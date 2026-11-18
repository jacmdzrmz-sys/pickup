'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import type { MatchSummary } from '@/lib/db-types';
import { useAsync } from '@/lib/use-async';
import { teamNames } from '@/components/compete/MatchCard';
import {
  cancelRoundRobin, confirmMatch, enterRoundRobinScore, finishRoundRobin, joinRoundRobin,
  leaveRoundRobin, startRoundRobin, type CompeteResult,
} from '../../actions';

function useRun() {
  const router = useRouter();
  const [pending, start] = useAsync();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<CompeteResult>) =>
    start(async () => {
      setError(null);
      const res = await fn();
      if (!res.ok) setError(res.error);
      router.refresh();
    });
  return { pending, error, run };
}

const primary = 'min-h-[52px] w-full rounded-lg px-4 text-lg font-extrabold text-white disabled:opacity-60';
const secondary = 'min-h-[48px] rounded-lg border border-gray-300 bg-white px-4 font-semibold text-gray-800 disabled:opacity-60';

export function EventControls(props: {
  eventId: string;
  status: string;
  isHost: boolean;
  joined: boolean;
  signedIn: boolean;
  canCompete: boolean;
  full: boolean;
  playerCount: number;
  format: 'singles' | 'doubles';
}) {
  const { pending, error, run } = useRun();
  const perCourt = props.format === 'doubles' ? 4 : 2;
  const suggested = Math.min(12, Math.max(3, props.format === 'doubles' ? Math.ceil(props.playerCount / 1.5) : props.playerCount - 1));
  const [rounds, setRounds] = useState(Math.min(suggested, 8));
  const [confirmCancel, setConfirmCancel] = useState(false);

  if (props.status === 'completed' || props.status === 'cancelled') return null;

  return (
    <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
      {!props.signedIn && (
        <a href={`/auth/login?next=/compete/events/${props.eventId}`} className={clsx(primary, 'flex items-center justify-center bg-dink-pink')}>
          Sign in to join
        </a>
      )}
      {props.signedIn && !props.canCompete && (
        <p className="text-sm text-gray-700">
          To join, turn on competitions (18+) on the <a href="/compete" className="font-bold text-blue-700 underline">Compete page</a>.
        </p>
      )}

      {props.status === 'open' && props.signedIn && props.canCompete && !props.isHost && (
        props.joined ? (
          <div className="space-y-2">
            <p className="rounded-lg bg-green-50 p-3 text-center font-semibold text-green-800">✓ You’re in! Pairings appear when the host starts.</p>
            <button type="button" disabled={pending} onClick={() => run(() => leaveRoundRobin(props.eventId))} className={clsx(secondary, 'w-full')}>
              Leave
            </button>
          </div>
        ) : (
          <button type="button" disabled={pending || props.full} onClick={() => run(() => joinRoundRobin(props.eventId))} className={clsx(primary, 'bg-dink-pink')}>
            {props.full ? 'Full' : 'Join round robin'}
          </button>
        )
      )}

      {props.isHost && props.status === 'open' && (
        <div className="space-y-2">
          <p className="font-semibold">You’re hosting. When everyone’s here, start it:</p>
          <label className="block text-sm">
            <span className="font-semibold text-gray-700">Number of rounds</span>
            <select value={rounds} onChange={(e) => setRounds(Number(e.target.value))} className="mt-1 block min-h-[48px] w-full rounded-lg border border-gray-300 bg-white px-3 text-base">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n} rounds</option>)}
            </select>
          </label>
          <button
            type="button"
            disabled={pending || props.playerCount < perCourt}
            onClick={() => run(() => startRoundRobin(props.eventId, rounds))}
            className={clsx(primary, 'bg-dink-blue')}
          >
            {props.playerCount < perCourt ? `Need at least ${perCourt} players` : 'Start & make pairings'}
          </button>
        </div>
      )}

      {props.isHost && props.status === 'in_progress' && (
        <div className="space-y-2">
          <p className="text-sm text-gray-700">Enter scores below as games finish. Your scores count right away.</p>
          <button type="button" disabled={pending} onClick={() => run(() => finishRoundRobin(props.eventId))} className={clsx(primary, 'bg-dink-pink')}>
            🏆 Finish & crown the winner
          </button>
        </div>
      )}

      {props.isHost && (
        confirmCancel ? (
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={pending} onClick={() => run(() => cancelRoundRobin(props.eventId))} className="min-h-[48px] rounded-lg bg-red-600 px-4 font-semibold text-white">
              Yes, cancel it
            </button>
            <button type="button" onClick={() => setConfirmCancel(false)} className={secondary}>Keep it</button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmCancel(true)} className="text-sm font-semibold text-red-700 underline">
            Cancel round robin
          </button>
        )
      )}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </section>
  );
}

