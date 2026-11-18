import Link from 'next/link';

export const metadata = { title: 'Our Story · Evanston Dinks' };

export default function AboutPage() {
  return (
    <main className="bg-dink-paper text-dink-navy">
      <div className="mx-auto max-w-2xl px-4 py-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-512.png" alt="Evanston Dinks" className="h-28 w-28" />
        <h1 className="mt-4 text-4xl font-black tracking-tight">
          Made in Evanston, <span className="text-dink-pink">for Evanston.</span>
        </h1>

        <div className="mt-6 space-y-4 text-lg leading-relaxed text-slate-700">
          <p>
            Evanston Dinks is a free app for pickup pickleball in E-Town. Find a game, join in one tap, and know exactly
            where to play, whether it’s a summer evening at James Park or a January drop-in at Robert Crown.
          </p>
          <p>
            It’s built and run by a neighbor: a Latina, a D65 parent, and a former service member who believes the best
            parts of Evanston happen when people show up for each other. On the court, that means everyone gets a turn.
          </p>
          <p>
            No ads. No fees to join a game. If it helps you find your people, that’s the whole point.
          </p>
        </div>

        <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black">What we believe</h2>
          <ul className="mt-3 space-y-2 text-slate-700">
            <li><span className="font-bold text-dink-pink">Everyone plays.</span> All ages, all levels, every ward.</li>
            <li><span className="font-bold text-dink-pink">Share the courts.</span> Rotate in, follow posted rules, and leave room for the next group.</li>
            <li><span className="font-bold text-dink-pink">The City runs the parks.</span> Evanston Parks &amp; Rec manages courts, hours and reservations. We point you to them.</li>
            <li><span className="font-bold text-dink-pink">Your info stays yours.</span> We never show your email and never sell your data.</li>
          </ul>
        </section>

        <p className="mt-8 text-sm text-slate-500">
          Evanston Dinks is a community platform and is not affiliated with or endorsed by the City of Evanston.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/games" className="rounded-full bg-dink-pink px-6 py-3 font-extrabold text-white">Find a Game</Link>
          <Link href="/support" className="rounded-full border-2 border-dink-navy px-6 py-3 font-extrabold">Support the app</Link>
        </div>
      </div>
    </main>
  );
}
