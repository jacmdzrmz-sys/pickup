'use server';

import { redirect } from 'next/navigation';
import { getSessionUser, safeNext, TERMS_VERSION } from '@/lib/session';

export async function acceptTerms(formData: FormData) {
  const next = safeNext(String(formData.get('next') ?? ''), '/games');
  const name = String(formData.get('display_name') ?? '').trim().slice(0, 40);
  if (formData.get('agree') !== 'on' || !name) {
    redirect(`/welcome?error=1&next=${encodeURIComponent(next)}`);
  }
  const { supabase, user } = await getSessionUser();
  if (!user) redirect(`/auth/login?next=${encodeURIComponent(next)}`);

  await supabase.from('profiles').update({ display_name: name }).eq('id', user.id);
  const { error } = await supabase.rpc('accept_terms', { p_version: TERMS_VERSION });
  if (error) redirect(`/welcome?error=1&next=${encodeURIComponent(next)}`);
  redirect(next);
}
