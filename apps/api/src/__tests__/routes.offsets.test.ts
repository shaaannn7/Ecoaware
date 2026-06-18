/**
 * Integration tests for /api/offsets routes.
 *
 * Database is fully mocked. Tests cover: GET list, POST create with valid/invalid
 * bodies, and DELETE with 404 handling.
 */

import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const mockOffset = {
  id: 1,
  userId: 1,
  provider: 'Gold Standard',
  description: 'Reforestation project',
  co2Kg: 500,
  costUsd: 25,
  date: '2024-06-15',
  createdAt: new Date().toISOString(),
};

vi.mock('../db/connection.js', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([]),
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([mockOffset]),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  },
  client: {},
}));

const { default: offsetsRouter } = await import('../routes/offsets.js');

const app = express();
app.use(express.json());
app.use('/api/offsets', offsetsRouter);

describe('GET /api/offsets', () => {
  it('returns 200 with offsets array', async () => {
    const res = await request(app).get('/api/offsets');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('offsets');
    expect(Array.isArray(res.body.offsets)).toBe(true);
  });
});

describe('POST /api/offsets', () => {
  it('creates offset with valid body → 201', async () => {
    const res = await request(app).post('/api/offsets').send({
      provider: 'Gold Standard',
      description: 'Reforestation project',
      co2Kg: 500,
      costUsd: 25,
      date: '2024-06-15',
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('offset');
  });

  it('accepts zero costUsd (free offsets are valid)', async () => {
    const res = await request(app).post('/api/offsets').send({
      provider: 'Community Project',
      description: 'Free tree planting',
      co2Kg: 100,
      costUsd: 0,
      date: '2024-06-15',
    });
    expect(res.status).toBe(201);
  });

  it('returns 400 when provider is empty', async () => {
    const res = await request(app).post('/api/offsets').send({
      provider: '',
      description: 'Something',
      co2Kg: 100,
      date: '2024-06-15',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('returns 400 when co2Kg is negative', async () => {
    const res = await request(app).post('/api/offsets').send({
      provider: 'Gold Standard',
      description: 'Tree planting',
      co2Kg: -50, // must be positive
      date: '2024-06-15',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('returns 400 when date is missing', async () => {
    const res = await request(app).post('/api/offsets').send({
      provider: 'Gold Standard',
      description: 'Tree planting',
      co2Kg: 100,
      // date missing
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('returns 400 when body is empty', async () => {
    const res = await request(app).post('/api/offsets').send({});
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/offsets/:id', () => {
  it('returns 404 when offset does not exist', async () => {
    const res = await request(app).delete('/api/offsets/9999');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Offset not found');
  });
});
