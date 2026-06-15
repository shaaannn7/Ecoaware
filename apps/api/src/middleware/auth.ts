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
  const authHeader = req.headers.authorization;

  // Verify that an Authorization header exists and has the correct 'Bearer <token>' format.
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  // Strip 'Bearer ' prefix to isolate the raw JWT token.
  const token = authHeader.slice(7);

  try {
    // Verify validity and expiration of token.
    const payload = verifyAccessToken(token);
    
    // Attach user payload details to request object for downstream route handlers.
    req.user = payload;
    
    // Pass control to the next middleware or route handler.
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

