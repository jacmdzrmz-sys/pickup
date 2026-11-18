-- =====================================================================
-- Evanston Dinks: competitions
--   * Score reporting with opponent confirmation, player ratings
--   * Opt-in Top Players lists (adults only) and Champion of the Month
--   * Player-run round robins
--   * Player-run singles ladders with challenges
-- All writes go through security-definer RPCs that check who is calling.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Opt-in and 18+ confirmation
-- ---------------------------------------------------------------------
alter table public.account_settings add column if not exists adult_confirmed_at timestamptz;
alter table public.profiles add column if not exists show_on_leaderboards boolean not null default false;

-- Notifications: allow competition messages with an in-app link.
alter table public.notifications add column if not exists link text
  check (link is null or (link like '/%' and link not like '//%'));
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('game_cancelled','game_removed','system','competition'));

-- Signed up, accepted terms, confirmed 18+, not suspended.
create or replace function public.is_competitor(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select uid is not null
     and exists (select 1 from public.account_settings s
                  where s.user_id = uid and s.terms_accepted_at is not null and s.adult_confirmed_at is not null)
     and not exists (select 1 from public.suspensions where user_id = uid)
$$;

create or replace function public.notify_user(p_user uuid, p_message text, p_link text)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, kind, message, link)
  values (p_user, 'competition', left(p_message, 300), p_link)
$$;

