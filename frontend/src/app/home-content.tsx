import Link from 'next/link';
import type { GameView } from '@/lib/db-types';
import GameCard from '@/components/GameCard';
import { evanstonToday } from '@/lib/time';
import { DonateCard } from '@/components/Donate';

type HomeContentProps = {
  games: GameView[];
  signedIn: boolean;
  donateUrl?: string | null;
};

const STEPS = [
  { icon: '🔎', title: 'Find a game', text: 'See what Evanston players are organizing.' },
  { icon: '👋', title: 'Join', text: 'One tap to save your spot.' },
  { icon: '📍', title: 'Know where to play', text: 'Outdoor courts, indoor drop-in and rentals.' },
  { icon: '📋', title: 'Follow the rules', text: 'City and posted court rules always apply.' },
  { icon: '🎉', title: 'Have fun', text: 'Meet your neighbors on the court.' },
];

export default function HomeContent({ games, signedIn, donateUrl }: HomeContentProps) {
  const today = evanstonToday();
  return (
    <main className="bg-gradient-to-br from-blue-50 to-indigo-100">
      <section className="mx-auto max-w-3xl px-4 pb-10 pt-10 text-center">
        <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl">Evanston Dinks</h1>
        <p className="mt-3 text-lg text-gray-600 sm:text-xl">
          Find a pickleball game, join in, and know where to play in Evanston.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Link
            href="/games"
            className="rounded-lg bg-blue-600 px-6 py-4 text-lg font-semibold text-white transition hover:bg-blue-700"
          >
            Browse Games
          </Link>
          <Link
            href="/games/new"
            className="rounded-lg bg-gray-800 px-6 py-4 text-lg font-semibold text-white transition hover:bg-gray-900"
          >
            Create a Game
          </Link>
          <Link
            href="/courts"
            className="rounded-lg bg-green-600 px-6 py-4 text-lg font-semibold text-white transition hover:bg-green-700"
          >
            Find Courts
          </Link>
        </div>
        {!signedIn && (
          <p className="mt-4 text-sm text-gray-600">
            Browsing is open to everyone.{' '}
            <Link href="/auth/login" className="font-semibold text-blue-700 underline">
              Sign in
            </Link>{' '}
            to join or host.
          </p>
        )}
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-10">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-bold text-gray-900">Coming up</h2>
          <Link href="/games" className="text-sm font-semibold text-blue-700 hover:underline">
            See all games →
          </Link>
        </div>
        {games.length > 0 ? (
          <div className="mt-3 grid gap-3">
            {games.map((g) => (
              <GameCard key={g.id} game={g} today={today} />
            ))}
          </div>
        ) : (
          <div className="mt-3 rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center">
            <p className="font-semibold text-gray-800">No games posted yet.</p>
            <p className="mt-1 text-sm text-gray-600">Be the first — it takes less than a minute.</p>
            <Link
              href="/games/new"
              className="mt-4 inline-block rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
            >
              Create a Game
            </Link>
          </div>
        )}
      </section>

      {donateUrl && (
        <section className="mx-auto max-w-3xl px-4 pb-10">
          <DonateCard url={donateUrl} />
        </section>
      )}

      <section className="mx-auto max-w-3xl px-4 pb-12">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-bold text-gray-900">How it works</h2>
          <ol className="grid grid-cols-1 gap-4 text-left sm:grid-cols-2">
            {STEPS.map((s) => (
              <li key={s.title} className="flex items-start gap-3">
                <span className="text-2xl" aria-hidden>
                  {s.icon}
                </span>
                <div>
                  <h3 className="font-semibold text-gray-900">{s.title}</h3>
                  <p className="text-gray-600">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-6 rounded-lg bg-green-50 p-4 text-sm text-green-900">
            <strong>Need to reserve a court?</strong> Evanston Parks &amp; Recreation manages official court
            reservations through its recreation system.{' '}
            <Link href="/courts" className="font-semibold underline">
              See how →
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
