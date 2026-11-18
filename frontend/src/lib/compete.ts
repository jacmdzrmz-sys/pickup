import type { SupabaseClient } from '@/lib/official';

export type CompetitorState = { signedIn: boolean; isAdult: boolean; showOnLeaderboards: boolean; acceptedTerms: boolean };

/** Whether the signed-in player has turned on competitions (18+) and the Top Players opt-in. */
export async function getCompetitorState(supabase: SupabaseClient, userId: string | undefined): Promise<CompetitorState> {
  if (!userId) return { signedIn: false, isAdult: false, showOnLeaderboards: false, acceptedTerms: false };
  const [{ data: settings }, { data: profile }] = await Promise.all([
    supabase.from('account_settings').select('adult_confirmed_at, terms_accepted_at').eq('user_id', userId).maybeSingle(),
    supabase.from('profiles').select('show_on_leaderboards').eq('id', userId).maybeSingle(),
  ]);
  return {
    signedIn: true,
    isAdult: !!settings?.adult_confirmed_at,
    acceptedTerms: !!settings?.terms_accepted_at,
    showOnLeaderboards: !!profile?.show_on_leaderboards,
  };
}

export function monthName(dateStr: string): string {
  const [y, m] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' });
}
