'use client';

import { useState } from 'react';
import { ALARM_CHOICES } from '@/lib/calendar';

/** "Add to calendar" with an optional alert, for Google, Apple, Outlook and most phones. */
export default function AddToCalendar({ googleUrl, icsPath }: { googleUrl: string; icsPath: string }) {
  const [open, setOpen] = useState(false);
  const [alert, setAlert] = useState(60);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold"
      >
        📅 Add to calendar
      </button>
    );
  }

  return (
    <div className="w-full space-y-2 rounded-xl border border-blue-200 bg-blue-50 p-3">
      <p className="font-semibold text-gray-900">📅 Add to your calendar</p>
      <label className="block text-sm">
        <span className="font-semibold text-gray-700">Reminder alert</span>
        <select
          value={alert}
          onChange={(e) => setAlert(Number(e.target.value))}
          className="mt-1 block min-h-[44px] w-full rounded-lg border border-gray-300 bg-white px-3 text-base"
        >
          {ALARM_CHOICES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </label>
      <div className="grid gap-2 sm:grid-cols-2">
        <a
          href={`${icsPath}?alert=${alert}`}
          className="flex min-h-[48px] items-center justify-center rounded-lg bg-blue-600 px-3 font-semibold text-white"
        >
          Apple / Outlook / phone
        </a>
        <a
          href={googleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-[48px] items-center justify-center rounded-lg border border-gray-300 bg-white px-3 font-semibold text-gray-900"
        >
          Google Calendar
        </a>
      </div>
      <p className="text-xs text-gray-600">
        Google Calendar uses your usual Google reminder. If the game changes or is cancelled, we’ll tell you in the app.
      </p>
    </div>
  );
}
