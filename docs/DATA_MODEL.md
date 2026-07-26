# Data Model & Database Schema

## Entity Relationship Diagram

```
Users
├── Profiles
├── Game Participations (many-to-many with Games)
└── Court Reservations

Courts
├── Games (one-to-many)
└── Court Reservations (one-to-many)

Games
├── Players (many-to-many through GamePlayers)
└── Court (belongs-to)

GamePlayers (join table)
├── Game
└── User

CourtReservations
├── Court
├── User
└── Game (optional)
```

## Table Definitions

### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  phone_number VARCHAR(20),
  profile_picture_url TEXT,
  skill_level VARCHAR(50), -- beginner, intermediate, advanced, pro
  bio TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
```

### courts
```sql
CREATE TABLE courts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  address VARCHAR(500) NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  description TEXT,
  basketball_courts INT DEFAULT 0,
  pickleball_courts INT DEFAULT 1,
  has_lighting BOOLEAN DEFAULT false,
  restrooms_available BOOLEAN DEFAULT false,
  parking_available BOOLEAN DEFAULT true,
  operating_hours_start TIME,
  operating_hours_end TIME,
  evanston_parks_url VARCHAR(500),
  permit_required BOOLEAN DEFAULT true,
  contact_phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_courts_location ON courts(latitude, longitude);
CREATE INDEX idx_courts_name ON courts(name);
```

### games
```sql
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id UUID NOT NULL REFERENCES courts(id),
  creator_id UUID NOT NULL REFERENCES users(id),
  sport_type VARCHAR(50) NOT NULL, -- basketball, pickleball
  title VARCHAR(255),
  description TEXT,
  status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, active, completed, cancelled
  scheduled_time TIMESTAMP NOT NULL,
  expected_duration_minutes INT DEFAULT 60,
  current_player_count INT DEFAULT 0,
  max_players INT DEFAULT 10,
  min_skill_level VARCHAR(50), -- beginner, intermediate, advanced, pro
  max_skill_level VARCHAR(50),
  is_public BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  ended_at TIMESTAMP
);

CREATE INDEX idx_games_court_id ON games(court_id);
CREATE INDEX idx_games_creator_id ON games(creator_id);
CREATE INDEX idx_games_scheduled_time ON games(scheduled_time);
CREATE INDEX idx_games_status ON games(status);
```

### game_players (Join Table)
```sql
CREATE TABLE game_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'joined', -- joined, invited, pending, declined, left
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  left_at TIMESTAMP,
  UNIQUE(game_id, user_id)
);

CREATE INDEX idx_game_players_game_id ON game_players(game_id);
CREATE INDEX idx_game_players_user_id ON game_players(user_id);
```

### court_reservations
```sql
CREATE TABLE court_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id UUID NOT NULL REFERENCES courts(id),
  user_id UUID NOT NULL REFERENCES users(id),
  game_id UUID REFERENCES games(id),
  reservation_start TIMESTAMP NOT NULL,
  reservation_end TIMESTAMP NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, cancelled, no_show
  permit_id VARCHAR(500), -- External Evanston Parks permit ID
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_court_reservations_court_id ON court_reservations(court_id);
CREATE INDEX idx_court_reservations_user_id ON court_reservations(user_id);
CREATE INDEX idx_court_reservations_reservation_start ON court_reservations(reservation_start);
```

### user_preferences
```sql
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  preferred_sports VARCHAR(255), -- JSON array: ["basketball", "pickleball"]
  preferred_skill_levels VARCHAR(255), -- JSON array
  preferred_time_range VARCHAR(100), -- morning, afternoon, evening
  max_distance_miles INT DEFAULT 5,
  notifications_enabled BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Key Relationships

- **User → Games**: One user can create many games
- **User → GamePlayers**: One user can join many games (many-to-many through GamePlayers)
- **Court → Games**: One court can have many games
- **Court → CourtReservations**: One court can have many reservations
- **Game → GamePlayers**: One game can have many players
- **Game → CourtReservations**: One game can be linked to reservations

## Indexing Strategy

- Location-based queries: Index on (latitude, longitude)
- Time-based queries: Index on scheduled_time, reservation_start
- Foreign keys: Automatic indexes on all foreign keys
- Frequent filters: Status, court_id, user_id

## Future Enhancements

- User ratings & reviews
- Game attendance history
- User blocking/reporting system
- Court photos & gallery
- Game chat/messaging
- Analytics & insights
