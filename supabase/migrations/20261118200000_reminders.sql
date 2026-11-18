-- =====================================================================
-- Evanston Dinks: optional automatic game reminders
--   * Players opt in on their Profile and pick how early (30 min – 1 day).
--   * Every 5 minutes pg_cron finds games (and round robins) starting soon
--     for players who opted in, adds an in-app notification, and asks the
--     website to send a phone notification (Web Push) to their devices.
-- =====================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

alter table public.account_settings add column if not exists game_reminders boolean not null default false;
alter table public.account_settings add column if not exists reminder_minutes integer not null default 60
  check (reminder_minutes in (30, 60, 120, 1440));

alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('game_cancelled','game_removed','system','competition','reminder'));

-- Phone/browser push subscriptions (one per device).
create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  endpoint    text not null unique check (endpoint like 'https://%' and char_length(endpoint) <= 1000),
  p256dh      text not null check (char_length(p256dh) <= 200),
  auth        text not null check (char_length(auth) <= 100),
  created_at  timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);
alter table public.push_subscriptions enable row level security;
create policy "push own read" on public.push_subscriptions for select to authenticated using (user_id = auth.uid());
create policy "push own insert" on public.push_subscriptions for insert to authenticated with check (user_id = auth.uid());
create policy "push own delete" on public.push_subscriptions for delete to authenticated using (user_id = auth.uid());

-- One reminder per player per game/event.
create table if not exists public.reminder_log (
  kind     text not null check (kind in ('game','round_robin')),
  ref_id   uuid not null,
  user_id  uuid not null references auth.users(id) on delete cascade,
  sent_at  timestamptz not null default now(),
  primary key (kind, ref_id, user_id)
);
alter table public.reminder_log enable row level security;  -- no policies: internal only

create or replace function public.friendly_when(d date, t time)
returns text language sql stable set search_path = public as $$
  select case
           when d = public.evanston_now()::date then 'today'
           when d = public.evanston_now()::date + 1 then 'tomorrow'
           else to_char(d, 'FMDay, FMMonth FMDD')
         end || ' at ' || to_char(t, 'FMHH12:MI AM')
$$;

-- Finds due reminders, records them, adds in-app notifications and hands
-- push messages to the website. Runs from pg_cron only.
create or replace function public.send_game_reminders()
returns integer language plpgsql security definer set search_path = public as $$
declare
  now_local timestamp := public.evanston_now();
  msgs jsonb := '[]'::jsonb;
  r record;
  n integer := 0;
  secret text;
begin
  for r in
    -- Community games the player hosts or joined
    select 'game'::text as kind, g.id as ref_id, gp.user_id,
           g.title || ' at ' || l.name || ' starts ' || public.friendly_when(g.game_date, g.start_time) || '.' as body,
           '/games/' || g.id as link, g.id as game_id
      from public.community_games g
      join public.locations l on l.id = g.location_id
      join public.community_game_players gp on gp.game_id = g.id
      join public.account_settings s on s.user_id = gp.user_id
     where g.status = 'scheduled'
       and s.game_reminders
       and (g.game_date + g.start_time) > now_local
       and (g.game_date + g.start_time) <= now_local + make_interval(mins => s.reminder_minutes)
       and not exists (select 1 from public.reminder_log rl where rl.kind = 'game' and rl.ref_id = g.id and rl.user_id = gp.user_id)
    union all
    -- Round robins the player joined
    select 'round_robin', e.id, ep.user_id,
           e.title || coalesce(' at ' || l.name, '') || ' starts ' || public.friendly_when(e.event_date, e.start_time) || '.',
           '/compete/events/' || e.id, null::uuid
      from public.rr_events e
      left join public.locations l on l.id = e.location_id
      join public.rr_event_players ep on ep.event_id = e.id
      join public.account_settings s on s.user_id = ep.user_id
     where e.status in ('open','in_progress')
       and s.game_reminders
       and (e.event_date + e.start_time) > now_local
       and (e.event_date + e.start_time) <= now_local + make_interval(mins => s.reminder_minutes)
       and not exists (select 1 from public.reminder_log rl where rl.kind = 'round_robin' and rl.ref_id = e.id and rl.user_id = ep.user_id)
  loop
    insert into public.reminder_log (kind, ref_id, user_id) values (r.kind, r.ref_id, r.user_id) on conflict do nothing;
    insert into public.notifications (user_id, kind, game_id, message, link)
    values (r.user_id, 'reminder', r.game_id, left('⏰ Reminder: ' || r.body, 300), r.link);
    msgs := msgs || coalesce((
      select jsonb_agg(jsonb_build_object('endpoint', ps.endpoint, 'p256dh', ps.p256dh, 'auth', ps.auth,
                                          'title', 'Game reminder 🏓', 'body', r.body, 'url', r.link))
        from public.push_subscriptions ps where ps.user_id = r.user_id), '[]'::jsonb);
    n := n + 1;
  end loop;

  if jsonb_array_length(msgs) > 0 then
    select decrypted_secret into secret from vault.decrypted_secrets where name = 'reminders_push_secret' limit 1;
    if secret is not null then
      perform net.http_post(
        url := 'https://www.evanstondinks.app/reminders/push',
        body := jsonb_build_object('messages', msgs),
        headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || secret),
        timeout_milliseconds := 10000
      );
    end if;
  end if;
  return n;
end $$;

-- The website reports devices that no longer accept notifications.
create or replace function public.prune_push_subscriptions(p_secret text, p_endpoints text[])
returns integer language plpgsql security definer set search_path = public as $$
declare secret text; n integer;
begin
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'reminders_push_secret' limit 1;
  if secret is null or p_secret is distinct from secret then raise exception 'Not allowed.'; end if;
  delete from public.push_subscriptions where endpoint = any(p_endpoints);
  get diagnostics n = row_count;
  return n;
end $$;

-- Saves a device for push notifications (re-registering moves it to the caller).
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Please sign in first.'; end if;
  if (select count(*) from public.push_subscriptions where user_id = auth.uid()) >= 10 then
    delete from public.push_subscriptions where id = (
      select id from public.push_subscriptions where user_id = auth.uid() order by created_at limit 1);
  end if;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth)
  on conflict (endpoint) do update set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth;
end $$;

revoke execute on function public.send_game_reminders() from public, anon, authenticated;
revoke execute on function public.friendly_when(date, time) from public, anon, authenticated;
revoke execute on function public.save_push_subscription(text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text) to authenticated;
grant execute on function public.prune_push_subscriptions(text, text[]) to anon, authenticated;

-- Every 5 minutes.
select cron.unschedule('game-reminders') where exists (select 1 from cron.job where jobname = 'game-reminders');
select cron.schedule('game-reminders', '*/5 * * * *', 'select public.send_game_reminders()');
