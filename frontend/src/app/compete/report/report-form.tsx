'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { useAsync } from '@/lib/use-async';
import { addDays } from '@/lib/time';
import PlayerPicker from '@/components/compete/PlayerPicker';
import { reportMatch, type PlayerOption } from '../actions';

const field = 'mt-1 block min-h-[48px] w-full rounded-lg border border-gray-300 bg-white px-3 text-base';

export default function ReportForm({ locations, today }: { locations: { id: string; name: string }[]; today: string }) {
  const router = useRouter();
  const [format, setFormat] = useState<'singles' | 'doubles'>('doubles');
  const [partner, setPartner] = useState<PlayerOption | null>(null);
  const [opp1, setOpp1] = useState<PlayerOption | null>(null);
  const [opp2, setOpp2] = useState<PlayerOption | null>(null);
  const [mine, setMine] = useState('11');
  const [theirs, setTheirs] = useState('');
  const [playedOn, setPlayedOn] = useState(today);
  const [locationId, setLocationId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useAsync();

  const chosen = [partner, opp1, opp2].filter(Boolean).map((p) => (p as PlayerOption).id);

  return (
    <form
      className="space-y-4 rounded-xl border border-gray-200 bg-white p-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const opponents = (format === 'doubles' ? [opp1, opp2] : [opp1]).filter(Boolean) as PlayerOption[];
        if (format === 'doubles' && !partner) return setError('Please choose your partner.');
        if (opponents.length !== (format === 'doubles' ? 2 : 1)) return setError('Please choose your opponent(s).');
        start(async () => {
          const res = await reportMatch({
            format,
            partnerId: format === 'doubles' ? partner?.id ?? null : null,
            opponentIds: opponents.map((o) => o.id),
            myScore: Number(mine),
            theirScore: Number(theirs),
            playedOn,
            locationId: locationId || null,
          });
          if (!res.ok) return setError(res.error);
          router.push('/compete?reported=1');
          router.refresh();
        });
      }}
    >
      <fieldset>
        <legend className="text-sm font-semibold text-gray-700">Game type</legend>
        <div className="mt-1 flex gap-2">
          {(['doubles', 'singles'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFormat(f)}
              className={clsx('min-h-[44px] rounded-full border px-5 font-semibold', format === f ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 bg-white')}
            >
              {f === 'doubles' ? 'Doubles' : 'Singles'}
            </button>
          ))}
        </div>
      </fieldset>

      {format === 'doubles' && <PlayerPicker label="Your partner" value={partner} onChange={setPartner} exclude={chosen} />}
      <PlayerPicker label={format === 'doubles' ? 'Opponent 1' : 'Opponent'} value={opp1} onChange={setOpp1} exclude={chosen} />
      {format === 'doubles' && <PlayerPicker label="Opponent 2" value={opp2} onChange={setOpp2} exclude={chosen} />}

      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          <span className="font-semibold text-gray-700">{format === 'doubles' ? 'Your team’s score' : 'Your score'}</span>
          <input type="number" inputMode="numeric" min={0} max={99} value={mine} onChange={(e) => setMine(e.target.value)} className={field} required />
        </label>
        <label className="text-sm">
          <span className="font-semibold text-gray-700">{format === 'doubles' ? 'Their score' : 'Their score'}</span>
          <input type="number" inputMode="numeric" min={0} max={99} value={theirs} onChange={(e) => setTheirs(e.target.value)} className={field} required />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="font-semibold text-gray-700">Date played</span>
          <input type="date" value={playedOn} min={addDays(today, -14)} max={today} onChange={(e) => setPlayedOn(e.target.value)} className={field} required />
        </label>
        <label className="text-sm">
          <span className="font-semibold text-gray-700">Where (optional)</span>
          <select value={locationId} onChange={(e) => setLocationId(e.target.value)} className={field}>
            <option value="">—</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </label>
      </div>

      <p className="text-xs text-gray-500">Only report games that really happened. Made-up scores can get an account suspended.</p>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p>}
      <button type="submit" disabled={pending} className="min-h-[52px] w-full rounded-lg bg-dink-pink px-4 text-lg font-extrabold text-white disabled:opacity-60">
        {pending ? 'Sending…' : 'Send for confirmation'}
      </button>
    </form>
  );
}
