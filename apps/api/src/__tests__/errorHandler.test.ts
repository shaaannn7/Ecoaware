/**
 * Unit tests for the global error handling middleware.
 *
 * Covers:
 *  - Returns HTTP 500 with JSON error body
 *  - In development mode, exposes err.message
 *  - In production mode, hides err.message
 *  - Always logs error details
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { errorHandler } from '../middleware/errorHandler.js';

describe('errorHandler middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let statusMock: ReturnType<typeof vi.fn>;
  let jsonMock: ReturnType<typeof vi.fn>;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    req = { method: 'GET', path: '/api/test' };
    res = {
      status: statusMock,
      json: jsonMock,
    } as Partial<Response>;
    next = vi.fn();
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('calls res.status(500)', () => {
    const err = new Error('Something broke');
    errorHandler(err, req as Request, res as Response, next);
    expect(statusMock).toHaveBeenCalledWith(500);
  });

  it('returns JSON body with "error" key', () => {
    const err = new Error('Something broke');
    errorHandler(err, req as Request, res as Response, next);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Internal server error' })
    );
  });

  it('exposes err.message in development environment', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const err = new Error('Detailed dev error');
    errorHandler(err, req as Request, res as Response, next);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Detailed dev error' })
    );
    process.env.NODE_ENV = originalEnv;
  });

  it('hides err.message in production environment', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const err = new Error('Sensitive internal error');
    errorHandler(err, req as Request, res as Response, next);
    const callArg = jsonMock.mock.calls[0][0];
    expect(callArg.message).toBeUndefined();
    process.env.NODE_ENV = originalEnv;
  });

  it('logs the error to console.error', () => {
    const err = new Error('Test error for logging');
    errorHandler(err, req as Request, res as Response, next);
    expect(consoleSpy).toHaveBeenCalled();
  });
});
