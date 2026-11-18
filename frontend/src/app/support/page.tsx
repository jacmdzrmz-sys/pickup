import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { getOfficialLinks } from '@/lib/official';
import { DonateButton, DONATE_NOTE, donateUrl } from '@/components/Donate';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Support Evanston Dinks' };

export default async function SupportPage() {
  const url = donateUrl(await getOfficialLinks(createClient()));
  return (
    <main className="mx-auto max-w-xl px-4 py-10 text-center">
      <p className="text-5xl" aria-hidden>💛🏓</p>
      <h1 className="mt-3 text-3xl font-extrabold text-gray-900">Keep Evanston Dinks free</h1>
      <p className="mt-3 text-lg text-gray-700">
        Evanston Dinks is free to use, with no ads and no fees to join games. It’s built and run by a neighbor.
      </p>
      <p className="mt-2 text-gray-700">
        Donations cover hosting, the database, and email, so the site can stay free for every Evanston player.
      </p>
      <div className="mt-6">
        {url ? (
          <DonateButton url={url} size="lg" />
        ) : (
          <p className="rounded-lg bg-gray-100 p-4 text-gray-700">Donations are coming soon. Thanks for thinking of us!</p>
        )}
      </div>
      <p className="mt-4 text-sm text-gray-600">You choose the amount. {DONATE_NOTE}</p>
      <p className="mt-8 text-sm text-gray-600">
        Donating never affects your account or access. Everyone gets the same Evanston Dinks.{' '}
        <Link href="/games" className="font-semibold text-blue-700 underline">Back to games</Link>
      </p>
    </main>
  );
}
