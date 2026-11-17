'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { API_BASE_URL } from '@/lib/api-client';

type Todo = {
  id: string | number;
  name: string;
};

type HomeContentProps = {
  todos: Todo[];
};

export default function HomeContent({ todos }: HomeContentProps) {
  const [backendStatus, setBackendStatus] = useState<
    'checking' | 'ready' | 'unavailable'
  >('checking');

  useEffect(() => {
    const checkApi = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/health`);
        if (!response.ok) {
          throw new Error(`Backend health check returned ${response.status}`);
        }
        const health: { database?: string } = await response.json();
        if (health.database !== 'connected') {
          throw new Error('Backend database is disconnected');
        }
        setBackendStatus('ready');
      } catch (error) {
        console.error('✗ Backend connection failed:', error);
        setBackendStatus('unavailable');
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

        {todos.length > 0 && (
          <section className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 text-left">
            <h2 className="text-xl font-bold text-gray-900 mb-3">Todos</h2>
            <ul className="space-y-2">
              {todos.map((todo) => (
                <li key={String(todo.id)} className="text-gray-700">
                  {todo.name}
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="text-sm text-gray-600">
          {backendStatus === 'checking' ? (
            <p>Connecting to backend...</p>
          ) : backendStatus === 'ready' ? (
            <p>✓ Backend ready</p>
          ) : (
            <p role="status">Server unavailable. Please try again later.</p>
          )}
        </div>
      </div>
    </main>
  );
}
