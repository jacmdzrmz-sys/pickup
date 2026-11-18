import { createClient } from '@/utils/supabase/server';
import { buildIcs, icsResponse, parseAlarm, SITE } from '@/lib/calendar';
import { rrCalendarEvent } from '@/lib/calendar-events';
import type { RrEvent } from '@/lib/db-types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) return new Response('Not found', { status: 404 });
  const supabase = createClient();
  const { data } = await supabase.from('rr_events').select('*').eq('id', params.id).maybeSingle();
  const e = data as RrEvent | null;
  if (!e || e.status === 'cancelled') return new Response('This event is no longer scheduled.', { status: 404 });
  const { data: loc } = e.location_id
    ? await supabase.from('locations').select('name, address').eq('id', e.location_id).maybeSingle()
    : { data: null };
  const alarm = parseAlarm(new URL(request.url).searchParams.get('alert'));
  return icsResponse(buildIcs(rrCalendarEvent(e, loc, SITE), alarm), 'evanston-dinks-round-robin.ics');
}
