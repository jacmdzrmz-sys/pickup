'use client';

import { useAsync } from '@/lib/use-async';
import { useRouter } from 'next/navigation';
import {useState} from 'react';
import { CANCEL_REASONS } from '@/lib/labels';
import { cancelGame, joinGame, leaveGame } from '../actions';

export function JoinLeave({
  gameId,
  joined,
  isHost,
  full,
  signedIn,
  closed,
}: {
  gameId: string;
  joined: boolean;
  isHost: boolean;
  full: boolean;
  signedIn: boolean;
  closed: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useAsync();
  const [error, setError] = useState<string | null>(null);

  if (closed) return null;
  if (isHost) {
    return <p className="rounded-lg bg-blue-50 p-3 text-sm font-semibold text-blue-900">You’re hosting this game.</p>;
  }

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setError(null);
      const res = await fn();
      if (!res.ok && res.error?.includes('accept the Evanston Dinks terms')) {
        window.location.assign(`/welcome?next=${encodeURIComponent(`/games/${gameId}`)}`);
        return;
      }
      if (!res.ok) setError(res.error ?? 'Something went wrong.');
      router.refresh();
    });

  if (!signedIn) {
    return (
      <a
        href={`/auth/login?next=${encodeURIComponent(`/games/${gameId}`)}`}
        className="flex min-h-[52px] w-full items-center justify-center rounded-lg bg-blue-600 px-4 text-lg font-semibold text-white hover:bg-blue-700"
      >
        Sign in to join
      </a>
    );
  }

  return (
    <div className="space-y-2">
      {joined ? (
        <>
          <p className="rounded-lg bg-green-50 p-3 text-center font-semibold text-green-800">✓ You’re in! See you on the court.</p>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => leaveGame(gameId))}
            className="min-h-[48px] w-full rounded-lg border border-gray-300 bg-white px-4 font-semibold text-gray-800 disabled:opacity-60"
          >
            Leave game
          </button>
        </>
      ) : (
        <button
          type="button"
          disabled={pending || full}
          onClick={() => run(() => joinGame(gameId))}
          className="min-h-[52px] w-full rounded-lg bg-blue-600 px-4 text-lg font-semibold text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-600"
        >
          {full ? 'Game is full' : pending ? 'Joining…' : 'Join Game'}
        </button>
      )}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </div>
  );
}

export function CancelGame({ gameId, outdoor }: { gameId: string; outdoor: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useAsync();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-[48px] w-full rounded-lg border border-red-300 bg-white px-4 font-semibold text-red-700 hover:bg-red-50"
      >
        Cancel this game
      </button>
    );
  }

  return (
    <form
      className="space-y-3 rounded-lg border border-red-200 bg-white p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!reason) return setError('Please choose a reason.');
        start(async () => {
          const res = await cancelGame(gameId, reason, note);
          if (!res.ok) setError(res.error);
          else router.refresh();
        });
      }}
    >
      <p className="font-semibold">Cancel game</p>
      <p className="text-sm text-gray-600">Everyone who joined will get a notification.</p>
      {outdoor && (
        <p className="text-xs text-gray-500">
          Evanston Dinks does not decide whether a City court is open or safe. Official City closures and posted facility
          information control.
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        {CANCEL_REASONS.map((r) => (
          <label
            key={r.value}
            className={`flex min-h-[44px] items-center gap-2 rounded-lg border px-3 text-sm ${reason === r.value ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
          >
            <input type="radio" name="reason" value={r.value} checked={reason === r.value} onChange={() => setReason(r.value)} />
            {r.label}
          </label>
        ))}
      </div>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={280}
        placeholder="Optional note for players"
        className="block min-h-[44px] w-full rounded-lg border border-gray-300 px-3"
      />
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="flex gap-2">
        <button disabled={pending} className="min-h-[44px] flex-1 rounded-lg bg-red-600 px-4 font-semibold text-white disabled:opacity-60">
          Cancel game &amp; notify players
        </button>
        <button type="button" onClick={() => setOpen(false)} className="min-h-[44px] rounded-lg border border-gray-300 px-4 font-semibold">
          Keep it
        </button>
      </div>
    </form>
  );
}
