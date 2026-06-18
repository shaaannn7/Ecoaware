import { db } from '../db/connection.js';
import { goals } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

/**
 * Service class handling database-level operations for user sustainability goals.
 */
export class GoalsService {
  /**
   * Fetches all goals registered to a specific user.
   */
  static async getAllForUser(userId: number) {
    return db
      .select()
      .from(goals)
      .where(eq(goals.userId, userId));
  }

  /**
   * Fetches a single goal by ID for validation and authorization checks.
   */
  static async getByIdForUser(id: number, userId: number) {
    const rows = await db
      .select()
      .from(goals)
      .where(and(eq(goals.id, id), eq(goals.userId, userId)))
      .limit(1);
    return rows[0] || null;
  }

  /**
   * Inserts a new sustainability target limit in the database.
   */
  static async create(userId: number, data: { title: string; targetCo2Kg: number; deadline: string }) {
    const [goal] = await db
      .insert(goals)
      .values({ userId, ...data })
      .returning();
    return goal;
  }

  /**
   * Updates mutable parameter fields of a user's goal.
   */
  static async update(
    id: number,
    userId: number,
    data: Partial<{
      title: string;
      targetCo2Kg: number;
      currentCo2Kg: number;
      deadline: string;
      status: 'active' | 'completed' | 'failed';
    }>
  ) {
    const [updated] = await db
      .update(goals)
      .set(data)
      .where(and(eq(goals.id, id), eq(goals.userId, userId)))
      .returning();
    return updated;
  }

  /**
   * Deletes a user's goal entry from the database.
   */
  static async delete(id: number, userId: number) {
    await db
      .delete(goals)
      .where(and(eq(goals.id, id), eq(goals.userId, userId)));
  }
}
