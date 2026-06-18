/**
 * Unit tests for the Auth Middleware.
 *
 * Covers:
 *  - Middleware populates req.user with the guest payload
 *  - Middleware always calls next()
 */

import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.js';

describe('authenticate middleware', () => {
  it('sets req.user to the guest payload and calls next()', () => {
    const req = {} as Request;
    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    authenticate(req, res, next);

    expect(req.user).toBeDefined();
    expect(req.user?.userId).toBe(1);
    expect(req.user?.email).toBe('guest@ecoaware.com');
    expect(next).toHaveBeenCalledOnce();
  });

  it('does not call next with an error argument', () => {
    const req = {} as Request;
    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    authenticate(req, res, next);

    // next() must be called with no arguments (not an Error)
    expect(next).toHaveBeenCalledWith();
  });
});
