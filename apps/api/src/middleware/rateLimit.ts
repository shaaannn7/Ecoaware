/**
 * Rate Limiting Middleware Configuration
 *
 * Applies progressive rate limits to different route groups:
 *  - Auth routes (login/register): strict 10 req/15min per IP — prevents brute-force attacks
 *  - General API routes: 100 req/min per IP — prevents API abuse
 *
 * Uses the `express-rate-limit` package which is production-proven and
 * supports memory, Redis, and other store backends.
 */

import rateLimit from 'express-rate-limit';

/**
 * Strict rate limiter for authentication endpoints.
 * Applies to: POST /api/auth/login, POST /api/auth/register
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // 10 requests per window per IP
  standardHeaders: true,     // Return RateLimit-* headers per RFC 6585
  legacyHeaders: false,      // Disable X-RateLimit-* legacy headers
  message: {
    error: 'Too many authentication attempts. Please wait 15 minutes before trying again.',
  },
  skip: () => process.env.NODE_ENV === 'test', // Skip during automated tests
});

/**
 * General API rate limiter for all other protected endpoints.
 */
export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 100,              // 100 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Rate limit exceeded. Please slow down your requests.',
  },
  skip: () => process.env.NODE_ENV === 'test', // Skip during automated tests
});
