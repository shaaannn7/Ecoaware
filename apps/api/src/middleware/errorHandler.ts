import { Request, Response, NextFunction } from 'express';

/**
 * Global Error Handling Middleware.
 * Catches all errors thrown in routes, logs details with stack traces, and sanitizes outgoing responses.
 *
 * @param err - The raw Error object caught by Express
 * @param req - Express Request object
 * @param res - Express Response object
 * @param next - Express Next function callback (necessary signature for Express error matching)
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  // Output full error messages and callstacks on server logs for debugging diagnostics.
  console.error(`[ERROR] ${req.method} ${req.path} - ${err.message}`, err.stack);

  // Return a generic JSON error message to the client, leaking the message only in non-production.
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
}

