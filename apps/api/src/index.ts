import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { runMigrations } from './db/migrate.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRouter from './routes/auth.js';
import activitiesRouter from './routes/activities.js';
import goalsRouter from './routes/goals.js';
import offsetsRouter from './routes/offsets.js';
import statsRouter from './routes/stats.js';

/**
 * Initialize Express application instance.
 */
const app = express();

/**
 * Configure target port from environment or fallback to 3001.
 */
const PORT = parseInt(process.env.PORT ?? '3001');

// ─── Middleware Configuration ──────────────────────────────────────────────────

/**
 * Cross-Origin Resource Sharing (CORS) Configuration.
 * Limits incoming connections to verified Vite frontend URLs during development & preview modes.
 */
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:4173'],
  credentials: true,
}));

/**
 * Global body parser middleware to handle incoming requests with JSON payloads.
 */
app.use(express.json());

/**
 * Global URL-encoded parser middleware for standard form submission data.
 */
app.use(express.urlencoded({ extended: true }));

/**
 * Request logger middleware active only in development environment.
 * Helps with monitoring request execution time and matching API routes.
 */
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
  });
}

// ─── Routes Registration ────────────────────────────────────────────────────────

/**
 * API Health Check endpoint.
 * Monitored by container orchestrators or uptime checkers.
 */
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * Sub-routers mounting.
 */
app.use('/api/auth', authRouter);
app.use('/api/activities', activitiesRouter);
app.use('/api/goals', goalsRouter);
app.use('/api/offsets', offsetsRouter);
app.use('/api/stats', statsRouter);

// ─── 404 Handler ──────────────────────────────────────────────────────────────

/**
 * Fallback middleware to catch requests that do not match any of the above endpoints.
 */
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────

/**
 * Catch-all centralized error handling middleware.
 */
app.use(errorHandler);

// ─── Bootstrap Procedure ──────────────────────────────────────────────────────

/**
 * Starts the database migration verification and mounts the HTTP listener.
 */
async function start() {
  try {
    // Run DB migrations check before binding to port to prevent incomplete database state requests.
    await runMigrations();
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