create or replace function public.player_name(uid uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce((select display_name from public.profiles where id = uid), 'A player')
$$;

-- Turn competitions on (records the 18+ confirmation) and set leaderboard visibility.
create or replace function public.set_competition_settings(p_is_adult boolean, p_show_on_leaderboards boolean)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Please sign in first.'; end if;
  if not public.has_accepted_terms(uid) then raise exception 'Please accept the Evanston Dinks terms first.'; end if;
  if p_is_adult then
    update public.account_settings set adult_confirmed_at = coalesce(adult_confirmed_at, now()) where user_id = uid;
  else
    -- Turning the 18+ confirmation off also hides the player from every public list.
    update public.account_settings set adult_confirmed_at = null where user_id = uid;
    p_show_on_leaderboards := false;
  end if;
  update public.profiles set show_on_leaderboards = coalesce(p_show_on_leaderboards, false) where id = uid;
end $$;

-- ---------------------------------------------------------------------
-- Ratings
-- ---------------------------------------------------------------------
create table if not exists public.player_ratings (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  rating          integer not null default 1000,
  matches         integer not null default 0,
  wins            integer not null default 0,
  losses          integer not null default 0,
  last_played_on  date,
  updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Round robins
-- ---------------------------------------------------------------------
create table if not exists public.rr_events (
  id           uuid primary key default gen_random_uuid(),
  host_id      uuid references auth.users(id) on delete set null,
  title        text not null check (char_length(title) between 3 and 80),
  description  text check (char_length(description) <= 500),
  location_id  uuid references public.locations(id) on delete set null,
  event_date   date not null,
  start_time   time not null,
  format       text not null default 'doubles' check (format in ('singles','doubles')),
  max_players  integer not null default 16 check (max_players between 4 and 32),
  status       text not null default 'open' check (status in ('open','in_progress','completed','cancelled')),
  rounds       integer check (rounds between 1 and 12),
  winner_id    uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger rr_events_updated_at before update on public.rr_events
  for each row execute function public.set_updated_at();
create index if not exists rr_events_date_idx on public.rr_events(event_date, status);

create table if not exists public.rr_event_players (
  event_id   uuid not null references public.rr_events(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  joined_at  timestamptz not null default now(),
  primary key (event_id, user_id)
);

-- ---------------------------------------------------------------------
-- Ladders (singles)
-- ---------------------------------------------------------------------
create table if not exists public.ladders (
  id            uuid primary key default gen_random_uuid(),
  organizer_id  uuid references auth.users(id) on delete set null,
  name          text not null check (char_length(name) between 3 and 60),
  description   text check (char_length(description) <= 500),
  location_id   uuid references public.locations(id) on delete set null,
  skill_level   text not null default 'all' check (skill_level in ('beginner','intermediate','advanced','all')),
  ends_on       date,
  status        text not null default 'active' check (status in ('active','closed')),
  created_at    timestamptz not null default now()
);

create table if not exists public.ladder_entries (
  ladder_id  uuid not null references public.ladders(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  position   integer not null check (position > 0),
  joined_at  timestamptz not null default now(),
  primary key (ladder_id, user_id),
  constraint ladder_entries_position_key unique (ladder_id, position) deferrable initially deferred
);

create table if not exists public.ladder_challenges (
  id             uuid primary key default gen_random_uuid(),
  ladder_id      uuid not null references public.ladders(id) on delete cascade,
  challenger_id  uuid not null references auth.users(id) on delete cascade,
  opponent_id    uuid not null references auth.users(id) on delete cascade,
  status         text not null default 'pending'
                 check (status in ('pending','accepted','declined','completed','cancelled')),
  match_id       uuid,
  created_at     timestamptz not null default now(),
  responded_at   timestamptz
);
create index if not exists ladder_challenges_ladder_idx on public.ladder_challenges(ladder_id, status);

-- ---------------------------------------------------------------------
-- Matches
-- ---------------------------------------------------------------------
create table if not exists public.matches (
  id            uuid primary key default gen_random_uuid(),
  kind          text not null check (kind in ('casual','round_robin','ladder')),
  format        text not null check (format in ('singles','doubles')),
  event_id      uuid references public.rr_events(id) on delete cascade,
  round_no      integer,
  court_no      integer,
  ladder_id     uuid references public.ladders(id) on delete cascade,
  challenge_id  uuid references public.ladder_challenges(id) on delete set null,
  location_id   uuid references public.locations(id) on delete set null,
  played_on     date not null,
  score_a       integer check (score_a between 0 and 99),
  score_b       integer check (score_b between 0 and 99),
  status        text not null default 'pending'
                check (status in ('scheduled','pending','confirmed','disputed','cancelled')),
  reported_by   uuid references auth.users(id) on delete set null,
  confirmed_by  uuid references auth.users(id) on delete set null,
  confirmed_at  timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists matches_event_idx on public.matches(event_id, round_no);
create index if not exists matches_status_idx on public.matches(status, played_on);

alter table public.ladder_challenges drop constraint if exists ladder_challenges_match_fk;
alter table public.ladder_challenges add constraint ladder_challenges_match_fk
  foreign key (match_id) references public.matches(id) on delete set null;

create table if not exists public.match_players (
  match_id  uuid not null references public.matches(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  team      text not null check (team in ('a','b')),
  primary key (match_id, user_id)
);
create index if not exists match_players_user_idx on public.match_players(user_id);

-- Round robin and ladder matches are public (players joined a public event);
-- casual matches are visible only to the people in them (and admins).
create or replace function public.can_see_match(p_match uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.matches m
     where m.id = p_match
       and (m.kind <> 'casual'
            or public.is_admin()
            or exists (select 1 from public.match_players mp where mp.match_id = m.id and mp.user_id = auth.uid()))
  )
$$;

-- ---------------------------------------------------------------------
-- Applying a confirmed result: ratings, records, ladder moves
-- ---------------------------------------------------------------------
create or replace function public.apply_match_result(p_match uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  m public.matches%rowtype;
  ra numeric; rb numeric; ea numeric; delta integer; a_won boolean;
  c public.ladder_challenges%rowtype;
  c_pos integer; o_pos integer; challenger_team text;
begin
  select * into m from public.matches where id = p_match;
  if m.score_a is null or m.score_b is null or m.score_a = m.score_b then return; end if;
  a_won := m.score_a > m.score_b;

  insert into public.player_ratings (user_id)
  select user_id from public.match_players where match_id = p_match
  on conflict (user_id) do nothing;

  select avg(r.rating) into ra from public.match_players mp join public.player_ratings r on r.user_id = mp.user_id
   where mp.match_id = p_match and mp.team = 'a';
  select avg(r.rating) into rb from public.match_players mp join public.player_ratings r on r.user_id = mp.user_id
   where mp.match_id = p_match and mp.team = 'b';
  ea := 1.0 / (1.0 + power(10.0, (rb - ra) / 400.0));
  delta := round(32 * ((case when a_won then 1 else 0 end) - ea));

  update public.player_ratings r
     set rating = greatest(100, r.rating + case when mp.team = 'a' then delta else -delta end),
         matches = r.matches + 1,
         wins = r.wins + case when (mp.team = 'a') = a_won then 1 else 0 end,
         losses = r.losses + case when (mp.team = 'a') = a_won then 0 else 1 end,
         last_played_on = greatest(coalesce(r.last_played_on, m.played_on), m.played_on),
         updated_at = now()
    from public.match_players mp
   where mp.match_id = p_match and mp.user_id = r.user_id;

  -- Ladder: a challenger who wins takes the opponent's spot; everyone in between moves down one.
  if m.kind = 'ladder' and m.challenge_id is not null then
    select * into c from public.ladder_challenges where id = m.challenge_id;
    update public.ladder_challenges set status = 'completed' where id = c.id;
    select team into challenger_team from public.match_players where match_id = p_match and user_id = c.challenger_id;
    if (challenger_team = 'a') = a_won then
      select position into c_pos from public.ladder_entries where ladder_id = c.ladder_id and user_id = c.challenger_id;
      select position into o_pos from public.ladder_entries where ladder_id = c.ladder_id and user_id = c.opponent_id;
      if c_pos is not null and o_pos is not null and c_pos > o_pos then
        update public.ladder_entries set position = position + 1
         where ladder_id = c.ladder_id and position >= o_pos and position < c_pos;
        update public.ladder_entries set position = o_pos
         where ladder_id = c.ladder_id and user_id = c.challenger_id;
      end if;
    end if;
  end if;
end $$;

-- Who may confirm a pending match: someone on the other team from the
-- reporter, or (round robins) the host.
create or replace function public.can_confirm_match(p_match uuid, uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.matches m
     where m.id = p_match and m.status in ('pending','disputed')
       and uid is not null
       and coalesce(m.reported_by, '00000000-0000-0000-0000-000000000000'::uuid) <> uid
       and (
         exists (select 1 from public.match_players me
                   join public.match_players rep on rep.match_id = me.match_id and rep.user_id = m.reported_by
                  where me.match_id = m.id and me.user_id = uid and me.team <> rep.team)
         or (m.kind = 'round_robin'
             and exists (select 1 from public.rr_events e where e.id = m.event_id and e.host_id = uid))
         or (m.reported_by is null
             and exists (select 1 from public.match_players me where me.match_id = m.id and me.user_id = uid))
       )
  )
$$;

-- ---------------------------------------------------------------------
-- Casual score reporting
-- ---------------------------------------------------------------------
create or replace function public.report_match(
  p_format text,
  p_partner uuid,
  p_opponents uuid[],
  p_my_score integer,
  p_their_score integer,
  p_played_on date default null,
  p_location_id uuid default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  everyone uuid[];
  p uuid;
  mid uuid;
  today date := public.evanston_now()::date;
  d date := coalesce(p_played_on, public.evanston_now()::date);
begin
  if uid is null then raise exception 'Please sign in first.'; end if;
  if not public.is_competitor(uid) then
    raise exception 'Turn on competitions in your profile (18+) to report scores.';
  end if;
  if p_format not in ('singles','doubles') then raise exception 'Please choose singles or doubles.'; end if;
  if p_format = 'singles' and (p_partner is not null or coalesce(array_length(p_opponents, 1), 0) <> 1) then
    raise exception 'Singles needs exactly one opponent.';
  end if;
  if p_format = 'doubles' and (p_partner is null or coalesce(array_length(p_opponents, 1), 0) <> 2) then
    raise exception 'Doubles needs a partner and two opponents.';
  end if;
  if p_my_score is null or p_their_score is null or p_my_score < 0 or p_their_score < 0
     or p_my_score > 99 or p_their_score > 99 or p_my_score = p_their_score then
    raise exception 'Please enter a final score (no ties).';
  end if;
  if d > today or d < today - 14 then raise exception 'You can report games from the last 14 days.'; end if;

  everyone := array[uid] || case when p_partner is null then '{}'::uuid[] else array[p_partner] end || p_opponents;
  if (select count(distinct x) from unnest(everyone) x) <> array_length(everyone, 1) then
    raise exception 'Each player can only appear once.';
  end if;
  foreach p in array everyone loop
    if not public.is_competitor(p) then
      raise exception 'Everyone in the match needs competitions turned on in their profile.';
    end if;
    if p <> uid and public.is_blocked_between(uid, p) then
      raise exception 'You can’t report a match with that player.';
    end if;
  end loop;
  if (select count(*) from public.matches where reported_by = uid and created_at > now() - interval '1 day') >= 10 then
    raise exception 'You’ve reported a lot of games today. Please try again tomorrow.';
  end if;

  insert into public.matches (kind, format, location_id, played_on, score_a, score_b, status, reported_by)
  values ('casual', p_format, p_location_id, d, p_my_score, p_their_score, 'pending', uid)
  returning id into mid;

  insert into public.match_players (match_id, user_id, team) values (mid, uid, 'a');
  if p_partner is not null then
    insert into public.match_players (match_id, user_id, team) values (mid, p_partner, 'a');
  end if;
  insert into public.match_players (match_id, user_id, team) select mid, x, 'b' from unnest(p_opponents) x;

  foreach p in array p_opponents loop
    perform public.notify_user(p, public.player_name(uid) || ' reported a score: ' || p_their_score || '–' || p_my_score
      || ' (your side first). Please confirm it.', '/compete');
  end loop;
  return mid;
end $$;

create or replace function public.confirm_match(p_match uuid)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); m public.matches%rowtype;
begin
  if uid is null then raise exception 'Please sign in first.'; end if;
  select * into m from public.matches where id = p_match for update;
  if not found then raise exception 'Match not found.'; end if;
  if m.status = 'confirmed' then return; end if;
  if not public.can_confirm_match(p_match, uid) then
    raise exception 'Only a player on the other team can confirm this score.';
  end if;
  update public.matches set status = 'confirmed', confirmed_by = uid, confirmed_at = now() where id = p_match;
  perform public.apply_match_result(p_match);
  if m.reported_by is not null then
    perform public.notify_user(m.reported_by, public.player_name(uid) || ' confirmed your score.', '/compete');
  end if;
end $$;

create or replace function public.dispute_match(p_match uuid)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); m public.matches%rowtype;
begin
  select * into m from public.matches where id = p_match for update;
  if not found or m.status <> 'pending' or not public.can_confirm_match(p_match, uid) then
    raise exception 'You can’t dispute this score.';
  end if;
  update public.matches set status = 'disputed' where id = p_match;
  if m.reported_by is not null then
    perform public.notify_user(m.reported_by, public.player_name(uid)
      || ' says the score you reported isn’t right. Talk it over, then report it again.', '/compete');
  end if;
end $$;

-- The reporter can withdraw a score that hasn't been confirmed.
create or replace function public.withdraw_match(p_match uuid)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); m public.matches%rowtype;
begin
  select * into m from public.matches where id = p_match for update;
  if not found or m.reported_by is distinct from uid or m.status not in ('pending','disputed') then
    raise exception 'You can only withdraw a score you reported that hasn’t been confirmed.';
  end if;
  if m.kind = 'casual' then
    update public.matches set status = 'cancelled' where id = p_match;
  else
    -- Round robin / ladder matches go back to waiting for a score.
    update public.matches set status = case when m.kind = 'round_robin' then 'scheduled' else 'cancelled' end,
           score_a = case when m.kind = 'round_robin' then null else score_a end,
           score_b = case when m.kind = 'round_robin' then null else score_b end,
           reported_by = case when m.kind = 'round_robin' then null else reported_by end
     where id = p_match;
    if m.kind = 'ladder' and m.challenge_id is not null then
      update public.ladder_challenges set status = 'accepted', match_id = null where id = m.challenge_id;
    end if;
  end if;
end $$;

-- Players to pick when reporting a score or challenging.
create or replace function public.search_competitors(p_query text)
returns table (id uuid, display_name text, avatar_url text, skill_level text)
language sql stable security definer set search_path = public as $$
  select p.id, p.display_name, p.avatar_url, p.skill_level
    from public.profiles p
   where auth.uid() is not null
     and p.id <> auth.uid()
     and char_length(trim(coalesce(p_query, ''))) >= 2
     and p.display_name ilike '%' || replace(replace(trim(p_query), '%', ''), '_', '') || '%'
     and public.is_competitor(p.id)
     and not public.is_blocked_between(auth.uid(), p.id)
   order by p.display_name
   limit 10
$$;

-- Readable match list with names.
create or replace function public.match_summaries(
  p_event uuid default null, p_ladder uuid default null, p_mine boolean default false, p_limit integer default 50
) returns table (
  id uuid, kind text, format text, status text, played_on date, round_no integer, court_no integer,
  score_a integer, score_b integer, reported_by uuid, event_id uuid, ladder_id uuid,
  team_a jsonb, team_b jsonb, my_team text, can_confirm boolean, created_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select m.id, m.kind, m.format, m.status, m.played_on, m.round_no, m.court_no,
         m.score_a, m.score_b, m.reported_by, m.event_id, m.ladder_id,
         coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.display_name, 'avatar', p.avatar_url) order by p.display_name)
                     from public.match_players mp join public.profiles p on p.id = mp.user_id
                    where mp.match_id = m.id and mp.team = 'a'), '[]'::jsonb),
         coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.display_name, 'avatar', p.avatar_url) order by p.display_name)
                     from public.match_players mp join public.profiles p on p.id = mp.user_id
                    where mp.match_id = m.id and mp.team = 'b'), '[]'::jsonb),
         (select mp.team from public.match_players mp where mp.match_id = m.id and mp.user_id = auth.uid()),
         public.can_confirm_match(m.id, auth.uid()),
         m.created_at
    from public.matches m
   where (p_event is null or m.event_id = p_event)
     and (p_ladder is null or m.ladder_id = p_ladder)
     and (not p_mine or exists (select 1 from public.match_players mp where mp.match_id = m.id and mp.user_id = auth.uid()))
     and (m.kind <> 'casual' or public.is_admin()
          or exists (select 1 from public.match_players mp where mp.match_id = m.id and mp.user_id = auth.uid()))
   order by case when p_event is not null then m.round_no end nulls last,
            case when p_event is not null then m.court_no end nulls last,
            m.created_at desc
   limit least(greatest(coalesce(p_limit, 50), 1), 200)
