/**
 * Integration tests for /api/stats routes.
 *
 * Database is fully mocked. Tests cover: footprint, breakdown, monthly,
 * recent-activities, and tips endpoints.
 */

import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

// ── Precise mock that handles all Drizzle query chain patterns in stats.ts ───
vi.mock('../db/connection.js', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          // Footprint queries: const [row] = await db.select({total}).from().where()
          // Must be iterable — return an array that destructures correctly.
          then: (resolve: (v: unknown[]) => void) =>
            Promise.resolve([{ total: 0 }]).then(resolve),
          catch: (reject: (v: unknown) => void) =>
            Promise.resolve([{ total: 0 }]).catch(reject),
          // Breakdown: .groupBy()
          groupBy: vi.fn().mockResolvedValue([
            { category: 'transport', totalKg: 150 },
            { category: 'energy', totalKg: 80 },
          ]),
          // Recent activities: .orderBy().limit()
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 1,
                userId: 1,
                category: 'transport',
                description: 'Commute',
                co2Kg: 21,
                date: '2024-06-15',
                createdAt: new Date().toISOString(),
              },
            ]),
          }),
          // For queries without chaining — e.g. tips breakdown
          limit: vi.fn().mockResolvedValue([]),
        }),
        // Tips groupBy at from() level
        groupBy: vi.fn().mockResolvedValue([
          { category: 'transport', totalKg: 200 },
        ]),
      }),
    }),
  },
  client: {},
}));

const { default: statsRouter } = await import('../routes/stats.js');

const app = express();
app.use(express.json());
app.use('/api/stats', statsRouter);

describe('GET /api/stats/footprint', () => {
  it('returns 200', async () => {
    const res = await request(app).get('/api/stats/footprint');
    expect(res.status).toBe(200);
  });

  it('response includes totalKg, offsetKg, netKg fields', async () => {
    const res = await request(app).get('/api/stats/footprint');
    expect(res.body).toHaveProperty('totalKg');
    expect(res.body).toHaveProperty('offsetKg');
    expect(res.body).toHaveProperty('netKg');
  });

  it('response includes totalTons, offsetTons, netTons fields', async () => {
    const res = await request(app).get('/api/stats/footprint');
    expect(res.body).toHaveProperty('totalTons');
    expect(res.body).toHaveProperty('offsetTons');
    expect(res.body).toHaveProperty('netTons');
  });

  it('netKg is always >= 0 (cannot be negative)', async () => {
    const res = await request(app).get('/api/stats/footprint');
    expect(res.body.netKg).toBeGreaterThanOrEqual(0);
  });
});

describe('GET /api/stats/breakdown', () => {
  it('returns 200 with breakdown array and totalKg', async () => {
    const res = await request(app).get('/api/stats/breakdown');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('breakdown');
    expect(res.body).toHaveProperty('totalKg');
    expect(Array.isArray(res.body.breakdown)).toBe(true);
  });
});

describe('GET /api/stats/monthly', () => {
  it('returns 200 with monthly array', async () => {
    const res = await request(app).get('/api/stats/monthly');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('monthly');
    expect(Array.isArray(res.body.monthly)).toBe(true);
  });

  it('monthly array has exactly 6 entries (6 months of history)', async () => {
    const res = await request(app).get('/api/stats/monthly');
    expect(res.body.monthly).toHaveLength(6);
  });

  it('each monthly entry has label, yearMonth, kg, percentage', async () => {
    const res = await request(app).get('/api/stats/monthly');
    const entry = res.body.monthly[0];
    expect(entry).toHaveProperty('label');
    expect(entry).toHaveProperty('yearMonth');
    expect(entry).toHaveProperty('kg');
    expect(entry).toHaveProperty('percentage');
  });
});

describe('GET /api/stats/recent-activities', () => {
  it('returns 200 with activities array', async () => {
    const res = await request(app).get('/api/stats/recent-activities');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('activities');
    expect(Array.isArray(res.body.activities)).toBe(true);
  });
});

describe('GET /api/stats/tips', () => {
  it('returns 200 with tips array', async () => {
    const res = await request(app).get('/api/stats/tips');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('tips');
    expect(Array.isArray(res.body.tips)).toBe(true);
  });

  it('returns at most 4 tips', async () => {
    const res = await request(app).get('/api/stats/tips');
    expect(res.body.tips.length).toBeLessThanOrEqual(4);
  });

  it('each tip has id, title, description, savingsKg, category', async () => {
    const res = await request(app).get('/api/stats/tips');
    if (res.body.tips.length > 0) {
      const tip = res.body.tips[0];
      expect(tip).toHaveProperty('id');
      expect(tip).toHaveProperty('title');
      expect(tip).toHaveProperty('description');
      expect(tip).toHaveProperty('savingsKg');
      expect(tip).toHaveProperty('category');
    }
  });
});
