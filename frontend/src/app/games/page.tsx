import Link from 'next/link';
import clsx from 'clsx';
import GameCard from '@/components/GameCard';
import { DonateCard, donateUrl } from '@/components/Donate';
import { getOfficialLinks } from '@/lib/official';
import { getSessionUser } from '@/lib/session';
import type { GameView, Location } from '@/lib/db-types';
import { addDays, evanstonToday, formatDateShort, isValidDateString, weekendRange } from '@/lib/time';
import { GAME_TYPES, SKILL_LEVELS } from '@/lib/labels';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Browse Games · Evanston Dinks' };

type Search = {
  when?: string;
  date?: string;
  location?: string;
  skill?: string;
  type?: string;
  setting?: string;
  open?: string;
  price?: string;
};

const WHEN_TABS = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'weekend', label: 'This Weekend' },
];

function buildHref(params: Search, patch: Partial<Search>) {
  const merged: Record<string, string> = {};
  for (const [k, v] of Object.entries({ ...params, ...patch })) if (v) merged[k] = v;
  const qs = new URLSearchParams(merged).toString();
  return qs ? `/games?${qs}` : '/games';
}

export default async function BrowseGamesPage({ searchParams }: { searchParams: Search }) {
  const { supabase, user } = await getSessionUser();
  const today = evanstonToday();
  const when = WHEN_TABS.some((t) => t.value === searchParams.when) ? searchParams.when! : 'upcoming';
  const date = isValidDateString(searchParams.date) ? searchParams.date : undefined;

  let query = supabase
    .from('community_games_view')
    .select('*')
    .eq('status', 'scheduled')
    .eq('is_past', false)
    .order('game_date')
    .order('start_time')
    .limit(200);

  if (date) query = query.eq('game_date', date);
  else if (when === 'today') query = query.eq('game_date', today);
  else if (when === 'tomorrow') query = query.eq('game_date', addDays(today, 1));
  else if (when === 'weekend') {
    const [sat, sun] = weekendRange(today);
    query = query.gte('game_date', sat).lte('game_date', sun);
  }
  if (searchParams.location) query = query.eq('location_slug', searchParams.location);
  if (searchParams.skill) query = query.eq('skill_level', searchParams.skill);
  if (searchParams.type) query = query.eq('game_type', searchParams.type);
  if (searchParams.setting === 'indoor' || searchParams.setting === 'outdoor') query = query.eq('setting', searchParams.setting);
  if (searchParams.price === 'free') query = query.eq('is_free', true);
  if (searchParams.price === 'paid') query = query.eq('is_free', false);

  const [{ data: gamesData, error }, { data: locData }, blocksRes, joinedRes, links] = await Promise.all([
    query,
    supabase.from('locations').select('slug,name,setting,sort_order').order('sort_order'),
    user ? supabase.from('user_blocks').select('blocked_id') : Promise.resolve({ data: [] as { blocked_id: string }[] }),
    user
      ? supabase.from('community_game_players').select('game_id').eq('user_id', user.id)
      : Promise.resolve({ data: [] as { game_id: string }[] }),
    getOfficialLinks(supabase),
  ]);
  const donate = donateUrl(links);

  const blocked = new Set(((blocksRes.data ?? []) as { blocked_id: string }[]).map((b) => b.blocked_id));
  const joined = new Set(((joinedRes.data ?? []) as { game_id: string }[]).map((j) => j.game_id));
  let games = ((gamesData ?? []) as GameView[]).filter((g) => !blocked.has(g.host_id));
  if (searchParams.open === '1') games = games.filter((g) => g.player_count < g.max_players);

  const locations = (locData ?? []) as Pick<Location, 'slug' | 'name' | 'setting'>[];
  const activeFilters = ['date', 'location', 'skill', 'type', 'setting', 'open', 'price'].filter(
    (k) => (searchParams as Record<string, string | undefined>)[k]
  ).length;

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Browse Games</h1>
        <Link
          href="/games/new"
          className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          + Create Game
        </Link>
      </div>
      <p className="mt-1 text-sm text-gray-600">
        Community meetups posted by Evanston Dinks players. A listing is not a court reservation.
      </p>

      {/* When tabs */}
      <div className="-mx-4 mt-4 overflow-x-auto px-4">
        <div className="flex gap-2">
          {WHEN_TABS.map((t) => (
            <Link
              key={t.value}
              href={buildHref({ ...searchParams, date: undefined }, { when: t.value === 'upcoming' ? undefined : t.value })}
              className={clsx(
                'whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold',
                !date && when === t.value ? 'bg-gray-900 text-white' : 'border border-gray-300 bg-white text-gray-700'
              )}
            >
              {t.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Filters */}
      <details className="mt-3 rounded-xl border border-gray-200 bg-white" open={activeFilters > 0}>
        <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-gray-800">
          Filters{activeFilters > 0 ? ` (${activeFilters})` : ''}
        </summary>
        <form method="get" action="/games" className="grid grid-cols-1 gap-3 border-t border-gray-100 p-4 sm:grid-cols-2">
          {searchParams.when && <input type="hidden" name="when" value={searchParams.when} />}
          <label className="text-sm">
            <span className="font-semibold text-gray-700">Date</span>
            <input
              type="date"
              name="date"
              min={today}
              defaultValue={date ?? ''}
              className="mt-1 block min-h-[44px] w-full rounded-lg border border-gray-300 px-3"
            />
          </label>
          <label className="text-sm">
            <span className="font-semibold text-gray-700">Location</span>
            <select name="location" defaultValue={searchParams.location ?? ''} className="mt-1 block min-h-[44px] w-full rounded-lg border border-gray-300 px-3">
              <option value="">Any location</option>
              <optgroup label="Outdoor">
                {locations.filter((l) => l.setting === 'outdoor').map((l) => (
                  <option key={l.slug} value={l.slug}>{l.name}</option>
                ))}
              </optgroup>
              <optgroup label="Indoor">
                {locations.filter((l) => l.setting === 'indoor').map((l) => (
                  <option key={l.slug} value={l.slug}>{l.name}</option>
                ))}
              </optgroup>
            </select>
          </label>
          <label className="text-sm">
            <span className="font-semibold text-gray-700">Skill level</span>
            <select name="skill" defaultValue={searchParams.skill ?? ''} className="mt-1 block min-h-[44px] w-full rounded-lg border border-gray-300 px-3">
              <option value="">Any skill level</option>
              {SKILL_LEVELS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="font-semibold text-gray-700">Game type</span>
            <select name="type" defaultValue={searchParams.type ?? ''} className="mt-1 block min-h-[44px] w-full rounded-lg border border-gray-300 px-3">
              <option value="">Any game type</option>
              {GAME_TYPES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="font-semibold text-gray-700">Indoor / outdoor</span>
            <select name="setting" defaultValue={searchParams.setting ?? ''} className="mt-1 block min-h-[44px] w-full rounded-lg border border-gray-300 px-3">
              <option value="">Indoor or outdoor</option>
              <option value="outdoor">Outdoor</option>
              <option value="indoor">Indoor</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="font-semibold text-gray-700">Cost</span>
            <select name="price" defaultValue={searchParams.price ?? ''} className="mt-1 block min-h-[44px] w-full rounded-lg border border-gray-300 px-3">
              <option value="">Free or paid</option>
              <option value="free">Free</option>
              <option value="paid">Has a fee</option>
            </select>
          </label>
          <label className="flex min-h-[44px] items-center gap-3 text-sm font-semibold text-gray-700 sm:col-span-2">
            <input type="checkbox" name="open" value="1" defaultChecked={searchParams.open === '1'} className="h-5 w-5" />
            Only show games with open spots
          </label>
          <div className="flex gap-2 sm:col-span-2">
            <button className="min-h-[44px] flex-1 rounded-lg bg-gray-900 px-4 font-semibold text-white">Apply filters</button>
            <Link href="/games" className="flex min-h-[44px] items-center rounded-lg border border-gray-300 px-4 font-semibold text-gray-700">
              Clear
            </Link>
          </div>
        </form>
      </details>

      {date && (
        <p className="mt-3 text-sm text-gray-700">
          Showing games on <strong>{formatDateShort(date)}</strong>.
        </p>
      )}

      {error ? (
        <div className="mt-6 rounded-xl bg-red-50 p-5 text-red-800">
          Games couldn’t be loaded right now. Please try again in a moment.
        </div>
      ) : games.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <p className="text-lg font-semibold text-gray-800">No games match yet.</p>
          <p className="mt-1 text-sm text-gray-600">
            {activeFilters > 0 || when !== 'upcoming' ? 'Try another day or clear the filters — or ' : 'Start one — '}
            hosting takes less than a minute.
          </p>
          <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
            <Link href="/games/new" className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700">
              Create a Game
            </Link>
            <Link href="/courts" className="rounded-lg border border-gray-300 px-5 py-3 font-semibold text-gray-700">
              See where to play
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-4 grid gap-3">
          {games.map((g) => (
            <GameCard key={g.id} game={g} today={today} joined={joined.has(g.id)} />
          ))}
        </div>
      )}

      {donate && (
        <div className="mt-8">
          <DonateCard url={donate} compact />
        </div>
      )}
    </main>
  );
}
