import Link from 'next/link';
import { redirect } from 'next/navigation';
import clsx from 'clsx';
import { getSessionUser } from '@/lib/session';
import type { GameView, Location, LocationClosure, LocationHours, OfficialLink, Profile, ReportRow } from '@/lib/db-types';
import { REPORT_CATEGORIES, labelFor } from '@/lib/labels';
import { evanstonToday, formatDateShort, formatTime, formatTimeRange } from '@/lib/time';
import {
  addClosure, addHours, deleteClosure, deleteHours, removeGame, setSuspension, updateLink, updateLocation, updateReport,
} from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin · Evanston Dinks' };

const TABS = ['overview', 'reports', 'games', 'users', 'locations', 'closures', 'links'] as const;
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const field = 'mt-1 block min-h-[40px] w-full rounded-lg border border-gray-300 px-2 text-sm';
const btn = 'min-h-[40px] rounded-lg bg-gray-900 px-3 text-sm font-semibold text-white';
const btnLight = 'min-h-[40px] rounded-lg border border-gray-300 px-3 text-sm font-semibold';

export default async function AdminPage({ searchParams }: { searchParams: { tab?: string; msg?: string } }) {
  const { supabase, user } = await getSessionUser();
  if (!user) redirect('/auth/login?next=/admin');
  const { data: isAdmin } = await supabase.rpc('is_admin');
  if (isAdmin !== true) redirect('/');

  const tab = (TABS as readonly string[]).includes(searchParams.tab ?? '') ? searchParams.tab! : 'overview';
  const today = evanstonToday();

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-2xl font-bold">Admin</h1>
      <p className="text-sm text-gray-600">Moderation and court information. Changes apply right away.</p>
      <nav className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4">
        {TABS.map((t) => (
          <Link
            key={t}
            href={`/admin?tab=${t}`}
            className={clsx('whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold capitalize', tab === t ? 'bg-gray-900 text-white' : 'border border-gray-300 bg-white')}
          >
            {t}
          </Link>
        ))}
      </nav>
      {searchParams.msg && <p role="status" className="mt-3 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">{searchParams.msg}</p>}

      <div className="mt-5">
        {tab === 'overview' && <Overview />}
        {tab === 'reports' && <Reports />}
        {tab === 'games' && <Games today={today} />}
        {tab === 'users' && <Users />}
        {tab === 'locations' && <Locations />}
        {tab === 'closures' && <Closures today={today} />}
        {tab === 'links' && <Links />}
      </div>
    </main>
  );

  async function Overview() {
    const { data } = await supabase.rpc('admin_stats');
    const s = (data ?? {}) as Record<string, number>;
    const items: [string, string][] = [
      ['users', 'Players'], ['new_users_7d', 'New players (7 days)'], ['upcoming_games', 'Upcoming games'],
      ['games_created_7d', 'Games created (7 days)'], ['joins_7d', 'Joins (7 days)'], ['open_reports', 'Open reports'],
      ['suspended_users', 'Suspended accounts'],
    ];
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map(([k, label]) => (
          <div key={k} className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-2xl font-bold">{s[k] ?? 0}</p>
            <p className="text-sm text-gray-600">{label}</p>
          </div>
        ))}
      </div>
    );
  }

  async function Reports() {
    const { data } = await supabase.from('reports').select('*').order('created_at', { ascending: false }).limit(100);
    const reports = (data ?? []) as ReportRow[];
    if (!reports.length) return <p className="text-gray-600">No reports.</p>;
    return (
      <ul className="space-y-3">
        {reports.map((r) => (
          <li key={r.id} className="rounded-xl border border-gray-200 bg-white p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-bold">
                {labelFor(REPORT_CATEGORIES, r.category)} · <span className="uppercase">{r.status}</span>
              </p>
              <p className="text-gray-500">{new Date(r.created_at).toLocaleString('en-US', { timeZone: 'America/Chicago' })}</p>
            </div>
            <p className="mt-1 text-gray-700">{r.context_snapshot}</p>
            {r.details && <p className="mt-1 whitespace-pre-line rounded bg-gray-50 p-2">{r.details}</p>}
            <div className="mt-2 flex flex-wrap gap-3">
              {r.game_id && <Link href={`/games/${r.game_id}`} className="font-semibold text-blue-700 underline">View game</Link>}
              {r.reported_user_id && <Link href={`/players/${r.reported_user_id}`} className="font-semibold text-blue-700 underline">View player</Link>}
            </div>
            <form action={updateReport} className="mt-3 flex flex-wrap items-end gap-2">
              <input type="hidden" name="id" value={r.id} />
              <label className="text-xs">
                Status
                <select name="status" defaultValue={r.status} className={field}>
                  {['open', 'reviewing', 'resolved', 'dismissed'].map((s) => <option key={s}>{s}</option>)}
                </select>
              </label>
              <label className="flex-1 text-xs">
                Note
                <input name="note" defaultValue={r.admin_note ?? ''} className={field} />
              </label>
              <button className={btn}>Save</button>
            </form>
            <div className="mt-2 flex flex-wrap gap-2">
              {r.game_id && (
                <form action={removeGame}>
                  <input type="hidden" name="id" value={r.game_id} />
                  <input type="hidden" name="tab" value="reports" />
                  <input type="hidden" name="reason" value={`Report: ${r.category}`} />
                  <button className={btnLight}>Remove game</button>
                </form>
              )}
              {r.reported_user_id && (
                <form action={setSuspension}>
                  <input type="hidden" name="user_id" value={r.reported_user_id} />
                  <input type="hidden" name="suspend" value="1" />
                  <input type="hidden" name="tab" value="reports" />
                  <input type="hidden" name="reason" value={`Report: ${r.category}`} />
                  <button className={btnLight}>Suspend player</button>
                </form>
              )}
            </div>
          </li>
        ))}
      </ul>
    );
  }

  async function Games({ today }: { today: string }) {
    const { data } = await supabase
      .from('community_games_view')
      .select('*')
      .gte('game_date', today)
      .order('game_date')
      .order('start_time')
      .limit(200);
    const games = (data ?? []) as GameView[];
    if (!games.length) return <p className="text-gray-600">No upcoming games.</p>;
    return (
      <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
        {games.map((g) => (
          <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
            <div>
              <Link href={`/games/${g.id}`} className="font-semibold text-blue-700 underline">{g.title}</Link>
              <p className="text-gray-600">
                {formatDateShort(g.game_date)} · {formatTimeRange(g.start_time, g.end_time)} · {g.location_name} · {g.player_count}/{g.max_players} · host {g.host_name} · <span className="uppercase">{g.status}</span>
              </p>
            </div>
            {g.status !== 'removed' && (
              <form action={removeGame} className="flex gap-2">
                <input type="hidden" name="id" value={g.id} />
                <input name="reason" placeholder="Reason" className="min-h-[40px] rounded-lg border border-gray-300 px-2 text-sm" />
                <button className={btnLight}>Remove</button>
              </form>
            )}
          </li>
        ))}
      </ul>
    );
  }

  async function Users() {
    const [{ data: profs }, { data: susp }] = await Promise.all([
      supabase.from('profiles').select('id, display_name, created_at').order('created_at', { ascending: false }).limit(200),
      supabase.from('suspensions').select('user_id, reason'),
    ]);
    const suspended = new Map(((susp ?? []) as { user_id: string; reason: string | null }[]).map((s) => [s.user_id, s.reason]));
    return (
      <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
        {((profs ?? []) as Pick<Profile, 'id' | 'display_name' | 'created_at'>[]).map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
            <div>
              <Link href={`/players/${p.id}`} className="font-semibold text-blue-700 underline">{p.display_name}</Link>
              <span className="ml-2 text-gray-500">joined {formatDateShort(p.created_at.slice(0, 10))}</span>
              {suspended.has(p.id) && <span className="ml-2 font-bold text-red-700">SUSPENDED {suspended.get(p.id) ? `(${suspended.get(p.id)})` : ''}</span>}
            </div>
            <form action={setSuspension} className="flex gap-2">
              <input type="hidden" name="user_id" value={p.id} />
              <input type="hidden" name="suspend" value={suspended.has(p.id) ? '0' : '1'} />
              {!suspended.has(p.id) && <input name="reason" placeholder="Reason" className="min-h-[40px] rounded-lg border border-gray-300 px-2 text-sm" />}
              <button className={btnLight}>{suspended.has(p.id) ? 'Unsuspend' : 'Suspend'}</button>
            </form>
          </li>
        ))}
      </ul>
    );
  }

  async function Locations() {
    const [{ data: locs }, { data: hrs }] = await Promise.all([
      supabase.from('locations').select('*').order('sort_order'),
      supabase.from('location_hours').select('*').order('day_of_week').order('open_time'),
    ]);
    const hours = (hrs ?? []) as LocationHours[];
    const text = (name: keyof Location, label: string, l: Location) => (
      <label className="text-xs">
        {label}
        <input name={name} defaultValue={(l[name] as string | null) ?? ''} className={field} />
      </label>
    );
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          “Playing hours (enforced)” decide which game times are allowed. A location with no hours can’t accept games. Keep these in
          line with the City’s current rules and schedules.
        </p>
        {((locs ?? []) as Location[]).map((l) => (
          <details key={l.id} className="rounded-xl border border-gray-200 bg-white">
            <summary className="cursor-pointer p-4 font-semibold">
              {l.name} <span className="text-sm font-normal text-gray-500">· {l.setting} · {l.status}{!l.accepts_games ? ' · not accepting games' : ''}</span>
            </summary>
            <div className="space-y-4 border-t border-gray-100 p-4">
              <form action={updateLocation} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input type="hidden" name="id" value={l.id} />
                {text('name', 'Name', l)}
                <label className="text-xs">
                  Status
                  <select name="status" defaultValue={l.status} className={field}>
                    <option value="open">open</option>
                    <option value="temporarily_unavailable">temporarily unavailable</option>
                    <option value="closed">closed</option>
                  </select>
                </label>
                {text('status_note', 'Status note (shown to players)', l)}
                <label className="text-xs">
                  Courts
                  <input name="court_count" type="number" min={0} defaultValue={l.court_count ?? ''} className={field} />
                </label>
                {text('court_notes', 'Court notes', l)}
                {text('hours_summary', 'Hours (display text)', l)}
                {text('address', 'Address', l)}
                {text('phone', 'Phone', l)}
                {text('maps_query', 'Map search text', l)}
                {text('reservation_info', 'Reservation info', l)}
                {text('first_come_info', 'First-come info', l)}
                {text('open_gym_info', 'Open gym / drop-in info', l)}
                {text('rental_info', 'Rental info', l)}
                {text('contact_method', 'Reservation / contact method', l)}
                {text('official_url', 'Official City page URL', l)}
                {text('schedule_url', 'Official City Schedule URL', l)}
                {text('reservation_url', 'Reservation URL', l)}
                <label className="text-xs">
                  Info last checked against City site
                  <input name="info_checked_on" type="date" defaultValue={l.info_checked_on ?? ''} className={field} />
                </label>
                <fieldset className="flex flex-wrap gap-4 text-sm sm:col-span-2">
                  <label className="flex items-center gap-2"><input type="checkbox" name="accepts_games" defaultChecked={l.accepts_games} /> Accepts games</label>
                  <label className="flex items-center gap-2"><input type="checkbox" name="has_lights" defaultChecked={l.has_lights} /> Lighted</label>
                  {['first_come', 'reservable', 'open_gym', 'rental'].map((a) => (
                    <label key={a} className="flex items-center gap-2">
                      <input type="checkbox" name="access_types" value={a} defaultChecked={l.access_types.includes(a)} /> {a.replace('_', ' ')}
                    </label>
                  ))}
                </fieldset>
                <button className={`${btn} sm:col-span-2`}>Save location</button>
              </form>

              <div>
                <h3 className="font-semibold">Playing hours (enforced)</h3>
                <ul className="mt-2 space-y-1 text-sm">
                  {hours.filter((h) => h.location_id === l.id).map((h) => (
                    <li key={h.id} className="flex items-center justify-between rounded bg-gray-50 px-3 py-1.5">
                      <span>
                        {DAYS[h.day_of_week]} {formatTime(h.open_time)}–{formatTime(h.close_time)}
                        {h.valid_from || h.valid_until ? ` (${h.valid_from ?? '…'} to ${h.valid_until ?? '…'})` : ''}
                        {h.note ? <span className="text-gray-500"> · {h.note}</span> : null}
                      </span>
                      <form action={deleteHours}>
                        <input type="hidden" name="id" value={h.id} />
                        <button className="text-sm font-semibold text-red-700 underline">Remove</button>
                      </form>
                    </li>
                  ))}
                  {!hours.some((h) => h.location_id === l.id) && <li className="text-red-700">No hours — games can’t be created here.</li>}
                </ul>
                <form action={addHours} className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-6">
                  <input type="hidden" name="location_id" value={l.id} />
                  <fieldset className="col-span-2 flex flex-wrap gap-2 text-sm sm:col-span-6">
                    {DAYS.map((d, i) => (
                      <label key={d} className="flex items-center gap-1"><input type="checkbox" name="days" value={i} /> {d}</label>
                    ))}
                  </fieldset>
                  <label className="text-xs">Open<input type="time" name="open_time" required className={field} /></label>
                  <label className="text-xs">Close<input type="time" name="close_time" required className={field} /></label>
                  <label className="text-xs">From (opt.)<input type="date" name="valid_from" className={field} /></label>
                  <label className="text-xs">Until (opt.)<input type="date" name="valid_until" className={field} /></label>
                  <label className="text-xs">Note<input name="note" className={field} /></label>
                  <button className={`${btn} self-end`}>Add hours</button>
                </form>
              </div>
            </div>
          </details>
        ))}
      </div>
    );
  }

  async function Closures({ today }: { today: string }) {
    const [{ data: cl }, { data: locs }] = await Promise.all([
      supabase.from('location_closures').select('*').gte('ends_on', today).order('starts_on'),
      supabase.from('locations').select('id, name').order('sort_order'),
    ]);
    const locations = (locs ?? []) as Pick<Location, 'id' | 'name'>[];
    const name = (c: LocationClosure) =>
      c.location_id ? locations.find((l) => l.id === c.location_id)?.name ?? 'Location' : c.setting ? `All ${c.setting} locations` : 'All locations';
    return (
      <div className="space-y-4">
        <form action={addClosure} className="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-3">
          <h2 className="font-bold sm:col-span-3">Mark a location (or all) unavailable</h2>
          <label className="text-xs sm:col-span-3">
            Applies to
            <select name="scope" className={field} defaultValue="outdoor">
              <option value="outdoor">All outdoor courts</option>
              <option value="indoor">All indoor facilities</option>
              <option value="all">All locations</option>
              {locations.map((l) => <option key={l.id} value={`loc:${l.id}`}>{l.name}</option>)}
            </select>
          </label>
          <label className="text-xs">From<input type="date" name="starts_on" required min={today} className={field} /></label>
          <label className="text-xs">Until<input type="date" name="ends_on" min={today} className={field} /></label>
          <label className="text-xs">Reason (shown to players)<input name="reason" required placeholder="e.g. Holiday closure (City notice)" className={field} /></label>
          <label className="text-xs">Start time (optional)<input type="time" name="start_time" className={field} /></label>
          <label className="text-xs">End time (optional)<input type="time" name="end_time" className={field} /></label>
          <button className={`${btn} self-end`}>Add closure</button>
        </form>
        <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
          {((cl ?? []) as LocationClosure[]).map((c) => (
            <li key={c.id} className="flex items-center justify-between p-3 text-sm">
              <span>
                <strong>{name(c)}</strong> · {formatDateShort(c.starts_on)}
                {c.ends_on !== c.starts_on ? ` – ${formatDateShort(c.ends_on)}` : ''}
                {c.start_time && c.end_time ? ` · ${formatTimeRange(c.start_time, c.end_time)}` : ' · all day'} · {c.reason}
              </span>
              <form action={deleteClosure}>
                <input type="hidden" name="id" value={c.id} />
                <button className="font-semibold text-red-700 underline">Remove</button>
              </form>
            </li>
          ))}
          {!(cl ?? []).length && <li className="p-3 text-sm text-gray-600">No current or upcoming closures.</li>}
        </ul>
      </div>
    );
  }

  async function Links() {
    const { data } = await supabase.from('official_links').select('*').order('sort_order');
    return (
      <div className="space-y-3">
        {((data ?? []) as OfficialLink[]).map((l) => (
          <form key={l.key} action={updateLink} className="grid grid-cols-1 gap-2 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-3">
            <input type="hidden" name="key" value={l.key} />
            <p className="text-xs font-mono text-gray-500 sm:col-span-3">{l.key}</p>
            {l.key === 'donate' && (
              <p className="rounded bg-amber-50 p-2 text-xs text-amber-900 sm:col-span-3">
                Paste your Stripe Payment Link here (starts with https://buy.stripe.com/). The donate buttons appear on the site as
                soon as you save. Clear it to hide them.
              </p>
            )}
            <label className="text-xs">Label<input name="label" defaultValue={l.label} required className={field} /></label>
            <label className="text-xs sm:col-span-2">URL<input name="url" type="url" defaultValue={l.url} required={l.key !== 'donate'} className={field} /></label>
            <label className="text-xs sm:col-span-2">Description<input name="description" defaultValue={l.description ?? ''} className={field} /></label>
            <button className={`${btn} self-end`}>Save</button>
          </form>
        ))}
      </div>
    );
  }
}
