'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check API connection
    const checkApi = async () => {
      try {
        const response = await fetch('/api/health');
        if (response.ok) {
          console.log('✓ Backend connected');
        }
      } catch (error) {
        console.error('✗ Backend connection failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkApi();
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="text-center space-y-8 max-w-2xl">
        <div className="space-y-3">
          <h1 className="text-5xl font-bold text-gray-900">
            Evanston Pickup Games
          </h1>
          <p className="text-xl text-gray-600">
            Find and join basketball & pickleball games at your local courts
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-lg font-semibold text-gray-700">
            Ready to play?
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/games"
              className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
            >
              Browse Games
            </Link>
            <Link
              href="/courts"
              className="px-8 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition"
            >
              Find Courts
            </Link>
            <Link
              href="/auth/login"
              className="px-8 py-3 bg-gray-800 text-white font-semibold rounded-lg hover:bg-gray-900 transition"
            >
              Sign In
            </Link>
          </div>
        </div>

        <div className="mt-12 p-6 bg-white rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Features</h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            <li className="flex items-start space-x-3">
              <span className="text-2xl">🗺️</span>
              <div>
                <h3 className="font-semibold text-gray-900">Interactive Map</h3>
                <p className="text-gray-600">Find courts near you</p>
              </div>
            </li>
            <li className="flex items-start space-x-3">
              <span className="text-2xl">🎮</span>
              <div>
                <h3 className="font-semibold text-gray-900">Create Games</h3>
                <p className="text-gray-600">Post pickup games easily</p>
              </div>
            </li>
            <li className="flex items-start space-x-3">
              <span className="text-2xl">👥</span>
              <div>
                <h3 className="font-semibold text-gray-900">Join Community</h3>
                <p className="text-gray-600">Meet other players</p>
              </div>
            </li>
            <li className="flex items-start space-x-3">
              <span className="text-2xl">📅</span>
              <div>
                <h3 className="font-semibold text-gray-900">Book Courts</h3>
                <p className="text-gray-600">Reserve permits online</p>
              </div>
            </li>
          </ul>
        </div>

        <div className="text-sm text-gray-600">
          {isLoading ? (
            <p>Connecting to backend...</p>
          ) : (
            <p>✓ Backend ready</p>
          )}
        </div>
      </div>
    </main>
  );
}