$$;

-- ---------------------------------------------------------------------
-- Round robins
-- ---------------------------------------------------------------------
create or replace function public.create_rr_event(
  p_title text, p_description text, p_location_id uuid, p_date date, p_start time, p_format text, p_max_players integer
) returns uuid
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); eid uuid; today date := public.evanston_now()::date;
begin
  if not public.is_competitor(uid) then raise exception 'Turn on competitions in your profile (18+) to host a round robin.'; end if;
  if p_date is null or p_date < today or p_date > today + 90 then raise exception 'Pick a date in the next 90 days.'; end if;
  if (select count(*) from public.rr_events where host_id = uid and status in ('open','in_progress')) >= 5 then
    raise exception 'You already have 5 round robins open. Finish or cancel one first.';
  end if;
  insert into public.rr_events (host_id, title, description, location_id, event_date, start_time, format, max_players)
  values (uid, trim(p_title), nullif(trim(coalesce(p_description, '')), ''), p_location_id, p_date, p_start,
          coalesce(p_format, 'doubles'), coalesce(p_max_players, 16))
  returning id into eid;
  insert into public.rr_event_players (event_id, user_id) values (eid, uid);
  return eid;
end $$;

create or replace function public.join_rr_event(p_event uuid)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); e public.rr_events%rowtype;
begin
  if not public.is_competitor(uid) then raise exception 'Turn on competitions in your profile (18+) to join.'; end if;
  select * into e from public.rr_events where id = p_event for update;
  if not found or e.status <> 'open' then raise exception 'This round robin isn’t taking players right now.'; end if;
  if e.host_id is not null and public.is_blocked_between(uid, e.host_id) then raise exception 'You can’t join this event.'; end if;
  if (select count(*) from public.rr_event_players where event_id = p_event) >= e.max_players then
    raise exception 'This round robin is full.';
  end if;
  insert into public.rr_event_players (event_id, user_id) values (p_event, uid) on conflict do nothing;
