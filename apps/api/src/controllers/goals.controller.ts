import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { GoalsService } from '../services/goals.service.js';

const createGoalSchema = z.object({
  title: z.string().min(1).max(100),
  targetCo2Kg: z.number().positive(),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // Format: YYYY-MM-DD
});

const updateSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  targetCo2Kg: z.number().positive().optional(),
  currentCo2Kg: z.number().min(0).optional(),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(['active', 'completed', 'failed']).optional(),
});

/**
 * Controller mapping HTTP request inputs and validation constraints to goals services.
 */
export class GoalsController {
  /**
   * GET /api/goals
   */
  static async getGoals(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const goalsList = await GoalsService.getAllForUser(userId);
      res.json({ goals: goalsList });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/goals
   */
  static async createGoal(req: Request, res: Response, next: NextFunction) {
    const parsed = createGoalSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    try {
      const userId = req.user!.userId;
      const goal = await GoalsService.create(userId, parsed.data);
      res.status(201).json({ goal });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /api/goals/:id
   */
  static async updateGoal(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user!.userId;

      const existing = await GoalsService.getByIdForUser(id, userId);
      if (!existing) {
        res.status(404).json({ error: 'Goal not found' });
        return;
      }

      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
        return;
      }

      const updated = await GoalsService.update(id, userId, parsed.data);
      res.json({ goal: updated });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/goals/:id
   */
  static async deleteGoal(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user!.userId;

      const existing = await GoalsService.getByIdForUser(id, userId);
      if (!existing) {
        res.status(404).json({ error: 'Goal not found' });
        return;
      }

      await GoalsService.delete(id, userId);
      res.json({ message: 'Goal deleted' });
    } catch (err) {
      next(err);
    }
  }
}
