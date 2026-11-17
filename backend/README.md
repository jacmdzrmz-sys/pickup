# Pickup Backend

Node.js/Express API for Evanston Pickup Games application.

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+

### Installation

```bash
cd backend
npm install
cp .env.example .env
```

### Database Setup

```bash
# Create database and run migrations
npm run prisma:migrate

# Seed with sample data
npm run db:seed

# Open Prisma Studio (GUI for database)
npm run prisma:studio
```

### Development

```bash
# Start dev server with hot reload
npm run dev

# Server will run on http://localhost:3001
```

### Production Build

```bash
npm run build
npm start
```

### Hostinger Node.js Hosting

Set these variables in the Hostinger application environment:

- `DATABASE_URL` — Supabase PostgreSQL transaction-pooler URI from Dashboard →
  Connect (port `6543`, with `pgbouncer=true`). URL-encode special characters
  in the database password.
- `PORT` — use the port assigned by Hostinger; the server defaults to `8080`.
- `NODE_ENV` — set to `production`.
- `JWT_SECRET` — a unique, private signing secret.
- `CORS_ORIGIN` — the frontend origin, such as `https://evanstondinks.app`.

Use `npm run build` as the build command and `dist/index.js` as the entry point.
The build generates Prisma Client before compiling TypeScript. Production
startup reads environment variables supplied by Hostinger and does not load a
local `.env` file. `GET /health` always returns HTTP 200 and reports whether the
database connection is currently available.

There is no Prisma migrations directory in this repository, so `DIRECT_URL` is
not currently used. If migrations are added, configure a direct Supabase
connection separately for migration commands.

## Project Structure

```
src/
├── index.ts              # Application entry point
├── middleware/
│   └── auth.ts          # JWT authentication
├── schemas/
│   └── validation.ts    # Zod validation schemas
├── routes/              # API route handlers (coming soon)
├── services/            # Business logic (coming soon)
├── controllers/         # Request handlers (coming soon)
└── types/              # TypeScript types (coming soon)

prisma/
├── schema.prisma       # Database schema
└── seed.ts            # Database seeding
```

## API Endpoints

### Health Check
- `GET /health` - Server health status

### Coming Soon
- `/api/auth` - Authentication
- `/api/users` - User management
- `/api/courts` - Court information
- `/api/games` - Game management
- `/api/reservations` - Court reservations

## Scripts

```bash
npm run dev              # Start development server
npm run build            # Build TypeScript
npm start                # Run production build
npm run lint             # Lint code
npm run format           # Format code
npm test                 # Run tests
npm run prisma:migrate   # Run database migrations
npm run prisma:studio    # Open database GUI
```

## Environment Variables

See `.env.example` for all available configuration options.

**Key variables:**
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `JWT_EXPIRATION` - Token expiration time
- `CORS_ORIGIN` - Frontend URL for CORS

## Docker

See `docker-compose.yml` in the root directory to run with Docker.

```bash
docker-compose up -d
```
