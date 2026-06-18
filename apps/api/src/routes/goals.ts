import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { GoalsController } from '../controllers/goals.controller.js';

const router = Router();

// Secure all goal endpoints with authentication.
router.use(authenticate);

router.get('/', GoalsController.getGoals);
router.post('/', GoalsController.createGoal);
router.put('/:id', GoalsController.updateGoal);
router.delete('/:id', GoalsController.deleteGoal);

export default router;

