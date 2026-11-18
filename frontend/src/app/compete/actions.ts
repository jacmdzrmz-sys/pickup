'use server';

import { revalidatePath } from 'next/cache';
import { getSessionUser } from '@/lib/session';
import { SKILL_LEVELS } from '@/lib/labels';
import { isValidDateString } from '@/lib/time';

export type CompeteResult = { ok: true; id?: string } | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isId = (v: unknown): v is string => typeof v === 'string' && UUID.test(v);

function friendly(message: string | undefined): string {
  if (!message) return 'Something went wrong. Please try again.';
  if (message.includes('row-level security') || message.includes('permission denied')) return 'You don’t have permission to do that.';
  if (message.includes('violates check constraint')) return 'Please check what you entered and try again.';
  return message;
}

/** Calls one of the competition RPCs (each checks who is calling) and refreshes the given pages. */
async function call(fn: string, args: Record<string, unknown>, paths: string[]): Promise<CompeteResult> {
  const { supabase, user } = await getSessionUser();
  if (!user) return { ok: false, error: 'Please sign in first.' };
  const { data, error } = await supabase.rpc(fn, args);
  if (error) return { ok: false, error: friendly(error.message) };
  for (const p of paths) revalidatePath(p);
  revalidatePath('/', 'layout');
  return { ok: true, id: typeof data === 'string' ? data : undefined };
}

const score = (n: unknown) => {
  const v = Math.round(Number(n));
  return Number.isFinite(v) && v >= 0 && v <= 99 ? v : null;
};

// ---------- Settings ----------
export async function saveCompetitionSettings(isAdult: boolean, showOnLeaderboards: boolean) {
  return call('set_competition_settings', { p_is_adult: !!isAdult, p_show_on_leaderboards: !!showOnLeaderboards }, ['/compete', '/profile', '/leaders']);
}

// ---------- Player search ----------
export type PlayerOption = { id: string; display_name: string; avatar_url: string | null; skill_level: string | null };
export async function searchPlayers(query: string): Promise<PlayerOption[]> {
  const q = String(query ?? '').trim().slice(0, 40);
  if (q.length < 2) return [];
  const { supabase, user } = await getSessionUser();
  if (!user) return [];
  const { data } = await supabase.rpc('search_competitors', { p_query: q });
  return (data ?? []) as PlayerOption[];
}

// ---------- Casual matches ----------
export async function reportMatch(input: {
  format: 'singles' | 'doubles';
  partnerId: string | null;
  opponentIds: string[];
  myScore: number;
  theirScore: number;
  playedOn: string;
  locationId: string | null;
}): Promise<CompeteResult> {
  const my = score(input.myScore);
  const their = score(input.theirScore);
  if (my === null || their === null || my === their) return { ok: false, error: 'Please enter a final score (no ties).' };
  if (!input.opponentIds.every(isId) || (input.partnerId && !isId(input.partnerId)))
    return { ok: false, error: 'Please choose the players again.' };
  if (!isValidDateString(input.playedOn)) return { ok: false, error: 'Please choose the date you played.' };
  return call(
    'report_match',
    {
      p_format: input.format === 'doubles' ? 'doubles' : 'singles',
      p_partner: input.format === 'doubles' ? input.partnerId : null,
      p_opponents: input.opponentIds,
      p_my_score: my,
      p_their_score: their,
      p_played_on: input.playedOn,
      p_location_id: input.locationId && isId(input.locationId) ? input.locationId : null,
    },
    ['/compete']
  );
}

export async function confirmMatch(id: string) {
  if (!isId(id)) return { ok: false, error: 'Match not found.' } as CompeteResult;
  return call('confirm_match', { p_match: id }, ['/compete', '/leaders', '/compete/events', '/compete/ladders']);
}
export async function disputeMatch(id: string) {
  if (!isId(id)) return { ok: false, error: 'Match not found.' } as CompeteResult;
  return call('dispute_match', { p_match: id }, ['/compete']);
}
export async function withdrawMatch(id: string) {
  if (!isId(id)) return { ok: false, error: 'Match not found.' } as CompeteResult;
  return call('withdraw_match', { p_match: id }, ['/compete', '/compete/events', '/compete/ladders']);
}

// ---------- Round robins ----------
export async function createRoundRobin(input: {
  title: string;
  description: string;
  locationId: string | null;
  date: string;
  start: string;
  format: 'singles' | 'doubles';
  maxPlayers: number;
}): Promise<CompeteResult> {
  const title = input.title.trim();
  if (title.length < 3 || title.length > 80) return { ok: false, error: 'Please give it a short name (3–80 characters).' };
  if (!isValidDateString(input.date)) return { ok: false, error: 'Please choose a date.' };
  if (!/^\d{2}:\d{2}$/.test(input.start)) return { ok: false, error: 'Please choose a start time.' };
  const max = Math.round(Number(input.maxPlayers));
  if (!Number.isFinite(max) || max < 4 || max > 32) return { ok: false, error: 'Player limit must be between 4 and 32.' };
  return call(
    'create_rr_event',
    {
      p_title: title,
      p_description: input.description.trim().slice(0, 500),
      p_location_id: input.locationId && isId(input.locationId) ? input.locationId : null,
      p_date: input.date,
      p_start: input.start,
      p_format: input.format === 'singles' ? 'singles' : 'doubles',
      p_max_players: max,
    },
    ['/compete']
  );
}

