/**
 * Unit tests for the JWT Authentication Service.
 *
 * Covers:
 *  - Access token signing and decoding (with HS256 + issuer/audience)
 *  - Refresh token signing and decoding
 *  - Token payload round-trip integrity
 *  - Rejection of tampered or invalid tokens
 *  - Algorithm hardening: different secrets for access vs refresh
 */

import { describe, it, expect } from 'vitest';
import {
  signAccessToken,
  verifyAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../services/jwt.js';

const TEST_PAYLOAD = { userId: 42, email: 'test@ecoaware.com' };

describe('signAccessToken / verifyAccessToken', () => {
  it('signAccessToken returns a non-empty JWT string', () => {
    const token = signAccessToken(TEST_PAYLOAD);
    expect(typeof token).toBe('string');
    // JWTs always have exactly 3 dot-separated segments
    expect(token.split('.')).toHaveLength(3);
  });

  it('verifyAccessToken decodes the correct userId', () => {
    const token = signAccessToken(TEST_PAYLOAD);
    const decoded = verifyAccessToken(token);
    expect(decoded.userId).toBe(TEST_PAYLOAD.userId);
  });

  it('verifyAccessToken decodes the correct email', () => {
    const token = signAccessToken(TEST_PAYLOAD);
    const decoded = verifyAccessToken(token);
    expect(decoded.email).toBe(TEST_PAYLOAD.email);
  });

  it('verifyAccessToken throws for a tampered token', () => {
    const token = signAccessToken(TEST_PAYLOAD);
    // Corrupt the signature segment (last part)
    const parts = token.split('.');
    parts[2] = 'invalidsignature';
    const tampered = parts.join('.');
    expect(() => verifyAccessToken(tampered)).toThrow();
  });

  it('verifyAccessToken throws for a completely invalid string', () => {
    expect(() => verifyAccessToken('not.a.jwt')).toThrow();
  });

  it('verifyAccessToken throws for an empty string', () => {
    expect(() => verifyAccessToken('')).toThrow();
  });
});

describe('signRefreshToken / verifyRefreshToken', () => {
  it('signRefreshToken returns a non-empty JWT string', () => {
    const token = signRefreshToken(TEST_PAYLOAD);
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
  });

  it('verifyRefreshToken round-trips userId correctly', () => {
    const token = signRefreshToken(TEST_PAYLOAD);
    const decoded = verifyRefreshToken(token);
    expect(decoded.userId).toBe(TEST_PAYLOAD.userId);
  });

  it('verifyRefreshToken round-trips email correctly', () => {
    const token = signRefreshToken(TEST_PAYLOAD);
    const decoded = verifyRefreshToken(token);
    expect(decoded.email).toBe(TEST_PAYLOAD.email);
  });

  it('access token cannot be verified as a refresh token (uses different secret)', () => {
    // Access and refresh tokens use different secrets, so cross-verification must fail
    const accessToken = signAccessToken(TEST_PAYLOAD);
    expect(() => verifyRefreshToken(accessToken)).toThrow();
  });

  it('verifyRefreshToken throws for a tampered token', () => {
    const token = signRefreshToken(TEST_PAYLOAD);
    const parts = token.split('.');
    parts[2] = 'tamperedsig';
    expect(() => verifyRefreshToken(parts.join('.'))).toThrow();
  });
});

describe('JWT security properties', () => {
  it('access token header specifies HS256 algorithm', () => {
    const token = signAccessToken(TEST_PAYLOAD);
    const header = JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString());
    expect(header.alg).toBe('HS256');
  });

  it('refresh token header specifies HS256 algorithm', () => {
    const token = signRefreshToken(TEST_PAYLOAD);
    const header = JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString());
    expect(header.alg).toBe('HS256');
  });

  it('access token contains issuer claim', () => {
    const token = signAccessToken(TEST_PAYLOAD);
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    expect(payload.iss).toBe('ecoaware-api');
  });

  it('access token contains expiry (exp) claim', () => {
    const token = signAccessToken(TEST_PAYLOAD);
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    expect(payload.exp).toBeDefined();
    expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });
});
