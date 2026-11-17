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

## Deploy to a Hostinger VPS

This project needs a Hostinger VPS with Docker Compose; it cannot run as a static
site on shared hosting. Point your domain's DNS A record to the VPS IPv4 address
and allow inbound ports 80 and 443 in the Hostinger firewall.

On the VPS, install Docker Engine with the Compose plugin, clone this repository,
and from the repository directory:

1. Create the production environment file:

   ```sh
   cp .env.hostinger.example .env
   chmod 600 .env
   ```

   Set `DOMAIN` to the domain pointed at the VPS. Set `DATABASE_URL` to the
   PostgreSQL connection string from Supabase Dashboard → Connect. This must be
   a PostgreSQL connection string (`postgresql://...`), not the Supabase HTTPS
   project URL or the `NEXT_PUBLIC_SUPABASE_URL` value. URL-encode special
   characters in the database password. If using Supabase's transaction
   pooler, use its pooler connection string with `pgbouncer=true`. Set the
   public Supabase project URL and publishable key separately; they are
   embedded into the frontend build and are not Prisma credentials.
   Replace `JWT_SECRET` with a long, unique random value before starting. You
   can generate one with `openssl rand -hex 32`. `NEXT_PUBLIC_MAPBOX_TOKEN` is
   optional.

2. Validate the required variables and Compose configuration:

   ```sh
   docker compose -f docker-compose.hostinger.yml config
   ```

3. Start the production containers:

   ```sh
   docker compose -f docker-compose.hostinger.yml up -d --build
   ```

   Caddy obtains and renews the HTTPS certificate automatically. The web app
   and API are exposed through Caddy. The backend connects to Supabase using
   `DATABASE_URL`; no local PostgreSQL container is started.

4. This repository does not yet include Prisma migration files. Initialize the
   database schema once on a new deployment:

   ```sh
   docker compose -f docker-compose.hostinger.yml exec backend npx prisma db push
   ```

   The initial deployment uses `db push` because this repository has no
   migration history yet. Back up the database before future schema changes;
   establish and baseline a Prisma migration history before switching to
   `prisma migrate deploy`. Set `NEXT_PUBLIC_MAPBOX_TOKEN` in `.env` if the
   map needs to load Mapbox tiles.

To deploy later code changes, pull them on the VPS and run the Compose
`up -d --build` command again. Persistent database and Caddy certificate data
are stored in Docker volumes.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

MIT
