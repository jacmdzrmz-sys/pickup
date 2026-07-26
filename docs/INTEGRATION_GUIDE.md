# External Integration Guide

## Evanston Parks & Recreation API

### Purpose
Integrate with the Evanston Parks & Recreation system to:
- Retrieve available court times and reservations
- Submit permit/reservation requests
- Sync court information
- Validate permit status

### Current Status: RESEARCH NEEDED

We need to investigate:
1. **API Availability**: Does Evanston Parks have a public API?
2. **Authentication**: What auth method? (API key, OAuth, Web Portal)
3. **Endpoints**: What operations are available?
4. **Rate Limits**: Any throttling?
5. **Data Format**: JSON, XML, other?
6. **Documentation**: Official docs or developer portal?

### Potential Approaches

#### Option A: Official Evanston Parks API
- **Pros**: Official, likely most reliable
- **Cons**: May not exist or be public
- **Action**: Contact Evanston Parks & Rec for developer access

#### Option B: Web Scraping
- **Pros**: Works with public websites
- **Cons**: Fragile, may violate ToS, needs maintenance
- **Tools**: Puppeteer, Cheerio, BeautifulSoup
- **Action**: Only if official API unavailable

#### Option C: Manual Court Database
- **Pros**: Full control, reliable
- **Cons**: Manual maintenance, no real-time sync
- **Action**: Seed with known Evanston courts, allow community updates

### Implementation Plan

```typescript
// backend/src/services/evanston-parks.service.ts

interface EvanstoneParksAPI {
  // Fetch available time slots for a court
  getAvailableSlots(courtId: string, date: Date): Promise<TimeSlot[]>;
  
  // Submit a new permit/reservation request
  createReservation(data: ReservationRequest): Promise<PermitId>;
  
  // Check reservation status
  getReservationStatus(permitId: string): Promise<ReservationStatus>;
  
  // Get all court information
  getAllCourts(): Promise<Court[]>;
}
```

## Google Maps / Mapbox Integration

### Purpose
- Display courts on an interactive map
- Show directions from user to court
- Geocode addresses
- Calculate distances

### Implementation

#### Frontend (React Component)
```typescript
// frontend/src/components/CourtMap.tsx

import mapboxgl from 'mapbox-gl';

const CourtMap = ({ courts, userLocation }) => {
  // Initialize map with courts
  // Add markers for each court
  // Show game info on click
  // Calculate distance from user
};
```

#### Backend (API Layer)
```typescript
// backend/src/services/geolocation.service.ts

class GeolocationService {
  async getNearby(lat: number, lng: number, radiusMiles: number) {
    // Find courts within radius using PostGIS
  }
  
  async calculateDistance(from: Point, to: Point) {
    // Haversine or PostGIS
  }
  
  async geocodeAddress(address: string) {
    // Google Maps Geocoding API or Mapbox
  }
}
```

### API Keys
- Store in environment variables
- Use backend for sensitive keys
- Frontend uses restricted keys (domain/IP limited)

## Authentication / OAuth

### Current Plan: Custom JWT

```typescript
// backend/src/services/auth.service.ts

class AuthService {
  register(email: string, password: string, username: string) {
    // Hash password with bcrypt
    // Create user record
    // Return JWT token
  }
  
  login(email: string, password: string) {
    // Verify password
    // Generate JWT token
    // Return token + refresh token
  }
  
  validateToken(token: string) {
    // Verify JWT signature
    // Check expiration
  }
}
```

### Future: OAuth Integration
- Google Sign-In
- Facebook Login
- Apple Sign-In

## Notifications (Future)

### Email Notifications
- SendGrid or Mailgun
- Game reminders
- Reservation confirmations

### Push Notifications
- Firebase Cloud Messaging (FCM)
- Game activity updates

### Real-time Updates
- Socket.io WebSocket
- Game status changes
- New games nearby

## Analytics (Future)

- Sentry for error tracking
- Mixpanel or Segment for events
- Google Analytics for web
