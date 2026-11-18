'use client';

import { useAsync } from '@/lib/use-async';
import { useRouter } from 'next/navigation';
import {useEffect, useMemo, useState} from 'react';
import clsx from 'clsx';
import type { Location, LocationClosure, LocationHours } from '@/lib/db-types';
import type { LinkMap } from '@/lib/official';
import { COURT_STATUSES, GAME_TYPES, SKILL_LEVELS, labelFor } from '@/lib/labels';
import { addDays, dayOfWeek, formatDateLong, formatTime, friendlyDate, timeSlots } from '@/lib/time';
import { RulesNotice } from '@/components/Notices';
import { createClient } from '@/utils/supabase/client';
import { createGame } from '../actions';

const PLAYER_CHOICES = [4, 6, 8, 12, 16];
const MAX_MINUTES = 240;

const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
};

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4">
      <h2 className="mb-3 flex items-center gap-2 font-bold text-gray-900">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-sm text-white">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Chip({ active, onClick, children, disabled }: { active: boolean; onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={active}
      className={clsx(
        'min-h-[44px] rounded-full border px-4 text-sm font-semibold transition disabled:opacity-40',
        active ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 bg-white text-gray-800 hover:bg-gray-50'
      )}
    >
      {children}
    </button>
  );
}

export default function CreateGameForm({
  locations,
  hours,
  closures,
  today,
  nowTime,
  initialLocationId,
  links,
}: {
  locations: Location[];
  hours: LocationHours[];
  closures: LocationClosure[];
  today: string;
  nowTime: string;
  initialLocationId?: string;
  links: LinkMap;
}) {
  const router = useRouter();
  const [pending, start] = useAsync();

  const [locationId, setLocationId] = useState(initialLocationId ?? '');
  const [date, setDate] = useState(today);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [skill, setSkill] = useState('all');
  const [gameType, setGameType] = useState('casual');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [courtStatus, setCourtStatus] = useState('');
  const [reservationConfirmed, setReservationConfirmed] = useState(false);
  const [rulesAck, setRulesAck] = useState(false);
  const [title, setTitle] = useState('');
  const [titleTouched, setTitleTouched] = useState(false);
  const [description, setDescription] = useState('');
  const [isFree, setIsFree] = useState(true);
  const [feeNote, setFeeNote] = useState('');

  const [serverCheck, setServerCheck] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<string | null>(null);

  const location = locations.find((l) => l.id === locationId);
  const available = (l: Location) => l.status === 'open' && l.accepts_games && hours.some((h) => h.location_id === l.id);

  // Playing windows for this location on this date
  const windows = useMemo(() => {
    if (!location) return [];
    const dow = dayOfWeek(date);
    return hours
      .filter(
        (h) =>
          h.location_id === location.id &&
          h.day_of_week === dow &&
          (!h.valid_from || h.valid_from <= date) &&
          (!h.valid_until || h.valid_until >= date)
      )
      .map((h) => ({ open: h.open_time.slice(0, 5), close: h.close_time.slice(0, 5) }))
      .sort((a, b) => a.open.localeCompare(b.open));
  }, [location, hours, date]);

  const closureToday = useMemo(() => {
    if (!location) return null;
    return (
      closures.find(
        (c) =>
          (c.location_id === location.id || (!c.location_id && (!c.setting || c.setting === location.setting))) &&
          c.starts_on <= date &&
          c.ends_on >= date
      ) ?? null
    );
  }, [closures, location, date]);

  const startOptions = useMemo(() => {
    const out: string[] = [];
    for (const w of windows) {
      for (const s of timeSlots(w.open, w.close)) {
        if (toMin(s) + 30 > toMin(w.close)) continue;
        if (date === today && toMin(s) <= toMin(nowTime)) continue;
        out.push(s);
      }
    }
    return out;
  }, [windows, date, today, nowTime]);

  const endOptions = useMemo(() => {
    if (!startTime) return [];
    const w = windows.find((w) => toMin(w.open) <= toMin(startTime) && toMin(startTime) < toMin(w.close));
    if (!w) return [];
    return timeSlots(startTime, w.close).filter(
      (t) => toMin(t) > toMin(startTime) && toMin(t) - toMin(startTime) <= MAX_MINUTES
    );
  }, [windows, startTime]);

  // Keep selections valid as inputs change
  useEffect(() => {
    if (startTime && !startOptions.includes(startTime)) setStartTime('');
  }, [startOptions, startTime]);
  useEffect(() => {
    if (!startTime) {
      setEndTime('');
      return;
    }
    if (!endTime || !endOptions.includes(endTime)) {
      const preferred = endOptions.find((t) => toMin(t) - toMin(startTime) === 120) ?? endOptions[endOptions.length - 1] ?? '';
      setEndTime(preferred);
    }
  }, [startTime, endOptions, endTime]);
  // Sensible default court status whenever the location changes
  useEffect(() => {
    if (!location) return;
    setReservationConfirmed(false);
    setCourtStatus(
      location.setting === 'outdoor' ? 'first_come' : location.access_types.includes('open_gym') ? 'drop_in' : 'other'
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId]);
  useEffect(() => {
    if (!titleTouched && location) setTitle(`${labelFor(GAME_TYPES, gameType)} pickleball at ${location.name}`.slice(0, 80));
  }, [location, gameType, titleTouched]);

  // Ask the database (the source of truth) whether this time is allowed
  useEffect(() => {
    setServerCheck(null);
    if (!locationId || !date || !startTime || !endTime) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      const supabase = createClient();
      const { data } = await supabase.rpc('check_game_time', {
        p_location_id: locationId,
        p_date: date,
        p_start: startTime,
        p_end: endTime,
      });
      if (!cancelled) setServerCheck(data ? String(data) : null);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [locationId, date, startTime, endTime]);

  const timeProblem =
    location && windows.length === 0
      ? 'That time is outside the current playing hours for this location. Please choose another time.'
      : location && startOptions.length === 0
        ? 'There are no playing times left at this location on this date. Please choose another date.'
        : null;

  const ready =
    !!location &&
    !!startTime &&
    !!endTime &&
    !!courtStatus &&
    (courtStatus !== 'reserved' || reservationConfirmed) &&
    rulesAck &&
    title.trim().length >= 3 &&
    !serverCheck &&
    !timeProblem;

  function submit(allowOverlap = false) {
    setError(null);
    if (!ready) {
      setError('Please finish the steps above.');
      return;
    }
    start(async () => {
      const res = await createGame({
        locationId,
        date,
        start: startTime,
        end: endTime,
        skill,
        gameType,
        maxPlayers,
        courtStatus,
        reservationConfirmed,
        rulesAcknowledged: rulesAck,
        title,
        description,
        isFree,
        feeNote,
        allowOverlap,
      });
      if (res.ok && res.id) {
        router.push(`/games/${res.id}?created=1`);
        return;
      }
      if (!res.ok) {
        setError(res.error);
        setDuplicate(res.duplicate ?? null);
      }
    });
  }

  const outdoor = locations.filter((l) => l.setting === 'outdoor');
  const indoor = locations.filter((l) => l.setting === 'indoor');

  return (
    <form
      className="mt-5 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit(false);
      }}
    >
      <Step n={1} title="Choose location">
        <select
          value={locationId}
          onChange={(e) => setLocationId(e.target.value)}
          className="block min-h-[48px] w-full rounded-lg border border-gray-300 bg-white px-3 text-base"
          required
        >
          <option value="">Select a court or facility…</option>
          <optgroup label="Outdoor courts">
            {outdoor.map((l) => (
              <option key={l.id} value={l.id} disabled={!available(l)}>
                {l.name}
                {l.has_lights ? ' (lighted)' : ''}
                {!available(l) ? ' — not available' : ''}
              </option>
            ))}
          </optgroup>
          <optgroup label="Indoor facilities">
            {indoor.map((l) => (
              <option key={l.id} value={l.id} disabled={!available(l)}>
                {l.name}
                {!available(l) ? ' — hours not confirmed' : ''}
              </option>
            ))}
          </optgroup>
        </select>
        {location && (
          <div className="mt-2 space-y-1 text-sm text-gray-600">
            <p>{location.setting === 'indoor' ? '🏢 Indoor' : '🌳 Outdoor'} · {location.hours_summary}</p>
            {location.setting === 'indoor' && location.schedule_url && (
              <a href={location.schedule_url} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-700 underline">
                Official City Schedule ↗
              </a>
            )}
          </div>
        )}
      </Step>

      <Step n={2} title="Choose date">
        <div className="flex flex-wrap gap-2">
          <Chip active={date === today} onClick={() => setDate(today)}>Today</Chip>
          <Chip active={date === addDays(today, 1)} onClick={() => setDate(addDays(today, 1))}>Tomorrow</Chip>
          <input
            type="date"
            min={today}
            max={addDays(today, 60)}
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="min-h-[44px] rounded-full border border-gray-300 px-4 text-sm"
            aria-label="Pick a date"
          />
        </div>
        <p className="mt-2 text-sm text-gray-600">{formatDateLong(date)}</p>
        {closureToday && (
          <p className="mt-2 rounded-lg bg-red-50 p-2 text-sm text-red-800">Closed or unavailable: {closureToday.reason}</p>
        )}
      </Step>

      <Step n={3} title="Choose start and end time">
        {!location ? (
          <p className="text-sm text-gray-500">Choose a location first to see its playing hours.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">
                <span className="font-semibold text-gray-700">Start</span>
                <select
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="mt-1 block min-h-[48px] w-full rounded-lg border border-gray-300 bg-white px-3 text-base"
                >
                  <option value="">Start time</option>
                  {startOptions.map((t) => (
                    <option key={t} value={t}>{formatTime(t)}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="font-semibold text-gray-700">End</span>
                <select
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  disabled={!startTime}
                  className="mt-1 block min-h-[48px] w-full rounded-lg border border-gray-300 bg-white px-3 text-base disabled:bg-gray-100"
                >
                  <option value="">End time</option>
                  {endOptions.map((t) => (
                    <option key={t} value={t}>{formatTime(t)}</option>
                  ))}
                </select>
              </label>
            </div>
            {windows.length > 0 && (
              <p className="mt-2 text-xs text-gray-500">
                Allowed on this day: {windows.map((w) => `${formatTime(w.open)}–${formatTime(w.close)}`).join(', ')}
              </p>
            )}
            {(timeProblem || serverCheck) && (
              <p role="alert" className="mt-2 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800">
                {timeProblem ?? serverCheck}
              </p>
            )}
          </>
        )}
      </Step>

      <Step n={4} title="Choose skill level">
        <div className="flex flex-wrap gap-2">
          {SKILL_LEVELS.map((s) => (
            <Chip key={s.value} active={skill === s.value} onClick={() => setSkill(s.value)}>{s.label}</Chip>
          ))}
        </div>
      </Step>

      <Step n={5} title="Choose game type">
        <div className="flex flex-wrap gap-2">
          {GAME_TYPES.map((s) => (
            <Chip key={s.value} active={gameType === s.value} onClick={() => setGameType(s.value)}>{s.label}</Chip>
          ))}
        </div>
      </Step>

      <Step n={6} title="Choose player limit (including you)">
        <div className="flex flex-wrap items-center gap-2">
          {PLAYER_CHOICES.map((n) => (
            <Chip key={n} active={maxPlayers === n} onClick={() => setMaxPlayers(n)}>{n}</Chip>
          ))}
          <input
            type="number"
            min={2}
            max={32}
            value={maxPlayers}
            onChange={(e) => setMaxPlayers(Math.min(32, Math.max(2, Number(e.target.value) || 2)))}
            className="min-h-[44px] w-20 rounded-full border border-gray-300 px-3 text-center text-sm"
            aria-label="Custom player limit"
          />
        </div>
      </Step>

      <Step n={7} title="Choose court status">
        <div className="space-y-2">
          {COURT_STATUSES.map((s) => {
            const disabled = s.value === 'drop_in' && location?.setting !== 'indoor';
            return (
              <label
                key={s.value}
                className={clsx(
                  'flex cursor-pointer items-start gap-3 rounded-lg border p-3',
                  courtStatus === s.value ? 'border-blue-600 bg-blue-50' : 'border-gray-200',
                  disabled && 'cursor-not-allowed opacity-50'
                )}
              >
                <input
                  type="radio"
                  name="court_status"
                  value={s.value}
                  checked={courtStatus === s.value}
                  disabled={disabled}
                  onChange={() => setCourtStatus(s.value)}
                  className="mt-1 h-5 w-5"
                />
                <span>
                  <span className="block font-semibold">{s.label}</span>
                  <span className="block text-sm text-gray-600">
                    {disabled ? 'Only for indoor open gym sessions.' : s.help}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
        {courtStatus === 'reserved' && (
          <label className="mt-3 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
            <input
              type="checkbox"
              checked={reservationConfirmed}
              onChange={(e) => setReservationConfirmed(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0"
            />
            I have obtained or will obtain the necessary reservation/permit for this game.
          </label>
        )}
        {courtStatus === 'reserved' && (
          <a
            href={links.reserve_court?.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-sm font-semibold text-blue-700 underline"
          >
            Reserve through the City (Amilia) ↗
          </a>
        )}
      </Step>

      <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="font-bold text-gray-900">Details</h2>
        <label className="block text-sm">
          <span className="font-semibold text-gray-700">Title</span>
          <input
            value={title}
            maxLength={80}
            onChange={(e) => {
              setTitle(e.target.value);
              setTitleTouched(true);
            }}
            className="mt-1 block min-h-[48px] w-full rounded-lg border border-gray-300 px-3 text-base"
          />
        </label>
        <div className="flex gap-2">
          <Chip active={isFree} onClick={() => setIsFree(true)}>Free</Chip>
          <Chip active={!isFree} onClick={() => setIsFree(false)}>Has a fee</Chip>
        </div>
        {!isFree && (
          <input
            value={feeNote}
            maxLength={80}
            onChange={(e) => setFeeNote(e.target.value)}
            placeholder="e.g. $5 drop-in at front desk, or split court rental"
            className="block min-h-[48px] w-full rounded-lg border border-gray-300 px-3 text-base"
          />
        )}
        <textarea
          value={description}
          maxLength={500}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Optional note (bring a paddle, meet by court 3…)"
          className="block w-full rounded-lg border border-gray-300 p-3 text-base"
        />
      </section>

      <Step n={8} title="Confirm rules">
        <RulesNotice links={links} compact />
        <label className="mt-3 flex items-start gap-3 text-sm font-semibold">
          <input type="checkbox" checked={rulesAck} onChange={(e) => setRulesAck(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0" />
          I understand and will follow these rules.
        </label>
      </Step>

      <section className="rounded-xl border-2 border-blue-600 bg-white p-4">
        <h2 className="font-bold text-gray-900">Review</h2>
        <dl className="mt-2 grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-gray-500">Location</dt>
          <dd className="font-semibold">{location?.name ?? '—'}</dd>
          <dt className="text-gray-500">Date</dt>
          <dd className="font-semibold">{friendlyDate(date, today)} · {formatDateLong(date)}</dd>
          <dt className="text-gray-500">Time</dt>
          <dd className="font-semibold">{startTime && endTime ? `${formatTime(startTime)} – ${formatTime(endTime)}` : '—'}</dd>
          <dt className="text-gray-500">Players</dt>
          <dd className="font-semibold">Up to {maxPlayers}</dd>
          <dt className="text-gray-500">Court status</dt>
          <dd className="font-semibold">{labelFor(COURT_STATUSES, courtStatus) || '—'}</dd>
        </dl>
        <p className="mt-3 rounded-lg bg-amber-50 p-2 text-sm font-semibold text-amber-900">
          Creating this game does not reserve a public court.
        </p>

        {error && (
          <div role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">
            <p className="font-semibold">{error}</p>
            {duplicate && (
              <>
                <p className="mt-1">{duplicate}</p>
                <p className="mt-1">Different groups can share a park with several courts. Still want to post yours?</p>
                <button
                  type="button"
                  onClick={() => submit(true)}
                  disabled={pending}
                  className="mt-2 min-h-[44px] rounded-lg bg-gray-900 px-4 font-semibold text-white"
                >
                  Create anyway
                </button>
              </>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={pending || !ready}
          className="mt-4 min-h-[56px] w-full rounded-lg bg-blue-600 px-4 text-lg font-semibold text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-600"
        >
          {pending ? 'Creating…' : 'Create Game'}
        </button>
        {!ready && !pending && (
          <p className="mt-2 text-center text-xs text-gray-500">Finish each step to enable Create Game.</p>
        )}
      </section>
    </form>
  );
}
