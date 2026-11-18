import { createClient } from '@/utils/supabase/server';
import { buildIcs, icsResponse, parseAlarm, SITE } from '@/lib/calendar';
import { gameCalendarEvent } from '@/lib/calendar-events';
import type { GameView } from '@/lib/db-types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) return new Response('Not found', { status: 404 });
  const supabase = createClient();
  const { data } = await supabase.from('community_games_view').select('*').eq('id', params.id).maybeSingle();
  const game = data as GameView | null;
  if (!game || game.status !== 'scheduled') return new Response('This game is no longer scheduled.', { status: 404 });
  const alarm = parseAlarm(new URL(request.url).searchParams.get('alert'));
  return icsResponse(buildIcs(gameCalendarEvent(game, SITE), alarm), 'evanston-dinks-game.ics');
}
