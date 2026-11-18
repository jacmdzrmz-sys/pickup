import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSessionUser } from '@/lib/session';
import { getOfficialLinks, mapsUrl } from '@/lib/official';
import type { GameView } from '@/lib/db-types';
import { evanstonToday, formatDateLong, formatTimeRange, friendlyDate } from '@/lib/time';
import { CANCEL_REASONS, COURT_STATUSES, GAME_TYPES, SKILL_LEVELS, labelFor } from '@/lib/labels';
import Badge, { CourtStatusBadge, SettingBadge } from '@/components/Badge';
import { GameDisclaimer, OutdoorNotice, RulesNotice } from '@/components/Notices';
import ReportButton from '@/components/ReportButton';
import { CancelGame, JoinLeave } from './game-actions';
import AddToCalendar from '@/components/AddToCalendar';
import { googleCalendarUrl, SITE } from '@/lib/calendar';
import { gameCalendarEvent } from '@/lib/calendar-events';

export const dynamic = 'force-dynamic';

type PlayerRow = { user_id: string; joined_at: string; profiles: { display_name: string; avatar_url: string | null } | null };
type ProfileLite = { id: string; display_name: string; avatar_url: string | null };

export default async function GamePage({ params, searchParams }: { params: { id: string }; searchParams: { created?: string } }) {
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) notFound();
  const { supabase, user } = await getSessionUser();

  const [{ data: gameData }, { data: playerData }, links, { data: loc }] = await Promise.all([
    supabase.from('community_games_view').select('*').eq('id', params.id).maybeSingle(),
    supabase
      .from('community_game_players')
      .select('user_id, joined_at')
      .eq('game_id', params.id)
      .order('joined_at'),
    getOfficialLinks(supabase),
    supabase.from('community_games').select('location_id, locations(official_url, schedule_url)').eq('id', params.id).maybeSingle(),
  ]);

  const game = gameData as GameView | null;
  if (!game) notFound();

  const playerRows = (playerData ?? []) as { user_id: string; joined_at: string }[];
  const { data: profileData } = playerRows.length
    ? await supabase.from('profiles').select('id, display_name, avatar_url').in('id', playerRows.map((p) => p.user_id))
    : { data: [] as ProfileLite[] };
  const profileMap = new Map(((profileData ?? []) as ProfileLite[]).map((p) => [p.id, p]));
  const players: PlayerRow[] = playerRows.map((p) => ({ ...p, profiles: profileMap.get(p.user_id) ?? null }));
  const today = evanstonToday();
  const isHost = user?.id === game.host_id;
  const joined = !!user && players.some((p) => p.user_id === user.id);
  const full = game.player_count >= game.max_players;
  const closed = game.status !== 'scheduled' || game.is_past;
  const outdoor = game.setting === 'outdoor';
  const locInfo = (loc as unknown as { locations: { official_url: string | null; schedule_url: string | null } | null } | null)?.locations;
  const directions = mapsUrl(game.maps_query ?? game.location_address ?? game.location_name);
  const courtStatus = COURT_STATUSES.find((s) => s.value === game.court_status);
  const { data: reminderRow } = user
    ? await supabase.from('account_settings').select('game_reminders').eq('user_id', user.id).maybeSingle()
    : { data: null };
  const remindersOn = !!(reminderRow as { game_reminders?: boolean } | null)?.game_reminders;

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Link href="/games" className="text-sm font-semibold text-blue-700 hover:underline">
        ← Browse Games
      </Link>

      {searchParams.created === '1' && (
        <p role="status" className="mt-3 rounded-lg bg-green-50 p-3 text-sm font-semibold text-green-800">
          🎉 Your game is posted. Share the link with friends! Remember: creating this game does not reserve a public court.
        </p>
      )}

      {game.status === 'cancelled' && (
        <div className="mt-3 rounded-lg bg-red-50 p-4 text-red-900">
          <p className="font-bold">This game was canceled.</p>
          <p className="text-sm">
            Reason: {labelFor(CANCEL_REASONS, game.cancel_reason)}
            {game.cancel_note ? ` — ${game.cancel_note}` : ''}
          </p>
        </div>
      )}
      {game.status === 'removed' && (
        <p className="mt-3 rounded-lg bg-red-50 p-4 font-bold text-red-900">This game was removed by moderators.</p>
      )}
      {game.is_past && game.status === 'scheduled' && (
        <p className="mt-3 rounded-lg bg-gray-100 p-4 font-semibold text-gray-700">This game has ended.</p>
      )}

      <div className="mt-4 flex flex-wrap gap-1.5">
        <CourtStatusBadge status={game.court_status} />
        <SettingBadge setting={game.setting} />
        <Badge>{game.is_free ? 'FREE' : 'FEE'}</Badge>
      </div>
      <h1 className="mt-2 text-2xl font-bold text-gray-900">{game.title}</h1>

      <section className="mt-4 space-y-3 rounded-xl border border-gray-200 bg-white p-4">
        <div>
          <p className="text-lg font-bold">
            {friendlyDate(game.game_date, today)} · {formatTimeRange(game.start_time, game.end_time)}
          </p>
          <p className="text-sm text-gray-600">{formatDateLong(game.game_date)} (Evanston time)</p>
          {!closed && (
            <div className="mt-2 flex flex-wrap gap-2">
              <AddToCalendar googleUrl={googleCalendarUrl(gameCalendarEvent(game, SITE))} icsPath={`/games/${game.id}/calendar`} />
            </div>
          )}
        </div>
        <div>
          <p className="font-semibold">📍 {game.location_name}</p>
          {game.location_address && <p className="text-sm text-gray-600">{game.location_address}</p>}
          <div className="mt-2 flex flex-wrap gap-2">
            {directions && (
              <a href={directions} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold">
                🧭 Directions
              </a>
            )}
            {locInfo?.official_url && (
              <a href={locInfo.official_url} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold">
                Official City info ↗
              </a>
            )}
            {locInfo?.schedule_url && (
              <a href={locInfo.schedule_url} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold">
                Official City Schedule ↗
              </a>
            )}
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-gray-500">Players</dt>
            <dd className="font-semibold">{game.player_count} of {game.max_players}{full ? ' · Full' : ` · ${game.max_players - game.player_count} open`}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Skill level</dt>
            <dd className="font-semibold">{labelFor(SKILL_LEVELS, game.skill_level)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Game type</dt>
            <dd className="font-semibold">{labelFor(GAME_TYPES, game.game_type)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Cost</dt>
            <dd className="font-semibold">{game.is_free ? 'Free' : game.fee_note || 'Has a fee'}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-gray-500">Court status</dt>
            <dd className="font-semibold">{courtStatus?.label}</dd>
            {game.court_status === 'reserved' && (
              <dd className="mt-1 text-xs text-gray-600">
                The host says they have obtained or will obtain the reservation/permit. Evanston Dinks does not make or verify
                reservations.
              </dd>
            )}
            {game.court_status === 'first_come' && (
              <dd className="mt-1 text-xs text-gray-600">No reservation. Courts are shared first come, first served under posted City rules.</dd>
            )}
            {game.court_status === 'drop_in' && (
              <dd className="mt-1 text-xs text-gray-600">City open gym session. Pay the facility’s drop-in fee and check the Official City Schedule.</dd>
            )}
          </div>
        </dl>
        {game.description && <p className="whitespace-pre-line text-gray-800">{game.description}</p>}
      </section>

      <section className="mt-4 space-y-3">
        {!closed && <RulesNotice links={links} />}
        {!closed && outdoor && <OutdoorNotice />}
        <JoinLeave gameId={game.id} joined={joined} isHost={isHost} full={full} signedIn={!!user} closed={closed} />
        {(joined || isHost) && !closed && !remindersOn && (
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            ⏰ Want a heads-up before you play?{' '}
            <Link href="/profile#reminders" className="font-bold underline">Turn on game reminders</Link>
          </p>
        )}
        {isHost && !closed && <CancelGame gameId={game.id} outdoor={outdoor} />}
      </section>

      <section className="mt-6">
        <h2 className="font-bold">Who’s playing</h2>
        <ul className="mt-2 divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
          {players.map((p) => (
            <li key={p.user_id}>
              <Link href={`/players/${p.user_id}`} className="flex min-h-[52px] items-center gap-3 px-4 py-2 hover:bg-gray-50">
                {p.profiles?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.profiles.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-sm">👤</span>
                )}
                <span className="font-semibold">{p.profiles?.display_name ?? 'Player'}</span>
                {p.user_id === game.host_id && <Badge tone="blue">HOST</Badge>}
              </Link>
            </li>
          ))}
          {players.length === 0 && <li className="px-4 py-3 text-sm text-gray-500">No players yet.</li>}
        </ul>
      </section>

      <section className="mt-6 space-y-3">
        <GameDisclaimer />
        {!isHost && <ReportButton targetType="game" gameId={game.id} label="Report this game" signedIn={!!user} />}
      </section>
    </main>
  );
}
