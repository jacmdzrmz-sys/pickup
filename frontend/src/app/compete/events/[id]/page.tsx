import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSessionUser } from '@/lib/session';
import { getCompetitorState } from '@/lib/compete';
import type { MatchSummary, RrEvent, RrStanding } from '@/lib/db-types';
import { evanstonToday, formatTime, friendlyDate } from '@/lib/time';
import Avatar from '@/components/compete/Avatar';
import { EventControls, RoundMatch } from './event-controls';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f-]{36}$/i;

export default async function EventPage({ params }: { params: { id: string } }) {
  if (!UUID.test(params.id)) notFound();
  const { supabase, user } = await getSessionUser();
  const { data: ev } = await supabase.from('rr_events').select('*').eq('id', params.id).maybeSingle();
  if (!ev) notFound();
  const e = ev as RrEvent;

  const [{ data: playerRows }, { data: standingsData }, { data: matchData }, { data: loc }, state] = await Promise.all([
    supabase.from('rr_event_players').select('user_id, joined_at').eq('event_id', e.id).order('joined_at'),
    supabase.rpc('rr_standings', { p_event: e.id }),
    supabase.rpc('match_summaries', { p_event: e.id, p_limit: 200 }),
    e.location_id ? supabase.from('locations').select('name').eq('id', e.location_id).maybeSingle() : Promise.resolve({ data: null }),
    getCompetitorState(supabase, user?.id),
  ]);
  const ids = ((playerRows ?? []) as { user_id: string }[]).map((p) => p.user_id);
  const { data: profs } = ids.length
    ? await supabase.from('profiles').select('id, display_name, avatar_url').in('id', [...ids, ...(e.host_id ? [e.host_id] : [])])
    : { data: [] };
  const people = new Map(((profs ?? []) as { id: string; display_name: string; avatar_url: string | null }[]).map((p) => [p.id, p]));

  const standings = (standingsData ?? []) as RrStanding[];
  const matches = ((matchData ?? []) as MatchSummary[]).filter((m) => m.status !== 'cancelled');
  const rounds = new Map<number, MatchSummary[]>();
  for (const m of matches) {
    const r = m.round_no ?? 0;
    rounds.set(r, [...(rounds.get(r) ?? []), m]);
  }
  const isHost = !!user && user.id === e.host_id;
  const joined = !!user && ids.includes(user.id);
  const winner = e.winner_id ? people.get(e.winner_id) : null;
  const today = evanstonToday();

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <Link href="/compete" className="text-sm font-semibold text-blue-700 underline">← Compete</Link>
      <header>
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-dink-blue">Round robin</p>
        <h1 className="text-3xl font-black text-dink-navy">{e.title}</h1>
        <p className="mt-1 text-gray-700">
          {friendlyDate(e.event_date, today)} · {formatTime(e.start_time)}
          {loc?.name ? ` · ${loc.name}` : ''}
        </p>
        <p className="text-gray-700">
          {e.format === 'doubles' ? 'Doubles, rotating partners' : 'Singles'} · {ids.length}/{e.max_players} players
          {e.host_id && people.get(e.host_id) ? ` · Hosted by ${people.get(e.host_id)!.display_name}` : ''}
        </p>
        {e.description && <p className="mt-2 whitespace-pre-line rounded-lg bg-white p-3 text-gray-700">{e.description}</p>}
      </header>

      {e.status === 'completed' && (
        <section className="rounded-2xl bg-gradient-to-br from-dink-plum to-dink-pink p-5 text-center text-white">
          <p className="text-sm font-bold uppercase tracking-widest text-pink-100">Winner</p>
          <p className="mt-1 text-3xl font-black">{winner ? `🏆 ${winner.display_name}` : 'Thanks for playing!'}</p>
        </section>
      )}
      {e.status === 'cancelled' && <p className="rounded-xl bg-red-50 p-4 font-semibold text-red-800">This round robin was cancelled.</p>}

      <EventControls
        eventId={e.id}
        status={e.status}
        isHost={isHost}
        joined={joined}
        signedIn={!!user}
        canCompete={state.isAdult}
        full={ids.length >= e.max_players}
        playerCount={ids.length}
        format={e.format}
      />

      {standings.some((s) => s.played > 0) && (
        <section>
          <h2 className="text-xl font-black">Standings</h2>
          <div className="mt-2 overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr><th className="p-2">#</th><th className="p-2">Player</th><th className="p-2 text-right">W</th><th className="p-2 text-right">L</th><th className="p-2 text-right">+/−</th></tr>
              </thead>
              <tbody>
                {standings.map((s, i) => (
                  <tr key={s.user_id} className="border-t border-gray-100">
                    <td className="p-2 font-bold">{i + 1}</td>
                    <td className="p-2"><span className="flex items-center gap-2"><Avatar name={s.display_name} url={s.avatar_url} size="sm" />{s.display_name}</span></td>
                    <td className="p-2 text-right tabular-nums">{s.wins}</td>
                    <td className="p-2 text-right tabular-nums">{s.losses}</td>
                    <td className="p-2 text-right tabular-nums">{s.diff > 0 ? `+${s.diff}` : s.diff}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {[...rounds.entries()].sort((a, b) => a[0] - b[0]).map(([r, ms]) => {
        const playing = new Set(ms.flatMap((m) => [...m.team_a, ...m.team_b].map((p) => p.id)));
        const sitting = ids.filter((id) => !playing.has(id)).map((id) => people.get(id)?.display_name ?? 'Player');
        return (
          <section key={r}>
            <h2 className="text-lg font-black">Round {r}</h2>
            <div className="mt-2 space-y-2">
              {ms.map((m) => (
                <RoundMatch key={m.id} match={m} eventId={e.id} userId={user?.id} isHost={isHost} live={e.status === 'in_progress'} />
              ))}
            </div>
            {sitting.length > 0 && <p className="mt-1 text-sm text-gray-500">Sitting out: {sitting.join(', ')}</p>}
          </section>
        );
      })}

      {e.status === 'open' && (
        <section>
          <h2 className="text-xl font-black">Who’s in ({ids.length})</h2>
          <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ids.map((id) => {
              const p = people.get(id);
              return (
                <li key={id} className="flex items-center gap-2 rounded-lg bg-white p-2">
                  <Avatar name={p?.display_name ?? '?'} url={p?.avatar_url ?? null} size="sm" />
                  <span className="truncate font-semibold">{p?.display_name ?? 'Player'}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <p className="text-xs text-gray-500">
        Player-run event, not organized by the City of Evanston. Posted court rules apply; hosting doesn’t reserve a court.
      </p>
    </main>
  );
}
