import Link from 'next/link';
import { DonateButton } from './Donate';

export default function Footer({ donateUrl }: { donateUrl?: string | null }) {
  return (
    <footer className="mt-12 border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-5xl space-y-3 px-4 py-6 text-center text-sm text-gray-600">
        {donateUrl && (
          <div className="pb-2">
            <p className="mb-2 font-semibold text-gray-800">Evanston Dinks is free thanks to players like you.</p>
            <DonateButton url={donateUrl} size="sm" />
          </div>
        )}
        <p className="font-semibold text-gray-800">For emergencies or immediate danger, call 911.</p>
        <p>
          <Link href="/about" className="hover:underline">Our Story</Link>
          {' • '}
          <Link href="/terms" className="hover:underline">Terms</Link>
          {' • '}
          <Link href="/privacy" className="hover:underline">Privacy</Link>
          {' • '}
          <Link href="/safety" className="hover:underline">Safety</Link>
          {' • '}
          <Link href="/guidelines" className="hover:underline">Community Guidelines</Link>
          {donateUrl && (
            <>
              {' • '}
              <Link href="/support" className="hover:underline">Support</Link>
            </>
          )}
        </p>
        <p className="text-xs text-gray-500">
          Evanston Dinks is a community platform, not the City of Evanston. Court reservations, rules, closures and
          schedules are managed by Evanston Parks &amp; Recreation.
        </p>
      </div>
    </footer>
  );
}
