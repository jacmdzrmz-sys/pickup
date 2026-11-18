'use client';

import { useEffect, useState } from 'react';
import { searchPlayers, type PlayerOption } from '@/app/compete/actions';
import Avatar from './Avatar';

/** Search for another player who has competitions turned on. */
export default function PlayerPicker({
  label,
  value,
  onChange,
  exclude,
}: {
  label: string;
  value: PlayerOption | null;
  onChange: (p: PlayerOption | null) => void;
  exclude: string[];
}) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<PlayerOption[]>([]);
  const [searching, setSearching] = useState(false);
  const excludeKey = exclude.join(',');

  useEffect(() => {
    if (value || q.trim().length < 2) {
      setResults([]);
      return;
    }
    let live = true;
    setSearching(true);
    const t = setTimeout(async () => {
      const r = await searchPlayers(q);
      if (live) {
        setResults(r.filter((p) => !excludeKey.split(',').includes(p.id)));
        setSearching(false);
      }
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [q, value, excludeKey]);

  if (value) {
    return (
      <div>
        <span className="text-sm font-semibold text-gray-700">{label}</span>
        <div className="mt-1 flex min-h-[48px] items-center gap-2 rounded-lg border border-gray-300 bg-white px-3">
          <Avatar name={value.display_name} url={value.avatar_url} size="sm" />
          <span className="font-semibold">{value.display_name}</span>
          <button type="button" onClick={() => { onChange(null); setQ(''); }} className="ml-auto text-sm font-semibold text-blue-700 underline">
            Change
          </button>
        </div>
      </div>
    );
  }

  return (
    <label className="block">
      <span className="text-sm font-semibold text-gray-700">{label}</span>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Type a name"
        className="mt-1 block min-h-[48px] w-full rounded-lg border border-gray-300 px-3 text-base"
      />
      {q.trim().length >= 2 && (
        <ul className="mt-1 divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
          {results.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => onChange(p)} className="flex min-h-[48px] w-full items-center gap-2 px-3 text-left hover:bg-gray-50">
                <Avatar name={p.display_name} url={p.avatar_url} size="sm" />
                <span className="font-semibold">{p.display_name}</span>
              </button>
            </li>
          ))}
          {!searching && results.length === 0 && (
            <li className="px-3 py-2 text-sm text-gray-500">No match. They need an account with competitions turned on.</li>
          )}
        </ul>
      )}
    </label>
  );
}
