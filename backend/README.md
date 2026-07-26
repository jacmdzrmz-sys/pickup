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
