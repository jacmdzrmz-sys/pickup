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

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

MIT
