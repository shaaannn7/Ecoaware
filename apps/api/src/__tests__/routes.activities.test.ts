/**
 * Integration tests for /api/activities routes.
 *
 * The database module is fully mocked so no SQLite file is accessed.
 * Tests cover: GET list, POST create (with factor, with direct co2Kg, validation errors),
 * DELETE, and the emission-factors reference endpoint.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// ── Mock DB ───────────────────────────────────────────────────────────────────
const mockActivity = {
  id: 1,
  userId: 1,
  category: 'transport',
  description: 'Test drive',
  co2Kg: 21,
  date: '2024-06-15',
  createdAt: new Date().toISOString(),
};

vi.mock('../db/connection.js', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              offset: vi.fn().mockResolvedValue([mockActivity]),
            }),
          }),
          limit: vi.fn().mockResolvedValue([]),
        }),
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            offset: vi.fn().mockResolvedValue([mockActivity]),
          }),
        }),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([mockActivity]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockActivity]),
        }),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  },
  client: {},
}));

const { default: activitiesRouter } = await import('../routes/activities.js');

const app = express();
app.use(express.json());
app.use('/api/activities', activitiesRouter);

describe('GET /api/activities', () => {
  it('returns 200 with activities array', async () => {
    const res = await request(app).get('/api/activities');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('activities');
    expect(Array.isArray(res.body.activities)).toBe(true);
  });
});

describe('POST /api/activities', () => {
  it('creates activity with factorKey + quantity → 201', async () => {
    const res = await request(app).post('/api/activities').send({
      category: 'transport',
      description: 'Commute',
      date: '2024-06-15',
      factorKey: 'car_petrol',
      quantity: 100,
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('activity');
  });

  it('creates activity with direct co2Kg → 201', async () => {
    const res = await request(app).post('/api/activities').send({
      category: 'energy',
      description: 'Electricity bill',
      date: '2024-06-15',
      co2Kg: 15.5,
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('activity');
  });

  it('returns 400 when body is empty', async () => {
    const res = await request(app).post('/api/activities').send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when category is invalid', async () => {
    const res = await request(app).post('/api/activities').send({
      category: 'flying', // invalid
      description: 'Flight',
      date: '2024-06-15',
      co2Kg: 50,
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('returns 400 when date format is wrong (not YYYY-MM-DD)', async () => {
    const res = await request(app).post('/api/activities').send({
      category: 'transport',
      description: 'Drive',
      date: '15/06/2024', // wrong format
      co2Kg: 10,
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('returns 400 when neither factorKey nor co2Kg is provided', async () => {
    const res = await request(app).post('/api/activities').send({
      category: 'transport',
      description: 'Drive',
      date: '2024-06-15',
      // Missing factorKey, quantity, and co2Kg
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when description is empty string', async () => {
    const res = await request(app).post('/api/activities').send({
      category: 'transport',
      description: '',
      date: '2024-06-15',
      co2Kg: 10,
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });
});

describe('DELETE /api/activities/:id', () => {
  it('returns 404 when activity does not belong to user', async () => {
    // The mock returns [] for the ownership check query
    const res = await request(app).delete('/api/activities/9999');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Activity not found');
  });
});

describe('GET /api/activities/emission-factors', () => {
  it('returns 200 with factors object', async () => {
    const res = await request(app).get('/api/activities/emission-factors');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('factors');
    expect(typeof res.body.factors).toBe('object');
  });

  it('factors include car_petrol entry', async () => {
    const res = await request(app).get('/api/activities/emission-factors');
    expect(res.body.factors).toHaveProperty('car_petrol');
  });

  it('each factor has co2PerUnit, unit, label, category', async () => {
    const res = await request(app).get('/api/activities/emission-factors');
    const factor = res.body.factors['car_petrol'];
    expect(factor).toHaveProperty('co2PerUnit');
    expect(factor).toHaveProperty('unit');
    expect(factor).toHaveProperty('label');
    expect(factor).toHaveProperty('category');
  });
});
