-- Behavior tests for the Evanston Dinks migration.
-- Runs against plain Postgres with a stubbed `auth` schema (see README in
-- this folder). Each line prints the outcome of one scenario.
\set QUIET on
\pset format unaligned
\pset tuples_only on

create or replace function pg_temp.try(q text) returns text language plpgsql as $$
begin execute q; return 'OK';
exception when others then return 'ERR: ' || sqlerrm; end $$;

create or replace function pg_temp.as_user(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', coalesce(uid::text, ''), false) $$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'host@example.com', '{"full_name":"Ana Host","picture":"https://x/a.png"}'),
  ('00000000-0000-0000-0000-00000000000b', 'bob@example.com',  '{}'),
  ('00000000-0000-0000-0000-00000000000c', 'cy@example.com',   '{"given_name":"Cy"}'),
  ('00000000-0000-0000-0000-0000000000ad', 'admin@example.com','{"name":"Ada Admin"}');
insert into public.admins values ('00000000-0000-0000-0000-0000000000ad');

select 'profiles: ' || string_agg(display_name, ', ' order by display_name) from public.profiles;

create temp table ids as
select (select id from public.locations where slug='james-park')         as james,
       (select id from public.locations where slug='lovelace-park')      as lovelace,
       (select id from public.locations where slug='chandler-newberger') as chandler,
       (select id from public.locations where slug='robert-crown')       as crown,
       (public.evanston_now()::date + 1)                                 as tmrw;
grant select on ids to authenticated;

set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');

select '01 create before terms -> ' || pg_temp.try(format(
  $q$insert into community_games (host_id, location_id, title, game_date, start_time, end_time, skill_level, game_type, max_players, court_status)
     values (auth.uid(), %L, 'Morning dinks', %L, '09:00', '11:00', 'all', 'casual', 4, 'first_come')$q$,
  (select james from ids), (select tmrw from ids)));

select public.accept_terms('2026-11-17');

select '02 non-lighted 8-9:30pm -> ' || pg_temp.try(format(
  $q$insert into community_games (host_id, location_id, title, game_date, start_time, end_time, skill_level, game_type, max_players, court_status)
     values (auth.uid(), %L, 'Late game', %L, '20:00', '21:30', 'all', 'casual', 4, 'first_come')$q$,
  (select lovelace from ids), (select tmrw from ids)));

select '03 non-lighted 6:30am -> ' || pg_temp.try(format(
  $q$insert into community_games (host_id, location_id, title, game_date, start_time, end_time, skill_level, game_type, max_players, court_status)
     values (auth.uid(), %L, 'Early game', %L, '06:30', '08:00', 'all', 'casual', 4, 'first_come')$q$,
  (select lovelace from ids), (select tmrw from ids)));

select '04 lighted 8-10pm -> ' || pg_temp.try(format(
  $q$insert into community_games (host_id, location_id, title, game_date, start_time, end_time, skill_level, game_type, max_players, court_status)
     values (auth.uid(), %L, 'Night dinks', %L, '20:00', '22:00', 'intermediate', 'competitive', 2, 'first_come')$q$,
  (select james from ids), (select tmrw from ids)));

select '05 lighted until 10:15pm -> ' || pg_temp.try(format(
  $q$insert into community_games (host_id, location_id, title, game_date, start_time, end_time, skill_level, game_type, max_players, court_status)
     values (auth.uid(), %L, 'Too late', %L, '21:00', '22:15', 'all', 'casual', 4, 'first_come')$q$,
  (select james from ids), (select tmrw from ids)));

select '06 in the past -> ' || pg_temp.try(format(
  $q$insert into community_games (host_id, location_id, title, game_date, start_time, end_time, skill_level, game_type, max_players, court_status)
     values (auth.uid(), %L, 'Yesterday', %L, '09:00', '10:00', 'all', 'casual', 4, 'first_come')$q$,
  (select james from ids), (select tmrw - 2 from ids)));

select '07 location without hours -> ' || pg_temp.try(format(
  $q$insert into community_games (host_id, location_id, title, game_date, start_time, end_time, skill_level, game_type, max_players, court_status)
     values (auth.uid(), %L, 'Rental', %L, '10:00', '11:00', 'all', 'casual', 4, 'other')$q$,
  (select chandler from ids), (select tmrw from ids)));

select '08 reserved without confirmation -> ' || pg_temp.try(format(
  $q$insert into community_games (host_id, location_id, title, game_date, start_time, end_time, skill_level, game_type, max_players, court_status)
     values (auth.uid(), %L, 'Reserved', %L, '10:00', '11:00', 'all', 'casual', 4, 'reserved')$q$,
  (select james from ids), (select tmrw from ids)));

select '09 drop-in at outdoor court -> ' || pg_temp.try(format(
  $q$insert into community_games (host_id, location_id, title, game_date, start_time, end_time, skill_level, game_type, max_players, court_status)
     values (auth.uid(), %L, 'Dropin', %L, '10:00', '11:00', 'all', 'casual', 4, 'drop_in')$q$,
  (select james from ids), (select tmrw from ids)));

select '10 indoor drop-in at Crown -> ' || pg_temp.try(format(
  $q$insert into community_games (host_id, location_id, title, game_date, start_time, end_time, skill_level, game_type, max_players, court_status, is_free, fee_note)
     values (auth.uid(), %L, 'Crown open gym', %L, '10:00', '12:00', 'all', 'open_play', 8, 'drop_in', false, '$5 at front desk')$q$,
  (select crown from ids), (select tmrw from ids)));

select '11 someone else as host -> ' || pg_temp.try(format(
  $q$insert into community_games (host_id, location_id, title, game_date, start_time, end_time, skill_level, game_type, max_players, court_status)
     values ('00000000-0000-0000-0000-00000000000b', %L, 'Spoof', %L, '10:00', '11:00', 'all', 'casual', 4, 'first_come')$q$,
  (select james from ids), (select tmrw from ids)));

select '12 host counted as player -> ' || player_count from community_games_view where title = 'Night dinks';

-- Joining
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select public.accept_terms('2026-11-17');
select '13 B joins -> ' || pg_temp.try(format($q$insert into community_game_players (game_id, user_id) values (%L, auth.uid())$q$,
  (select id from community_games where title='Night dinks')));
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select '14 C joins without terms -> ' || pg_temp.try(format($q$insert into community_game_players (game_id, user_id) values (%L, auth.uid())$q$,
  (select id from community_games where title='Night dinks')));
select public.accept_terms('2026-11-17');
select '15 C joins full game -> ' || pg_temp.try(format($q$insert into community_game_players (game_id, user_id) values (%L, auth.uid())$q$,
  (select id from community_games where title='Night dinks')));
select '16 C joins as B (spoof) -> ' || pg_temp.try(format($q$insert into community_game_players (game_id, user_id) values (%L, '00000000-0000-0000-0000-00000000000b')$q$,
  (select id from community_games where title='Crown open gym')));

-- Leaving
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select '17 host leaves own game -> ' || pg_temp.try(format($q$delete from community_game_players where game_id = %L and user_id = auth.uid()$q$,
  (select id from community_games where title='Night dinks')));
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select '18 B leaves -> ' || pg_temp.try(format($q$delete from community_game_players where game_id = %L and user_id = auth.uid()$q$,
  (select id from community_games where title='Night dinks')));
select '19 B rejoins -> ' || pg_temp.try(format($q$insert into community_game_players (game_id, user_id) values (%L, auth.uid())$q$,
  (select id from community_games where title='Night dinks')));

-- Blocking
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select '20 A blocks C -> ' || pg_temp.try($q$insert into user_blocks (blocker_id, blocked_id) values (auth.uid(), '00000000-0000-0000-0000-00000000000c')$q$);
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select '21 C joins A''s game after block -> ' || pg_temp.try(format($q$insert into community_game_players (game_id, user_id) values (%L, auth.uid())$q$,
  (select id from community_games where title='Crown open gym')));
select '22 C sees A''s blocks -> ' || count(*) from user_blocks;

-- Direct tampering
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select '23 B edits A''s game directly -> rows changed: ' || pg_temp.try(format($q$update community_games set title='hacked' where id = %L$q$,
  (select id from community_games where title='Night dinks'))) || ' / title now ' || (select title from community_games where start_time='20:00');
select '24 B sets terms timestamp directly -> ' || pg_temp.try($q$update account_settings set terms_accepted_at = now() - interval '1 year'$q$);
select '25 B opts into email -> ' || pg_temp.try($q$update account_settings set email_notifications = true$q$);
select '26 B cancels A''s game -> ' || pg_temp.try(format($q$select cancel_game(%L, 'weather')$q$,
  (select id from community_games where title='Night dinks')));
select '27 B admin stats -> ' || pg_temp.try($q$select admin_stats()$q$);
select '28 B sees admins table rows -> ' || count(*) from admins;

-- Reports
select '29 B reports game -> ' || pg_temp.try(format($q$insert into reports (target_type, game_id, category, details) values ('game', %L, 'reservation_misrepresentation', 'Says reserved but no permit')$q$,
  (select id from community_games where title='Night dinks')));
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select '30 C sees B''s report -> ' || count(*) from reports;

-- Closures (admin)
select pg_temp.as_user('00000000-0000-0000-0000-0000000000ad');
select '31 admin adds outdoor closure -> ' || pg_temp.try(format($q$insert into location_closures (setting, starts_on, ends_on, reason) values ('outdoor', %L, %L, 'Courts closed for winter maintenance')$q$,
  (select tmrw from ids), (select tmrw from ids)));
select '32 check James tomorrow -> ' || coalesce(check_game_time((select james from ids), (select tmrw from ids), '09:00', '10:00'), 'allowed');
select '33 check Crown tomorrow -> ' || coalesce(check_game_time((select crown from ids), (select tmrw from ids), '09:00', '10:00'), 'allowed');
select '34 admin stats -> ' || admin_stats()::text;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select '35 non-admin edits location -> ' || pg_temp.try($q$update locations set name = 'x' where slug = 'james-park'$q$)
  || ' / name now ' || (select name from locations where slug='james-park');

-- Cancel with notification
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select '36 host cancels -> ' || pg_temp.try(format($q$select cancel_game(%L, 'weather', 'Rain')$q$,
  (select id from community_games where title='Night dinks')));
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select '37 B notification -> ' || message from notifications;
select '38 B joins canceled game -> ' || pg_temp.try(format($q$insert into community_game_players (game_id, user_id) values (%L, auth.uid())$q$,
  (select id from community_games where title='Night dinks')));

-- Anonymous browsing
select pg_temp.as_user(null);
reset role; set role anon;
select '39 anon sees games in view -> ' || count(*) from community_games_view;
select '40 anon reads settings -> ' || pg_temp.try('select * from account_settings');
select '41 anon check_game_time -> ' || coalesce(check_game_time((select id from locations where slug='lovelace-park'), current_date + 3, '20:30', '21:30'), 'allowed');

-- Account deletion
reset role; set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select '42 B joins Crown game -> ' || pg_temp.try(format($q$insert into community_game_players (game_id, user_id) values (%L, auth.uid())$q$,
  (select id from community_games where title='Crown open gym')));
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select '43 A deletes account -> ' || pg_temp.try('select delete_my_account()');
reset role;
select '44 A remaining rows: users=' || (select count(*) from auth.users where email='host@example.com')
  || ' profiles=' || (select count(*) from profiles where display_name='Ana')
  || ' games=' || (select count(*) from community_games)
  || ' blocks=' || (select count(*) from user_blocks)
  || ' reports kept=' || (select count(*) from reports);
select '45 B notifications -> ' || string_agg(message, ' | ' order by created_at) from notifications
  where user_id = '00000000-0000-0000-0000-00000000000b';