end $$;

create or replace function public.leave_rr_event(p_event uuid)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); e public.rr_events%rowtype;
begin
  select * into e from public.rr_events where id = p_event;
  if not found or e.status <> 'open' then raise exception 'You can only leave before the round robin starts.'; end if;
  if e.host_id = uid then raise exception 'You’re the host. Cancel the event instead.'; end if;
  delete from public.rr_event_players where event_id = p_event and user_id = uid;
end $$;

-- Builds every round up front. Each round, the players who have played the
-- fewest games so far go on court first (so sit-outs rotate), then the
-- order is shuffled so partners and opponents change.
create or replace function public.start_rr_event(p_event uuid, p_rounds integer)
returns void language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  e public.rr_events%rowtype;
  n integer; per_court integer; courts integer; r integer; c integer;
  players uuid[]; mid uuid;
begin
  select * into e from public.rr_events where id = p_event for update;
  if not found then raise exception 'Event not found.'; end if;
  if e.host_id is distinct from uid and not public.is_admin() then raise exception 'Only the host can start the round robin.'; end if;
  if e.status <> 'open' then raise exception 'This round robin has already started.'; end if;
  if p_rounds is null or p_rounds < 1 or p_rounds > 12 then raise exception 'Choose between 1 and 12 rounds.'; end if;
  per_court := case when e.format = 'doubles' then 4 else 2 end;
  select count(*) into n from public.rr_event_players where event_id = p_event;
  if n < per_court then raise exception 'You need at least % players to start.', per_court; end if;
  courts := n / per_court;

  for r in 1..p_rounds loop
    select array_agg(x.user_id order by x.played, x.shuffle) into players
      from (
        select ep.user_id,
               (select count(*) from public.match_players mp join public.matches m on m.id = mp.match_id
                 where m.event_id = p_event and mp.user_id = ep.user_id) as played,
               md5(ep.user_id::text || p_event::text || r::text || clock_timestamp()::text) as shuffle
          from public.rr_event_players ep where ep.event_id = p_event
      ) x;
    for c in 1..courts loop
      insert into public.matches (kind, format, event_id, round_no, court_no, location_id, played_on, status)
      values ('round_robin', e.format, p_event, r, c, e.location_id, e.event_date, 'scheduled')
      returning id into mid;
      if per_court = 4 then
        insert into public.match_players (match_id, user_id, team) values
          (mid, players[(c-1)*4+1], 'a'), (mid, players[(c-1)*4+4], 'a'),
          (mid, players[(c-1)*4+2], 'b'), (mid, players[(c-1)*4+3], 'b');
      else
        insert into public.match_players (match_id, user_id, team) values
          (mid, players[(c-1)*2+1], 'a'), (mid, players[(c-1)*2+2], 'b');
      end if;
    end loop;
  end loop;

  update public.rr_events set status = 'in_progress', rounds = p_rounds where id = p_event;
  perform public.notify_user(ep.user_id, 'The round robin "' || e.title || '" has started. See your courts and partners.',
                             '/compete/events/' || p_event)
     from public.rr_event_players ep where ep.event_id = p_event and ep.user_id <> uid;
