'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import type { LadderChallenge, MatchSummary } from '@/lib/db-types';
import { useAsync } from '@/lib/use-async';
import {
  cancelChallenge, challengePlayer, closeLadder, confirmMatch, disputeMatch, joinLadder, leaveLadder,
  reportLadderMatch, respondChallenge, type CompeteResult,
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

const btn = 'min-h-[44px] rounded-lg px-4 font-semibold disabled:opacity-60';

export function LadderControls(props: {
  ladderId: string;
  active: boolean;
  onLadder: boolean;
  isOrganizer: boolean;
  signedIn: boolean;
  canCompete: boolean;
}) {
  const { pending, error, run } = useRun();
  const [sure, setSure] = useState<'leave' | 'close' | null>(null);
  if (!props.active) return null;
  return (
    <section className="space-y-2 rounded-xl border border-gray-200 bg-white p-4">
      {!props.signedIn && (
        <a href={`/auth/login?next=/compete/ladders/${props.ladderId}`} className="flex min-h-[52px] items-center justify-center rounded-lg bg-dink-pink text-lg font-extrabold text-white">
          Sign in to join
        </a>
      )}
      {props.signedIn && !props.canCompete && (
        <p className="text-sm text-gray-700">
          To join, turn on competitions (18+) on the <a href="/compete" className="font-bold text-blue-700 underline">Compete page</a>.
        </p>
      )}
      {props.signedIn && props.canCompete && !props.onLadder && (
        <button type="button" disabled={pending} onClick={() => run(() => joinLadder(props.ladderId))}
          className="min-h-[52px] w-full rounded-lg bg-dink-pink text-lg font-extrabold text-white disabled:opacity-60">
          Join the ladder
        </button>
      )}
      {props.onLadder && <p className="font-semibold text-green-800">✓ You’re on this ladder.</p>}
      <div className="flex flex-wrap gap-3 text-sm">
        {props.onLadder && (sure === 'leave' ? (
          <>
            <button type="button" disabled={pending} onClick={() => run(() => leaveLadder(props.ladderId))} className={clsx(btn, 'bg-red-600 text-white')}>Yes, leave</button>
            <button type="button" onClick={() => setSure(null)} className={clsx(btn, 'border border-gray-300')}>Stay</button>
          </>
        ) : (
          <button type="button" onClick={() => setSure('leave')} className="font-semibold text-red-700 underline">Leave ladder</button>
        ))}
        {props.isOrganizer && (sure === 'close' ? (
          <>
            <button type="button" disabled={pending} onClick={() => run(() => closeLadder(props.ladderId))} className={clsx(btn, 'bg-red-600 text-white')}>Yes, close it</button>
            <button type="button" onClick={() => setSure(null)} className={clsx(btn, 'border border-gray-300')}>Keep open</button>
          </>
        ) : (
          <button type="button" onClick={() => setSure('close')} className="font-semibold text-red-700 underline">Close ladder</button>
        ))}
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </section>
  );
}

export function ChallengeButton({ ladderId, opponentId }: { ladderId: string; opponentId: string }) {
  const { pending, error, run } = useRun();
  return (
    <span className="text-right">
      <button type="button" disabled={pending} onClick={() => run(() => challengePlayer(ladderId, opponentId))}
        className={clsx(btn, 'bg-dink-blue text-white')}>
        Challenge
      </button>
      {error && <span role="alert" className="block text-xs text-red-700">{error}</span>}
    </span>
  );
}

export function ChallengeRow({
  ladderId,
  challenge,
  challengerName,
  opponentName,
  userId,
  pendingMatch,
}: {
  ladderId: string;
  challenge: LadderChallenge;
  challengerName: string;
  opponentName: string;
  userId?: string;
  pendingMatch: MatchSummary | null;
}) {
  const { pending, error, run } = useRun();
  const [mine, setMine] = useState('');
  const [theirs, setTheirs] = useState('');
  const involved = userId === challenge.challenger_id || userId === challenge.opponent_id;
  const amOpponent = userId === challenge.opponent_id;
  const num = 'h-11 w-16 rounded-lg border border-gray-300 text-center text-lg';

  return (
    <article className={clsx('rounded-xl border bg-white p-3', involved ? 'border-dink-pink' : 'border-gray-200')}>
      <p>
        <span className="font-bold">{challengerName}</span> challenged <span className="font-bold">{opponentName}</span>
        <span className="ml-2 text-xs text-gray-500">{challenge.status === 'pending' ? 'Waiting for answer' : 'Accepted, time to play'}</span>
      </p>

      {challenge.status === 'pending' && amOpponent && (
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" disabled={pending} onClick={() => run(() => respondChallenge(ladderId, challenge.id, true))} className={clsx(btn, 'bg-green-600 text-white')}>Accept</button>
          <button type="button" disabled={pending} onClick={() => run(() => respondChallenge(ladderId, challenge.id, false))} className={clsx(btn, 'border border-gray-300')}>Decline</button>
        </div>
      )}

      {challenge.status === 'accepted' && involved && !pendingMatch && (
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <label className="text-sm"><span className="block font-semibold text-gray-700">You</span>
            <input inputMode="numeric" value={mine} onChange={(e) => setMine(e.target.value)} className={num} /></label>
          <label className="text-sm"><span className="block font-semibold text-gray-700">{amOpponent ? challengerName : opponentName}</span>
            <input inputMode="numeric" value={theirs} onChange={(e) => setTheirs(e.target.value)} className={num} /></label>
          <button type="button" disabled={pending} onClick={() => run(() => reportLadderMatch(ladderId, challenge.id, Number(mine), Number(theirs)))}
            className={clsx(btn, 'bg-blue-600 text-white')}>Report score</button>
        </div>
      )}

      {pendingMatch && (
        <div className="mt-2 text-sm">
          <p>
            Reported: {pendingMatch.team_a.map((p) => p.name).join('')} {pendingMatch.score_a} – {pendingMatch.score_b}{' '}
            {pendingMatch.team_b.map((p) => p.name).join('')}
          </p>
          {pendingMatch.can_confirm && (
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" disabled={pending} onClick={() => run(() => confirmMatch(pendingMatch.id))} className={clsx(btn, 'bg-green-600 text-white')}>✓ Confirm</button>
              <button type="button" disabled={pending} onClick={() => run(() => disputeMatch(pendingMatch.id))} className={clsx(btn, 'border border-gray-300')}>That’s not right</button>
            </div>
          )}
        </div>
      )}

      {involved && !pendingMatch && (
        <button type="button" disabled={pending} onClick={() => run(() => cancelChallenge(ladderId, challenge.id))} className="mt-2 text-sm font-semibold text-red-700 underline">
          Cancel challenge
        </button>
      )}
      {error && <p role="alert" className="mt-1 text-sm text-red-700">{error}</p>}
    </article>
  );
}
