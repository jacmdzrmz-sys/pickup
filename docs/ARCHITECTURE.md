# Architecture Overview

## System Design

### High-Level Components

```
┌────────────────────────────────────────────────────────────────────┐
│                   Mobile Apps                            │
│          (React Native / Flutter - Future)               │
└────────────────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────────────────┴────────────────────────────────────┐
│                   Web Frontend                           │
│              (React / Next.js)                           │
│  - Map Interface (Mapbox GL / Google Maps)               │
│  - Game Creation & Joining                               │
│  - User Authentication & Profiles                        │
└────────────────────────────────┬────────────────────────────────────┘
                     │ HTTPS / REST / WebSocket
┌────────────────────────────────┴────────────────────────────────────┐
│                   Backend API                            │
│              (Node.js / Express)                         │
│  - REST Endpoints                                        │
│  - WebSocket Server (Real-time updates)                  │
│  - Authentication & Authorization                        │
│  - Business Logic                                        │
└────────────────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
   ┌────┴───┐  ┌────┴────┐  ┌───┴──────┐
   │PostgreSQL Evanston  │  │ Mapbox/  │
   │         Parks API   │  │ Google   │
   │         (Permits)   │  │ Maps     │
   └─────────┘  └────────┘  └──────────┘
```

## Data Model

### Core Entities

1. **Users**
   - id, email, username, password_hash
   - profile (full_name, phone, skill_level)
   - preferences (sports, locations, times)
   - created_at, updated_at

2. **Courts**
   - id, name, address, location (lat/lng)
   - sports_available (basketball, pickleball)
   - capacity, lighting (yes/no)
   - permit_link (to Evanston Parks system)
   - hours_of_operation
   - created_at, updated_at

3. **Games**
   - id, court_id, sport_type
   - creator_id, status (scheduled, active, completed, cancelled)
   - scheduled_time, expected_duration
   - player_count, max_players
   - skill_level_min, skill_level_max
   - description
   - created_at, updated_at

4. **Game Players**
   - id, game_id, user_id, joined_at
   - status (confirmed, pending, declined)

5. **Court Reservations**
   - id, court_id, user_id/game_id
   - reserved_time, duration
   - permit_id (external Evanston Parks reference)
   - status (pending, confirmed, cancelled)
   - created_at, updated_at

## API Endpoints

### Games
- `GET /api/games` - List nearby games
- `POST /api/games` - Create new game
- `GET /api/games/:id` - Get game details
- `PUT /api/games/:id` - Update game
- `DELETE /api/games/:id` - Cancel game
- `POST /api/games/:id/join` - Join game
- `POST /api/games/:id/leave` - Leave game

### Courts
- `GET /api/courts` - List all courts
- `GET /api/courts/:id` - Get court details
- `GET /api/courts/nearby?lat=&lng=&radius=` - Find nearby courts

### Reservations
- `GET /api/reservations` - User's reservations
- `POST /api/reservations` - Create reservation (connects to Evanston Parks API)
- `GET /api/reservations/:id` - Get reservation details
- `DELETE /api/reservations/:id` - Cancel reservation

### Users
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `GET /api/users/profile` - Get current user profile
- `PUT /api/users/profile` - Update profile
- `POST /api/auth/logout` - Logout

## Real-time Features

### WebSocket Events
- `game:created` - New game posted
- `game:player_joined` - Someone joined a game
- `game:player_left` - Someone left a game
- `game:cancelled` - Game cancelled
- `game:started` - Game started
- `game:completed` - Game finished

## External Integrations

### Evanston Parks & Recreation
- **Purpose**: Court permit/reservation system
- **Integration**: 
  - API endpoint (to be researched)
  - OAuth or API key authentication
  - Sync available court times
  - Submit permit/reservation requests

### Mapbox GL / Google Maps
- **Purpose**: Display courts on map, directions, geolocation
- **Integration**:
  - Client-side map rendering
  - Geocoding for court addresses
  - Distance calculation

## Authentication & Security

- JWT tokens for API authentication
- Bcrypt for password hashing
- HTTPS for all communications
- CORS configured for frontend domain
- Rate limiting on public endpoints
- Input validation & sanitization

## Deployment

- **Frontend**: Vercel / Netlify
- **Backend**: Heroku / AWS / DigitalOcean
- **Database**: Managed PostgreSQL service
- **Monitoring**: Sentry for error tracking

## Technology Stack

### Backend
- Runtime: Node.js 18+
- Framework: Express.js
- Database: PostgreSQL
- ORM: Prisma
- Authentication: JWT + Bcrypt
- Real-time: Socket.io (WebSocket)
- Validation: Zod / Joi
- Testing: Jest

### Frontend
- Framework: Next.js (React)
- Styling: Tailwind CSS
- State Management: Zustand / Redux
- Maps: Mapbox GL JS
- HTTP: Axios / Fetch API
- Testing: Vitest / Testing Library

### Development
- Container: Docker & Docker Compose
- Version Control: Git
- CI/CD: GitHub Actions
- Code Quality: ESLint, Prettier
