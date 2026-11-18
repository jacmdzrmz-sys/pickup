import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import type { Champion } from '@/lib/db-types';
import { monthName } from '@/lib/compete';
import { evanstonToday } from '@/lib/time';
import Avatar from './Avatar';

/**
 * Champion of the Month: most confirmed wins last month among players who
 * chose to appear on public lists. Early in a month with no champion yet,
 * shows this month's leader instead.
 */
export default async function ChampionCard({ variant = 'card' }: { variant?: 'card' | 'home' }) {
  let champ: Champion | null = null;
  let current = false;
  try {
    const supabase = createClient();
    const { data } = await supabase.rpc('champion_of_month', {});
    champ = ((data ?? []) as Champion[])[0] ?? null;
    if (!champ) {
      const { data: now } = await supabase.rpc('champion_of_month', { p_month: evanstonToday() });
      champ = ((now ?? []) as Champion[])[0] ?? null;
      current = !!champ;
    }
  } catch {
    champ = null;
  }

  const home = variant === 'home';
  if (!champ) {
    if (home) return null;
    return (
      <section className="rounded-2xl border-2 border-dashed border-dink-pink/40 bg-white p-5 text-center">
        <p className="text-sm font-bold uppercase tracking-widest text-dink-pink">Champion of the Month</p>
        <p className="mt-1 text-gray-700">No champion yet. Report a few confirmed wins and it could be you!</p>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-dink-plum to-dink-pink p-5 text-white shadow-lg">
      <span aria-hidden className="absolute -right-3 -top-4 text-8xl opacity-20">🏆</span>
      <p className="text-sm font-bold uppercase tracking-widest text-pink-100">
        {current ? `${monthName(champ.month)} leader so far` : `${monthName(champ.month)} Champion`}
      </p>
      <div className="mt-3 flex items-center gap-4">
        <Avatar name={champ.display_name} url={champ.avatar_url} size="lg" />
        <div>
          <p className="text-2xl font-black">{champ.display_name}</p>
          <p className="text-pink-50">
            {champ.wins} {champ.wins === 1 ? 'win' : 'wins'} in {champ.games} {champ.games === 1 ? 'game' : 'games'}. Congratulations!
          </p>
        </div>
      </div>
      <Link href="/leaders" className="mt-4 inline-block rounded-full bg-white px-5 py-2 font-extrabold text-dink-pink">
        See Top Players →
      </Link>
    </section>
  );
}
