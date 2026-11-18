export const SKILL_LEVELS = [
  { value: 'all', label: 'All levels' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
] as const;

export const GAME_TYPES = [
  { value: 'casual', label: 'Casual' },
  { value: 'open_play', label: 'Open play' },
  { value: 'competitive', label: 'Competitive' },
  { value: 'drills', label: 'Drills / practice' },
  { value: 'round_robin', label: 'Round robin' },
] as const;

export const PLAY_TYPES = [
  { value: 'any', label: 'Anything' },
  { value: 'casual', label: 'Casual' },
  { value: 'open_play', label: 'Open play' },
  { value: 'competitive', label: 'Competitive' },
  { value: 'drills', label: 'Drills / practice' },
] as const;

export const COURT_STATUSES = [
  {
    value: 'first_come',
    label: 'Public / First Come, First Served',
    badge: 'FIRST COME, FIRST SERVED',
    help: 'Meeting at a public court with no reservation. Courts are shared; follow posted rules for waiting your turn.',
  },
  {
    value: 'reserved',
    label: 'Court Reserved',
    badge: 'RESERVED',
    help: 'You (the host) have booked, or will book, the court through the City or the facility.',
  },
  {
    value: 'drop_in',
    label: 'Indoor Open Gym / Drop-In',
    badge: 'DROP-IN',
    help: "Meeting at a City open gym session. Pay the facility's drop-in fee and follow its schedule.",
  },
  {
    value: 'other',
    label: 'Other / Private Facility',
    badge: 'OTHER / PRIVATE',
    help: 'A facility rental or another arrangement made directly with the facility.',
  },
] as const;

export const CANCEL_REASONS = [
  { value: 'weather', label: 'Weather' },
  { value: 'court_unavailable', label: 'Court unavailable' },
  { value: 'not_enough_players', label: 'Not enough players' },
  { value: 'personal', label: 'Personal reason' },
  { value: 'other', label: 'Other' },
] as const;

export const REPORT_CATEGORIES = [
  { value: 'harassment', label: 'Harassment' },
  { value: 'threatening', label: 'Threatening behavior' },
  { value: 'inappropriate_content', label: 'Inappropriate content' },
  { value: 'reservation_misrepresentation', label: 'Misrepresentation of court reservation' },
  { value: 'unsafe_behavior', label: 'Unsafe behavior' },
  { value: 'spam', label: 'Spam' },
  { value: 'other', label: 'Other' },
] as const;

type Option = { value: string; label: string };
export function labelFor(options: readonly Option[], value: string | null | undefined): string {
  return options.find((o) => o.value === value)?.label ?? (value ?? '');
}

export function courtStatusBadge(value: string): string {
  return COURT_STATUSES.find((s) => s.value === value)?.badge ?? value.toUpperCase();
}
