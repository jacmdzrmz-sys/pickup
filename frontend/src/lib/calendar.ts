// Calendar helpers: an .ics file (Apple Calendar, Outlook, most phones)
// and a Google Calendar link. Times are Evanston local time.

export type CalendarEvent = {
  uid: string;
  title: string;
  description: string;
  location: string;
  date: string; // YYYY-MM-DD
  start: string; // HH:MM[:SS]
  end: string; // HH:MM[:SS]
  url: string;
};

export const ALARM_CHOICES = [
  { value: 0, label: 'No alert' },
  { value: 30, label: '30 minutes before' },
  { value: 60, label: '1 hour before' },
  { value: 120, label: '2 hours before' },
  { value: 1440, label: '1 day before' },
] as const;

const stamp = (date: string, time: string) => `${date.replace(/-/g, '')}T${time.slice(0, 5).replace(':', '')}00`;

function escapeText(s: string) {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Fold lines longer than 75 octets, as the iCalendar format requires. */
function fold(line: string) {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let cur = '';
  let len = 0;
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length;
    if (len + n > (out.length ? 74 : 75)) {
      out.push(cur);
      cur = '';
      len = 0;
    }
    cur += ch;
    len += n;
  }
  out.push(cur);
  return out.join('\r\n ');
}

const VTIMEZONE = [
  'BEGIN:VTIMEZONE',
  'TZID:America/Chicago',
  'BEGIN:DAYLIGHT',
  'TZOFFSETFROM:-0600',
  'TZOFFSETTO:-0500',
  'TZNAME:CDT',
  'DTSTART:19700308T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU',
  'END:DAYLIGHT',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:-0500',
  'TZOFFSETTO:-0600',
  'TZNAME:CST',
  'DTSTART:19701101T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU',
  'END:STANDARD',
  'END:VTIMEZONE',
];

export function buildIcs(e: CalendarEvent, alarmMinutes = 0): string {
  const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Evanston Dinks//Games//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...VTIMEZONE,
    'BEGIN:VEVENT',
    `UID:${e.uid}@evanstondinks.app`,
    `DTSTAMP:${now}`,
    `DTSTART;TZID=America/Chicago:${stamp(e.date, e.start)}`,
    `DTEND;TZID=America/Chicago:${stamp(e.date, e.end)}`,
    `SUMMARY:${escapeText(e.title)}`,
    `LOCATION:${escapeText(e.location)}`,
    `DESCRIPTION:${escapeText(e.description)}`,
    `URL:${e.url}`,
  ];
  if (alarmMinutes > 0) {
    lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escapeText(e.title)}`, `TRIGGER:-PT${alarmMinutes}M`, 'END:VALARM');
  }
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

export function googleCalendarUrl(e: CalendarEvent): string {
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.title,
    dates: `${stamp(e.date, e.start)}/${stamp(e.date, e.end)}`,
    ctz: 'America/Chicago',
    details: e.description,
    location: e.location,
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

export function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = Math.min(h * 60 + m + minutes, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export const SITE = 'https://www.evanstondinks.app';

export function icsResponse(ics: string, filename: string) {
  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}

export function parseAlarm(v: string | null): number {
  const n = Number(v);
  return ALARM_CHOICES.some((c) => c.value === n) ? n : 0;
}
