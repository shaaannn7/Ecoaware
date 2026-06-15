import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db/connection.js';
import { goals } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Secure all goal endpoints with authentication.
router.use(authenticate);

/**
 * Zod schema validation for creating user sustainability goals.
 */
const createGoalSchema = z.object({
  title: z.string().min(1).max(100),
  targetCo2Kg: z.number().positive(),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // Format: YYYY-MM-DD
});

/**
 * GET /api/goals
 * Fetches all goals matching the authenticated user.
 */
router.get('/', async (req: Request, res: Response) => {
  const userGoals = await db
    .select()
    .from(goals)
    .where(eq(goals.userId, req.user!.userId));
  res.json({ goals: userGoals });
});

/**
 * POST /api/goals
 * Creates a new reduction or offsetting target goal.
 */
router.post('/', async (req: Request, res: Response) => {
  const parsed = createGoalSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const [goal] = await db
    .insert(goals)
    .values({ userId: req.user!.userId, ...parsed.data })
    .returning();
  res.status(201).json({ goal });
});

/**
 * PUT /api/goals/:id
 * Updates mutable details of an existing goal (e.g. deadline or completion status).
 */
router.put('/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const existing = await db.select().from(goals)
    .where(and(eq(goals.id, id), eq(goals.userId, req.user!.userId))).limit(1);

  if (existing.length === 0) {
    res.status(404).json({ error: 'Goal not found' });
    return;
  }

  const updateSchema = z.object({
    title: z.string().min(1).max(100).optional(),
    targetCo2Kg: z.number().positive().optional(),
    currentCo2Kg: z.number().min(0).optional(),
    deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    status: z.enum(['active', 'completed', 'failed']).optional(),
  });

  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const [updated] = await db
    .update(goals)
    .set(parsed.data)
    .where(and(eq(goals.id, id), eq(goals.userId, req.user!.userId)))
    .returning();
  res.json({ goal: updated });
});

/**
 * DELETE /api/goals/:id
 * Purges a specific goal entry from the database.
 */
router.delete('/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const existing = await db.select().from(goals)
    .where(and(eq(goals.id, id), eq(goals.userId, req.user!.userId))).limit(1);

  if (existing.length === 0) {
    res.status(404).json({ error: 'Goal not found' });
    return;
  }

  await db.delete(goals)
    .where(and(eq(goals.id, id), eq(goals.userId, req.user!.userId)));
  res.json({ message: 'Goal deleted' });
});

export default router;