const eventPaths = (id: string) => [`/compete/events/${id}`, '/compete'];
export async function joinRoundRobin(id: string) {
  return isId(id) ? call('join_rr_event', { p_event: id }, eventPaths(id)) : ({ ok: false, error: 'Not found.' } as CompeteResult);
}
export async function leaveRoundRobin(id: string) {
  return isId(id) ? call('leave_rr_event', { p_event: id }, eventPaths(id)) : ({ ok: false, error: 'Not found.' } as CompeteResult);
}
export async function startRoundRobin(id: string, rounds: number) {
  const r = Math.round(Number(rounds));
  if (!isId(id) || !Number.isFinite(r)) return { ok: false, error: 'Please choose the number of rounds.' } as CompeteResult;
  return call('start_rr_event', { p_event: id, p_rounds: r }, eventPaths(id));
}
export async function enterRoundRobinScore(eventId: string, matchId: string, a: number, b: number) {
  const sa = score(a);
  const sb = score(b);
  if (!isId(eventId) || !isId(matchId)) return { ok: false, error: 'Match not found.' } as CompeteResult;
  if (sa === null || sb === null || sa === sb) return { ok: false, error: 'Please enter a final score (no ties).' } as CompeteResult;
  return call('enter_rr_score', { p_match: matchId, p_score_a: sa, p_score_b: sb }, [...eventPaths(eventId), '/leaders']);
}
export async function finishRoundRobin(id: string) {
  return isId(id) ? call('finish_rr_event', { p_event: id }, [...eventPaths(id), '/']) : ({ ok: false, error: 'Not found.' } as CompeteResult);
}
export async function cancelRoundRobin(id: string) {
  return isId(id) ? call('cancel_rr_event', { p_event: id }, eventPaths(id)) : ({ ok: false, error: 'Not found.' } as CompeteResult);
}

// ---------- Ladders ----------
export async function createLadder(input: {
  name: string;
  description: string;
  locationId: string | null;
  skill: string;
  endsOn: string | null;
}): Promise<CompeteResult> {
  const name = input.name.trim();
  if (name.length < 3 || name.length > 60) return { ok: false, error: 'Please give the ladder a short name (3–60 characters).' };
  if (input.endsOn && !isValidDateString(input.endsOn)) return { ok: false, error: 'Please choose a valid end date.' };
  return call(
    'create_ladder',
    {
      p_name: name,
      p_description: input.description.trim().slice(0, 500),
      p_location_id: input.locationId && isId(input.locationId) ? input.locationId : null,
      p_skill: SKILL_LEVELS.some((s) => s.value === input.skill) ? input.skill : 'all',
      p_ends_on: input.endsOn || null,
    },
    ['/compete']
  );
}

const ladderPaths = (id: string) => [`/compete/ladders/${id}`, '/compete'];
export async function joinLadder(id: string) {
  return isId(id) ? call('join_ladder', { p_ladder: id }, ladderPaths(id)) : ({ ok: false, error: 'Not found.' } as CompeteResult);
}
export async function leaveLadder(id: string) {
  return isId(id) ? call('leave_ladder', { p_ladder: id }, ladderPaths(id)) : ({ ok: false, error: 'Not found.' } as CompeteResult);
}
export async function challengePlayer(ladderId: string, opponentId: string) {
  if (!isId(ladderId) || !isId(opponentId)) return { ok: false, error: 'Not found.' } as CompeteResult;
  return call('challenge_player', { p_ladder: ladderId, p_opponent: opponentId }, ladderPaths(ladderId));
}
export async function respondChallenge(ladderId: string, challengeId: string, accept: boolean) {
  if (!isId(ladderId) || !isId(challengeId)) return { ok: false, error: 'Not found.' } as CompeteResult;
  return call('respond_challenge', { p_challenge: challengeId, p_accept: !!accept }, ladderPaths(ladderId));
}
export async function cancelChallenge(ladderId: string, challengeId: string) {
  if (!isId(ladderId) || !isId(challengeId)) return { ok: false, error: 'Not found.' } as CompeteResult;
  return call('cancel_challenge', { p_challenge: challengeId }, ladderPaths(ladderId));
}
export async function reportLadderMatch(ladderId: string, challengeId: string, myScore: number, theirScore: number) {
  const my = score(myScore);
  const their = score(theirScore);
  if (!isId(ladderId) || !isId(challengeId)) return { ok: false, error: 'Not found.' } as CompeteResult;
  if (my === null || their === null || my === their) return { ok: false, error: 'Please enter a final score (no ties).' } as CompeteResult;
  return call('report_ladder_match', { p_challenge: challengeId, p_my_score: my, p_their_score: their }, ladderPaths(ladderId));
}
export async function closeLadder(id: string) {
  return isId(id) ? call('close_ladder', { p_ladder: id }, ladderPaths(id)) : ({ ok: false, error: 'Not found.' } as CompeteResult);
}
