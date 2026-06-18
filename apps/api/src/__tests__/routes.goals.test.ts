/**
 * Integration tests for /api/goals routes.
 *
 * Database is fully mocked. Tests cover: GET list, POST create with valid/invalid
 * bodies, and DELETE with 404 handling.
 */

import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const mockGoal = {
  id: 1,
  userId: 1,
  title: 'Reduce transport',
  targetCo2Kg: 100,
  currentCo2Kg: 0,
  deadline: '2024-12-31',
  status: 'active',
  createdAt: new Date().toISOString(),
};

// Build a flexible mock that handles all chained Drizzle query patterns
const makeMockWhere = (resolveValue: unknown[]) => ({
  limit: vi.fn().mockResolvedValue(resolveValue),
  // For list queries that call .where() and then await directly
  then: (resolve: (v: unknown) => void) => Promise.resolve(resolveValue).then(resolve),
  catch: (reject: (v: unknown) => void) => Promise.resolve(resolveValue).catch(reject),
  // Make the result directly awaitable (for queries without .limit())
  [Symbol.toStringTag]: 'Promise',
});

vi.mock('../db/connection.js', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          // For list() — returns empty [] when awaited directly
          then: (resolve: (v: unknown) => void) => Promise.resolve([]).then(resolve),
          catch: () => Promise.resolve([]),
          // For DELETE/PUT ownership check — .limit(1) → []
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([mockGoal]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ ...mockGoal, status: 'completed' }]),
        }),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  },
  client: {},
}));

const { default: goalsRouter } = await import('../routes/goals.js');

const app = express();
app.use(express.json());
app.use('/api/goals', goalsRouter);

describe('GET /api/goals', () => {
  it('returns 200 with goals array', async () => {
    const res = await request(app).get('/api/goals');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('goals');
    expect(Array.isArray(res.body.goals)).toBe(true);
  });
});

describe('POST /api/goals', () => {
  it('creates a goal with valid body → 201', async () => {
    const res = await request(app).post('/api/goals').send({
      title: 'Reduce transport CO2',
      targetCo2Kg: 100,
      deadline: '2024-12-31',
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('goal');
  });

  it('returns 400 when title is empty string', async () => {
    const res = await request(app).post('/api/goals').send({
      title: '',
      targetCo2Kg: 100,
      deadline: '2024-12-31',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('returns 400 when targetCo2Kg is negative', async () => {
    const res = await request(app).post('/api/goals').send({
      title: 'My goal',
      targetCo2Kg: -50,
      deadline: '2024-12-31',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('returns 400 when targetCo2Kg is zero', async () => {
    const res = await request(app).post('/api/goals').send({
      title: 'My goal',
      targetCo2Kg: 0,
      deadline: '2024-12-31',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('returns 400 when deadline format is wrong', async () => {
    const res = await request(app).post('/api/goals').send({
      title: 'My goal',
      targetCo2Kg: 100,
      deadline: '31-12-2024',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('returns 400 when body is empty', async () => {
    const res = await request(app).post('/api/goals').send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});

describe('DELETE /api/goals/:id', () => {
  it('returns 404 when goal is not found (ownership check fails)', async () => {
    const res = await request(app).delete('/api/goals/9999');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Goal not found');
  });
});