end $$;

-- Host scores count right away; a player's score waits for the other team or the host.
create or replace function public.enter_rr_score(p_match uuid, p_score_a integer, p_score_b integer)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); m public.matches%rowtype; e public.rr_events%rowtype; is_host boolean;
begin
  select * into m from public.matches where id = p_match for update;
  if not found or m.kind <> 'round_robin' then raise exception 'Match not found.'; end if;
  select * into e from public.rr_events where id = m.event_id;
  if e.status <> 'in_progress' then raise exception 'This round robin isn’t in progress.'; end if;
  is_host := e.host_id = uid or public.is_admin();
  if not is_host and not exists (select 1 from public.match_players where match_id = p_match and user_id = uid) then
    raise exception 'Only players in this match or the host can enter the score.';
  end if;
  if m.status = 'confirmed' then raise exception 'This score is already final.'; end if;
  if p_score_a is null or p_score_b is null or p_score_a < 0 or p_score_b < 0
     or p_score_a > 99 or p_score_b > 99 or p_score_a = p_score_b then
    raise exception 'Please enter a final score (no ties).';
  end if;
  if is_host then
    update public.matches set score_a = p_score_a, score_b = p_score_b, status = 'confirmed',
           reported_by = coalesce(reported_by, uid), confirmed_by = uid, confirmed_at = now()
     where id = p_match;
    perform public.apply_match_result(p_match);
  else
    update public.matches set score_a = p_score_a, score_b = p_score_b, status = 'pending', reported_by = uid
     where id = p_match;
  end if;
end $$;

create or replace function public.rr_standings(p_event uuid)
returns table (user_id uuid, display_name text, avatar_url text, played integer, wins integer, losses integer,
               points_for integer, points_against integer, diff integer)
language sql stable security definer set search_path = public as $$
  with res as (
    select mp.user_id,
           case when mp.team = 'a' then m.score_a else m.score_b end as pf,
           case when mp.team = 'a' then m.score_b else m.score_a end as pa
      from public.matches m join public.match_players mp on mp.match_id = m.id
     where m.event_id = p_event and m.status = 'confirmed'
  )
  select ep.user_id, p.display_name, p.avatar_url,
         count(res.pf)::int,
         count(*) filter (where res.pf > res.pa)::int,
         count(*) filter (where res.pf < res.pa)::int,
         coalesce(sum(res.pf), 0)::int, coalesce(sum(res.pa), 0)::int,
         coalesce(sum(res.pf - res.pa), 0)::int
    from public.rr_event_players ep
    join public.profiles p on p.id = ep.user_id
    left join res on res.user_id = ep.user_id
   where ep.event_id = p_event
   group by ep.user_id, p.display_name, p.avatar_url
   order by 5 desc, 9 desc, 7 desc, p.display_name
$$;

create or replace function public.finish_rr_event(p_event uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); e public.rr_events%rowtype; w uuid;
begin
  select * into e from public.rr_events where id = p_event for update;
  if not found then raise exception 'Event not found.'; end if;
  if e.host_id is distinct from uid and not public.is_admin() then raise exception 'Only the host can finish the round robin.'; end if;
  if e.status <> 'in_progress' then raise exception 'This round robin isn’t in progress.'; end if;
  update public.matches set status = 'cancelled' where event_id = p_event and status in ('scheduled','pending','disputed');
  select s.user_id into w from public.rr_standings(p_event) s where s.wins > 0 limit 1;
  update public.rr_events set status = 'completed', winner_id = w where id = p_event;
  perform public.notify_user(ep.user_id,
            case when w is null then 'The round robin "' || e.title || '" is finished.'
                 else public.player_name(w) || ' won the round robin "' || e.title || '"! 🏆' end,
            '/compete/events/' || p_event)
     from public.rr_event_players ep where ep.event_id = p_event and ep.user_id <> uid;
  return w;
end $$;

create or replace function public.cancel_rr_event(p_event uuid)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); e public.rr_events%rowtype;
begin
  select * into e from public.rr_events where id = p_event for update;
  if not found then raise exception 'Event not found.'; end if;
  if e.host_id is distinct from uid and not public.is_admin() then raise exception 'Only the host can cancel.'; end if;
  if e.status not in ('open','in_progress') then raise exception 'This round robin is already over.'; end if;
  update public.matches set status = 'cancelled' where event_id = p_event and status in ('scheduled','pending','disputed');
  update public.rr_events set status = 'cancelled' where id = p_event;
  perform public.notify_user(ep.user_id, 'The round robin "' || e.title || '" was cancelled.', '/compete/events/' || p_event)
     from public.rr_event_players ep where ep.event_id = p_event and ep.user_id <> uid;
end $$;

