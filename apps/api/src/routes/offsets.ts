import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db/connection.js';
import { offsets } from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Secure all carbon offset program routes.
router.use(authenticate);

/**
 * Validation schema for recording a new carbon offset purchase/action.
 */
const createOffsetSchema = z.object({
  provider: z.string().min(1).max(100),
  description: z.string().min(1).max(200),
  co2Kg: z.number().positive(),
  costUsd: z.number().min(0).default(0),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // Format: YYYY-MM-DD
});

/**
 * GET /api/offsets
 * Returns all offsets registered by the current user, ordered by date descending.
 */
router.get('/', async (req: Request, res: Response) => {
  const userOffsets = await db
    .select()
    .from(offsets)
    .where(eq(offsets.userId, req.user!.userId))
    .orderBy(desc(offsets.date));
  res.json({ offsets: userOffsets });
});

/**
 * POST /api/offsets
 * Logs a new carbon offset scheme purchase.
 */
router.post('/', async (req: Request, res: Response) => {
  const parsed = createOffsetSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const [offset] = await db
    .insert(offsets)
    .values({ userId: req.user!.userId, ...parsed.data })
    .returning();
  res.status(201).json({ offset });
});

/**
 * DELETE /api/offsets/:id
 * Removes a registered offset program from the database record.
 */
router.delete('/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const existing = await db.select().from(offsets)
    .where(and(eq(offsets.id, id), eq(offsets.userId, req.user!.userId))).limit(1);

  if (existing.length === 0) {
    res.status(404).json({ error: 'Offset not found' });
    return;
  }

  await db.delete(offsets)
    .where(and(eq(offsets.id, id), eq(offsets.userId, req.user!.userId)));
  res.json({ message: 'Offset deleted' });
});

export default router;

