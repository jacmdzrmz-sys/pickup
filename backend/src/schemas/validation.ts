import { z } from 'zod';

// User schemas
export const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(100),
  password: z.string().min(8),
  fullName: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const updateProfileSchema = z.object({
  fullName: z.string().optional(),
  phoneNumber: z.string().optional(),
  skillLevel: z.enum(['beginner', 'intermediate', 'advanced', 'pro']).optional(),
  bio: z.string().optional(),
});

// Game schemas
export const createGameSchema = z.object({
  courtId: z.string().uuid(),
  sportType: z.enum(['basketball', 'pickleball']),
  title: z.string().optional(),
  description: z.string().optional(),
  scheduledTime: z.string().datetime(),
  expectedDurationMinutes: z.number().int().positive().default(60),
  maxPlayers: z.number().int().positive().default(10),
  minSkillLevel: z.enum(['beginner', 'intermediate', 'advanced', 'pro']).optional(),
  maxSkillLevel: z.enum(['beginner', 'intermediate', 'advanced', 'pro']).optional(),
  notes: z.string().optional(),
});

export const updateGameSchema = createGameSchema.partial();

// Court schemas
export const createCourtSchema = z.object({
  name: z.string(),
  address: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  description: z.string().optional(),
  basketballCourts: z.number().int().default(0),
  pickleballCourts: z.number().int().default(1),
  hasLighting: z.boolean().optional(),
  restroomsAvailable: z.boolean().optional(),
  parkingAvailable: z.boolean().optional(),
});

// Reservation schemas
export const createReservationSchema = z.object({
  courtId: z.string().uuid(),
  gameId: z.string().uuid().optional(),
  reservationStart: z.string().datetime(),
  reservationEnd: z.string().datetime(),
  notes: z.string().optional(),
});
