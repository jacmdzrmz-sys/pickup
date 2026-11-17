import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

config();

const app: Express = express();
const prisma = new PrismaClient();
const PORT = Number(process.env.PORT) || 8080;
const HOST = '0.0.0.0';

// Fly Proxy sits in front of the app, so trust its forwarded client headers.
app.set('trust proxy', 1);

const configuredOrigins = process.env.CORS_ORIGIN
  ?.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: configuredOrigins?.length ? configuredOrigins : true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

const checkHealth = async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Database health check failed:', error);
    res.status(503).json({
      status: 'unavailable',
      database: 'disconnected',
      timestamp: new Date().toISOString(),
    });
  }
};

app.get(['/health', '/api/health'], checkHealth);

// API Routes (to be implemented)
app.use('/api/auth', (_req: Request, res: Response) => {
  res.json({ message: 'Auth routes - coming soon' });
});

app.use('/api/users', (_req: Request, res: Response) => {
  res.json({ message: 'User routes - coming soon' });
});

app.use('/api/courts', (_req: Request, res: Response) => {
  res.json({ message: 'Court routes - coming soon' });
});

app.use('/api/games', (_req: Request, res: Response) => {
  res.json({ message: 'Game routes - coming soon' });
});

app.use('/api/reservations', (_req: Request, res: Response) => {
  res.json({ message: 'Reservation routes - coming soon' });
});

app.use(
  (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
);

function start() {
  const server = app.listen(PORT, HOST, () => {
    console.log(`✓ Server listening on http://${HOST}:${PORT}`);
    console.log(`✓ Environment: ${process.env.NODE_ENV}`);
  });

  let isShuttingDown = false;
  const shutdown = (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`Received ${signal}; shutting down gracefully...`);

    server.close(async (error) => {
      if (error) console.error('HTTP server shutdown error:', error);
      try {
        await prisma.$disconnect();
        process.exitCode = error ? 1 : 0;
      } catch (disconnectError) {
        console.error('Database disconnect failed:', disconnectError);
        process.exitCode = 1;
      }
    });
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

start();
