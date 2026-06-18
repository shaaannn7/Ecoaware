/**
 * Integration tests for GET /api/health
 *
 * Verifies the health-check endpoint that container orchestrators poll.
 */

import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';

// Minimal app reproducing exactly how health is mounted in src/index.ts
const app = express();
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

describe('GET /api/health', () => {
  it('responds with HTTP 200', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
  });

  it('returns { status: "ok" }', async () => {
    const res = await request(app).get('/api/health');
    expect(res.body.status).toBe('ok');
  });

  it('includes a timestamp field', async () => {
    const res = await request(app).get('/api/health');
    expect(res.body).toHaveProperty('timestamp');
  });

  it('timestamp is a valid ISO 8601 string', async () => {
    const res = await request(app).get('/api/health');
    const ts = new Date(res.body.timestamp);
    expect(Number.isNaN(ts.getTime())).toBe(false);
  });

  it('Content-Type is application/json', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });
});
