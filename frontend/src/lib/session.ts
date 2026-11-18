import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

export const TERMS_VERSION = '2026-11-17';

export async function getSessionUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/** Signed-in user who has accepted the terms; otherwise redirect. */
export async function requireUser(nextPath: string) {
  const { supabase, user } = await getSessionUser();
  if (!user) {
    redirect(`/auth/login?next=${encodeURIComponent(nextPath)}`);
  }
  const { data: settings } = await supabase
    .from('account_settings')
    .select('terms_accepted_at')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!settings?.terms_accepted_at) {
    redirect(`/welcome?next=${encodeURIComponent(nextPath)}`);
  }
  return { supabase, user };
}

export async function isAdmin(): Promise<boolean> {
  const { supabase, user } = await getSessionUser();
  if (!user) return false;
  const { data } = await supabase.rpc('is_admin');
  return data === true;
}

/** Only allow same-site relative redirects. */
export function safeNext(next: string | null | undefined, fallback = '/games'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return fallback;
  return next;
}
