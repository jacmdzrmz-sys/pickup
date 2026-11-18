'use server';

import { revalidatePath } from 'next/cache';
import { getSessionUser } from '@/lib/session';
import { PLAY_TYPES, SKILL_LEVELS } from '@/lib/labels';

type Result = { ok: true } | { ok: false; error: string };

export async function saveProfile(input: {
  displayName: string;
  avatarUrl: string | null;
  skillLevel: string;
  playType: string;
  neighborhood: string;
  bio: string;
  emailNotifications: boolean;
}): Promise<Result> {
  const { supabase, user } = await getSessionUser();
  if (!user) return { ok: false, error: 'Please sign in again.' };
  const name = input.displayName.trim().slice(0, 40);
  if (!name) return { ok: false, error: 'Please enter a display name.' };

  // Only accept photos from our own storage bucket or the sign-in provider.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const avatar = input.avatarUrl && (input.avatarUrl.startsWith(`${supabaseUrl}/storage/`) || input.avatarUrl.startsWith('https://lh3.googleusercontent.com/'))
    ? input.avatarUrl
    : null;

  const { error } = await supabase
    .from('profiles')
    .update({
      display_name: name,
      avatar_url: avatar,
      skill_level: SKILL_LEVELS.some((s) => s.value === input.skillLevel) ? input.skillLevel : null,
      play_type: PLAY_TYPES.some((s) => s.value === input.playType) ? input.playType : null,
      neighborhood: input.neighborhood.trim().slice(0, 40) || null,
      bio: input.bio.trim().slice(0, 280) || null,
    })
    .eq('id', user.id);
  if (error) return { ok: false, error: 'Your profile couldn’t be saved. Please try again.' };

  await supabase.from('account_settings').update({ email_notifications: input.emailNotifications }).eq('user_id', user.id);
  revalidatePath('/profile');
  return { ok: true };
}

export async function markNotificationsRead(): Promise<void> {
  const { supabase, user } = await getSessionUser();
  if (!user) return;
  await supabase.from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null);
  revalidatePath('/profile');
  revalidatePath('/', 'layout');
}

export async function unblockUser(blockedId: string): Promise<void> {
  const { supabase, user } = await getSessionUser();
  if (!user) return;
  await supabase.from('user_blocks').delete().eq('blocker_id', user.id).eq('blocked_id', blockedId);
  revalidatePath('/profile');
}

export async function blockUser(blockedId: string): Promise<Result> {
  const { supabase, user } = await getSessionUser();
  if (!user) return { ok: false, error: 'Please sign in to block a player.' };
  if (blockedId === user.id) return { ok: false, error: 'You can’t block yourself.' };
  const { error } = await supabase.from('user_blocks').insert({ blocker_id: user.id, blocked_id: blockedId });
  if (error && !error.message.includes('duplicate')) return { ok: false, error: 'Couldn’t block this player.' };
  revalidatePath(`/players/${blockedId}`);
  return { ok: true };
}

export async function deleteAccount(confirmation: string): Promise<Result> {
  if (confirmation.trim().toUpperCase() !== 'DELETE') return { ok: false, error: 'Type DELETE to confirm.' };
  const { supabase, user } = await getSessionUser();
  if (!user) return { ok: false, error: 'Please sign in again.' };

  // Remove uploaded photos
  const { data: files } = await supabase.storage.from('avatars').list(user.id);
  if (files && files.length) {
    await supabase.storage.from('avatars').remove(files.map((f) => `${user.id}/${f.name}`));
  }
  const { error } = await supabase.rpc('delete_my_account');
  if (error) return { ok: false, error: 'Your account couldn’t be deleted. Please contact us.' };
  await supabase.auth.signOut();
  return { ok: true };
}