-- ---------------------------------------------------------------------
-- Ladders
-- ---------------------------------------------------------------------
create or replace function public.create_ladder(
  p_name text, p_description text, p_location_id uuid, p_skill text, p_ends_on date
) returns uuid language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); lid uuid; today date := public.evanston_now()::date;
begin
  if not public.is_competitor(uid) then raise exception 'Turn on competitions in your profile (18+) to start a ladder.'; end if;
  if p_ends_on is not null and (p_ends_on <= today or p_ends_on > today + 366) then
    raise exception 'Pick an end date within the next year.';
  end if;
  if (select count(*) from public.ladders where organizer_id = uid and status = 'active') >= 3 then
    raise exception 'You already run 3 active ladders.';
  end if;
  insert into public.ladders (organizer_id, name, description, location_id, skill_level, ends_on)
  values (uid, trim(p_name), nullif(trim(coalesce(p_description, '')), ''), p_location_id, coalesce(p_skill, 'all'), p_ends_on)
  returning id into lid;
  insert into public.ladder_entries (ladder_id, user_id, position) values (lid, uid, 1);
  return lid;
end $$;

create or replace function public.join_ladder(p_ladder uuid)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); l public.ladders%rowtype;
begin
  if not public.is_competitor(uid) then raise exception 'Turn on competitions in your profile (18+) to join.'; end if;
  select * into l from public.ladders where id = p_ladder for update;
  if not found or l.status <> 'active' then raise exception 'This ladder is closed.'; end if;
  if (select count(*) from public.ladder_entries where ladder_id = p_ladder) >= 64 then raise exception 'This ladder is full.'; end if;
  insert into public.ladder_entries (ladder_id, user_id, position)
  values (p_ladder, uid, coalesce((select max(position) from public.ladder_entries where ladder_id = p_ladder), 0) + 1)
  on conflict (ladder_id, user_id) do nothing;
end $$;

create or replace function public.leave_ladder(p_ladder uuid)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); pos integer;
begin
  perform 1 from public.ladders where id = p_ladder for update;
  delete from public.ladder_entries where ladder_id = p_ladder and user_id = uid returning position into pos;
  if pos is null then return; end if;
  update public.ladder_entries set position = position - 1 where ladder_id = p_ladder and position > pos;
  update public.ladder_challenges set status = 'cancelled'
   where ladder_id = p_ladder and status in ('pending','accepted') and (challenger_id = uid or opponent_id = uid);
end $$;

-- You can challenge anyone up to 3 spots above you.
create or replace function public.challenge_player(p_ladder uuid, p_opponent uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); l public.ladders%rowtype; my_pos integer; their_pos integer; cid uuid;
begin
  if not public.is_competitor(uid) then raise exception 'Turn on competitions in your profile (18+).'; end if;
  select * into l from public.ladders where id = p_ladder;
  if not found or l.status <> 'active' then raise exception 'This ladder is closed.'; end if;
  select count(*) + 1 into my_pos from public.ladder_entries e
   where e.ladder_id = p_ladder and e.position < (select position from public.ladder_entries where ladder_id = p_ladder and user_id = uid);
  select count(*) + 1 into their_pos from public.ladder_entries e
   where e.ladder_id = p_ladder and e.position < (select position from public.ladder_entries where ladder_id = p_ladder and user_id = p_opponent);
  if not exists (select 1 from public.ladder_entries where ladder_id = p_ladder and user_id = uid)
     or not exists (select 1 from public.ladder_entries where ladder_id = p_ladder and user_id = p_opponent) then
    raise exception 'You both need to be on this ladder.';
  end if;
  if their_pos >= my_pos or my_pos - their_pos > 3 then raise exception 'You can challenge players up to 3 spots above you.'; end if;
  if public.is_blocked_between(uid, p_opponent) then raise exception 'You can’t challenge that player.'; end if;
  if exists (select 1 from public.ladder_challenges where ladder_id = p_ladder and status in ('pending','accepted')
               and ((challenger_id = uid and opponent_id = p_opponent) or (challenger_id = p_opponent and opponent_id = uid))) then
    raise exception 'You already have an open challenge with this player.';
  end if;
  if (select count(*) from public.ladder_challenges where challenger_id = uid and ladder_id = p_ladder and status in ('pending','accepted')) >= 2 then
    raise exception 'You can have 2 open challenges at a time.';
  end if;
  insert into public.ladder_challenges (ladder_id, challenger_id, opponent_id) values (p_ladder, uid, p_opponent)
  returning id into cid;
  perform public.notify_user(p_opponent, public.player_name(uid) || ' challenged you on the ladder "' || l.name || '".',
                             '/compete/ladders/' || p_ladder);
  return cid;
end $$;

create or replace function public.respond_challenge(p_challenge uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); c public.ladder_challenges%rowtype;
begin
  select * into c from public.ladder_challenges where id = p_challenge for update;
  if not found or c.opponent_id <> uid or c.status <> 'pending' then raise exception 'This challenge can’t be answered.'; end if;
  update public.ladder_challenges set status = case when p_accept then 'accepted' else 'declined' end, responded_at = now()
   where id = p_challenge;
  perform public.notify_user(c.challenger_id, public.player_name(uid)
    || case when p_accept then ' accepted your ladder challenge. Set up a time to play!' else ' declined your ladder challenge.' end,
    '/compete/ladders/' || c.ladder_id);
end $$;

create or replace function public.cancel_challenge(p_challenge uuid)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); c public.ladder_challenges%rowtype;
begin
  select * into c from public.ladder_challenges where id = p_challenge for update;
  if not found or c.status not in ('pending','accepted') or uid not in (c.challenger_id, c.opponent_id) then
    raise exception 'This challenge can’t be cancelled.';
  end if;
  if c.match_id is not null and exists (select 1 from public.matches where id = c.match_id and status = 'pending') then
    raise exception 'A score is waiting to be confirmed for this challenge.';
  end if;
  update public.ladder_challenges set status = 'cancelled' where id = p_challenge;
