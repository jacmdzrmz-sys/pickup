import { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import './globals.css';
import AppNav from '@/components/AppNav';
import Footer from '@/components/Footer';
import { RegisterServiceWorker } from '@/components/InstallApp';
import { createClient } from '@/utils/supabase/server';
import { getOfficialLinks } from '@/lib/official';
import { donateUrl } from '@/components/Donate';

export const metadata: Metadata = {
  title: 'Evanston Dinks',
  description:
    'Find and join pickleball games in Evanston, see where to play, and get to official City court reservations.',
  applicationName: 'Evanston Dinks',
  appleWebApp: { capable: true, title: 'Dinks', statusBarStyle: 'default' },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#2563eb',
};

async function getNavState() {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { signedIn: false, unread: 0 };
    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .is('read_at', null);
    return { signedIn: true, unread: count ?? 0 };
  } catch {
    return { signedIn: false, unread: 0 };
  }
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [nav, links] = await Promise.all([getNavState(), getOfficialLinks(createClient()).catch(() => undefined)]);
  const donate = donateUrl(links);
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900">
        <div className="flex min-h-screen flex-col pb-20 lg:pb-0">
          <AppNav signedIn={nav.signedIn} unread={nav.unread} donateUrl={donate} />
          <div className="flex-1">{children}</div>
          <Footer donateUrl={donate} />
          <RegisterServiceWorker />
        </div>
      </body>
    </html>
  );
}
