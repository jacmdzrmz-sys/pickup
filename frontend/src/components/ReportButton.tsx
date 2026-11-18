'use client';

import { useAsync } from '@/lib/use-async';
import {useState} from 'react';
import { REPORT_CATEGORIES } from '@/lib/labels';
import { submitReport } from '@/app/games/actions';

export default function ReportButton({
  targetType,
  gameId,
  userId,
  label,
  signedIn,
}: {
  targetType: 'game' | 'user';
  gameId?: string;
  userId?: string;
  label: string;
  signedIn: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState('');
  const [details, setDetails] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useAsync();

  if (done) {
    return (
      <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">
        Thanks — your report was sent to the Evanston Dinks moderators.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          if (!signedIn) {
            window.location.assign(`/auth/login?next=${encodeURIComponent(window.location.pathname)}`);
            return;
          }
          setOpen(true);
        }}
        className="text-sm font-semibold text-gray-600 underline hover:text-gray-900"
      >
        🚩 {label}
      </button>
    );
  }

  return (
    <form
      className="space-y-3 rounded-lg border border-gray-200 bg-white p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!category) {
          setError('Please choose what happened.');
          return;
        }
        start(async () => {
          const res = await submitReport({ targetType, gameId, userId, category, details });
          if (res.ok) setDone(true);
          else setError(res.error);
        });
      }}
    >
      <p className="font-semibold">{label}</p>
      <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
        For emergencies or immediate danger, call 911.
      </p>
      <fieldset className="space-y-1">
        <legend className="text-sm font-semibold text-gray-700">What happened?</legend>
        {REPORT_CATEGORIES.map((c) => (
          <label key={c.value} className="flex min-h-[40px] items-center gap-3 text-sm">
            <input
              type="radio"
              name="category"
              value={c.value}
              checked={category === c.value}
              onChange={() => setCategory(c.value)}
              className="h-5 w-5"
            />
            {c.label}
          </label>
        ))}
      </fieldset>
      <label className="block text-sm">
        <span className="font-semibold text-gray-700">Details (optional)</span>
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          maxLength={1000}
          rows={3}
          className="mt-1 block w-full rounded-lg border border-gray-300 p-3"
        />
      </label>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="flex gap-2">
        <button disabled={pending} className="min-h-[44px] flex-1 rounded-lg bg-gray-900 px-4 font-semibold text-white disabled:opacity-60">
          Send report
        </button>
        <button type="button" onClick={() => setOpen(false)} className="min-h-[44px] rounded-lg border border-gray-300 px-4 font-semibold">
          Cancel
        </button>
      </div>
    </form>
  );
}
