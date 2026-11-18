import Link from 'next/link';
import type { GameView } from '@/lib/db-types';
import { friendlyDate, formatTimeRange } from '@/lib/time';
import { GAME_TYPES, SKILL_LEVELS, labelFor } from '@/lib/labels';
import Badge, { CourtStatusBadge, SettingBadge } from './Badge';

export default function GameCard({ game, today, joined = false }: { game: GameView; today: string; joined?: boolean }) {
  const spotsLeft = Math.max(game.max_players - game.player_count, 0);
  const full = spotsLeft === 0;
  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-1.5">
        <CourtStatusBadge status={game.court_status} />
        <SettingBadge setting={game.setting} />
        {game.is_free ? <Badge tone="gray">FREE</Badge> : <Badge tone="gray">FEE</Badge>}
        {game.status === 'cancelled' && <Badge tone="red">CANCELED</Badge>}
        {game.is_past && game.status === 'scheduled' && <Badge tone="gray">ENDED</Badge>}
      </div>

      <h3 className="mt-2 text-lg font-bold leading-snug text-gray-900">
        <Link href={`/games/${game.id}`} className="hover:underline">
          {game.title}
        </Link>
      </h3>

      <p className="mt-1 text-base font-semibold text-gray-800">
        {friendlyDate(game.game_date, today)} · {formatTimeRange(game.start_time, game.end_time)}
      </p>
      <p className="text-sm text-gray-600">📍 {game.location_name}</p>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
        <div>
          <dt className="sr-only">Players</dt>
          <dd className={full ? 'font-semibold text-red-700' : 'font-semibold text-gray-900'}>
            👥 {game.player_count}/{game.max_players} players
          </dd>
        </div>
        <div>
          <dt className="sr-only">Skill level</dt>
          <dd className="text-gray-700">{labelFor(SKILL_LEVELS, game.skill_level)}</dd>
        </div>
        <div>
          <dt className="sr-only">Game type</dt>
          <dd className="text-gray-700">{labelFor(GAME_TYPES, game.game_type)}</dd>
        </div>
        <div>
          <dt className="sr-only">Cost</dt>
          <dd className="text-gray-700">{game.is_free ? 'Free' : game.fee_note || 'Has a fee'}</dd>
        </div>
      </dl>

      <div className="mt-3 flex items-center justify-between gap-3">
        <Link href={`/players/${game.host_id}`} className="flex min-w-0 items-center gap-2 text-sm text-gray-700 hover:underline">
          {game.host_avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={game.host_avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
          ) : (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-xs">👤</span>
          )}
          <span className="truncate">Hosted by {game.host_name ?? 'Player'}</span>
        </Link>
        <Link
          href={`/games/${game.id}`}
          className={
            joined
              ? 'shrink-0 rounded-lg border border-green-600 px-4 py-2.5 text-sm font-semibold text-green-700'
              : full || game.status !== 'scheduled' || game.is_past
                ? 'shrink-0 rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-600'
                : 'shrink-0 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700'
          }
        >
          {joined ? "✓ You're in" : full ? 'Full' : game.status !== 'scheduled' || game.is_past ? 'View' : 'Join Game'}
        </Link>
      </div>
    </article>
  );
}
