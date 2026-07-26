export type Game = {
  id: string;
  courtId: string;
  creatorId: string;
  sportType: 'basketball' | 'pickleball';
  title?: string;
  description?: string;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  scheduledTime: string;
  expectedDurationMinutes: number;
  currentPlayerCount: number;
  maxPlayers: number;
  minSkillLevel?: string;
  maxSkillLevel?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Court = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  description?: string;
  basketballCourts: number;
  pickleballCourts: number;
  hasLighting: boolean;
  restroomsAvailable: boolean;
  parkingAvailable: boolean;
  permitRequired: boolean;
  createdAt: string;
  updatedAt: string;
};

export type User = {
  id: string;
  email: string;
  username: string;
  fullName?: string;
  skillLevel?: string;
  bio?: string;
  createdAt: string;
  updatedAt: string;
};

export type CourtReservation = {
  id: string;
  courtId: string;
  userId: string;
  gameId?: string;
  reservationStart: string;
  reservationEnd: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'no_show';
  permitId?: string;
  createdAt: string;
  updatedAt: string;
};

export type ApiResponse<T> = {
  data?: T;
  error?: string;
  message?: string;
};
