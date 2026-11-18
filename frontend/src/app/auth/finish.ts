import type { createClient } from '@/utils/supabase/server';

type SupabaseClient = ReturnType<typeof createClient>;
import { TERMS_VERSION, safeNext } from '@/lib/session';

/**
 * After a successful sign-in: record the terms acknowledgment the user
 * checked on the sign-in page (ack=1), then send them on — or to /welcome
 * if no acknowledgment is on file.
 */
export async function finishSignIn(supabase: SupabaseClient, nextParam: string | null, ack: boolean): Promise<string> {
  const next = safeNext(nextParam, '/games');
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return '/auth/login?error=signin';

  const { data: settings } = await supabase
    .from('account_settings')
    .select('terms_accepted_at')
    .eq('user_id', user.id)
    .maybeSingle();

  if (settings?.terms_accepted_at) return next;
  if (ack) {
    const { error } = await supabase.rpc('accept_terms', { p_version: TERMS_VERSION });
    if (!error) return next;
  }
  return `/welcome?next=${encodeURIComponent(next)}`;
}
