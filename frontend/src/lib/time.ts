// All Evanston Dinks game times are Evanston local time (America/Chicago).
export const EVANSTON_TZ = 'America/Chicago';

const pad = (n: number) => String(n).padStart(2, '0');

/** Today's date in Evanston as YYYY-MM-DD. */
export function evanstonToday(now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: EVANSTON_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Current Evanston wall-clock time as HH:MM (24h). */
export function evanstonNowTime(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: EVANSTON_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const h = parts.find((p) => p.type === 'hour')?.value ?? '00';
  const m = parts.find((p) => p.type === 'minute')?.value ?? '00';
  return `${h === '24' ? '00' : h}:${m}`;
}

function toUtcDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00Z`);
}

export function addDays(dateStr: string, days: number): string {
  const d = toUtcDate(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 0 = Sunday … 6 = Saturday */
export function dayOfWeek(dateStr: string): number {
  return toUtcDate(dateStr).getUTCDay();
}

/** The coming (or current) Saturday–Sunday. */
export function weekendRange(today: string): [string, string] {
  const dow = dayOfWeek(today);
  if (dow === 0) return [today, today];
  if (dow === 6) return [today, addDays(today, 1)];
  return [addDays(today, 6 - dow), addDays(today, 7 - dow)];
}

/** "8:00 PM" from "20:00" or "20:00:00" */
export function formatTime(t: string): string {
  const [hStr, mStr] = t.split(':');
  const h = Number(hStr);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mStr ?? '00'} ${suffix}`;
}

export function formatTimeRange(start: string, end: string): string {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

/** "Sat, Nov 22" */
export function formatDateShort(dateStr: string): string {
  return toUtcDate(dateStr).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/** "Saturday, November 22, 2026" */
export function formatDateLong(dateStr: string): string {
  return toUtcDate(dateStr).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/** "Today", "Tomorrow" or "Sat, Nov 22" */
export function friendlyDate(dateStr: string, today: string = evanstonToday()): string {
  if (dateStr === today) return 'Today';
  if (dateStr === addDays(today, 1)) return 'Tomorrow';
  return formatDateShort(dateStr);
}

/** "HH:MM" strings every `step` minutes from open to close (inclusive). */
export function timeSlots(open: string, close: string, step = 30): string[] {
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + (m || 0);
  };
  const out: string[] = [];
  for (let m = toMin(open); m <= toMin(close); m += step) {
    out.push(`${pad(Math.floor(m / 60))}:${pad(m % 60)}`);
  }
  return out;
}

export function isValidDateString(s: unknown): s is string {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
}
