import type { createClient } from '@/utils/supabase/server';

export type SupabaseClient = ReturnType<typeof createClient>;
import type { OfficialLink } from './db-types';

// Fallbacks used only if the official_links table can't be read. Admins
// update the live values in /admin → Official links (no code change needed).
export const FALLBACK_LINKS: Record<string, OfficialLink> = {
  reserve_court: {
    key: 'reserve_court',
    label: 'Reserve a Court (Amilia)',
    url: 'https://app.amilia.com/store/en/cityofevanston/shop/facilitybookings',
    description: 'Official City of Evanston facility booking system.',
    category: 'reservations',
    sort_order: 10,
  },
  parks_rec: {
    key: 'parks_rec',
    label: 'Evanston Parks & Recreation',
    url: 'https://cityofevanston.org/departments/prcs/index.php',
    description: null,
    category: 'general',
    sort_order: 20,
  },
  tennis_pickleball: {
    key: 'tennis_pickleball',
    label: 'Evanston Tennis & Pickleball',
    url: 'https://cityofevanston.org/departments/prcs/parks_athletic_fields/tennis_and_pickleball.php',
    description: null,
    category: 'general',
    sort_order: 30,
  },
  court_rules: {
    key: 'court_rules',
    label: 'Evanston Court Rules',
    url: 'https://cityofevanston.org/departments/prcs/parks_athletic_fields/tennis_and_pickleball.php',
    description: null,
    category: 'rules',
    sort_order: 50,
  },
  open_gym_calendars: {
    key: 'open_gym_calendars',
    label: 'Open Gym & Open Play Calendars',
    url: 'https://cityofevanston.org/departments/prcs/programs_events/open_gym_open_play_calendars.php',
    description: null,
    category: 'schedule',
    sort_order: 60,
  },
  city_311: {
    key: 'city_311',
    label: 'Evanston 311',
    url: 'https://cityofevanston.org/residents/311/index.php',
    description: null,
    category: 'contact',
    sort_order: 80,
  },
};

export type LinkMap = Record<string, OfficialLink>;

export async function getOfficialLinks(supabase: SupabaseClient): Promise<LinkMap> {
  const map: LinkMap = { ...FALLBACK_LINKS };
  try {
    const { data } = await supabase.from('official_links').select('*').order('sort_order');
    for (const row of (data ?? []) as OfficialLink[]) map[row.key] = row;
  } catch {
    // fall back silently
  }
  return map;
}

export function mapsUrl(query: string | null | undefined): string | null {
  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function telHref(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^0-9]/g, '');
  return digits ? `tel:+1${digits.slice(-10)}` : null;
}
