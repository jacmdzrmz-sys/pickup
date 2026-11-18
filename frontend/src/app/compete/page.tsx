import Link from 'next/link';
import { getSessionUser } from '@/lib/session';
import { getCompetitorState } from '@/lib/compete';
import type { Ladder, MatchSummary, RrEvent } from '@/lib/db-types';
import { formatTime, friendlyDate, evanstonToday } from '@/lib/time';
import { labelFor, SKILL_LEVELS } from '@/lib/labels';
import MatchCard from '@/components/compete/MatchCard';
import CompetitionSettings from '@/components/compete/CompetitionSettings';
import ChampionCard from '@/components/compete/ChampionCard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Compete · Evanston Dinks' };

const btn = 'flex min-h-[52px] items-center justify-center rounded-full px-5 text-center font-extrabold transition hover:brightness-110';

export default async function CompetePage() {
  const { supabase, user } = await getSessionUser();
  const today = evanstonToday();
  const [state, { data: events }, { data: ladders }, { data: locs }, myMatches] = await Promise.all([
    getCompetitorState(supabase, user?.id),
    supabase.from('rr_events').select('*').in('status', ['open', 'in_progress']).gte('event_date', today).order('event_date').order('start_time').limit(12),
    supabase.from('ladders').select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(12),
    supabase.from('locations').select('id, name'),
    user ? supabase.rpc('match_summaries', { p_mine: true, p_limit: 30 }) : Promise.resolve({ data: [] }),
  ]);

  const evs = (events ?? []) as RrEvent[];
  const lads = (ladders ?? []) as Ladder[];
  const locName = new Map(((locs ?? []) as { id: string; name: string }[]).map((l) => [l.id, l.name]));
  const [{ data: evPlayers }, { data: ladEntries }] = await Promise.all([
    evs.length ? supabase.from('rr_event_players').select('event_id').in('event_id', evs.map((e) => e.id)) : Promise.resolve({ data: [] }),
    lads.length ? supabase.from('ladder_entries').select('ladder_id').in('ladder_id', lads.map((l) => l.id)) : Promise.resolve({ data: [] }),
  ]);
  const count = (rows: Record<string, string>[] | null, key: string) => {
    const m = new Map<string, number>();
    for (const r of rows ?? []) m.set(r[key], (m.get(r[key]) ?? 0) + 1);
    return m;
  };
  const evCount = count(evPlayers as Record<string, string>[] | null, 'event_id');
  const ladCount = count(ladEntries as Record<string, string>[] | null, 'ladder_id');

  const matches = ((myMatches.data ?? []) as MatchSummary[]).filter((m) => m.status !== 'cancelled' && m.status !== 'scheduled');
  const needsMe = matches.filter((m) => m.can_confirm);
  const recent = matches.filter((m) => !m.can_confirm).slice(0, 8);
  const ready = state.signedIn && state.isAdult && state.acceptedTerms;

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-6">
      <header>
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-dink-blue">Friendly competition</p>
        <h1 className="text-3xl font-black text-dink-navy">Compete 🏆</h1>
        <p className="mt-1 text-gray-600">
          Report your scores, run a round robin, or climb a ladder. Everything is player-run and just for fun.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link href="/compete/report" className={`${btn} bg-dink-pink text-white`}>Report a Score</Link>
          <Link href="/leaders" className={`${btn} border-[3px] border-dink-blue bg-white text-dink-blue`}>Top Players</Link>
          <Link href="/compete/events/new" className={`${btn} bg-dink-blue text-white`}>Host a Round Robin</Link>
          <Link href="/compete/ladders/new" className={`${btn} bg-dink-blue text-white`}>Start a Ladder</Link>
        </div>
      </header>

      {!state.signedIn && (
        <p className="rounded-xl bg-blue-50 p-4 text-blue-900">
          <Link href="/auth/login?next=/compete" className="font-bold underline">Sign in</Link> to report scores and join events.
        </p>
      )}
      {state.signedIn && !state.acceptedTerms && (
        <p className="rounded-xl bg-blue-50 p-4 text-blue-900">
          Please <Link href="/welcome?next=/compete" className="font-bold underline">finish setting up your account</Link> first.
        </p>
      )}
      {state.signedIn && state.acceptedTerms && !state.isAdult && (
        <CompetitionSettings isAdult={false} showOnLeaderboards={false} compact />
      )}

      {ready && needsMe.length > 0 && (
        <section>
          <h2 className="text-xl font-black">Needs your OK ({needsMe.length})</h2>
          <p className="text-sm text-gray-600">A score only counts once someone on the other side confirms it.</p>
          <div className="mt-3 space-y-3">
            {needsMe.map((m) => <MatchCard key={m.id} match={m} userId={user?.id} />)}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-black">Round robins</h2>
          <Link href="/compete/events/new" className="text-sm font-bold text-dink-blue hover:underline">+ Host one</Link>
        </div>
        {evs.length === 0 ? (
          <p className="mt-2 rounded-xl border-2 border-dashed border-dink-blue/30 bg-white p-4 text-gray-600">
            No round robins coming up. Host one: we pair everyone up and keep score for you.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {evs.map((e) => (
              <li key={e.id}>
                <Link href={`/compete/events/${e.id}`} className="block rounded-xl border border-gray-200 bg-white p-4 hover:border-dink-blue">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-extrabold">{e.title}</span>
                    {e.status === 'in_progress' && <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-800">LIVE</span>}
                  </div>
                  <p className="text-sm text-gray-600">
                    {friendlyDate(e.event_date, today)} · {formatTime(e.start_time)}
                    {e.location_id && locName.get(e.location_id) ? ` · ${locName.get(e.location_id)}` : ''}
                  </p>
                  <p className="text-sm text-gray-600">
                    {e.format === 'doubles' ? 'Doubles, rotating partners' : 'Singles'} · {evCount.get(e.id) ?? 0}/{e.max_players} players
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-black">Ladders</h2>
          <Link href="/compete/ladders/new" className="text-sm font-bold text-dink-blue hover:underline">+ Start one</Link>
        </div>
        {lads.length === 0 ? (
          <p className="mt-2 rounded-xl border-2 border-dashed border-dink-blue/30 bg-white p-4 text-gray-600">
            No ladders yet. Start one: challenge players above you and climb to the top.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {lads.map((l) => (
              <li key={l.id}>
                <Link href={`/compete/ladders/${l.id}`} className="block rounded-xl border border-gray-200 bg-white p-4 hover:border-dink-blue">
                  <span className="font-extrabold">{l.name}</span>
                  <p className="text-sm text-gray-600">
                    Singles · {labelFor(SKILL_LEVELS, l.skill_level)} · {ladCount.get(l.id) ?? 0} players
                    {l.location_id && locName.get(l.location_id) ? ` · ${locName.get(l.location_id)}` : ''}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ChampionCard />

      {ready && recent.length > 0 && (
        <section>
          <h2 className="text-xl font-black">Your recent matches</h2>
          <div className="mt-3 space-y-3">
            {recent.map((m) => <MatchCard key={m.id} match={m} userId={user?.id} />)}
          </div>
        </section>
      )}

      {ready && (
        <CompetitionSettings isAdult={state.isAdult} showOnLeaderboards={state.showOnLeaderboards} />
      )}

      <p className="text-xs text-gray-500">
        Competitions are organized by players, not the City of Evanston. Play by posted court rules and share the courts.
        Scores count only when confirmed by the other side. Adults only.
      </p>
    </main>
  );
}
