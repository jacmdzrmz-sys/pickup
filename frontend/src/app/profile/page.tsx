import Link from 'next/link';
import { requireUser } from '@/lib/session';
import type { GameView, NotificationRow, Profile } from '@/lib/db-types';
import { evanstonToday } from '@/lib/time';
import GameCard from '@/components/GameCard';
import InstallApp from '@/components/InstallApp';
import ProfileForm, { BlockedList, DeleteAccount, NotificationsList } from './profile-form';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Profile · Evanston Dinks' };

export default async function ProfilePage() {
  const { supabase, user } = await requireUser('/profile');
  const today = evanstonToday();

  const [{ data: profile }, { data: settings }, { data: notes }, { data: myPlayers }, { data: blocks }, { data: adminRow }] =
    await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('account_settings').select('email_notifications, terms_accepted_at').eq('user_id', user.id).single(),
      supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(20),
      supabase.from('community_game_players').select('game_id').eq('user_id', user.id),
      supabase.from('user_blocks').select('blocked_id'),
      supabase.from('admins').select('user_id').eq('user_id', user.id).maybeSingle(),
    ]);

  const gameIds = (myPlayers ?? []).map((p: { game_id: string }) => p.game_id);
  const { data: gamesData } = gameIds.length
    ? await supabase
        .from('community_games_view')
        .select('*')
        .in('id', gameIds)
        .neq('status', 'removed')
        .order('game_date')
        .order('start_time')
    : { data: [] };
  const games = (gamesData ?? []) as GameView[];
  const upcoming = games.filter((g) => !g.is_past);
  const past = games.filter((g) => g.is_past).reverse().slice(0, 5);

  const blockedIds = (blocks ?? []).map((b: { blocked_id: string }) => b.blocked_id);
  const { data: blockedProfiles } = blockedIds.length
    ? await supabase.from('profiles').select('id, display_name').in('id', blockedIds)
    : { data: [] };

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your profile</h1>
        <div className="flex items-center gap-2">
          {adminRow && (
            <Link href="/admin" className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold">
              Admin
            </Link>
          )}
          <form action="/auth/signout" method="post">
            <button className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold">Sign out</button>
          </form>
        </div>
      </div>

      <InstallApp />

      <NotificationsList notifications={(notes ?? []) as NotificationRow[]} />

      <section>
        <h2 className="text-lg font-bold">Your upcoming games</h2>
        {upcoming.length === 0 ? (
          <p className="mt-2 rounded-xl border border-dashed border-gray-300 bg-white p-4 text-sm text-gray-600">
            No upcoming games.{' '}
            <Link href="/games" className="font-semibold text-blue-700 underline">Browse games</Link> or{' '}
            <Link href="/games/new" className="font-semibold text-blue-700 underline">host one</Link>.
          </p>
        ) : (
          <div className="mt-2 grid gap-3">
            {upcoming.map((g) => (
              <GameCard key={g.id} game={g} today={today} joined />
            ))}
          </div>
        )}
        {past.length > 0 && (
          <details className="mt-3">
            <summary className="cursor-pointer text-sm font-semibold text-gray-700">Recent past games</summary>
            <div className="mt-2 grid gap-3">
              {past.map((g) => (
                <GameCard key={g.id} game={g} today={today} />
              ))}
            </div>
          </details>
        )}
      </section>

      <ProfileForm
        userId={user.id}
        profile={profile as Profile}
        emailNotifications={!!settings?.email_notifications}
      />

      <BlockedList people={(blockedProfiles ?? []) as { id: string; display_name: string }[]} />

      <section className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-700">
        <h2 className="font-bold text-gray-900">Privacy</h2>
        <p className="mt-1">
          Other players see only your display name, photo, skill level, play type, neighborhood and bio. Your email address is
          never shown. <Link href="/privacy" className="font-semibold text-blue-700 underline">Privacy Policy</Link>
        </p>
      </section>

      <DeleteAccount />
    </main>
  );
}
