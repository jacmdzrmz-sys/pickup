import type { GameView, RrEvent } from '@/lib/db-types';
import { addMinutes, type CalendarEvent } from '@/lib/calendar';

export function gameCalendarEvent(game: GameView, site: string): CalendarEvent {
  const url = `${site}/games/${game.id}`;
  return {
    uid: `game-${game.id}`,
    title: `🏓 ${game.title}`,
    description: [
      `Pickup pickleball with Evanston Dinks at ${game.location_name}.`,
      game.description ?? '',
      `Game details and updates: ${url}`,
      'Creating a game does not reserve a public court. Follow posted City court rules.',
    ].filter(Boolean).join('\n\n'),
    location: [game.location_name, game.location_address].filter(Boolean).join(', ') + ', Evanston, IL',
    date: game.game_date,
    start: game.start_time,
    end: game.end_time,
    url,
  };
}

export function rrCalendarEvent(e: RrEvent, loc: { name: string; address: string | null } | null, site: string): CalendarEvent {
  const url = `${site}/compete/events/${e.id}`;
  return {
    uid: `rr-${e.id}`,
    title: `🏆 ${e.title} (round robin)`,
    description: [e.description ?? '', `Pairings, scores and standings: ${url}`].filter(Boolean).join('\n\n'),
    location: loc ? [loc.name, loc.address].filter(Boolean).join(', ') + ', Evanston, IL' : 'Evanston, IL',
    date: e.event_date,
    start: e.start_time,
    end: addMinutes(e.start_time, 120),
    url,
  };
}
