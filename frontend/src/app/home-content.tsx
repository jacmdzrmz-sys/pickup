import Link from 'next/link';
import type { GameView } from '@/lib/db-types';
import GameCard from '@/components/GameCard';
import { evanstonToday } from '@/lib/time';
import { DonateCard } from '@/components/Donate';
import InstallApp from '@/components/InstallApp';
import ChampionCard from '@/components/compete/ChampionCard';

type HomeContentProps = {
  games: GameView[];
  signedIn: boolean;
  donateUrl?: string | null;
};

const STEPS = [
  { n: '1', title: 'Find a game', text: 'See what your neighbors are organizing, from James Park to Robert Crown.' },
  { n: '2', title: 'Join in one tap', text: 'Grab a spot. All levels welcome; nobody keeps score of your first dink.' },
  { n: '3', title: 'Know where to play', text: 'Outdoor courts, indoor drop-in and City rentals, all in one place.' },
  { n: '4', title: 'Play by the rules', text: 'City and posted court rules always apply. Share the courts and rotate in.' },
  { n: '5', title: 'Have fun', text: 'Meet people you’ve passed on Dempster for years.' },
];

const PLACES = [
  { name: 'James Park', note: '15 dedicated courts, lighted', href: '/games?location=james-park' },
  { name: 'Lovelace Park', note: '6 courts up north', href: '/games?location=lovelace-park' },
  { name: 'Fitzsimmons Park', note: 'Lighted, with a bang board', href: '/games?location=fitzsimmons-park' },
  { name: 'Robert Crown', note: 'Indoor drop-in all winter', href: '/games?location=robert-crown' },
  { name: 'Levy Center', note: 'Indoor open gym', href: '/games?location=levy-senior-center' },
  { name: 'Cartwright & Mason', note: 'Neighborhood courts', href: '/courts#outdoor' },
];

/** Court-line decoration echoing the Evanston Dinks badge and cover. */
function CourtLines() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -right-40 -top-40 h-96 w-96 rounded-full border-[14px] border-dink-blue/15" />
      <div className="absolute -bottom-56 -left-48 h-[28rem] w-[28rem] rounded-full border-[14px] border-dink-blue/10" />
    </div>
  );
}

