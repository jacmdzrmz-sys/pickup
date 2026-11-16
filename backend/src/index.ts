import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Load environment variables
config();

const app: Express = express();
const prisma = new PrismaClient();
const PORT = Number(process.env.PORT) || 8080;
const HOST = '0.0.0.0';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API Routes (to be implemented)
app.use('/api/auth', (req: Request, res: Response) => {
  res.json({ message: 'Auth routes - coming soon' });
});

app.use('/api/users', (req: Request, res: Response) => {
  res.json({ message: 'User routes - coming soon' });
});

app.use('/api/courts', (req: Request, res: Response) => {
  res.json({ message: 'Court routes - coming soon' });
});

app.use('/api/games', (req: Request, res: Response) => {
  res.json({ message: 'Game routes - coming soon' });
});

app.use('/api/reservations', (req: Request, res: Response) => {
  res.json({ message: 'Reservation routes - coming soon' });
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start the server on all interfaces so Fly Proxy can reach it.
app.listen(PORT, HOST, async () => {
  try {
    await prisma.$connect();
    console.log('✓ Database connected');
    console.log(`✓ Server listening on http://${HOST}:${PORT}`);
    console.log(`✓ Environment: ${process.env.NODE_ENV}`);
  } catch (error) {
    console.error('✗ Database connection failed:', error);
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  await prisma.$disconnect();
  process.exit(0);
});
