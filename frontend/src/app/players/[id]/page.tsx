import { notFound } from 'next/navigation';
import { getSessionUser } from '@/lib/session';
import type { GameView, Profile } from '@/lib/db-types';
import { PLAY_TYPES, SKILL_LEVELS, labelFor } from '@/lib/labels';
import { evanstonToday } from '@/lib/time';
import GameCard from '@/components/GameCard';
import ReportButton from '@/components/ReportButton';
import BlockButton from './block-button';

export const dynamic = 'force-dynamic';

export default async function PlayerPage({ params }: { params: { id: string } }) {
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) notFound();
  const { supabase, user } = await getSessionUser();

  const [{ data: profileData }, { data: gamesData }, blockRes] = await Promise.all([
    supabase.from('profiles').select('id, display_name, avatar_url, skill_level, play_type, neighborhood, bio, created_at').eq('id', params.id).maybeSingle(),
    supabase
      .from('community_games_view')
      .select('*')
      .eq('host_id', params.id)
      .eq('status', 'scheduled')
      .eq('is_past', false)
      .order('game_date')
      .limit(10),
    user
      ? supabase.from('user_blocks').select('blocked_id').eq('blocked_id', params.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const profile = profileData as Profile | null;
  if (!profile) notFound();
  const isMe = user?.id === profile.id;
  const blocked = !!blockRes.data;
  const games = (gamesData ?? []) as GameView[];
  const today = evanstonToday();

  return (
    <main className="mx-auto max-w-2xl space-y-5 px-4 py-6">
      <section className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4">
        {profile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.avatar_url} alt="" className="h-20 w-20 rounded-full object-cover" />
        ) : (
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-200 text-3xl">👤</span>
        )}
        <div>
          <h1 className="text-2xl font-bold">{profile.display_name}</h1>
          <p className="text-sm text-gray-600">
            {[
              profile.skill_level ? labelFor(SKILL_LEVELS, profile.skill_level) : null,
              profile.play_type ? labelFor(PLAY_TYPES, profile.play_type) : null,
              profile.neighborhood,
            ]
              .filter(Boolean)
              .join(' · ') || 'Evanston Dinks player'}
          </p>
        </div>
      </section>

      {profile.bio && <p className="whitespace-pre-line rounded-xl border border-gray-200 bg-white p-4 text-gray-800">{profile.bio}</p>}

      <section>
        <h2 className="font-bold">Upcoming games hosted</h2>
        {games.length === 0 ? (
          <p className="mt-2 text-sm text-gray-600">None right now.</p>
        ) : (
          <div className="mt-2 grid gap-3">
            {games.map((g) => (
              <GameCard key={g.id} game={g} today={today} />
            ))}
          </div>
        )}
      </section>

      {!isMe && (
        <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="font-bold">Safety</h2>
          <p className="text-sm text-gray-600">
            Blocking hides this player’s games from you and stops them from joining games you host.
          </p>
          <BlockButton userId={profile.id} blocked={blocked} signedIn={!!user} />
          <ReportButton targetType="user" userId={profile.id} label="Report this player" signedIn={!!user} />
          <p className="text-sm font-semibold text-red-800">For emergencies or immediate danger, call 911.</p>
        </section>
      )}
    </main>
  );
}
