import Link from 'next/link';
import { requireUser } from '@/lib/session';
import { getCompetitorState } from '@/lib/compete';
import { evanstonToday } from '@/lib/time';
import CompetitionSettings from '@/components/compete/CompetitionSettings';
import LadderForm from './ladder-form';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Start a Ladder · Evanston Dinks' };

export default async function NewLadderPage() {
  const { supabase, user } = await requireUser('/compete/ladders/new');
  const [state, { data: locs }] = await Promise.all([
    getCompetitorState(supabase, user.id),
    supabase.from('locations').select('id, name').order('sort_order'),
  ]);
  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <Link href="/compete" className="text-sm font-semibold text-blue-700 underline">← Compete</Link>
      <h1 className="text-2xl font-black text-dink-navy">Start a Ladder</h1>
      <p className="text-gray-600">
        A singles ladder runs for weeks. New players join at the bottom and can challenge anyone up to 3 spots above them.
        Win, and you take their spot.
      </p>
      {state.isAdult ? (
        <LadderForm locations={(locs ?? []) as { id: string; name: string }[]} today={evanstonToday()} />
      ) : (
        <CompetitionSettings isAdult={false} showOnLeaderboards={false} compact />
      )}
    </main>
  );
}
