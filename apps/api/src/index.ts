import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { runMigrations } from './db/migrate.js';
import { seed } from './db/seed.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authRateLimit, apiRateLimit } from './middleware/rateLimit.js';
import authRouter from './routes/auth.js';
import activitiesRouter from './routes/activities.js';
import goalsRouter from './routes/goals.js';
import offsetsRouter from './routes/offsets.js';
import statsRouter from './routes/stats.js';
import assistantRouter from './routes/assistant.js';

/**
 * Initialize Express application instance.
 */
const app = express();

/**
 * Configure target port from environment or fallback to 3001.
 */
const PORT = parseInt(process.env.PORT ?? '3001', 10);

// ─── Explicit allowed CORS origins ───────────────────────────────────────────
// Maintains an exact allowlist — no wildcard patterns that accept arbitrary subdomains.
const CORS_ALLOWLIST: string[] = [
  'http://localhost:5173',      // Vite dev server
  'http://localhost:4173',      // Vite preview server
  'https://ecoaware-psi.vercel.app',
  // Additional production origins can be added via environment variable:
  // CORS_EXTRA_ORIGIN=https://my-domain.com
  ...(process.env.CORS_EXTRA_ORIGIN ? [process.env.CORS_EXTRA_ORIGIN] : []),
];

// ─── Security Middleware ────────────────────────────────────────────────────────

/**
 * Helmet — sets 14+ HTTP security response headers in one call.
 * Protects against clickjacking (X-Frame-Options), MIME sniffing, XSS (CSP),
 * and information disclosure (X-Powered-By removed).
 */
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'"],
      imgSrc:     ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc:    ["'self'"],
      objectSrc:  ["'none'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  // Strict-Transport-Security: force HTTPS for 1 year
  hsts: {
    maxAge: 31536000,        // 1 year in seconds
    includeSubDomains: true,
    preload: true,
  },
  // Prevent clickjacking — same as X-Frame-Options: DENY
  frameguard: { action: 'deny' },
  // Disable X-Powered-By: Express (prevents tech fingerprinting)
  hidePoweredBy: true,
  // X-Content-Type-Options: nosniff — prevents MIME sniffing
  noSniff: true,
  // X-XSS-Protection: disabled in modern browsers (CSP is more reliable)
  xssFilter: false,
  // Referrer-Policy: send only origin, not full URL
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

/**
 * Cross-Origin Resource Sharing (CORS) Configuration.
 * Maintains an exact allowlist — the regex wildcard (*.vercel.app) has been
 * replaced with explicit origins to prevent subdomain takeover abuse.
 */
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (native mobile clients, Postman, server-to-server)
    if (!origin) {
      callback(null, true);
      return;
    }
    if (CORS_ALLOWLIST.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin '${origin}' is not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

/**
 * Body parsers with size limits to prevent large-payload DoS attacks.
 * Default Express limit is 100kb; we explicitly set it here for visibility.
 */
app.use(express.json({ limit: '64kb' }));
app.use(express.urlencoded({ extended: true, limit: '16kb' }));

/**
 * Request logger middleware active only in development environment.
 */
if (process.env.NODE_ENV !== 'production') {
  app.use((req: Request, _res: Response, next: NextFunction) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
  });
}

// ─── Routes Registration ────────────────────────────────────────────────────────

/**
 * API Health Check endpoint.
 * Intentionally minimal — does not expose version, environment, or DB status.
 */
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * Sub-routers mounting with targeted rate limits.
 * Auth routes get stricter limits to prevent brute-force attacks.
 */
app.use('/api/auth',       authRateLimit, authRouter);
app.use('/api/activities', apiRateLimit,  activitiesRouter);
app.use('/api/goals',      apiRateLimit,  goalsRouter);
app.use('/api/offsets',    apiRateLimit,  offsetsRouter);
app.use('/api/stats',      apiRateLimit,  statsRouter);
app.use('/api/assistant',  apiRateLimit,  assistantRouter);

// ─── 404 Handler ──────────────────────────────────────────────────────────────

/**
 * Fallback middleware for unmatched routes.
 * Returns a generic message — no route enumeration.
 */
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────

/**
 * Centralized error handling — must be last middleware, after all routes.
 */
app.use(errorHandler);

// ─── Bootstrap Procedure ──────────────────────────────────────────────────────

/**
 * Starts the database migration verification and mounts the HTTP listener.
 */
async function start(): Promise<void> {
  try {
    await runMigrations();
    await seed();
    app.listen(PORT, () => {
      console.log(`\n🌿 Carbon Platform API running on http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health\n`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

start();
