'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

const NAV = [
  { href: '/', label: 'Home', icon: '🏠', match: (p: string) => p === '/' },
  { href: '/games', label: 'Browse Games', short: 'Games', icon: '🏓', match: (p: string) => p === '/games' || (p.startsWith('/games/') && p !== '/games/new') },
  { href: '/games/new', label: 'Create Game', short: 'Create', icon: '➕', match: (p: string) => p === '/games/new' },
  { href: '/courts', label: 'Find Courts', short: 'Courts', icon: '📍', match: (p: string) => p.startsWith('/courts') },
  { href: '/profile', label: 'Profile', icon: '👤', match: (p: string) => p.startsWith('/profile') || p.startsWith('/auth') || p.startsWith('/welcome') },
];

export default function AppNav({ unread = 0, signedIn = false }: { unread?: number; signedIn?: boolean }) {
  const pathname = usePathname() || '/';

  return (
    <>
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-bold text-gray-900">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-160.png" alt="" className="h-9 w-9 rounded-full" />
            <span className="text-lg">Evanston <span className="text-dink-pink">Dinks</span></span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'relative rounded-lg px-3 py-2 text-sm font-semibold transition',
                  item.match(pathname) ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                )}
              >
                {item.href === '/profile' && !signedIn ? 'Sign In' : item.label}
                {item.href === '/profile' && unread > 0 && (
                  <span className="ml-1 rounded-full bg-red-600 px-1.5 text-xs text-white">{unread}</span>
                )}
              </Link>
            ))}
          </nav>
          <Link
            href="/games/new"
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white md:hidden"
          >
            + Create
          </Link>
        </div>
      </header>

      {/* Bottom bar (mobile) */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <ul className="grid grid-cols-5">
          {NAV.map((item) => {
            const active = item.match(pathname);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={clsx(
                    'relative flex h-16 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold',
                    active ? 'text-blue-700' : 'text-gray-600'
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  <span aria-hidden className="text-xl leading-none">{item.icon}</span>
                  <span>{item.href === '/profile' && !signedIn ? 'Sign In' : item.short ?? item.label}</span>
                  {item.href === '/profile' && unread > 0 && (
                    <span className="absolute right-4 top-2 h-2.5 w-2.5 rounded-full bg-red-600" aria-label={`${unread} unread`} />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