export function RoundMatch({
  match,
  eventId,
  userId,
  isHost,
  live,
}: {
  match: MatchSummary;
  eventId: string;
  userId?: string;
  isHost: boolean;
  live: boolean;
}) {
  const { pending, error, run } = useRun();
  const [a, setA] = useState(match.score_a?.toString() ?? '');
  const [b, setB] = useState(match.score_b?.toString() ?? '');
  const inMatch = !!match.my_team;
  const canEnter = live && match.status !== 'confirmed' && (isHost || inMatch);
  const hasScore = match.score_a !== null && match.score_b !== null;
  const aWon = hasScore && (match.score_a ?? 0) > (match.score_b ?? 0);
  const num = 'h-11 w-14 rounded-lg border border-gray-300 text-center text-lg tabular-nums';

  return (
    <article className={clsx('rounded-xl border bg-white p-3', inMatch ? 'border-dink-pink' : 'border-gray-200')}>
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Court {match.court_no}</span>
        <span>
          {match.status === 'confirmed' ? 'Final' : match.status === 'pending' ? 'Waiting for the other team or host to confirm' : match.status === 'disputed' ? 'Score questioned' : ''}
        </span>
      </div>
      <div className="mt-1 grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1">
        <span className={clsx(aWon && 'font-extrabold')}>{teamNames(match.team_a)}</span>
        {canEnter ? <input aria-label="Score, first team" inputMode="numeric" value={a} onChange={(e) => setA(e.target.value)} className={num} /> : <span className={clsx('text-right tabular-nums', aWon && 'font-extrabold')}>{match.score_a ?? '–'}</span>}
        <span className={clsx(hasScore && !aWon && 'font-extrabold')}>{teamNames(match.team_b)}</span>
        {canEnter ? <input aria-label="Score, second team" inputMode="numeric" value={b} onChange={(e) => setB(e.target.value)} className={num} /> : <span className={clsx('text-right tabular-nums', hasScore && !aWon && 'font-extrabold')}>{match.score_b ?? '–'}</span>}
      </div>
      {(canEnter || match.can_confirm) && (
        <div className="mt-2 flex flex-wrap gap-2">
          {canEnter && (
            <button type="button" disabled={pending} onClick={() => run(() => enterRoundRobinScore(eventId, match.id, Number(a), Number(b)))}
              className="min-h-[44px] rounded-lg bg-blue-600 px-4 font-semibold text-white disabled:opacity-60">
              {isHost ? 'Save score' : match.status === 'pending' && match.reported_by === userId ? 'Update score' : 'Submit score'}
            </button>
          )}
          {match.can_confirm && match.status === 'pending' && (
            <button type="button" disabled={pending} onClick={() => run(() => confirmMatch(match.id))}
              className="min-h-[44px] rounded-lg bg-green-600 px-4 font-semibold text-white disabled:opacity-60">
              ✓ Confirm {match.score_a}–{match.score_b}
            </button>
          )}
        </div>
      )}
      {error && <p role="alert" className="mt-1 text-sm text-red-700">{error}</p>}
    </article>
  );
}