end $$;

-- Either player reports the challenge result; the other confirms it.
create or replace function public.report_ladder_match(p_challenge uuid, p_my_score integer, p_their_score integer)
returns uuid language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); c public.ladder_challenges%rowtype; other uuid; mid uuid; l public.ladders%rowtype;
begin
  select * into c from public.ladder_challenges where id = p_challenge for update;
  if not found or uid not in (c.challenger_id, c.opponent_id) then raise exception 'Challenge not found.'; end if;
  if c.status <> 'accepted' then raise exception 'The challenge needs to be accepted first.'; end if;
  if c.match_id is not null and exists (select 1 from public.matches where id = c.match_id and status in ('pending','confirmed')) then
    raise exception 'A score was already reported for this challenge.';
  end if;
  if p_my_score is null or p_their_score is null or p_my_score < 0 or p_their_score < 0
     or p_my_score > 99 or p_their_score > 99 or p_my_score = p_their_score then
    raise exception 'Please enter a final score (no ties).';
  end if;
  select * into l from public.ladders where id = c.ladder_id;
  other := case when uid = c.challenger_id then c.opponent_id else c.challenger_id end;
  insert into public.matches (kind, format, ladder_id, challenge_id, location_id, played_on, score_a, score_b, status, reported_by)
  values ('ladder', 'singles', c.ladder_id, c.id, l.location_id, public.evanston_now()::date, p_my_score, p_their_score, 'pending', uid)
  returning id into mid;
  insert into public.match_players (match_id, user_id, team) values (mid, uid, 'a'), (mid, other, 'b');
  update public.ladder_challenges set match_id = mid where id = c.id;
  perform public.notify_user(other, public.player_name(uid) || ' reported your ladder match: ' || p_their_score || '–' || p_my_score
    || ' (your score first). Please confirm it.', '/compete/ladders/' || c.ladder_id);
  return mid;
end $$;

create or replace function public.close_ladder(p_ladder uuid)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); l public.ladders%rowtype;
begin
  select * into l from public.ladders where id = p_ladder for update;
  if not found then raise exception 'Ladder not found.'; end if;
  if l.organizer_id is distinct from uid and not public.is_admin() then raise exception 'Only the organizer can close the ladder.'; end if;
  update public.ladders set status = 'closed' where id = p_ladder;
  update public.ladder_challenges set status = 'cancelled' where ladder_id = p_ladder and status in ('pending','accepted');
end $$;

create or replace function public.ladder_standings(p_ladder uuid)
returns table (rank integer, user_id uuid, display_name text, avatar_url text, wins integer, losses integer)
language sql stable security definer set search_path = public as $$
  select (row_number() over (order by e.position))::int, e.user_id, p.display_name, p.avatar_url,
         (select count(*) from public.matches m join public.match_players mp on mp.match_id = m.id
           where m.ladder_id = p_ladder and m.status = 'confirmed' and mp.user_id = e.user_id
             and ((mp.team = 'a') = (m.score_a > m.score_b)))::int,
         (select count(*) from public.matches m join public.match_players mp on mp.match_id = m.id
           where m.ladder_id = p_ladder and m.status = 'confirmed' and mp.user_id = e.user_id
             and ((mp.team = 'a') <> (m.score_a > m.score_b)))::int
    from public.ladder_entries e join public.profiles p on p.id = e.user_id
   where e.ladder_id = p_ladder
   order by e.position
$$;

-- ---------------------------------------------------------------------
-- Top Players and Champion of the Month (opted-in adults only)
-- ---------------------------------------------------------------------
create or replace function public.top_players(p_skill text default null, p_limit integer default 50)
returns table (rank integer, user_id uuid, display_name text, avatar_url text, skill_level text,
               rating integer, wins integer, losses integer, matches integer)
language sql stable security definer set search_path = public as $$
  select (row_number() over (order by r.rating desc, r.wins desc, p.display_name))::int,
         p.id, p.display_name, p.avatar_url, p.skill_level, r.rating, r.wins, r.losses, r.matches
    from public.player_ratings r join public.profiles p on p.id = r.user_id
   where p.show_on_leaderboards and public.is_competitor(p.id) and r.matches >= 3
     and (p_skill is null or p.skill_level = p_skill)
   order by r.rating desc, r.wins desc, p.display_name
   limit least(greatest(coalesce(p_limit, 50), 1), 100)
$$;

create or replace function public.most_active(p_month date default null, p_limit integer default 10)
returns table (user_id uuid, display_name text, avatar_url text, games integer, wins integer)
language sql stable security definer set search_path = public as $$
  with bounds as (
    select date_trunc('month', coalesce(p_month, public.evanston_now()::date))::date as month_start
  )
  select p.id, p.display_name, p.avatar_url, count(*)::int,
         count(*) filter (where (mp.team = 'a') = (m.score_a > m.score_b))::int
    from public.matches m
    join public.match_players mp on mp.match_id = m.id
    join public.profiles p on p.id = mp.user_id
    cross join bounds b
   where m.status = 'confirmed' and m.played_on >= b.month_start and m.played_on < (b.month_start + interval '1 month')
     and p.show_on_leaderboards and public.is_competitor(p.id)
   group by p.id, p.display_name, p.avatar_url
   order by 4 desc, 5 desc, p.display_name
   limit least(greatest(coalesce(p_limit, 10), 1), 50)
$$;

