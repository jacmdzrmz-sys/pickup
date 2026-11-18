-- Competition flow test. Run after auth_stub.sql and all migrations.
\set ON_ERROR_STOP 1
begin;

-- Six players, all accepted terms; five confirm 18+.
insert into auth.users (id, raw_user_meta_data) values
 ('00000000-0000-0000-0000-000000000001', '{"given_name":"Ana"}'),
 ('00000000-0000-0000-0000-000000000002', '{"given_name":"Ben"}'),
 ('00000000-0000-0000-0000-000000000003', '{"given_name":"Cy"}'),
 ('00000000-0000-0000-0000-000000000004', '{"given_name":"Dee"}'),
 ('00000000-0000-0000-0000-000000000005', '{"given_name":"Eli"}'),
 ('00000000-0000-0000-0000-000000000006', '{"given_name":"Kid"}');
update public.account_settings set terms_accepted_at = now(), terms_version = 't';

create or replace function pg_temp.as_user(n int) returns void language sql as $$
  select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000' || n, true), null::void
$$;

set local role authenticated;
do $$ begin
  for i in 1..5 loop
    perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000' || i, true);
    perform public.set_competition_settings(true, true);
  end loop;
end $$;

-- 1. Casual doubles: Ana+Ben beat Cy+Dee 11-7
select pg_temp.as_user(1);
select public.report_match('doubles', '00000000-0000-0000-0000-000000000002',
  array['00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000004']::uuid[], 11, 7) as m1 \gset

-- Kid (no 18+) can't be included
do $$ begin
  perform public.report_match('singles', null, array['00000000-0000-0000-0000-000000000006']::uuid[], 11, 3);
  raise exception 'FAIL: minor included';
exception when others then
  if sqlerrm like 'FAIL%' then raise; end if;
  raise notice 'ok: %', sqlerrm;
end $$;

-- Partner can't confirm; opponent can
select pg_temp.as_user(2);
do $$ begin
  perform public.confirm_match((select id from public.matches limit 1));
  raise exception 'FAIL: partner confirmed';
exception when others then if sqlerrm like 'FAIL%' then raise; end if; raise notice 'ok: %', sqlerrm; end $$;
select pg_temp.as_user(3);
select public.confirm_match(:'m1');
select id, status from public.matches;

-- Ratings: winners up, losers down
reset role;
select user_id, rating, wins, losses from public.player_ratings order by user_id;
set local role authenticated;

-- 2. Round robin doubles with 5 players, 3 rounds
select pg_temp.as_user(1);
select public.create_rr_event('Tuesday RR', null, null, (public.evanston_now()::date + 1), '18:00', 'doubles', 16) as ev \gset
do $$ begin for i in 2..5 loop
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000' || i, true);
  perform public.join_rr_event((select id from public.rr_events limit 1));
end loop; end $$;
select pg_temp.as_user(1);
select public.start_rr_event(:'ev', 3);
select round_no, court_no, team_a, team_b from public.match_summaries(:'ev');
-- Host enters all scores
do $$ declare r record; begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  for r in select id from public.matches where event_id = (select id from public.rr_events limit 1) loop
    perform public.enter_rr_score(r.id, 11, 5);
  end loop;
end $$;
select display_name, played, wins, losses, diff from public.rr_standings(:'ev');
select public.finish_rr_event(:'ev') as winner;

-- 3. Ladder
select pg_temp.as_user(1);
select public.create_ladder('Winter Ladder', null, null, 'all', null) as lad \gset
do $$ begin for i in 2..4 loop
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000' || i, true);
  perform public.join_ladder((select id from public.ladders limit 1));
end loop; end $$;
-- Dee (#4) challenges Ana (#1): allowed (3 spots)
select pg_temp.as_user(4);
select public.challenge_player(:'lad', '00000000-0000-0000-0000-000000000001') as ch \gset
select pg_temp.as_user(1);
select public.respond_challenge(:'ch', true);
select pg_temp.as_user(4);
select public.report_ladder_match(:'ch', 11, 9);
select pg_temp.as_user(1);
select public.confirm_match((select id from public.matches where challenge_id = :'ch'));
select rank, display_name, wins, losses from public.ladder_standings(:'lad');

-- Leaderboards
select rank, display_name, rating, wins, losses, matches from public.top_players();
select display_name, games, wins from public.most_active();
select display_name, wins, games, month from public.champion_of_month(public.evanston_now()::date);

-- Casual matches are private
select pg_temp.as_user(5);
select count(*) as eli_sees_casual from public.matches where kind = 'casual';
select pg_temp.as_user(1);
select count(*) as ana_sees_casual from public.matches where kind = 'casual';

-- Anonymous can read public lists but not write
reset role; set local role anon;
select count(*) as anon_top from public.top_players();
do $$ begin
  perform public.join_ladder((select id from public.ladders limit 1));
  raise exception 'FAIL: anon wrote';
exception when insufficient_privilege then raise notice 'ok: anon blocked'; end $$;

reset role;
select m.kind, m.played_on, m.status, m.score_a, m.score_b, p.display_name, mp.team from public.matches m join public.match_players mp on mp.match_id=m.id join public.profiles p on p.id=mp.user_id where p.display_name in ('Eli','Ana') order by 6,1;
select * from public.most_active();
select p.display_name, count(*), count(*) filter (where (mp.team = 'a') = (m.score_a > m.score_b)) from public.matches m join public.match_players mp on mp.match_id=m.id join public.profiles p on p.id=mp.user_id where m.status='confirmed' group by 1;
select r.user_id, r.matches, (select count(*) from public.match_players mp join public.matches m on m.id=mp.match_id where m.status='confirmed' and mp.user_id=r.user_id) as actual from public.player_ratings r where r.matches <> (select count(*) from public.match_players mp join public.matches m on m.id=mp.match_id where m.status='confirmed' and mp.user_id=r.user_id);
rollback;
