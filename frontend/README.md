# Pickup Frontend

Next.js web application for Evanston Pickup Games.

## Getting Started

### Prerequisites
- Node.js 18+
- Backend API running on `http://localhost:3001`

### Installation

```bash
cd frontend
npm install
cp .env.local.example .env.local
```

### Environment Setup

Update `.env.local` with:
```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_public_token
```

### Development

```bash
# Start dev server
npm run dev

# Server will run on http://localhost:3000
```

### Production Build

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home page
│   ├── globals.css         # Global styles
│   ├── games/              # Games pages (coming soon)
│   ├── courts/             # Courts pages (coming soon)
│   └── auth/               # Auth pages (coming soon)
├── components/             # Reusable components (coming soon)
│   ├── Map.tsx             # Mapbox map component
│   ├── GameCard.tsx        # Game card component
│   └── ...
├── lib/
│   ├── api-client.ts       # Axios API client
│   ├── auth-store.ts       # Zustand auth store
│   └── game-store.ts       # Zustand data stores
├── types/
│   └── index.ts            # TypeScript types
└── styles/                 # Shared styles
```

## Key Features

- **Next.js 14** with App Router
- **Tailwind CSS** for styling
- **Zustand** for state management
- **Axios** for API requests
- **Mapbox GL** for interactive maps
- **TypeScript** for type safety

## Available Scripts

```bash
npm run dev              # Start development server
npm run build            # Build for production
npm start                # Run production build
npm run lint             # Lint code
npm run format           # Format code
npm run type-check       # Check types
npm test                 # Run tests
```

## Pages to Build

- [ ] `/` - Home page (landing)
- [ ] `/auth/login` - Login page
- [ ] `/auth/register` - Registration page
- [ ] `/games` - Browse games
- [ ] `/games/[id]` - Game details
- [ ] `/games/create` - Create game
- [ ] `/courts` - Browse courts with map
- [ ] `/courts/[id]` - Court details
- [ ] `/profile` - User profile
- [ ] `/reservations` - User reservations

## Components to Build

- [ ] `CourtMap` - Interactive Mapbox map
- [ ] `GameCard` - Game listing card
- [ ] `GameForm` - Create/edit game form
- [ ] `Navigation` - Header navigation
- [ ] `AuthForm` - Login/register form
- [ ] `LoadingSpinner` - Loading indicator
- [ ] `ErrorAlert` - Error messages

## Integration Points

- Backend API: `http://localhost:3001`
- Mapbox API for maps and geolocation
- JWT token storage in localStorage
- Real-time updates via WebSocket (coming soon)
