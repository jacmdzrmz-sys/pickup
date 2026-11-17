# Evanston Pickup Games

A mobile-first application for discovering and joining pickup basketball and pickleball games at local public courts in Evanston, IL.

## Features

- **Interactive Map**: View all available courts in Evanston with real-time game activity
- **Game Matchmaking**: Create or join pickup games at your preferred court
- **Court Reservations**: Integrated with Evanston Parks & Recreation permit system
- **User Profiles**: Track your game history and preferences
- **Real-time Notifications**: Get alerted when games you're interested in are starting soon

## Project Structure

```
pickup/
├── frontend/           # React/Next.js web app
├── backend/            # Node.js/Express API server
├── mobile/             # React Native mobile app (future)
├── docs/               # Architecture, API specs, integration guides
├── docker-compose.yml  # Local development environment
└── scripts/            # Utility scripts
```

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Docker & Docker Compose (optional)

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

See `.env.example` files in `backend/` and `frontend/` directories.

## Deployment

### Backend on Hostinger Node.js hosting

Deploy the `backend/` directory as a Node.js application, using Node 22,
`npm run build` as the build command, and `dist/index.js` as the entry point.
Configure these environment variables in Hostinger:

- `NODE_ENV=production`
- `DATABASE_URL` — the Supabase PostgreSQL transaction-pooler URI, using port
  `6543` and the `?pgbouncer=true` query parameter. URL-encode special
  characters in credentials.
- `JWT_SECRET` — a private, unique signing secret.
- `CORS_ORIGIN` — a comma-separated list of allowed frontend origins. Include
  the deployed frontend domain, such as `https://pickup.vercel.app`, and any
  custom frontend domain, such as `https://evanstondinks.app`.
- `PORT` — set this only if Hostinger requires you to provide its assigned port.

### Frontend on Vercel

Create a Vercel project for this repository and set its Root Directory to
`frontend`. Set `NEXT_PUBLIC_API_URL` to `https://evanstondinks.app`. Add the
optional `NEXT_PUBLIC_MAPBOX_TOKEN` if the map uses Mapbox, and set
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` if the
frontend uses Supabase directly. Only use public client values with the
`NEXT_PUBLIC_` prefix; never put secrets there.

The root `vercel.json` defines a combined backend/frontend service layout and
rewrites, not a frontend-only deployment. It does not conflict when the Vercel
project Root Directory is `frontend`, because that project should use
configuration inside `frontend/`. If deploying from the repository root
instead, remove or adjust the combined-service config and its backend service
binding/API rewrites for a frontend-only deployment.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

MIT
