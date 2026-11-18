import Link from 'next/link';
import { requireUser } from '@/lib/session';
import { getCompetitorState } from '@/lib/compete';
import { evanstonToday } from '@/lib/time';
import CompetitionSettings from '@/components/compete/CompetitionSettings';
import ReportForm from './report-form';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Report a Score · Evanston Dinks' };

export default async function ReportPage() {
  const { supabase, user } = await requireUser('/compete/report');
  const [state, { data: locs }] = await Promise.all([
    getCompetitorState(supabase, user.id),
    supabase.from('locations').select('id, name').order('sort_order'),
  ]);
  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <Link href="/compete" className="text-sm font-semibold text-blue-700 underline">← Compete</Link>
      <h1 className="text-2xl font-black text-dink-navy">Report a Score</h1>
      <p className="text-gray-600">
        Played a pickup game? Log it here. Your opponent gets a notice and confirms the score, then it counts toward Top Players.
      </p>
      {state.isAdult ? (
        <ReportForm locations={(locs ?? []) as { id: string; name: string }[]} today={evanstonToday()} />
      ) : (
        <CompetitionSettings isAdult={false} showOnLeaderboards={false} compact />
      )}
    </main>
  );
}
