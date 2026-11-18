'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAsync } from '@/lib/use-async';
import { addDays } from '@/lib/time';
import { SKILL_LEVELS } from '@/lib/labels';
import { createLadder } from '../../actions';

const field = 'mt-1 block min-h-[48px] w-full rounded-lg border border-gray-300 bg-white px-3 text-base';

export default function LadderForm({ locations, today }: { locations: { id: string; name: string }[]; today: string }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [locationId, setLocationId] = useState('');
  const [skill, setSkill] = useState('all');
  const [endsOn, setEndsOn] = useState(addDays(today, 56));
  const [error, setError] = useState<string | null>(null);
  const [pending, run] = useAsync();

  return (
    <form
      className="space-y-4 rounded-xl border border-gray-200 bg-white p-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        run(async () => {
          const res = await createLadder({ name, description, locationId: locationId || null, skill, endsOn: endsOn || null });
          if (!res.ok) return setError(res.error);
          router.push(`/compete/ladders/${res.id}`);
        });
      }}
    >
      <label className="block text-sm">
        <span className="font-semibold text-gray-700">Ladder name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Winter Singles Ladder" className={field} required />
      </label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="text-sm">
          <span className="font-semibold text-gray-700">Level</span>
          <select value={skill} onChange={(e) => setSkill(e.target.value)} className={field}>
            {SKILL_LEVELS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>
        <label className="text-sm">
          <span className="font-semibold text-gray-700">Home courts</span>
          <select value={locationId} onChange={(e) => setLocationId(e.target.value)} className={field}>
            <option value="">Anywhere in Evanston</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </label>
        <label className="text-sm">
          <span className="font-semibold text-gray-700">Ends on</span>
          <input type="date" value={endsOn} min={addDays(today, 1)} max={addDays(today, 365)} onChange={(e) => setEndsOn(e.target.value)} className={field} />
        </label>
      </div>
      <label className="block text-sm">
        <span className="font-semibold text-gray-700">Details (optional)</span>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} rows={3}
          placeholder="One game to 11, win by 2. Play within a week of accepting a challenge." className="mt-1 block w-full rounded-lg border border-gray-300 p-3 text-base" />
      </label>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p>}
      <button type="submit" disabled={pending} className="min-h-[52px] w-full rounded-lg bg-dink-blue px-4 text-lg font-extrabold text-white disabled:opacity-60">
        {pending ? 'Creating…' : 'Create ladder'}
      </button>
    </form>
  );
}
