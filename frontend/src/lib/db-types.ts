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
