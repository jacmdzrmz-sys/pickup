'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import type { MatchPlayer, MatchSummary } from '@/lib/db-types';
import { useAsync } from '@/lib/use-async';
import { formatDateShort } from '@/lib/time';
import { confirmMatch, disputeMatch, withdrawMatch, type CompeteResult } from '@/app/compete/actions';

const STATUS: Record<MatchSummary['status'], { label: string; cls: string }> = {
  scheduled: { label: 'Waiting for score', cls: 'bg-gray-100 text-gray-700' },
  pending: { label: 'Waiting for confirmation', cls: 'bg-amber-100 text-amber-900' },
  confirmed: { label: 'Final', cls: 'bg-green-100 text-green-800' },
  disputed: { label: 'Not confirmed', cls: 'bg-red-100 text-red-800' },
  cancelled: { label: 'Withdrawn', cls: 'bg-gray-100 text-gray-500' },
};

const KIND: Record<MatchSummary['kind'], string> = { casual: 'Pickup', round_robin: 'Round robin', ladder: 'Ladder' };

export function teamNames(team: MatchPlayer[]) {
  return team.map((p) => p.name).join(' & ') || '—';
}

export default function MatchCard({ match, userId, showKind = true }: { match: MatchSummary; userId?: string; showKind?: boolean }) {
  const router = useRouter();
  const [pending, start] = useAsync();
  const [error, setError] = useState<string | null>(null);
  const s = STATUS[match.status];
  const hasScore = match.score_a !== null && match.score_b !== null;
  const aWon = hasScore && (match.score_a ?? 0) > (match.score_b ?? 0);
  const iReported = !!userId && match.reported_by === userId;

  const run = (fn: () => Promise<CompeteResult>) =>
    start(async () => {
      setError(null);
      const res = await fn();
      if (!res.ok) setError(res.error);
      router.refresh();
    });

  return (
    <article className="rounded-xl border border-gray-200 bg-white p-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {showKind && <span className="font-bold uppercase tracking-wide text-dink-blue">{KIND[match.kind]}</span>}
        <span className="text-gray-500">{formatDateShort(match.played_on)} · {match.format === 'doubles' ? 'Doubles' : 'Singles'}</span>
        <span className={clsx('ml-auto rounded-full px-2 py-0.5 font-semibold', s.cls)}>{s.label}</span>
      </div>
      <div className="mt-2 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-base">
        <span className={clsx(aWon && 'font-extrabold', match.my_team === 'a' && 'text-dink-navy')}>
          {teamNames(match.team_a)} {match.my_team === 'a' && <span className="text-xs text-gray-500">(you)</span>}
        </span>
        <span className={clsx('text-right tabular-nums', aWon && 'font-extrabold')}>{hasScore ? match.score_a : '–'}</span>
        <span className={clsx(hasScore && !aWon && 'font-extrabold')}>
          {teamNames(match.team_b)} {match.my_team === 'b' && <span className="text-xs text-gray-500">(you)</span>}
        </span>
        <span className={clsx('text-right tabular-nums', hasScore && !aWon && 'font-extrabold')}>{hasScore ? match.score_b : '–'}</span>
      </div>

      {(match.can_confirm || (iReported && (match.status === 'pending' || match.status === 'disputed'))) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {match.can_confirm && (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => confirmMatch(match.id))}
              className="min-h-[44px] rounded-lg bg-green-600 px-4 font-semibold text-white disabled:opacity-60"
            >
              ✓ Confirm score
            </button>
          )}
          {match.can_confirm && match.status === 'pending' && (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => disputeMatch(match.id))}
              className="min-h-[44px] rounded-lg border border-gray-300 bg-white px-4 font-semibold text-gray-800 disabled:opacity-60"
            >
              That’s not right
            </button>
          )}
          {iReported && (match.status === 'pending' || match.status === 'disputed') && (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => withdrawMatch(match.id))}
              className="min-h-[44px] rounded-lg border border-gray-300 bg-white px-4 font-semibold text-gray-800 disabled:opacity-60"
            >
              Withdraw score
            </button>
          )}
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
    </article>
  );
}
