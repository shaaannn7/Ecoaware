import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '../db/connection.js';
import { activities } from '../db/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import { authenticate } from '../middleware/auth.js';
import { EMISSION_FACTORS, calculateCO2 } from '../services/emissionFactors.js';

const router = Router();

// Secure all activity endpoints with JWT Authentication middleware.
router.use(authenticate);

/**
 * Validation schema for creating a new activity footprint.
 * Enforces dynamic validation where a user must supply either:
 * - A registered `factorKey` and corresponding usage `quantity`.
 * - Or a direct pre-calculated `co2Kg` total.
 */
const createActivitySchema = z.object({
  category: z.enum(['transport', 'energy', 'diet', 'waste']),
  description: z.string().min(1).max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // Enforces YYYY-MM-DD ISO format
  factorKey: z.string().optional(),
  quantity: z.number().positive().optional(),
  co2Kg: z.number().positive().optional(),
}).refine(
  (data) => (data.factorKey && data.quantity) || data.co2Kg,
  { message: 'Provide either (factorKey + quantity) or co2Kg' }
);

/**
 * GET /api/activities
 * Retrieves a list of activities for the authenticated user.
 * Supports limit/offset query parameters for cursor pagination.
 * Parameters are clamped to safe ranges to prevent DoS via extreme values.
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Clamp limit to [1, 100] and offset to [0, ∞) to prevent extreme queries
    const rawLimit = parseInt(req.query.limit as string, 10);
    const rawOffset = parseInt(req.query.offset as string, 10);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 50;
    const offset = Number.isFinite(rawOffset) ? Math.max(rawOffset, 0) : 0;

    const results = await db
      .select()
      .from(activities)
      .where(eq(activities.userId, req.user!.userId))
      .orderBy(desc(activities.date))
      .limit(limit)
      .offset(offset);
    res.json({ activities: results });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/activities
 * Validates request body and inserts a new carbon activity entry.
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  const parsed = createActivitySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const { category, description, date, factorKey, quantity, co2Kg: rawCo2 } = parsed.data;

  let co2Kg: number;
  if (factorKey && quantity) {
    try {
      co2Kg = calculateCO2(factorKey, quantity);
    } catch (e: unknown) {
      res.status(400).json({ error: e instanceof Error ? e.message : 'Unknown error' });
      return;
    }
  } else {
    co2Kg = rawCo2!;
  }

  try {
    const [activity] = await db
      .insert(activities)
      .values({ userId: req.user!.userId, category, description, co2Kg, date })
      .returning();
    res.status(201).json({ activity });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/activities/:id
 * Updates mutable fields of an existing user activity.
 */
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await db.select().from(activities)
      .where(and(eq(activities.id, id), eq(activities.userId, req.user!.userId))).limit(1);

    if (existing.length === 0) {
      res.status(404).json({ error: 'Activity not found' });
      return;
    }

    const updateSchema = z.object({
      description: z.string().min(1).max(200).optional(),
      co2Kg: z.number().positive().optional(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    });

    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    const [updated] = await db
      .update(activities)
      .set(parsed.data)
      .where(and(eq(activities.id, id), eq(activities.userId, req.user!.userId)))
      .returning();

    res.json({ activity: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/activities/:id
 * Removes a specific activity record belonging to the user.
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await db.select().from(activities)
      .where(and(eq(activities.id, id), eq(activities.userId, req.user!.userId))).limit(1);

    if (existing.length === 0) {
      res.status(404).json({ error: 'Activity not found' });
      return;
    }

    await db.delete(activities)
      .where(and(eq(activities.id, id), eq(activities.userId, req.user!.userId)));
    res.json({ message: 'Activity deleted' });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/activities/summary
 * Aggregates user carbon footprint data grouped by activity category.
 */
router.get('/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const summaryRows = await db
      .select({
        category: activities.category,
        totalCo2: sql<number>`sum(${activities.co2Kg})`,
        count: sql<number>`count(*)`,
      })
      .from(activities)
      .where(eq(activities.userId, req.user!.userId))
      .groupBy(activities.category);
    res.json({ summary: summaryRows });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/activities/emission-factors
 * Exposes reference lookup constants for frontend form calculation drop-downs.
 */
router.get('/emission-factors', (_req: Request, res: Response) => {
  res.json({ factors: EMISSION_FACTORS });
});

export default router;

