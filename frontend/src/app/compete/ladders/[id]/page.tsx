import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSessionUser } from '@/lib/session';
import { getCompetitorState } from '@/lib/compete';
import type { Ladder, LadderChallenge, LadderStanding, MatchSummary } from '@/lib/db-types';
import { formatDateLong } from '@/lib/time';
import { labelFor, SKILL_LEVELS } from '@/lib/labels';
import Avatar from '@/components/compete/Avatar';
import MatchCard from '@/components/compete/MatchCard';
import { ChallengeButton, ChallengeRow, LadderControls } from './ladder-controls';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f-]{36}$/i;

export default async function LadderPage({ params }: { params: { id: string } }) {
  if (!UUID.test(params.id)) notFound();
  const { supabase, user } = await getSessionUser();
  const { data: lad } = await supabase.from('ladders').select('*').eq('id', params.id).maybeSingle();
  if (!lad) notFound();
  const l = lad as Ladder;

  const [{ data: st }, { data: ch }, { data: ms }, { data: loc }, state] = await Promise.all([
    supabase.rpc('ladder_standings', { p_ladder: l.id }),
    supabase.from('ladder_challenges').select('*').eq('ladder_id', l.id).in('status', ['pending', 'accepted']).order('created_at'),
    supabase.rpc('match_summaries', { p_ladder: l.id, p_limit: 20 }),
    l.location_id ? supabase.from('locations').select('name').eq('id', l.location_id).maybeSingle() : Promise.resolve({ data: null }),
    getCompetitorState(supabase, user?.id),
  ]);
  const standings = (st ?? []) as LadderStanding[];
  const challenges = (ch ?? []) as LadderChallenge[];
  const matches = ((ms ?? []) as MatchSummary[]).filter((m) => m.status !== 'cancelled');
  const name = new Map(standings.map((s) => [s.user_id, s.display_name]));
  const me = standings.find((s) => s.user_id === user?.id);
  const organizer = l.organizer_id ? name.get(l.organizer_id) : null;
  const pendingByChallenge = new Map(matches.filter((m) => m.status === 'pending').map((m) => [m.id, m]));
  const busyWith = new Set(
    challenges.filter((c) => c.challenger_id === user?.id || c.opponent_id === user?.id).flatMap((c) => [c.challenger_id, c.opponent_id])
  );
  const myOpen = challenges.filter((c) => c.challenger_id === user?.id).length;

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <Link href="/compete" className="text-sm font-semibold text-blue-700 underline">← Compete</Link>
      <header>
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-dink-blue">Singles ladder</p>
        <h1 className="text-3xl font-black text-dink-navy">{l.name}</h1>
        <p className="mt-1 text-gray-700">
          {labelFor(SKILL_LEVELS, l.skill_level)} · {standings.length} players
          {loc?.name ? ` · ${loc.name}` : ''}
          {l.ends_on ? ` · Ends ${formatDateLong(l.ends_on)}` : ''}
          {organizer ? ` · Organized by ${organizer}` : ''}
        </p>
        {l.description && <p className="mt-2 whitespace-pre-line rounded-lg bg-white p-3 text-gray-700">{l.description}</p>}
        {l.status === 'closed' && <p className="mt-2 rounded-lg bg-gray-100 p-3 font-semibold">This ladder is closed. Final standings below.</p>}
      </header>

      <LadderControls
        ladderId={l.id}
        active={l.status === 'active'}
        onLadder={!!me}
        isOrganizer={!!user && user.id === l.organizer_id}
        signedIn={!!user}
        canCompete={state.isAdult}
      />

      {challenges.length > 0 && (
        <section>
          <h2 className="text-xl font-black">Open challenges</h2>
          <div className="mt-2 space-y-2">
            {challenges.map((c) => (
              <ChallengeRow
                key={c.id}
                ladderId={l.id}
                challenge={c}
                challengerName={name.get(c.challenger_id) ?? 'Player'}
                opponentName={name.get(c.opponent_id) ?? 'Player'}
                userId={user?.id}
                pendingMatch={c.match_id ? pendingByChallenge.get(c.match_id) ?? null : null}
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-xl font-black">Standings</h2>
        <ol className="mt-2 divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
          {standings.map((s) => {
            const canChallenge =
              !!me && l.status === 'active' && s.user_id !== me.user_id && s.rank < me.rank && me.rank - s.rank <= 3 &&
              !busyWith.has(s.user_id) && myOpen < 2;
            return (
              <li key={s.user_id} className={`flex items-center gap-3 p-3 ${s.user_id === user?.id ? 'bg-pink-50' : ''}`}>
                <span className="w-7 text-center text-lg font-black text-dink-blue">{s.rank === 1 ? '👑' : s.rank}</span>
                <Avatar name={s.display_name} url={s.avatar_url} size="sm" />
                <span className="flex-1 truncate font-semibold">
                  {s.display_name} {s.user_id === user?.id && <span className="text-xs text-gray-500">(you)</span>}
                  <span className="block text-xs font-normal text-gray-500">{s.wins}W · {s.losses}L</span>
                </span>
                {canChallenge && <ChallengeButton ladderId={l.id} opponentId={s.user_id} />}
              </li>
            );
          })}
        </ol>
        {me && <p className="mt-2 text-sm text-gray-600">You can challenge anyone up to 3 spots above you, 2 challenges at a time.</p>}
      </section>

      {matches.length > 0 && (
        <section>
          <h2 className="text-xl font-black">Recent ladder matches</h2>
          <div className="mt-2 space-y-2">
            {matches.map((m) => <MatchCard key={m.id} match={m} userId={user?.id} showKind={false} />)}
          </div>
        </section>
      )}

      <p className="text-xs text-gray-500">
        Player-run ladder, not organized by the City of Evanston. Arrange your own court time and follow posted court rules.
      </p>
    </main>
  );
}
