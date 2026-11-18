import Link from 'next/link';
import { requireUser } from '@/lib/session';
import { getCompetitorState } from '@/lib/compete';
import { evanstonToday } from '@/lib/time';
import CompetitionSettings from '@/components/compete/CompetitionSettings';
import EventForm from './event-form';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Host a Round Robin · Evanston Dinks' };

export default async function NewEventPage() {
  const { supabase, user } = await requireUser('/compete/events/new');
  const [state, { data: locs }] = await Promise.all([
    getCompetitorState(supabase, user.id),
    supabase.from('locations').select('id, name').order('sort_order'),
  ]);
  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <Link href="/compete" className="text-sm font-semibold text-blue-700 underline">← Compete</Link>
      <h1 className="text-2xl font-black text-dink-navy">Host a Round Robin</h1>
      <p className="text-gray-600">
        Players sign up, you tap Start, and the app makes the pairings. Partners rotate every round and everyone sits out
        fairly. Enter scores as you go and standings update live.
      </p>
      <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
        Hosting an event doesn’t reserve a court. Use first-come courts, or reserve with the City first if you need courts held.
      </p>
      {state.isAdult ? (
        <EventForm locations={(locs ?? []) as { id: string; name: string }[]} today={evanstonToday()} />
      ) : (
        <CompetitionSettings isAdult={false} showOnLeaderboards={false} compact />
      )}
    </main>
  );
}
