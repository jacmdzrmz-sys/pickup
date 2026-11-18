'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { useAsync } from '@/lib/use-async';
import { addDays, formatTime, timeSlots } from '@/lib/time';
import { createRoundRobin } from '../../actions';

const field = 'mt-1 block min-h-[48px] w-full rounded-lg border border-gray-300 bg-white px-3 text-base';

export default function EventForm({ locations, today }: { locations: { id: string; name: string }[]; today: string }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationId, setLocationId] = useState('');
  const [date, setDate] = useState(addDays(today, 1));
  const [startTime, setStartTime] = useState('18:00');
  const [format, setFormat] = useState<'doubles' | 'singles'>('doubles');
  const [max, setMax] = useState(12);
  const [error, setError] = useState<string | null>(null);
  const [pending, run] = useAsync();

  return (
    <form
      className="space-y-4 rounded-xl border border-gray-200 bg-white p-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        run(async () => {
          const res = await createRoundRobin({ title, description, locationId: locationId || null, date, start: startTime, format, maxPlayers: max });
          if (!res.ok) return setError(res.error);
          router.push(`/compete/events/${res.id}`);
        });
      }}
    >
      <label className="block text-sm">
        <span className="font-semibold text-gray-700">Name</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="Tuesday Night Round Robin" className={field} required />
      </label>
      <fieldset>
        <legend className="text-sm font-semibold text-gray-700">Format</legend>
        <div className="mt-1 flex gap-2">
          {(['doubles', 'singles'] as const).map((f) => (
            <button key={f} type="button" onClick={() => setFormat(f)}
              className={clsx('min-h-[44px] rounded-full border px-5 font-semibold', format === f ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 bg-white')}>
              {f === 'doubles' ? 'Doubles (rotating partners)' : 'Singles'}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="font-semibold text-gray-700">Date</span>
          <input type="date" value={date} min={today} max={addDays(today, 90)} onChange={(e) => setDate(e.target.value)} className={field} required />
        </label>
        <label className="text-sm">
          <span className="font-semibold text-gray-700">Start time</span>
          <select value={startTime} onChange={(e) => setStartTime(e.target.value)} className={field}>
            {timeSlots('07:00', '21:30').map((t) => <option key={t} value={t}>{formatTime(t)}</option>)}
          </select>
        </label>
        <label className="text-sm">
          <span className="font-semibold text-gray-700">Where</span>
          <select value={locationId} onChange={(e) => setLocationId(e.target.value)} className={field}>
            <option value="">Choose later</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </label>
        <label className="text-sm">
          <span className="font-semibold text-gray-700">Player limit</span>
          <select value={max} onChange={(e) => setMax(Number(e.target.value))} className={field}>
            {[4, 6, 8, 10, 12, 16, 20, 24, 32].map((n) => <option key={n} value={n}>{n} players</option>)}
          </select>
        </label>
      </div>
      <label className="block text-sm">
        <span className="font-semibold text-gray-700">Details (optional)</span>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} rows={3}
          placeholder="Games to 11, win by 2. Bring water!" className="mt-1 block w-full rounded-lg border border-gray-300 p-3 text-base" />
      </label>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p>}
      <button type="submit" disabled={pending} className="min-h-[52px] w-full rounded-lg bg-dink-blue px-4 text-lg font-extrabold text-white disabled:opacity-60">
        {pending ? 'Creating…' : 'Create round robin'}
      </button>
    </form>
  );
}
