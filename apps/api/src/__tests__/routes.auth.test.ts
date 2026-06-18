/**
 * Integration tests for the /api/auth route handlers.
 *
 * Strategy:
 *  - Construct a minimal Express app with the auth router mounted.
 *  - Mock the database module (`../db/connection.js`) so no real DB is needed.
 *  - Use supertest to fire HTTP requests and assert response codes/bodies.
 *
 * Covered scenarios:
 *  1. POST /register with invalid body → 400
 *  2. POST /login with invalid body → 400
 *  3. POST /refresh with missing token → 400
 *  4. POST /logout always succeeds → 200
 *  5. GET /me returns user for the authenticated guest → 200
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';
import express from 'express';
import request from 'supertest';

// ── Mock the database before importing the router ────────────────────────────
// The auth router imports `db` from '../db/connection.js'. We intercept the
// module and return mock implementations so no SQLite file is touched.
vi.mock('../db/connection.js', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            {
              id: 1,
              email: 'guest@ecoaware.com',
              name: 'Guest User',
              avatarInitials: 'GU',
              monthlyLimitKg: 500,
              passwordHash: '$2a$12$fakehash',
              createdAt: new Date().toISOString(),
            },
          ]),
        }),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            id: 1,
            email: 'new@ecoaware.com',
            name: 'New User',
            avatarInitials: 'NU',
            monthlyLimitKg: 500,
          },
        ]),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  },
  client: {},
}));

// Import router AFTER mock is set up
const { default: authRouter } = await import('../routes/auth.js');

// Build the minimal test app
const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

describe('POST /api/auth/register', () => {
  it('returns 400 when body is completely missing', async () => {
    const res = await request(app).post('/api/auth/register').send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when email is invalid', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'not-an-email',
      name: 'Test User',
      password: 'password123',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('returns 400 when name is too short (< 2 chars)', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'valid@test.com',
      name: 'A',
      password: 'password123',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('returns 400 when password is too short (< 6 chars)', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'valid@test.com',
      name: 'Test User',
      password: 'abc',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });
});

describe('POST /api/auth/login', () => {
  it('returns 400 when body is empty', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when email is malformed', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'bad-email', password: 'password123' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });
});

describe('POST /api/auth/refresh', () => {
  it('returns 400 when refreshToken is not provided', async () => {
    const res = await request(app).post('/api/auth/refresh').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Refresh token required');
  });

  it('returns 401 when refreshToken is invalid/not in store', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'invalid-token-value' });
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });
});

describe('POST /api/auth/logout', () => {
  it('returns 200 with success message even with no token', async () => {
    const res = await request(app).post('/api/auth/logout').send({});
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Logged out successfully');
  });
});

describe('GET /api/auth/me', () => {
  it('returns 200 with user object (auth bypass stub sets guest user)', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('user');
    expect(res.body.user).toHaveProperty('email');
  });
});
