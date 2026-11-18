import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const app: Express = express();
let prisma: PrismaClient | undefined;
let isDatabaseConnected = false;
let isShuttingDown = false;
const DATABASE_RETRY_INTERVAL_MS = 10_000;

// Fly Proxy sits in front of the app, so trust its forwarded client headers.
app.set('trust proxy', 1);

const configuredOrigins = process.env.CORS_ORIGIN
  ?.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = [
  ...new Set([
    ...(configuredOrigins ?? []),
    'https://evanstondinks.app',
    'https://www.evanstondinks.app',
    'https://pickup-jalitico.vercel.app',
  ]),
];

app.use(
  cors({
    origin: allowedOrigins,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

const checkHealth = (_req: Request, res: Response) => {
  const databaseStatus = !process.env.DATABASE_URL
    ? 'unconfigured'
    : isDatabaseConnected
      ? 'connected'
      : 'disconnected';

  res.status(200).json({
    status: 'ok',
    database: databaseStatus,
    timestamp: new Date().toISOString(),
  });
};

app.get(['/health', '/api/health'], checkHealth);

app.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'pickup-api', status: 'ok', health: '/health' });
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

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

app.use(
  (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
);

async function monitorDatabase() {
  let missingUrlReported = false;

  while (!isShuttingDown) {
    if (!process.env.DATABASE_URL) {
      isDatabaseConnected = false;
      if (!missingUrlReported) {
        console.error(
          'DATABASE_URL is not set; configure it in the Hostinger environment.'
        );
        missingUrlReported = true;
      }
    } else {
      try {
        prisma ??= new PrismaClient();
        if (!isDatabaseConnected) {
          await prisma.$connect();
        }
        await prisma.$queryRaw`SELECT 1`;
        if (!isDatabaseConnected) {
          console.log('✓ Database connected');
        }
        isDatabaseConnected = true;
        missingUrlReported = false;
      } catch (error) {
        isDatabaseConnected = false;
        console.error(
          `Database connection failed; retrying in ${DATABASE_RETRY_INTERVAL_MS / 1000} seconds.`,
          error
        );
      }
    }

    await new Promise((resolve) =>
      setTimeout(resolve, DATABASE_RETRY_INTERVAL_MS)
    );
  }
}

function start() {
  const server = app.listen(
    Number(process.env.PORT) || 8080,
    '0.0.0.0',
    () => {
      console.log(
        `✓ Server listening on port ${Number(process.env.PORT) || 8080}`
      );
      console.log(`✓ Environment: ${process.env.NODE_ENV ?? 'production'}`);
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          '⚠ NODE_ENV is development; set it to production on the host.'
        );
      }
      void monitorDatabase();
    }
  );

  const shutdown = (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`Received ${signal}; shutting down gracefully...`);

    server.close(async (error) => {
      if (error) console.error('HTTP server shutdown error:', error);
      try {
        if (prisma) {
          await prisma.$disconnect();
        }
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
