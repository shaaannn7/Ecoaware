import { Router, Request, Response } from 'express';
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
 */
router.get('/', async (req: Request, res: Response) => {
  const { limit = '50', offset = '0' } = req.query;
  const results = await db
    .select()
    .from(activities)
    .where(eq(activities.userId, req.user!.userId))
    .orderBy(desc(activities.date))
    .limit(parseInt(limit as string))
    .offset(parseInt(offset as string));
  res.json({ activities: results });
});

/**
 * POST /api/activities
 * Validates request body and inserts a new carbon activity entry.
 */
router.post('/', async (req: Request, res: Response) => {
  const parsed = createActivitySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const { category, description, date, factorKey, quantity, co2Kg: rawCo2 } = parsed.data;

  let co2Kg: number;
  if (factorKey && quantity) {
    try {
      // Look up factor conversion rate and calculate final metric weight
      co2Kg = calculateCO2(factorKey, quantity);
    } catch (e: unknown) {
      res.status(400).json({ error: e instanceof Error ? e.message : 'Unknown error' });
      return;
    }
  } else {
    // If factorKey is missing, fall back to direct user input weight
    co2Kg = rawCo2!;
  }

  const [activity] = await db
    .insert(activities)
    .values({ userId: req.user!.userId, category, description, co2Kg, date })
    .returning();

  res.status(201).json({ activity });
});

/**
 * PUT /api/activities/:id
 * Updates mutable fields of an existing user activity.
 */
router.put('/:id', async (req: Request, res: Response) => {
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
});

/**
 * DELETE /api/activities/:id
 * Removes a specific activity record belonging to the user.
 */
router.delete('/:id', async (req: Request, res: Response) => {
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
});

/**
 * GET /api/activities/summary
 * Aggregates user carbon footprint data grouped by activity category.
 */
router.get('/summary', async (req: Request, res: Response) => {
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
});

/**
 * GET /api/activities/emission-factors
 * Exposes reference lookup constants for frontend form calculation drop-downs.
 */
router.get('/emission-factors', (_req: Request, res: Response) => {
  res.json({ factors: EMISSION_FACTORS });
});

export default router;

