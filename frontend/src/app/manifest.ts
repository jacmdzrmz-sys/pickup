import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Evanston Dinks',
    short_name: 'Dinks',
    description: 'Find and join pickleball games in Evanston and see where to play.',
    start_url: '/?source=app',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f9fafb',
    theme_color: '#2563eb',
    categories: ['sports', 'social', 'lifestyle'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Browse Games', url: '/games', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Create Game', url: '/games/new', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Find Courts', url: '/courts', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
    ],
  };
}
