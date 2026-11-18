'use client';

import { useAsync } from '@/lib/use-async';
import { useRouter } from 'next/navigation';
import {useState} from 'react';
import type { NotificationRow, Profile } from '@/lib/db-types';
import { PLAY_TYPES, SKILL_LEVELS } from '@/lib/labels';
import { createClient } from '@/utils/supabase/client';
import { deleteAccount, markNotificationsRead, saveProfile, unblockUser } from './actions';

const input = 'mt-1 block min-h-[48px] w-full rounded-lg border border-gray-300 px-3 text-base';

export default function ProfileForm({
  userId,
  profile,
  emailNotifications,
}: {
  userId: string;
  profile: Profile;
  emailNotifications: boolean;
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(profile.display_name ?? '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url);
  const [skillLevel, setSkillLevel] = useState(profile.skill_level ?? '');
  const [playType, setPlayType] = useState(profile.play_type ?? '');
  const [neighborhood, setNeighborhood] = useState(profile.neighborhood ?? '');
  const [bio, setBio] = useState(profile.bio ?? '');
  const [emails, setEmails] = useState(emailNotifications);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useAsync();

  async function upload(file: File) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setMsg({ ok: false, text: 'Please choose a JPG, PNG or WebP image.' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setMsg({ ok: false, text: 'Please choose an image under 2 MB.' });
      return;
    }
    setUploading(true);
    setMsg(null);
    const supabase = createClient();
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const path = `${userId}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type });
    setUploading(false);
    if (error) {
      setMsg({ ok: false, text: 'Photo upload failed. Please try again.' });
      return;
    }
    setAvatarUrl(supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl);
  }

  return (
    <form
      className="space-y-4 rounded-xl border border-gray-200 bg-white p-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveProfile({ displayName, avatarUrl, skillLevel, playType, neighborhood, bio, emailNotifications: emails });
          setMsg(res.ok ? { ok: true, text: 'Saved!' } : { ok: false, text: res.error });
          if (res.ok) router.refresh();
        });
      }}
    >
      <h2 className="text-lg font-bold">Edit profile</h2>
      <div className="flex items-center gap-4">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="Your profile photo" className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-200 text-2xl">👤</span>
        )}
        <div className="flex flex-col gap-1 text-sm">
          <label className="cursor-pointer font-semibold text-blue-700 underline">
            {uploading ? 'Uploading…' : avatarUrl ? 'Change photo' : 'Add photo'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
            />
          </label>
          {avatarUrl && (
            <button type="button" className="text-left text-gray-600 underline" onClick={() => setAvatarUrl(null)}>
              Remove photo
            </button>
          )}
        </div>
      </div>
      <label className="block text-sm">
        <span className="font-semibold text-gray-700">Display name</span>
        <input value={displayName} maxLength={40} required onChange={(e) => setDisplayName(e.target.value)} className={input} />
      </label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-semibold text-gray-700">Skill level</span>
          <select value={skillLevel} onChange={(e) => setSkillLevel(e.target.value)} className={input}>
            <option value="">Prefer not to say</option>
            {SKILL_LEVELS.map((s) => (
              <option key={s.value} value={s.value}>{s.value === 'all' ? 'Mixed / not sure' : s.label}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-semibold text-gray-700">Preferred play</span>
          <select value={playType} onChange={(e) => setPlayType(e.target.value)} className={input}>
            <option value="">Prefer not to say</option>
            {PLAY_TYPES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="block text-sm">
        <span className="font-semibold text-gray-700">Neighborhood (optional)</span>
        <input
          value={neighborhood}
          maxLength={40}
          onChange={(e) => setNeighborhood(e.target.value)}
          placeholder="e.g. South Evanston — not your address"
          className={input}
        />
      </label>
      <label className="block text-sm">
        <span className="font-semibold text-gray-700">Short bio (optional)</span>
        <textarea value={bio} maxLength={280} rows={3} onChange={(e) => setBio(e.target.value)} className="mt-1 block w-full rounded-lg border border-gray-300 p-3 text-base" />
      </label>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" checked={emails} onChange={(e) => setEmails(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0" />
        <span>
          <span className="font-semibold">Email me about my games</span> (for example, when a game I joined is canceled). Optional
          — you’ll always see notifications here in the app.
        </span>
      </label>
      {msg && <p className={msg.ok ? 'text-sm text-green-700' : 'text-sm text-red-700'}>{msg.text}</p>}
      <button disabled={pending || uploading} className="min-h-[48px] w-full rounded-lg bg-blue-600 px-4 font-semibold text-white disabled:opacity-60">
        {pending ? 'Saving…' : 'Save profile'}
      </button>
    </form>
  );
}

export function NotificationsList({ notifications }: { notifications: NotificationRow[] }) {
  const router = useRouter();
  const [pending, start] = useAsync();
  if (notifications.length === 0) return null;
  const unread = notifications.filter((n) => !n.read_at).length;
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Notifications{unread ? ` (${unread} new)` : ''}</h2>
        {unread > 0 && (
          <button
            type="button"
            disabled={pending}
            onClick={() => start(async () => { await markNotificationsRead(); router.refresh(); })}
            className="text-sm font-semibold text-blue-700 underline"
          >
            Mark all read
          </button>
        )}
      </div>
      <ul className="mt-2 space-y-2">
        {notifications.map((n) => (
          <li key={n.id} className={`rounded-lg p-3 text-sm ${n.read_at ? 'bg-gray-50 text-gray-600' : 'bg-red-50 font-semibold text-red-900'}`}>
            {n.link ? <a href={n.link} className="underline">{n.message}</a> : n.game_id ? <a href={`/games/${n.game_id}`} className="underline">{n.message}</a> : n.message}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function BlockedList({ people }: { people: { id: string; display_name: string }[] }) {
  const router = useRouter();
  const [pending, start] = useAsync();
  if (people.length === 0) return null;
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4">
      <h2 className="text-lg font-bold">Blocked players</h2>
      <ul className="mt-2 divide-y divide-gray-100">
        {people.map((p) => (
          <li key={p.id} className="flex items-center justify-between py-2">
            <span>{p.display_name}</span>
            <button
              type="button"
              disabled={pending}
              onClick={() => start(async () => { await unblockUser(p.id); router.refresh(); })}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold"
            >
              Unblock
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useAsync();
  return (
    <section className="rounded-xl border border-red-200 bg-white p-4">
      <h2 className="text-lg font-bold text-red-800">Delete account</h2>
      <p className="mt-1 text-sm text-gray-700">
        This permanently deletes your account, profile, photo and game sign-ups. Upcoming games you host are canceled and
        players are notified. Safety reports may be kept, without your account attached, as explained in the Privacy Policy.
      </p>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="mt-3 min-h-[44px] rounded-lg border border-red-300 px-4 font-semibold text-red-700">
          Delete my account…
        </button>
      ) : (
        <form
          className="mt-3 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await deleteAccount(text);
              if (res.ok) window.location.assign('/?deleted=1');
              else setError(res.error);
            });
          }}
        >
          <label className="block text-sm font-semibold">
            Type DELETE to confirm
            <input value={text} onChange={(e) => setText(e.target.value)} className={input} autoComplete="off" />
          </label>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button disabled={pending} className="min-h-[44px] w-full rounded-lg bg-red-600 px-4 font-semibold text-white disabled:opacity-60">
            Permanently delete my account
          </button>
        </form>
      )}
    </section>
  );
}
