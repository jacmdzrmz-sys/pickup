-- =====================================================================
-- Evanston Dinks — community games, courts directory, safety & admin
-- =====================================================================
-- Run this in the Supabase SQL editor (or `supabase db push`).
--
-- Design notes
-- * Uses Supabase Auth (auth.users) for accounts. Passwords are hashed by
--   Supabase Auth; this schema never stores a password or an email.
-- * New tables are prefixed/named so they do NOT collide with the older
--   Prisma tables (users, courts, games, game_players, court_reservations)
--   used by the Express backend in /backend. Nothing in this file touches them.
-- * All game times are stored as Evanston local wall-clock time
--   (America/Chicago) as a date + start/end time.
-- * Court facts (hours, closures, links, statuses) live in tables so admins
--   can update them without a code change. The City of Evanston is the source
--   of truth; these rows are a convenience copy and should be kept current.
-- * Game-time validation is enforced IN THE DATABASE (trigger), so it cannot
--   be bypassed by calling the API directly. The app calls the same function
--   (check_game_time) for instant feedback.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------
create or replace function public.evanston_now()
returns timestamp
language sql stable
as $$ select (now() at time zone 'America/Chicago') $$;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------
-- Official City resources (editable links)
-- ---------------------------------------------------------------------
create table if not exists public.official_links (
  key          text primary key,
  label        text not null,
  url          text not null,
  description  text,
  category     text not null default 'general'
               check (category in ('general','reservations','rules','schedule','facility','contact','safety')),
  sort_order   int  not null default 0,
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Locations (outdoor parks and indoor facilities)
-- ---------------------------------------------------------------------
create table if not exists public.locations (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique,
  name             text not null,
  setting          text not null check (setting in ('outdoor','indoor')),
  address          text,
  phone            text,
  maps_query       text,                 -- used to build a Google Maps link
  court_count      int,
  court_notes      text,
  has_lights       boolean not null default false,
  hours_summary    text,                 -- human-readable; location_hours is what's enforced
  access_types     text[] not null default '{}',  -- first_come | reservable | open_gym | rental
  reservation_info text,
  first_come_info  text,
  open_gym_info    text,
  rental_info      text,
  contact_method   text,
  official_url     text,
  schedule_url     text,
  reservation_url  text,
  status           text not null default 'open'
                   check (status in ('open','temporarily_unavailable','closed')),
  status_note      text,
  accepts_games    boolean not null default true,
  sort_order       int not null default 0,
  info_checked_on  date,                 -- when an admin last checked against City info
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create trigger locations_updated_at before update on public.locations
  for each row execute function public.set_updated_at();

-- Allowed playing windows per weekday (0 = Sunday … 6 = Saturday).
-- A game must fit entirely inside one matching row. Several rows per day are
-- allowed (e.g. split drop-in sessions). Optional valid_from/valid_until make a
-- row seasonal. A location with NO rows cannot accept games.
create table if not exists public.location_hours (
  id           uuid primary key default gen_random_uuid(),
  location_id  uuid not null references public.locations(id) on delete cascade,
  day_of_week  smallint not null check (day_of_week between 0 and 6),
  open_time    time not null,
  close_time   time not null,
  valid_from   date,
  valid_until  date,
  note         text,
  check (close_time > open_time),
  check (valid_until is null or valid_from is null or valid_until >= valid_from)
);
create index if not exists location_hours_location_idx on public.location_hours(location_id, day_of_week);

-- Closures: one location, or every location of a setting (location_id null +
-- setting), or citywide (both null). Whole day when start/end time are null.
create table if not exists public.location_closures (
  id           uuid primary key default gen_random_uuid(),
  location_id  uuid references public.locations(id) on delete cascade,
  setting      text check (setting in ('outdoor','indoor')),
  starts_on    date not null,
  ends_on      date not null,
  start_time   time,
  end_time     time,
  reason       text not null,
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  check (ends_on >= starts_on),
  check ((start_time is null) = (end_time is null)),
  check (end_time is null or end_time > start_time)
);
create index if not exists location_closures_dates_idx on public.location_closures(starts_on, ends_on);

-- ---------------------------------------------------------------------
-- Accounts: public profile, private settings, admins, suspensions
-- ---------------------------------------------------------------------
-- Public profile. Contains ONLY fields that are safe to show publicly.
-- Email/phone/address/date of birth are never stored here.
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text not null default 'Player' check (char_length(display_name) between 1 and 40),
  avatar_url    text,
  skill_level   text check (skill_level in ('beginner','intermediate','advanced','all')),
  play_type     text check (play_type in ('casual','competitive','open_play','drills','any')),
  neighborhood  text check (char_length(neighborhood) <= 40),
  bio           text check (char_length(bio) <= 280),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Private, owner-only settings and consent records.
create table if not exists public.account_settings (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  terms_accepted_at    timestamptz,
  terms_version        text,
  email_notifications  boolean not null default false,  -- opt-in
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create trigger account_settings_updated_at before update on public.account_settings
  for each row execute function public.set_updated_at();

-- Admins are added by hand in the SQL editor:
--   insert into public.admins (user_id) values ('<auth user uuid>');
create table if not exists public.admins (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table if not exists public.suspensions (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  reason        text,
  suspended_by  uuid references auth.users(id) on delete set null,
  suspended_at  timestamptz not null default now()
);

create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = uid)
$$;

create or replace function public.is_suspended(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.suspensions where user_id = uid)
$$;

create or replace function public.has_accepted_terms(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.account_settings
                 where user_id = uid and terms_accepted_at is not null)
$$;

-- Create profile + settings rows when someone signs up (Google, email, magic link).
-- Display name comes from the provider's first name when available; we never
-- derive it from the email address.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  dn text;
begin
  dn := nullif(trim(coalesce(
          meta->>'display_name',
          meta->>'given_name',
          split_part(coalesce(meta->>'full_name', meta->>'name', ''), ' ', 1)
        )), '');
  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, left(coalesce(dn, 'Player'), 40), coalesce(meta->>'avatar_url', meta->>'picture'))
  on conflict (id) do nothing;
  insert into public.account_settings (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Record acceptance of Terms, Privacy, Community Guidelines and the
-- activity risk acknowledgment (server-set timestamp).
create or replace function public.accept_terms(p_version text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Please sign in first.'; end if;
  insert into public.account_settings (user_id, terms_accepted_at, terms_version)
  values (auth.uid(), now(), p_version)
  on conflict (user_id) do update
    set terms_accepted_at = now(), terms_version = excluded.terms_version;
end $$;

-- ---------------------------------------------------------------------
-- Blocks
-- ---------------------------------------------------------------------
create table if not exists public.user_blocks (
  blocker_id  uuid not null references auth.users(id) on delete cascade,
  blocked_id  uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create or replace function public.is_blocked_between(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_blocks
                 where (blocker_id = a and blocked_id = b)
                    or (blocker_id = b and blocked_id = a))
$$;

-- ---------------------------------------------------------------------
-- Community games
-- ---------------------------------------------------------------------
create table if not exists public.community_games (
  id                     uuid primary key default gen_random_uuid(),
  host_id                uuid not null references auth.users(id) on delete cascade,
  location_id            uuid not null references public.locations(id),
  title                  text not null check (char_length(title) between 3 and 80),
  description            text check (char_length(description) <= 500),
  game_date              date not null,
  start_time             time not null,
  end_time               time not null,
  skill_level            text not null check (skill_level in ('beginner','intermediate','advanced','all')),
  game_type              text not null check (game_type in ('casual','competitive','open_play','drills','round_robin')),
  max_players            int  not null check (max_players between 2 and 32),
  court_status           text not null check (court_status in ('reserved','first_come','drop_in','other')),
  reservation_confirmed  boolean not null default false,
  is_free                boolean not null default true,
  fee_note               text check (char_length(fee_note) <= 80),
  status                 text not null default 'scheduled' check (status in ('scheduled','cancelled','removed')),
  cancel_reason          text check (cancel_reason in ('weather','court_unavailable','not_enough_players','personal','other')),
  cancel_note            text check (char_length(cancel_note) <= 280),
  cancelled_at           timestamptz,
  removed_reason         text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  check (end_time > start_time),
  check (court_status <> 'reserved' or reservation_confirmed)
);
create index if not exists community_games_date_idx on public.community_games(game_date, start_time);
create index if not exists community_games_location_idx on public.community_games(location_id, game_date);
create index if not exists community_games_host_idx on public.community_games(host_id);

create trigger community_games_updated_at before update on public.community_games
  for each row execute function public.set_updated_at();

create table if not exists public.community_game_players (
  game_id    uuid not null references public.community_games(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  joined_at  timestamptz not null default now(),
  primary key (game_id, user_id)
);
create index if not exists community_game_players_user_idx on public.community_game_players(user_id);

-- The single source of truth for "can a game be scheduled here, then?"
-- Returns NULL when allowed, otherwise a plain-language message.
create or replace function public.check_game_time(
  p_location_id uuid, p_date date, p_start time, p_end time)
returns text
language plpgsql stable security definer set search_path = public as $$
declare
  loc        public.locations%rowtype;
  local_now  timestamp := public.evanston_now();
  dow        int;
  fits       boolean;
  closure    public.location_closures%rowtype;
begin
  if p_location_id is null then
    return 'Please choose a location.';
  end if;
  select * into loc from public.locations where id = p_location_id;
  if not found then
    return 'Please choose a location from the list.';
  end if;
  if loc.status <> 'open' or not loc.accepts_games then
    return 'This location isn''t available for Evanston Dinks games right now.'
           || coalesce(' ' || loc.status_note, '');
  end if;
  if p_date is null or p_start is null or p_end is null then
    return 'Please choose a date, start time and end time.';
  end if;
  if p_end <= p_start then
    return 'The end time must be after the start time.';
  end if;
  if p_end - p_start > interval '4 hours' then
    return 'Games can be up to 4 hours long.';
  end if;
  if (p_date + p_start) <= local_now then
    return 'Please choose a time that hasn''t happened yet.';
  end if;
  if p_date > (local_now::date + 60) then
    return 'Games can be scheduled up to 60 days ahead.';
  end if;

  if not exists (select 1 from public.location_hours where location_id = p_location_id) then
    return 'Playing hours for this location haven''t been confirmed in Evanston Dinks yet, so games can''t be scheduled here. Check the official City schedule.';
  end if;

  dow := extract(dow from p_date)::int;
  select exists (
    select 1 from public.location_hours h
     where h.location_id = p_location_id
       and h.day_of_week = dow
       and (h.valid_from  is null or h.valid_from  <= p_date)
       and (h.valid_until is null or h.valid_until >= p_date)
       and h.open_time <= p_start
       and h.close_time >= p_end
  ) into fits;
  if not fits then
    return 'That time is outside the current playing hours for this location. Please choose another time.';
  end if;

  select c.* into closure
    from public.location_closures c
   where (c.location_id = p_location_id
          or (c.location_id is null and (c.setting is null or c.setting = loc.setting)))
     and p_date between c.starts_on and c.ends_on
     and (c.start_time is null or (p_start < c.end_time and p_end > c.start_time))
   limit 1;
  if found then
    return 'This location is closed or unavailable then (' || closure.reason || '). Please choose another time.';
  end if;

  return null;
end $$;

create or replace function public.community_games_before_write()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  msg text;
  loc_setting text;
begin
  if tg_op = 'INSERT' then
    if auth.uid() is null or new.host_id is distinct from auth.uid() then
      raise exception 'Please sign in to create a game.';
    end if;
    if public.is_suspended(new.host_id) then
      raise exception 'Your account is suspended, so you can''t create games right now.';
    end if;
    if not public.has_accepted_terms(new.host_id) then
      raise exception 'Please review and accept the Evanston Dinks terms before creating a game.';
    end if;
    new.status := 'scheduled';
    new.cancel_reason := null; new.cancel_note := null; new.cancelled_at := null;
    new.removed_reason := null;
  end if;

  if tg_op = 'INSERT'
     or new.location_id is distinct from old.location_id
     or new.game_date   is distinct from old.game_date
     or new.start_time  is distinct from old.start_time
     or new.end_time    is distinct from old.end_time then
    msg := public.check_game_time(new.location_id, new.game_date, new.start_time, new.end_time);
    if msg is not null then
      raise exception using message = msg, errcode = 'P0001', hint = 'game_validation';
    end if;
  end if;

  select setting into loc_setting from public.locations where id = new.location_id;
  if new.court_status = 'drop_in' and loc_setting <> 'indoor' then
    raise exception 'Indoor Open Gym / Drop-In is only for indoor facilities.';
  end if;
  if new.court_status = 'reserved' and not new.reservation_confirmed then
    raise exception 'Please confirm that you have obtained or will obtain the necessary reservation or permit.';
  end if;
  if new.court_status <> 'reserved' then
    new.reservation_confirmed := false;
  end if;
  if new.is_free then
    new.fee_note := null;
  end if;
  return new;
end $$;

create trigger community_games_validate
  before insert or update on public.community_games
  for each row execute function public.community_games_before_write();

-- Host is automatically the first player.
create or replace function public.community_games_after_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.community_game_players (game_id, user_id)
  values (new.id, new.host_id) on conflict do nothing;
  return new;
end $$;

create trigger community_games_add_host
  after insert on public.community_games
  for each row execute function public.community_games_after_insert();

-- Joining rules: signed in, terms accepted, not suspended, game upcoming and
-- scheduled, not full, no block between player and host.
create or replace function public.community_game_players_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  g public.community_games%rowtype;
  n int;
begin
  select * into g from public.community_games where id = new.game_id for update;
  if not found then
    raise exception 'That game no longer exists.';
  end if;

  -- The host row is added by the system trigger above.
  if new.user_id = g.host_id then
    return new;
  end if;

  if auth.uid() is null or new.user_id is distinct from auth.uid() then
    raise exception 'Please sign in to join a game.';
  end if;
  if public.is_suspended(new.user_id) then
    raise exception 'Your account is suspended, so you can''t join games right now.';
  end if;
  if not public.has_accepted_terms(new.user_id) then
    raise exception 'Please review and accept the Evanston Dinks terms before joining a game.';
  end if;
  if g.status <> 'scheduled' then
    raise exception 'This game is no longer happening.';
  end if;
  if (g.game_date + g.start_time) <= public.evanston_now() then
    raise exception 'This game has already started.';
  end if;
  if public.is_blocked_between(new.user_id, g.host_id) then
    raise exception 'You can''t join this game.';
  end if;
  select count(*) into n from public.community_game_players where game_id = g.id;
  if n >= g.max_players then
    raise exception 'This game is full.';
  end if;
  return new;
end $$;

create trigger community_game_players_validate
  before insert on public.community_game_players
  for each row execute function public.community_game_players_before_insert();

-- Hosts cancel rather than leave their own scheduled game.
create or replace function public.community_game_players_before_delete()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  g public.community_games%rowtype;
begin
  if pg_trigger_depth() > 1 then
    return old;  -- cascading delete (game or account removed)
  end if;
  select * into g from public.community_games where id = old.game_id;
  if found and g.host_id = old.user_id and g.status = 'scheduled' then
    raise exception 'As the host, please cancel the game instead of leaving it.';
  end if;
  return old;
end $$;

create trigger community_game_players_leave
  before delete on public.community_game_players
  for each row execute function public.community_game_players_before_delete();

-- ---------------------------------------------------------------------
-- Notifications (in-app). Email delivery is opt-in and not wired yet.
-- ---------------------------------------------------------------------
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  kind        text not null check (kind in ('game_cancelled','game_removed','system')),
  game_id     uuid references public.community_games(id) on delete set null,
  message     text not null,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);

create or replace function public.reason_label(r text)
returns text language sql immutable as $$
  select case r
    when 'weather' then 'Weather'
    when 'court_unavailable' then 'Court unavailable'
    when 'not_enough_players' then 'Not enough players'
    when 'personal' then 'Personal reason'
    else 'Other' end
$$;

create or replace function public.notify_game_players(p_game_id uuid, p_kind text, p_message text)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, kind, game_id, message)
  select gp.user_id, p_kind, p_game_id, p_message
    from public.community_game_players gp
    join public.community_games g on g.id = gp.game_id
   where gp.game_id = p_game_id and gp.user_id <> g.host_id
$$;

-- Host (or admin) cancels a game; joined players are notified automatically.
create or replace function public.cancel_game(p_game_id uuid, p_reason text, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  g public.community_games%rowtype;
  loc_name text;
begin
  select * into g from public.community_games where id = p_game_id for update;
  if not found then raise exception 'That game no longer exists.'; end if;
  if auth.uid() is null or (auth.uid() <> g.host_id and not public.is_admin()) then
    raise exception 'Only the host can cancel this game.';
  end if;
  if g.status <> 'scheduled' then raise exception 'This game is already canceled.'; end if;
  if p_reason not in ('weather','court_unavailable','not_enough_players','personal','other') then
    raise exception 'Please choose a reason.';
  end if;

  update public.community_games
     set status = 'cancelled', cancel_reason = p_reason,
         cancel_note = nullif(left(trim(coalesce(p_note, '')), 280), ''),
         cancelled_at = now()
   where id = p_game_id;

  select name into loc_name from public.locations where id = g.location_id;
  perform public.notify_game_players(
    p_game_id, 'game_cancelled',
    format('Canceled: "%s" on %s at %s. Reason: %s.',
           g.title, to_char(g.game_date, 'Dy Mon FMDD'), loc_name, public.reason_label(p_reason)));
end $$;

-- ---------------------------------------------------------------------
-- Reports
-- ---------------------------------------------------------------------
create table if not exists public.reports (
  id                uuid primary key default gen_random_uuid(),
  reporter_id       uuid default auth.uid() references auth.users(id) on delete set null,
  target_type       text not null check (target_type in ('game','user')),
  game_id           uuid references public.community_games(id) on delete set null,
  reported_user_id  uuid references auth.users(id) on delete set null,
  category          text not null check (category in
                    ('harassment','threatening','inappropriate_content','reservation_misrepresentation',
                     'unsafe_behavior','spam','other')),
  details           text check (char_length(details) <= 1000),
  status            text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  admin_note        text,
  resolved_by       uuid references auth.users(id) on delete set null,
  resolved_at       timestamptz,
  context_snapshot  text,   -- what was reported, kept even if the game/user is later deleted
  created_at        timestamptz not null default now()
);
create index if not exists reports_status_idx on public.reports(status, created_at desc);

create or replace function public.reports_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.target_type = 'game' then
    if new.game_id is null then raise exception 'Please choose a game to report.'; end if;
    select format('Game "%s" on %s %s–%s at %s, hosted by %s', g.title, g.game_date,
                  to_char(g.start_time, 'HH12:MI AM'), to_char(g.end_time, 'HH12:MI AM'), l.name, p.display_name),
           g.host_id
      into new.context_snapshot, new.reported_user_id
      from public.community_games g
      join public.locations l on l.id = g.location_id
      left join public.profiles p on p.id = g.host_id
     where g.id = new.game_id;
  else
    if new.reported_user_id is null then raise exception 'Please choose a player to report.'; end if;
    select format('Player "%s"', p.display_name) into new.context_snapshot
      from public.profiles p where p.id = new.reported_user_id;
  end if;
  new.status := 'open'; new.admin_note := null; new.resolved_by := null; new.resolved_at := null;
  return new;
end $$;

create trigger reports_fill_context
  before insert on public.reports
  for each row execute function public.reports_before_insert();

-- ---------------------------------------------------------------------
-- Admin actions
-- ---------------------------------------------------------------------
create or replace function public.admin_remove_game(p_game_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare g public.community_games%rowtype;
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  select * into g from public.community_games where id = p_game_id for update;
  if not found then raise exception 'Game not found.'; end if;
  update public.community_games set status = 'removed', removed_reason = p_reason where id = p_game_id;
  if g.status = 'scheduled' then
    perform public.notify_game_players(p_game_id, 'game_removed',
      format('"%s" on %s was removed by Evanston Dinks moderators.', g.title, to_char(g.game_date, 'Dy Mon FMDD')));
  end if;
end $$;

create or replace function public.admin_set_suspension(p_user_id uuid, p_suspend boolean, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  if p_suspend then
    insert into public.suspensions (user_id, reason, suspended_by)
    values (p_user_id, p_reason, auth.uid())
    on conflict (user_id) do update set reason = excluded.reason, suspended_by = excluded.suspended_by, suspended_at = now();
  else
    delete from public.suspensions where user_id = p_user_id;
  end if;
end $$;

create or replace function public.admin_update_report(p_report_id uuid, p_status text, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  update public.reports
     set status = p_status,
         admin_note = coalesce(p_note, admin_note),
         resolved_by = case when p_status in ('resolved','dismissed') then auth.uid() else resolved_by end,
         resolved_at = case when p_status in ('resolved','dismissed') then now() else resolved_at end
   where id = p_report_id;
end $$;

create or replace function public.admin_stats()
returns json language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  return json_build_object(
    'users',            (select count(*) from public.profiles),
    'new_users_7d',     (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'upcoming_games',   (select count(*) from public.community_games
                          where status = 'scheduled' and (game_date + end_time) > public.evanston_now()),
    'games_created_7d', (select count(*) from public.community_games where created_at > now() - interval '7 days'),
    'joins_7d',         (select count(*) from public.community_game_players where joined_at > now() - interval '7 days'),
    'open_reports',     (select count(*) from public.reports where status in ('open','reviewing')),
    'suspended_users',  (select count(*) from public.suspensions)
  );
end $$;

-- ---------------------------------------------------------------------
-- Account deletion (self-service). Cancels upcoming hosted games (players
-- are notified), then deletes the auth user; profile, settings, games,
-- memberships, blocks and notifications cascade. Reports filed by or about
-- the user are kept with the user reference cleared, for safety review.
-- ---------------------------------------------------------------------
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public, auth as $$
declare
  uid uuid := auth.uid();
  g record;
begin
  if uid is null then raise exception 'Please sign in first.'; end if;
  for g in
    select id from public.community_games
     where host_id = uid and status = 'scheduled'
       and (game_date + start_time) > public.evanston_now()
  loop
    perform public.cancel_game(g.id, 'other', 'The host deleted their account.');
  end loop;
  delete from auth.users where id = uid;
end $$;

-- ---------------------------------------------------------------------
-- Read model for listings
-- ---------------------------------------------------------------------
create or replace view public.community_games_view
with (security_invoker = true) as
select
  g.id, g.host_id, g.location_id, g.title, g.description, g.game_date, g.start_time, g.end_time,
  g.skill_level, g.game_type, g.max_players, g.court_status, g.reservation_confirmed,
  g.is_free, g.fee_note, g.status, g.cancel_reason, g.cancel_note, g.cancelled_at, g.created_at,
  l.name  as location_name,
  l.slug  as location_slug,
  l.setting,
  l.has_lights,
  l.address as location_address,
  l.maps_query,
  p.display_name as host_name,
  p.avatar_url   as host_avatar_url,
  (select count(*)::int from public.community_game_players gp where gp.game_id = g.id) as player_count,
  ((g.game_date + g.end_time) <= public.evanston_now()) as is_past
from public.community_games g
join public.locations l on l.id = g.location_id
left join public.profiles p on p.id = g.host_id;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.official_links          enable row level security;
alter table public.locations               enable row level security;
alter table public.location_hours          enable row level security;
alter table public.location_closures       enable row level security;
alter table public.profiles                enable row level security;
alter table public.account_settings        enable row level security;
alter table public.admins                  enable row level security;
alter table public.suspensions             enable row level security;
alter table public.user_blocks             enable row level security;
alter table public.community_games         enable row level security;
alter table public.community_game_players  enable row level security;
alter table public.notifications           enable row level security;
alter table public.reports                 enable row level security;

-- Public reference data: anyone can read, admins can write.
create policy "links readable" on public.official_links for select using (true);
create policy "links admin"    on public.official_links for all using (public.is_admin()) with check (public.is_admin());
create policy "locations readable" on public.locations for select using (true);
create policy "locations admin"    on public.locations for all using (public.is_admin()) with check (public.is_admin());
create policy "hours readable" on public.location_hours for select using (true);
create policy "hours admin"    on public.location_hours for all using (public.is_admin()) with check (public.is_admin());
create policy "closures readable" on public.location_closures for select using (true);
create policy "closures admin"    on public.location_closures for all using (public.is_admin()) with check (public.is_admin());

-- Profiles hold public-safe fields only.
create policy "profiles readable"   on public.profiles for select using (true);
create policy "profiles update own" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Private settings: owner only. Terms are set via accept_terms().
create policy "settings own" on public.account_settings for select to authenticated using (user_id = auth.uid());
create policy "settings update own" on public.account_settings for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke update on public.account_settings from anon, authenticated;
grant update (email_notifications) on public.account_settings to authenticated;

create policy "admins see self" on public.admins for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "suspensions read" on public.suspensions for select to authenticated using (user_id = auth.uid() or public.is_admin());

create policy "blocks own read"   on public.user_blocks for select to authenticated using (blocker_id = auth.uid());
create policy "blocks own insert" on public.user_blocks for insert to authenticated with check (blocker_id = auth.uid());
create policy "blocks own delete" on public.user_blocks for delete to authenticated using (blocker_id = auth.uid());

-- Games: anyone can browse scheduled/cancelled games; removed games are
-- visible only to their host and admins. Inserts go through validation
-- triggers. There is no direct UPDATE/DELETE for users — they use
-- cancel_game(); admins use admin_remove_game().
create policy "games readable" on public.community_games for select
  using (status <> 'removed' or host_id = auth.uid() or public.is_admin());
create policy "games insert own" on public.community_games for insert to authenticated
  with check (host_id = auth.uid());

create policy "players readable" on public.community_game_players for select using (true);
create policy "players join self" on public.community_game_players for insert to authenticated
  with check (user_id = auth.uid());
create policy "players leave self" on public.community_game_players for delete to authenticated
  using (user_id = auth.uid());

create policy "notifications own" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "notifications mark read" on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notifications delete own" on public.notifications for delete to authenticated using (user_id = auth.uid());
revoke update on public.notifications from anon, authenticated;
grant update (read_at) on public.notifications to authenticated;

create policy "reports create" on public.reports for insert to authenticated
  with check (reporter_id = auth.uid());
create policy "reports read own or admin" on public.reports for select to authenticated
  using (reporter_id = auth.uid() or public.is_admin());
create policy "reports admin update" on public.reports for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Function execute permissions
revoke execute on function public.delete_my_account() from public, anon;
grant  execute on function public.delete_my_account() to authenticated;
revoke execute on function public.accept_terms(text) from public, anon;
grant  execute on function public.accept_terms(text) to authenticated;
revoke execute on function public.cancel_game(uuid, text, text) from public, anon;
grant  execute on function public.cancel_game(uuid, text, text) to authenticated;
revoke execute on function public.notify_game_players(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.admin_remove_game(uuid, text) from public, anon;
grant  execute on function public.admin_remove_game(uuid, text) to authenticated;
revoke execute on function public.admin_set_suspension(uuid, boolean, text) from public, anon;
grant  execute on function public.admin_set_suspension(uuid, boolean, text) to authenticated;
revoke execute on function public.admin_update_report(uuid, text, text) from public, anon;
grant  execute on function public.admin_update_report(uuid, text, text) to authenticated;
revoke execute on function public.admin_stats() from public, anon;
grant  execute on function public.admin_stats() to authenticated;
grant  execute on function public.check_game_time(uuid, date, time, time) to anon, authenticated;

-- =====================================================================
-- Seed data — official City of Evanston information, checked 2026-11-17
-- against cityofevanston.org (Athletic Courts and Tennis & Pickleball
-- pages). Fees and schedules change: the City's pages control.
-- =====================================================================
insert into public.official_links (key, label, url, description, category, sort_order) values
  ('reserve_court', 'Reserve a Court (Amilia)',
   'https://app.amilia.com/store/en/cityofevanston/shop/facilitybookings',
   'Official City of Evanston facility booking system. Your receipt serves as your permit.', 'reservations', 10),
  ('parks_rec', 'Evanston Parks & Recreation',
   'https://cityofevanston.org/departments/prcs/index.php',
   'Parks, Recreation & Community Services home.', 'general', 20),
  ('tennis_pickleball', 'Evanston Tennis & Pickleball',
   'https://cityofevanston.org/departments/prcs/parks_athletic_fields/tennis_and_pickleball.php',
   'Outdoor courts, how to reserve, court rules and indoor pickleball.', 'general', 30),
  ('athletic_courts', 'Evanston Athletic Courts',
   'https://cityofevanston.org/departments/prcs/parks_athletic_fields/athletic_courts.php',
   'Current list of outdoor pickleball courts, lights and fees.', 'general', 40),
  ('court_rules', 'Evanston Court Rules',
   'https://cityofevanston.org/Documents/Departments/Parks%20Recreation%20and%20Community%20Services/Parks%20and%20Athletic%20Fields/Athletic%20Courts/Evanston%20Court%20Rules%202025v2.pdf',
   'Official court guidelines and rules (PDF).', 'rules', 50),
  ('open_gym_calendars', 'Open Gym & Open Play Calendars',
   'https://cityofevanston.org/departments/prcs/programs_events/open_gym_open_play_calendars.php',
   'Official City schedule for indoor drop-in pickleball.', 'schedule', 60),
  ('lightning', 'Thor Guard Lightning Prediction',
   'https://cityofevanston.org/departments/prcs/parks_athletic_fields/thor_guard_lightning_prediction_system.php',
   'How the City warns of lightning at parks.', 'safety', 70),
  ('city_311', 'Evanston 311',
   'https://cityofevanston.org/residents/311/index.php',
   'Questions for the City: call 311 or (847) 448-4311.', 'contact', 80)
on conflict (key) do nothing;

insert into public.locations
  (slug, name, setting, address, phone, maps_query, court_count, court_notes, has_lights,
   hours_summary, access_types, reservation_info, first_come_info, open_gym_info, rental_info,
   contact_method, official_url, schedule_url, reservation_url, sort_order, info_checked_on)
values
  ('james-park', 'James Park', 'outdoor', null, null, 'James Park, Evanston, IL', 15,
   'Dedicated pickleball courts', true,
   '7:00 AM–10:00 PM (lighted). Lights shut off automatically at 10 PM.',
   array['first_come','reservable'],
   'Some courts and times can be reserved through the City''s Amilia system. Current listed fee: $20/hour resident, $26/hour non-resident.',
   'When not reserved, courts are first come, first served. Follow posted rules for waiting your turn.',
   null, null, null,
   'https://cityofevanston.org/departments/prcs/parks_athletic_fields/athletic_courts.php', null,
   'https://app.amilia.com/store/en/cityofevanston/shop/facilitybookings', 10, '2026-11-17'),
  ('fitzsimmons-park', 'Fitzsimmons Park', 'outdoor', null, null, 'Fitzsimmons Park, Evanston, IL', 2,
   'Pickleball lines, bang board', true,
   '7:00 AM–10:00 PM (lighted). Lights shut off automatically at 10 PM.',
   array['first_come','reservable'],
   'Some courts and times can be reserved through the City''s Amilia system. Current listed fee: $20/hour resident, $26/hour non-resident.',
   'When not reserved, courts are first come, first served. Follow posted rules for waiting your turn.',
   null, null, null,
   'https://cityofevanston.org/departments/prcs/parks_athletic_fields/athletic_courts.php', null,
   'https://app.amilia.com/store/en/cityofevanston/shop/facilitybookings', 20, '2026-11-17'),
  ('lovelace-park', 'Lovelace Park', 'outdoor', null, null, 'Lovelace Park, Evanston, IL', 6,
   'Pickleball lines', false,
   '7:00 AM–9:00 PM (no lights).',
   array['first_come','reservable'],
   'Some courts and times can be reserved through the City''s Amilia system. Current listed fee: $20/hour resident, $26/hour non-resident.',
   'When not reserved, courts are first come, first served. Follow posted rules for waiting your turn.',
   null, null, null,
   'https://cityofevanston.org/departments/prcs/parks_athletic_fields/athletic_courts.php', null,
   'https://app.amilia.com/store/en/cityofevanston/shop/facilitybookings', 30, '2026-11-17'),
  ('cartwright-park', 'Cartwright Park', 'outdoor', null, null, 'Cartwright Park, Evanston, IL', 2,
   'Pickleball lines', false,
   '7:00 AM–9:00 PM (no lights).',
   array['first_come','reservable'],
   'Some courts and times can be reserved through the City''s Amilia system. Current listed fee: $20/hour resident, $26/hour non-resident.',
   'When not reserved, courts are first come, first served. Follow posted rules for waiting your turn.',
   null, null, null,
   'https://cityofevanston.org/departments/prcs/parks_athletic_fields/athletic_courts.php', null,
   'https://app.amilia.com/store/en/cityofevanston/shop/facilitybookings', 40, '2026-11-17'),
  ('mason-park', 'Mason Park', 'outdoor', null, null, 'Mason Park, Evanston, IL', 2,
   'Pickleball lines', false,
   '7:00 AM–9:00 PM (no lights).',
   array['first_come','reservable'],
   'Some courts and times can be reserved through the City''s Amilia system. Current listed fee: $20/hour resident, $26/hour non-resident.',
   'When not reserved, courts are first come, first served. Follow posted rules for waiting your turn.',
   null, null, null,
   'https://cityofevanston.org/departments/prcs/parks_athletic_fields/athletic_courts.php', null,
   'https://app.amilia.com/store/en/cityofevanston/shop/facilitybookings', 50, '2026-11-17'),

  ('robert-crown', 'Robert Crown Community Center', 'indoor', '1801 Main St., Evanston, IL 60202', '(847) 448-8258',
   'Robert Crown Community Center, 1801 Main St, Evanston, IL', 3, 'Three half-courts for pickleball', true,
   'Building hours 8:30 AM–9:00 PM daily. Pickleball sessions follow the Official City Schedule.',
   array['open_gym','rental'], null, null,
   'Indoor drop-in/open gym on three half-courts, up to 32 people per session. Current listed fee: $5/person, paid at the front desk before playing. First-time players sign a waiver.',
   'Court rentals available (up to 3 half-courts).',
   'Use the City''s rental request form on the Robert Crown pickleball page, or call (847) 448-8258.',
   'https://cityofevanston.org/departments/prcs/facilities/robert_crown_center/pickleball_at_crown.php',
   'https://cityofevanston.org/departments/prcs/programs_events/open_gym_open_play_calendars.php',
   null, 110, '2026-11-17'),
  ('chandler-newberger', 'Chandler-Newberger Center', 'indoor', '1028 Central St., Evanston, IL 60201', '(847) 448-8252',
   'Chandler-Newberger Center, 1028 Central St, Evanston, IL', null, null, true,
   'Call the front desk for rental times.',
   array['rental'], null, null,
   'No pickleball open gym is currently listed.',
   'Indoor court rental for up to 5 players. Paddles and balls provided. Current listed rental fee: $20/hour.',
   'Contact Chandler-Newberger directly for rental requests: (847) 448-8252.',
   'https://cityofevanston.org/departments/prcs/facilities/chandler_newberger_center/index.php',
   null, null, 120, '2026-11-17'),
  ('levy-senior-center', 'Levy Senior Center', 'indoor', '300 Dodge Ave., Evanston, IL 60202', '(847) 448-8250',
   'Levy Senior Center, 300 Dodge Ave, Evanston, IL', null, null, true,
   'Office hours Mon–Fri 8:30 AM–8:00 PM, Sat–Sun 9:00 AM–3:00 PM. Pickleball sessions follow the Official City Schedule.',
   array['open_gym','rental'], null, null,
   'Indoor pickleball open gym. Current listed fee: $5/person. Nets and balls provided; bring your own paddle. Free member-only sessions on select days. The current City schedule controls availability.',
   'Gym available for rental.',
   'Call (847) 448-8250 or see the Levy rentals page.',
   'https://cityofevanston.org/departments/prcs/facilities/levy_senior_center/index.php',
   'https://cityofevanston.org/departments/prcs/programs_events/open_gym_open_play_calendars.php',
   'https://cityofevanston.org/departments/prcs/facilities/levy_senior_center/rentals.php', 130, '2026-11-17'),
  ('prieto-community-center', 'Dr. Jorge & Luz Maria Prieto Community Center', 'indoor', '430 Asbury Ave., Evanston, IL 60202', '(847) 859-7697',
   'Prieto Community Center, 430 Asbury Ave, Evanston, IL', null, null, true,
   'Building hours Mon–Fri 8:30 AM–8:00 PM, Sat–Sun 8:30 AM–4:30 PM. Gym bookings by request.',
   array['rental'], null, null,
   null,
   'The gym can be booked for pickleball by request.',
   'Submit the City''s Prieto booking request form (linked on the official page) or call (847) 859-7697.',
   'https://cityofevanston.org/departments/prcs/facilities/prieto/pickleball_at_prieto.php',
   null, null, 140, '2026-11-17')
on conflict (slug) do nothing;

-- Enforced playing windows.
-- Outdoor lighted courts 7 AM–10 PM, non-lighted 7 AM–9 PM (City court rules).
insert into public.location_hours (location_id, day_of_week, open_time, close_time, note)
select l.id, d, '07:00', case when l.has_lights then '22:00'::time else '21:00'::time end,
       'City court rules: lighted 7 AM–10 PM, non-lighted 7 AM–9 PM'
  from public.locations l cross join generate_series(0, 6) d
 where l.setting = 'outdoor'
   and not exists (select 1 from public.location_hours h where h.location_id = l.id);

-- Indoor: building/office hours published on official City pages. Drop-in
-- sessions are narrower; hosts are told to check the Official City Schedule.
-- Chandler-Newberger is intentionally left without hours (no published
-- weekly hours were found) — an admin can add them in /admin.
insert into public.location_hours (location_id, day_of_week, open_time, close_time, note)
select l.id, d, '08:30', '21:00', 'Building hours (official page)'
  from public.locations l cross join generate_series(0, 6) d
 where l.slug = 'robert-crown'
   and not exists (select 1 from public.location_hours h where h.location_id = l.id);

insert into public.location_hours (location_id, day_of_week, open_time, close_time, note)
select l.id, d,
       case when d in (0, 6) then '09:00'::time else '08:30'::time end,
       case when d in (0, 6) then '15:00'::time else '20:00'::time end,
       'Office hours (official page)'
  from public.locations l cross join generate_series(0, 6) d
 where l.slug = 'levy-senior-center'
   and not exists (select 1 from public.location_hours h where h.location_id = l.id);

insert into public.location_hours (location_id, day_of_week, open_time, close_time, note)
select l.id, d, '08:30',
       case when d in (0, 6) then '16:30'::time else '20:00'::time end,
       'Building hours (official page)'
  from public.locations l cross join generate_series(0, 6) d
 where l.slug = 'prieto-community-center'
   and not exists (select 1 from public.location_hours h where h.location_id = l.id);
