-- Tighten function access after Supabase security advisor review.
-- * Fixed search_path on the small helper functions.
-- * Trigger functions and internal helpers can't be called through the API.
--   (Triggers still fire normally; Postgres doesn't check EXECUTE for them.)
-- * Kept callable on purpose: is_admin (used by row-level security),
--   check_game_time (live time check on the Create Game form), and the
--   user-facing RPCs, which each check who is calling.

alter function public.evanston_now() set search_path = public;
alter function public.set_updated_at() set search_path = public;
alter function public.reason_label(text) set search_path = public;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.community_games_before_write() from public, anon, authenticated;
revoke execute on function public.community_games_after_insert() from public, anon, authenticated;
revoke execute on function public.community_game_players_before_insert() from public, anon, authenticated;
revoke execute on function public.community_game_players_before_delete() from public, anon, authenticated;
revoke execute on function public.reports_before_insert() from public, anon, authenticated;

revoke execute on function public.is_blocked_between(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.is_suspended(uuid) from public, anon, authenticated;
revoke execute on function public.has_accepted_terms(uuid) from public, anon, authenticated;
