import Link from 'next/link';
import clsx from 'clsx';
import type { LinkMap } from '@/lib/official';

/** Only Stripe-hosted Payment Links are accepted, so the button can't point anywhere unexpected. */
export function donateUrl(links: LinkMap | undefined): string | null {
  const url = links?.donate?.url?.trim();
  if (!url) return null;
  return /^https:\/\/(buy|donate)\.stripe\.com\//.test(url) ? url : null;
}

export const DONATE_NOTE =
  'Payments are processed securely by Stripe. Evanston Dinks is not a nonprofit, so donations are not tax-deductible.';

export function DonateButton({ url, size = 'md', className }: { url: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-full bg-amber-400 font-extrabold text-gray-900 shadow-md ring-2 ring-amber-500/40 transition hover:-translate-y-0.5 hover:bg-amber-300 hover:shadow-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-600',
        size === 'sm' && 'min-h-[40px] px-4 text-sm',
        size === 'md' && 'min-h-[48px] px-6 text-base',
        size === 'lg' && 'min-h-[56px] px-8 text-lg',
        className
      )}
    >
      <span aria-hidden>💛</span> Donate to keep it free
    </a>
  );
}

/** Eye-catching card used on the home page and below game listings. */
export function DonateCard({ url, compact = false }: { url: string; compact?: boolean }) {
  return (
    <section
      aria-labelledby="donate-heading"
      className="relative overflow-hidden rounded-2xl border-2 border-amber-400 bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-100 p-5 text-center shadow-sm sm:p-6"
    >
      <span aria-hidden className="absolute -right-4 -top-4 text-7xl opacity-20">🏓</span>
      <h2 id="donate-heading" className={clsx('font-extrabold text-gray-900', compact ? 'text-lg' : 'text-2xl')}>
        Keep Evanston Dinks free
      </h2>
      <p className={clsx('mx-auto mt-1 max-w-md text-gray-700', compact ? 'text-sm' : 'text-base')}>
        No ads, no fees to join. Your donation pays for the servers and hosting that keep Evanston Dinks running, so it
        stays free and more neighbors can find a game.
      </p>
      <div className="mt-4">
        <DonateButton url={url} size={compact ? 'md' : 'lg'} />
      </div>
      <p className="mt-3 text-xs text-gray-600">
        {DONATE_NOTE}{' '}
        <Link href="/support" className="underline">Learn more</Link>
      </p>
    </section>
  );
}
