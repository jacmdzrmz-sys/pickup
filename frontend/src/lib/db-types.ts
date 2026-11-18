// Row shapes for the Evanston Dinks Supabase tables
// (supabase/migrations/20261117000000_evanston_dinks_community.sql).

export type Setting = 'outdoor' | 'indoor';
export type CourtStatus = 'reserved' | 'first_come' | 'drop_in' | 'other';
export type GameStatus = 'scheduled' | 'cancelled' | 'removed';

export type OfficialLink = {
  key: string;
  label: string;
  url: string;
  description: string | null;
  category: string;
  sort_order: number;
};

export type Location = {
  id: string;
  slug: string;
  name: string;
  setting: Setting;
  address: string | null;
  phone: string | null;
  maps_query: string | null;
  court_count: number | null;
  court_notes: string | null;
  has_lights: boolean;
  hours_summary: string | null;
  access_types: string[];
  reservation_info: string | null;
  first_come_info: string | null;
  open_gym_info: string | null;
  rental_info: string | null;
  contact_method: string | null;
  official_url: string | null;
  schedule_url: string | null;
  reservation_url: string | null;
  status: 'open' | 'temporarily_unavailable' | 'closed';
  status_note: string | null;
  accepts_games: boolean;
  sort_order: number;
  info_checked_on: string | null;
};

export type LocationHours = {
  id: string;
  location_id: string;
  day_of_week: number;
  open_time: string;
  close_time: string;
  valid_from: string | null;
  valid_until: string | null;
  note: string | null;
};

export type LocationClosure = {
  id: string;
  location_id: string | null;
  setting: Setting | null;
  starts_on: string;
  ends_on: string;
  start_time: string | null;
  end_time: string | null;
  reason: string;
};

export type Profile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  skill_level: string | null;
  play_type: string | null;
  neighborhood: string | null;
  bio: string | null;
  show_on_leaderboards?: boolean;
  created_at: string;
};

export type GameView = {
  id: string;
  host_id: string;
  location_id: string;
  title: string;
  description: string | null;
  game_date: string;
  start_time: string;
  end_time: string;
  skill_level: string;
  game_type: string;
  max_players: number;
  court_status: CourtStatus;
  reservation_confirmed: boolean;
  is_free: boolean;
  fee_note: string | null;
  status: GameStatus;
  cancel_reason: string | null;
  cancel_note: string | null;
  cancelled_at: string | null;
  created_at: string;
  location_name: string;
  location_slug: string;
  setting: Setting;
  has_lights: boolean;
  location_address: string | null;
  maps_query: string | null;
  host_name: string | null;
  host_avatar_url: string | null;
  player_count: number;
  is_past: boolean;
};

export type NotificationRow = {
  id: string;
  kind: string;
  game_id: string | null;
  link?: string | null;
  message: string;
  read_at: string | null;
  created_at: string;
};

export type ReportRow = {
  id: string;
  reporter_id: string | null;
  target_type: 'game' | 'user';
  game_id: string | null;
  reported_user_id: string | null;
  category: string;
  details: string | null;
  status: 'open' | 'reviewing' | 'resolved' | 'dismissed';
  admin_note: string | null;
  context_snapshot: string | null;
  created_at: string;
};

// ---- Competitions (supabase/migrations/20261118100000_competitions.sql) ----

export type MatchPlayer = { id: string; name: string; avatar: string | null };

export type MatchSummary = {
  id: string;
  kind: 'casual' | 'round_robin' | 'ladder';
  format: 'singles' | 'doubles';
  status: 'scheduled' | 'pending' | 'confirmed' | 'disputed' | 'cancelled';
  played_on: string;
  round_no: number | null;
  court_no: number | null;
  score_a: number | null;
  score_b: number | null;
  reported_by: string | null;
  event_id: string | null;
  ladder_id: string | null;
  team_a: MatchPlayer[];
  team_b: MatchPlayer[];
  my_team: 'a' | 'b' | null;
  can_confirm: boolean;
  created_at: string;
};

export type RrEvent = {
  id: string;
  host_id: string | null;
  title: string;
  description: string | null;
  location_id: string | null;
  event_date: string;
  start_time: string;
  format: 'singles' | 'doubles';
  max_players: number;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  rounds: number | null;
  winner_id: string | null;
};

export type RrStanding = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  played: number;
  wins: number;
  losses: number;
  points_for: number;
  points_against: number;
  diff: number;
};

export type Ladder = {
  id: string;
  organizer_id: string | null;
  name: string;
  description: string | null;
  location_id: string | null;
  skill_level: string;
  ends_on: string | null;
  status: 'active' | 'closed';
  created_at: string;
};

export type LadderStanding = {
  rank: number;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  wins: number;
  losses: number;
};

export type LadderChallenge = {
  id: string;
  ladder_id: string;
  challenger_id: string;
  opponent_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled';
  match_id: string | null;
  created_at: string;
};

export type TopPlayer = {
  rank: number;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  skill_level: string | null;
  rating: number;
  wins: number;
  losses: number;
  matches: number;
};

export type ActivePlayer = { user_id: string; display_name: string; avatar_url: string | null; games: number; wins: number };

export type Champion = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  skill_level: string | null;
  wins: number;
  games: number;
  month: string;
};
