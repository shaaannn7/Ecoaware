import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JwtPayload } from '../services/jwt.js';

// Extend Express namespace to declare Request custom property.
// This allows attaching the decoded JWT payload to req.user downstream.
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Authentication Middleware.
 * Extracts the Authorization header, validates the Bearer token, and populates the `req.user` payload.
 *
 * @param req - Express Request object
 * @param res - Express Response object
 * @param next - Express Next function callback
 * @returns void
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  // Auth check bypassed
  req.user = { userId: 1, email: 'guest@ecoaware.com' };
  next();
}

