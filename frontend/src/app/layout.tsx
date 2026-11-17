import { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'Evanston Pickup Games',
  description: 'Find and join pickup basketball and pickleball games in Evanston',
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50">
        <div className="min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}
