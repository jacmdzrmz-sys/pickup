'use server';

import { revalidatePath } from 'next/cache';
import { getSessionUser } from '@/lib/session';
import { COURT_STATUSES, GAME_TYPES, SKILL_LEVELS } from '@/lib/labels';
import { formatTimeRange } from '@/lib/time';

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string; duplicate?: string };

function friendlyDbError(message: string | undefined): string {
  if (!message) return 'Something went wrong. Please try again.';
  if (message.includes('duplicate key')) return 'You’re already in this game.';
  if (message.includes('row-level security')) return 'You don’t have permission to do that.';
  return message;
}

export type CreateGameInput = {
  locationId: string;
  date: string;
  start: string;
  end: string;
  skill: string;
  gameType: string;
  maxPlayers: number;
  courtStatus: string;
  reservationConfirmed: boolean;
  rulesAcknowledged: boolean;
  title: string;
  description?: string;
  isFree: boolean;
  feeNote?: string;
  allowOverlap?: boolean;
};

export async function createGame(input: CreateGameInput): Promise<ActionResult> {
  const { supabase, user } = await getSessionUser();
  if (!user) return { ok: false, error: 'Please sign in to create a game.' };

  if (!input.rulesAcknowledged) return { ok: false, error: 'Please confirm the rules acknowledgment.' };
  if (!SKILL_LEVELS.some((s) => s.value === input.skill)) return { ok: false, error: 'Please choose a skill level.' };
  if (!GAME_TYPES.some((s) => s.value === input.gameType)) return { ok: false, error: 'Please choose a game type.' };
  if (!COURT_STATUSES.some((s) => s.value === input.courtStatus)) return { ok: false, error: 'Please choose a court status.' };
  if (input.courtStatus === 'reserved' && !input.reservationConfirmed)
    return { ok: false, error: 'Please confirm that you have obtained or will obtain the necessary reservation/permit.' };
  const max = Math.round(Number(input.maxPlayers));
  if (!Number.isFinite(max) || max < 2 || max > 32) return { ok: false, error: 'Player limit must be between 2 and 32.' };
  const title = input.title.trim();
  if (title.length < 3 || title.length > 80) return { ok: false, error: 'Please give the game a short title (3–80 characters).' };

  // Same check the database enforces, for a friendly message.
  const { data: timeMsg, error: checkError } = await supabase.rpc('check_game_time', {
    p_location_id: input.locationId,
    p_date: input.date,
    p_start: input.start,
    p_end: input.end,
  });
  if (checkError) return { ok: false, error: 'We couldn’t check that time. Please try again.' };
  if (timeMsg) return { ok: false, error: String(timeMsg) };

  if (!input.allowOverlap) {
    const { data: overlaps } = await supabase
      .from('community_games_view')
      .select('title,start_time,end_time')
      .eq('location_id', input.locationId)
      .eq('game_date', input.date)
      .eq('status', 'scheduled')
      .lt('start_time', input.end)
      .gt('end_time', input.start);
    if (overlaps && overlaps.length > 0) {
      const o = overlaps[0] as { title: string; start_time: string; end_time: string };
      return {
        ok: false,
        error: 'Another Evanston Dinks game is already scheduled at this location during this time.',
        duplicate: `“${o.title}” · ${formatTimeRange(o.start_time, o.end_time)}${overlaps.length > 1 ? ` (+${overlaps.length - 1} more)` : ''}`,
      };
    }
  }

  const { data, error } = await supabase
    .from('community_games')
    .insert({
      host_id: user.id,
      location_id: input.locationId,
      title,
      description: input.description?.trim().slice(0, 500) || null,
      game_date: input.date,
      start_time: input.start,
      end_time: input.end,
      skill_level: input.skill,
      game_type: input.gameType,
      max_players: max,
      court_status: input.courtStatus,
      reservation_confirmed: input.courtStatus === 'reserved' && input.reservationConfirmed,
      is_free: input.isFree,
      fee_note: input.isFree ? null : input.feeNote?.trim().slice(0, 80) || null,
    })
    .select('id')
    .single();

  if (error) return { ok: false, error: friendlyDbError(error.message) };
  revalidatePath('/games');
  return { ok: true, id: data.id as string };
}

export async function joinGame(gameId: string): Promise<ActionResult> {
  const { supabase, user } = await getSessionUser();
  if (!user) return { ok: false, error: 'Please sign in first.' };
  const { error } = await supabase.from('community_game_players').insert({ game_id: gameId, user_id: user.id });
  if (error) return { ok: false, error: friendlyDbError(error.message) };
  revalidatePath(`/games/${gameId}`);
  revalidatePath('/games');
  return { ok: true };
}

export async function leaveGame(gameId: string): Promise<ActionResult> {
  const { supabase, user } = await getSessionUser();
  if (!user) return { ok: false, error: 'Please sign in first.' };
  const { error } = await supabase
    .from('community_game_players')
    .delete()
    .eq('game_id', gameId)
    .eq('user_id', user.id);
  if (error) return { ok: false, error: friendlyDbError(error.message) };
  revalidatePath(`/games/${gameId}`);
  revalidatePath('/games');
  return { ok: true };
}

export async function cancelGame(gameId: string, reason: string, note: string): Promise<ActionResult> {
  const { supabase, user } = await getSessionUser();
  if (!user) return { ok: false, error: 'Please sign in first.' };
  const { error } = await supabase.rpc('cancel_game', { p_game_id: gameId, p_reason: reason, p_note: note || null });
  if (error) return { ok: false, error: friendlyDbError(error.message) };
  revalidatePath(`/games/${gameId}`);
  revalidatePath('/games');
  return { ok: true };
}

export async function submitReport(input: {
  targetType: 'game' | 'user';
  gameId?: string;
  userId?: string;
  category: string;
  details: string;
}): Promise<ActionResult> {
  const { supabase, user } = await getSessionUser();
  if (!user) return { ok: false, error: 'Please sign in to send a report.' };
  const { error } = await supabase.from('reports').insert({
    reporter_id: user.id,
    target_type: input.targetType,
    game_id: input.targetType === 'game' ? input.gameId : null,
    reported_user_id: input.targetType === 'user' ? input.userId : null,
    category: input.category,
    details: input.details.trim().slice(0, 1000) || null,
  });
  if (error) return { ok: false, error: friendlyDbError(error.message) };
  return { ok: true };
}