-- Most confirmed wins in the month; ties go to more games, then rating.
create or replace function public.champion_of_month(p_month date default null)
returns table (user_id uuid, display_name text, avatar_url text, skill_level text, wins integer, games integer, month date)
language sql stable security definer set search_path = public as $$
  with bounds as (
    select date_trunc('month', coalesce(p_month, (public.evanston_now() - interval '1 month')::date))::date as month_start
  ), stats as (
    select mp.user_id, count(*)::int as games,
           count(*) filter (where (mp.team = 'a') = (m.score_a > m.score_b))::int as wins
      from public.matches m join public.match_players mp on mp.match_id = m.id cross join bounds b
     where m.status = 'confirmed' and m.played_on >= b.month_start and m.played_on < (b.month_start + interval '1 month')
     group by mp.user_id
  )
  select p.id, p.display_name, p.avatar_url, p.skill_level, st.wins, st.games, b.month_start
    from stats st join public.profiles p on p.id = st.user_id
    cross join bounds b
    left join public.player_ratings r on r.user_id = st.user_id
   where st.wins > 0 and p.show_on_leaderboards and public.is_competitor(p.id)
   order by st.wins desc, st.games desc, r.rating desc nulls last
   limit 1
$$;

create or replace function public.my_competition_stats()
returns table (rating integer, wins integer, losses integer, matches integer)
language sql stable security definer set search_path = public as $$
  select r.rating, r.wins, r.losses, r.matches from public.player_ratings r where r.user_id = auth.uid()
$$;

-- ---------------------------------------------------------------------
-- Row-level security: everything is read-only through the API;
-- changes go through the functions above.
-- ---------------------------------------------------------------------
alter table public.player_ratings enable row level security;
alter table public.rr_events enable row level security;
alter table public.rr_event_players enable row level security;
alter table public.ladders enable row level security;
alter table public.ladder_entries enable row level security;
alter table public.ladder_challenges enable row level security;
alter table public.matches enable row level security;
alter table public.match_players enable row level security;

create policy "ratings own or admin" on public.player_ratings for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy "rr events readable" on public.rr_events for select using (true);
create policy "rr players readable" on public.rr_event_players for select using (true);
create policy "ladders readable" on public.ladders for select using (true);
create policy "ladder entries readable" on public.ladder_entries for select using (true);
create policy "challenges readable" on public.ladder_challenges for select using (true);
create policy "matches visible" on public.matches for select using (public.can_see_match(id));
create policy "match players visible" on public.match_players for select using (public.can_see_match(match_id));

-- ---------------------------------------------------------------------
-- Function access
-- ---------------------------------------------------------------------
revoke execute on function public.is_competitor(uuid) from public, anon, authenticated;
revoke execute on function public.notify_user(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.player_name(uuid) from public, anon, authenticated;
revoke execute on function public.apply_match_result(uuid) from public, anon, authenticated;
revoke execute on function public.can_confirm_match(uuid, uuid) from public, anon, authenticated;

-- Signed-in actions (each checks the caller).
revoke execute on function public.set_competition_settings(boolean, boolean) from public, anon;
revoke execute on function public.report_match(text, uuid, uuid[], integer, integer, date, uuid) from public, anon;
revoke execute on function public.confirm_match(uuid) from public, anon;
revoke execute on function public.dispute_match(uuid) from public, anon;
revoke execute on function public.withdraw_match(uuid) from public, anon;
revoke execute on function public.search_competitors(text) from public, anon;
revoke execute on function public.create_rr_event(text, text, uuid, date, time, text, integer) from public, anon;
revoke execute on function public.join_rr_event(uuid) from public, anon;
revoke execute on function public.leave_rr_event(uuid) from public, anon;
revoke execute on function public.start_rr_event(uuid, integer) from public, anon;
revoke execute on function public.enter_rr_score(uuid, integer, integer) from public, anon;
revoke execute on function public.finish_rr_event(uuid) from public, anon;
revoke execute on function public.cancel_rr_event(uuid) from public, anon;
revoke execute on function public.create_ladder(text, text, uuid, text, date) from public, anon;
revoke execute on function public.join_ladder(uuid) from public, anon;
revoke execute on function public.leave_ladder(uuid) from public, anon;
revoke execute on function public.challenge_player(uuid, uuid) from public, anon;
revoke execute on function public.respond_challenge(uuid, boolean) from public, anon;
revoke execute on function public.cancel_challenge(uuid) from public, anon;
revoke execute on function public.report_ladder_match(uuid, integer, integer) from public, anon;
revoke execute on function public.close_ladder(uuid) from public, anon;
revoke execute on function public.my_competition_stats() from public, anon;
grant execute on function public.set_competition_settings(boolean, boolean), public.report_match(text, uuid, uuid[], integer, integer, date, uuid),
  public.confirm_match(uuid), public.dispute_match(uuid), public.withdraw_match(uuid), public.search_competitors(text),
  public.create_rr_event(text, text, uuid, date, time, text, integer), public.join_rr_event(uuid), public.leave_rr_event(uuid),
  public.start_rr_event(uuid, integer), public.enter_rr_score(uuid, integer, integer), public.finish_rr_event(uuid),
  public.cancel_rr_event(uuid), public.create_ladder(text, text, uuid, text, date), public.join_ladder(uuid),
  public.leave_ladder(uuid), public.challenge_player(uuid, uuid), public.respond_challenge(uuid, boolean),
  public.cancel_challenge(uuid), public.report_ladder_match(uuid, integer, integer), public.close_ladder(uuid),
  public.my_competition_stats()
  to authenticated;

-- Public read functions (opted-in players and public events only).
grant execute on function public.can_see_match(uuid), public.match_summaries(uuid, uuid, boolean, integer),
  public.rr_standings(uuid), public.ladder_standings(uuid), public.top_players(text, integer),
  public.most_active(date, integer), public.champion_of_month(date)
  to anon, authenticated;
