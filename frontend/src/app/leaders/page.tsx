import Link from 'next/link';
import clsx from 'clsx';
import { getSessionUser } from '@/lib/session';
import { getCompetitorState, monthName } from '@/lib/compete';
import type { ActivePlayer, TopPlayer } from '@/lib/db-types';
import { evanstonToday } from '@/lib/time';
import Avatar from '@/components/compete/Avatar';
import ChampionCard from '@/components/compete/ChampionCard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Top Players · Evanston Dinks' };

const TABS = [
  { value: '', label: 'Everyone' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

export default async function LeadersPage({ searchParams }: { searchParams: { level?: string } }) {
  const level = TABS.some((t) => t.value === searchParams.level) ? searchParams.level ?? '' : '';
  const { supabase, user } = await getSessionUser();
  const [{ data: top }, { data: active }, state] = await Promise.all([
    supabase.rpc('top_players', { p_skill: level || null, p_limit: 50 }),
    supabase.rpc('most_active', { p_limit: 10 }),
    getCompetitorState(supabase, user?.id),
  ]);
  const players = (top ?? []) as TopPlayer[];
  const busy = (active ?? []) as ActivePlayer[];

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-6">
      <header>
        <Link href="/compete" className="text-sm font-semibold text-blue-700 underline">← Compete</Link>
        <h1 className="mt-2 text-3xl font-black text-dink-navy">Top Players</h1>
        <p className="mt-1 text-gray-600">
          Ratings go up when you win and down when you lose. Beating a higher-rated player counts more. You need 3 confirmed
          games to show up. Only players who opted in are listed.
        </p>
        {state.signedIn && !state.showOnLeaderboards && (
          <p className="mt-3 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
            You’re not on these lists. Want to be? Turn it on at the bottom of the <Link href="/compete" className="font-bold underline">Compete page</Link>.
          </p>
        )}
      </header>

      <ChampionCard />

      <section>
        <nav aria-label="Skill level" className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <Link
              key={t.label}
              href={t.value ? `/leaders?level=${t.value}` : '/leaders'}
              className={clsx('min-h-[44px] rounded-full border px-4 py-2 text-sm font-semibold',
                level === t.value ? 'border-dink-blue bg-dink-blue text-white' : 'border-gray-300 bg-white text-gray-800')}
            >
              {t.label}
            </Link>
          ))}
        </nav>
        {level && <p className="mt-2 text-xs text-gray-500">Level comes from each player’s profile.</p>}
        {players.length === 0 ? (
          <p className="mt-4 rounded-xl border-2 border-dashed border-dink-blue/30 bg-white p-6 text-center text-gray-600">
            No one here yet. <Link href="/compete/report" className="font-bold text-dink-blue underline">Report a score</Link> to get started.
          </p>
        ) : (
          <ol className="mt-4 divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
            {players.map((p) => (
              <li key={p.user_id} className={clsx('flex items-center gap-3 p-3', p.user_id === user?.id && 'bg-pink-50')}>
                <span className="w-8 text-center text-lg font-black text-dink-blue">
                  {p.rank === 1 ? '🥇' : p.rank === 2 ? '🥈' : p.rank === 3 ? '🥉' : p.rank}
                </span>
                <Avatar name={p.display_name} url={p.avatar_url} size="sm" />
                <Link href={`/players/${p.user_id}`} className="flex-1 truncate font-semibold hover:underline">{p.display_name}</Link>
                <span className="text-right text-sm text-gray-600">
                  <span className="block font-extrabold tabular-nums text-dink-navy">{p.rating}</span>
                  {p.wins}W · {p.losses}L
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section>
        <h2 className="text-xl font-black">Most active in {monthName(evanstonToday())}</h2>
        <p className="text-sm text-gray-600">Showing up counts too. Confirmed games this month.</p>
        {busy.length === 0 ? (
          <p className="mt-2 text-gray-600">No confirmed games yet this month.</p>
        ) : (
          <ol className="mt-2 grid gap-2 sm:grid-cols-2">
            {busy.map((p, i) => (
              <li key={p.user_id} className="flex items-center gap-3 rounded-xl bg-white p-3">
                <span className="w-6 font-black text-dink-pink">{i + 1}</span>
                <Avatar name={p.display_name} url={p.avatar_url} size="sm" />
                <span className="flex-1 truncate font-semibold">{p.display_name}</span>
                <span className="text-sm text-gray-600">{p.games} games</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
