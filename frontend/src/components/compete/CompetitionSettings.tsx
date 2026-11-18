'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAsync } from '@/lib/use-async';
import { saveCompetitionSettings } from '@/app/compete/actions';

/** Turn on competitions (18+ confirmation) and choose whether to appear on public lists. */
export default function CompetitionSettings({
  isAdult,
  showOnLeaderboards,
  compact = false,
}: {
  isAdult: boolean;
  showOnLeaderboards: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const [adult, setAdult] = useState(isAdult);
  const [show, setShow] = useState(showOnLeaderboards);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useAsync();

  return (
    <form
      className="space-y-3 rounded-xl border border-gray-200 bg-white p-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveCompetitionSettings(adult, adult && show);
          setMsg(res.ok ? { ok: true, text: 'Saved!' } : { ok: false, text: res.error });
          if (res.ok) router.refresh();
        });
      }}
    >
      <h2 className="text-lg font-bold">{compact ? 'Turn on competitions' : 'Competitions & Top Players'}</h2>
      <p className="text-sm text-gray-600">
        Report scores, join round robins and ladders. Competitions are for adults only.
      </p>
      <label className="flex min-h-[44px] items-start gap-3">
        <input type="checkbox" className="mt-1 h-5 w-5" checked={adult} onChange={(e) => { setAdult(e.target.checked); if (!e.target.checked) setShow(false); }} />
        <span>I’m 18 or older and want to take part in competitions.</span>
      </label>
      <label className="flex min-h-[44px] items-start gap-3">
        <input type="checkbox" className="mt-1 h-5 w-5" checked={show} disabled={!adult} onChange={(e) => setShow(e.target.checked)} />
        <span>
          Show me on public lists (Top Players, Most Active, Champion of the Month).
          <span className="block text-xs text-gray-500">Off by default. Round robin and ladder standings show everyone who joins them.</span>
        </span>
      </label>
      <button type="submit" disabled={pending} className="min-h-[48px] rounded-lg bg-blue-600 px-5 font-semibold text-white disabled:opacity-60">
        {pending ? 'Saving…' : 'Save'}
      </button>
      {msg && <p role="status" className={msg.ok ? 'text-sm text-green-700' : 'text-sm text-red-700'}>{msg.text}</p>}
    </form>
  );
}
