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

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

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

async function start() {
  try {
    // Connect before listening so Fly does not route traffic to an app that
    // cannot reach its required database.
    await prisma.$connect();
    console.log('✓ Database connected');

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
  } catch (error) {
    console.error('✗ Application startup failed:', error);
    await prisma.$disconnect().catch((disconnectError) => {
      console.error('Database disconnect failed:', disconnectError);
    });
    process.exitCode = 1;
  }
}

void start();