export default function HomeContent({ games, signedIn, donateUrl }: HomeContentProps) {
  const today = evanstonToday();
  return (
    <main className="bg-dink-paper text-dink-navy">
      {/* Hero */}
      <section className="relative">
        <CourtLines />
        <div className="relative mx-auto max-w-3xl px-4 pb-10 pt-8 text-center sm:pt-12">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-512.png" alt="Evanston Dinks" className="mx-auto h-36 w-36 sm:h-44 sm:w-44" />
          <p className="mt-4 text-sm font-bold uppercase tracking-[0.2em] text-dink-blue">Welcome · Bienvenidos</p>
          <h1 className="mt-2 text-4xl font-black leading-tight tracking-tight sm:text-5xl">
            Pickup pickleball for <span className="text-dink-pink">all of Evanston.</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-lg text-slate-600">
            Find a game, meet your neighbors, and know where to play: lakefront to the Canal, Central Street to Howard.
            Free, always.
          </p>

          <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Link href="/games" className="rounded-full bg-dink-pink px-6 py-4 text-lg font-extrabold text-white shadow-lg shadow-pink-500/25 transition hover:brightness-110">
              Find a Game
            </Link>
            <Link href="/games/new" className="rounded-full bg-dink-blue px-6 py-4 text-lg font-extrabold text-white transition hover:brightness-110">
              Host a Game
            </Link>
            <Link href="/courts" className="rounded-full border-[3px] border-dink-blue bg-white px-6 py-4 text-lg font-extrabold text-dink-blue transition hover:bg-blue-50">
              Find Courts
            </Link>
          </div>
          {!signedIn && (
            <p className="mt-4 text-sm text-slate-600">
              Look around, no account needed.{' '}
              <Link href="/auth/login" className="font-bold text-dink-blue underline">Sign in</Link> to join or host.
            </p>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-4 pb-6">
        <InstallApp />
      </div>

      {/* Coming up */}
      <section className="mx-auto max-w-3xl px-4 pb-10">
        <div className="flex items-baseline justify-between">
          <h2 className="text-2xl font-black">Who’s playing this week</h2>
          <Link href="/games" className="text-sm font-bold text-dink-blue hover:underline">See all games →</Link>
        </div>
        {games.length > 0 ? (
          <div className="mt-3 grid gap-3">
            {games.map((g) => (
              <GameCard key={g.id} game={g} today={today} />
            ))}
          </div>
        ) : (
          <div className="mt-3 rounded-2xl border-[3px] border-dashed border-dink-blue/30 bg-white p-6 text-center">
            <p className="text-lg font-extrabold">The courts are quiet… for now.</p>
            <p className="mt-1 text-slate-600">Be the first to post a game this week. It takes less than a minute.</p>
            <Link href="/games/new" className="mt-4 inline-block rounded-full bg-dink-pink px-6 py-3 font-extrabold text-white">
              Host a Game
            </Link>
          </div>
        )}
      </section>

      {/* Compete */}
      <section className="mx-auto max-w-3xl space-y-4 px-4 pb-10">
        <ChampionCard variant="home" />
        <div className="rounded-2xl border-[3px] border-dink-pink/30 bg-white p-5">
          <p className="text-sm font-bold uppercase tracking-widest text-dink-pink">Friendly competition</p>
          <h2 className="mt-1 text-2xl font-black">Round robins, ladders & Top Players 🏆</h2>
          <p className="mt-1 text-slate-600">
            Log your scores, host a round robin with automatic pairings, or climb a singles ladder. Player-run, just for fun.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/compete" className="rounded-full bg-dink-pink px-5 py-3 font-extrabold text-white">Let’s compete</Link>
            <Link href="/leaders" className="rounded-full border-[3px] border-dink-blue px-5 py-2.5 font-extrabold text-dink-blue">Top Players</Link>
          </div>
        </div>
      </section>

      {/* Where Evanston plays */}
      <section className="mx-auto max-w-3xl px-4 pb-10">
        <h2 className="text-2xl font-black">Where E-Town plays</h2>
        <p className="mt-1 text-slate-600">Tap a spot to see games there.</p>
        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {PLACES.map((p) => (
            <li key={p.name}>
              <Link href={p.href} className="block h-full rounded-2xl border-2 border-dink-blue/20 bg-white p-4 transition hover:border-dink-blue">
                <span className="block font-extrabold">{p.name}</span>
                <span className="block text-sm text-slate-600">{p.note}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Winter */}
      <section className="mx-auto max-w-3xl px-4 pb-10">
        <div className="rounded-2xl bg-dink-blue p-6 text-white">
          <p className="text-sm font-bold uppercase tracking-widest text-blue-100">When the lake wind kicks in</p>
          <h2 className="mt-1 text-2xl font-black">Keep playing all winter ❄️</h2>
          <p className="mt-2 text-blue-50">
            Outdoor season winds down, but the dinks don’t stop. Robert Crown and the Levy Center run indoor drop-in, and
            Chandler-Newberger and Prieto rent courts. We keep the times, fees and how-to-book in one spot.
          </p>
          <Link href="/courts#indoor" className="mt-4 inline-block rounded-full bg-white px-6 py-3 font-extrabold text-dink-blue">
            See indoor options →
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-3xl px-4 pb-10">
        <h2 className="text-2xl font-black">How it works</h2>
        <ol className="mt-3 grid gap-3 sm:grid-cols-2">
          {STEPS.map((s) => (
            <li key={s.n} className="flex gap-3 rounded-2xl bg-white p-4 shadow-sm">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-dink-pink font-black text-white">{s.n}</span>
              <div>
                <h3 className="font-extrabold">{s.title}</h3>
                <p className="text-slate-600">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Community story */}
      <section className="mx-auto max-w-3xl px-4 pb-10">
        <div className="rounded-2xl border-[3px] border-dink-pink/30 bg-white p-6">
          <h2 className="text-2xl font-black">Built by neighbors who kept showing up</h2>
          <p className="mt-2 text-slate-700">
            Evanston pickleball started on borrowed courts: pickleball lines painted onto tennis courts and temporary indoor courts at
            Robert Crown. Evanston neighbors went to Park Board meetings for years, and in 2026 James Park opened with 15
            dedicated courts. That win belongs to them.
          </p>
          <p className="mt-3 text-slate-700">
            Evanston Dinks was inspired by their effort and built to build community: a simple way to fill those courts and
            meet the people who live around the corner. Neighbors made room for everyone to play, so this app is free for
            everyone, too.
          </p>
          <p className="mt-3 text-slate-700">
            And a shout-out to Evanston Parks &amp; Rec, which keeps 76 parks, 6 beaches and a dozen facilities going
            in under 8 square miles.
          </p>
          <p className="mt-3 font-semibold text-slate-800">
            Want to help? Donations pay for the servers and hosting that keep Evanston Dinks running, so more neighbors can
            join in.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/about" className="rounded-full bg-dink-navy px-5 py-2.5 font-bold text-white">Our story</Link>
            <a
              href="https://cityofevanston.org/departments/prcs/index.php"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border-2 border-dink-navy px-5 py-2.5 font-bold"
            >
              Evanston Parks &amp; Rec ↗
            </a>
          </div>
        </div>
      </section>

      {donateUrl && (
        <section className="mx-auto max-w-3xl px-4 pb-10">
          <DonateCard url={donateUrl} />
        </section>
      )}

      <section className="mx-auto max-w-3xl px-4 pb-12">
        <div className="rounded-2xl bg-green-50 p-4 text-sm text-green-900">
          <strong>Need to reserve a court?</strong> Evanston Parks &amp; Recreation manages official court reservations
          through its recreation system. Evanston Dinks is a community app, not the City.{' '}
          <Link href="/courts" className="font-bold underline">See how to reserve →</Link>
        </div>
      </section>
    </main>
  );
}
