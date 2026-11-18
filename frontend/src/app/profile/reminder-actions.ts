'use server';

import { revalidatePath } from 'next/cache';
import { getSessionUser } from '@/lib/session';
import { isPushEndpoint } from '@/lib/push';

type Result = { ok: true } | { ok: false; error: string };
const MINUTES = [30, 60, 120, 1440];

export async function saveReminderSettings(enabled: boolean, minutes: number): Promise<Result> {
  const { supabase, user } = await getSessionUser();
  if (!user) return { ok: false, error: 'Please sign in again.' };
  const m = MINUTES.includes(Number(minutes)) ? Number(minutes) : 60;
  const { error } = await supabase
    .from('account_settings')
    .update({ game_reminders: !!enabled, reminder_minutes: m })
    .eq('user_id', user.id);
  if (error) return { ok: false, error: 'Couldn’t save your reminder settings. Please try again.' };
  revalidatePath('/profile');
  return { ok: true };
}

export async function savePushSubscription(sub: { endpoint: string; p256dh: string; auth: string }): Promise<Result> {
  const { supabase, user } = await getSessionUser();
  if (!user) return { ok: false, error: 'Please sign in again.' };
  if (!isPushEndpoint(sub?.endpoint) || typeof sub.p256dh !== 'string' || typeof sub.auth !== 'string' ||
      sub.p256dh.length > 200 || sub.auth.length > 100) {
    return { ok: false, error: 'This browser’s notification service isn’t supported.' };
  }
  const { error } = await supabase.rpc('save_push_subscription', { p_endpoint: sub.endpoint, p_p256dh: sub.p256dh, p_auth: sub.auth });
  if (error) return { ok: false, error: 'Couldn’t turn on notifications for this device. Please try again.' };
  return { ok: true };
}

export async function removePushSubscription(endpoint: string): Promise<Result> {
  const { supabase, user } = await getSessionUser();
  if (!user) return { ok: false, error: 'Please sign in again.' };
  await supabase.from('push_subscriptions').delete().eq('endpoint', String(endpoint).slice(0, 1000));
  return { ok: true };
}
