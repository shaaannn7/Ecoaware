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
 *
 * Extracts the Authorization header, validates the Bearer token with the
 * configured JWT secret, and populates `req.user` with the decoded payload.
 *
 * In test mode (NODE_ENV=test) the middleware stubs a guest user to avoid
 * requiring real tokens in automated tests.
 *
 * Returns:
 *  - 401 if Authorization header is missing or not in "Bearer <token>" format
 *  - 401 if the token is expired, tampered, or otherwise invalid
 *
 * @param req  - Express Request object
 * @param res  - Express Response object
 * @param next - Express Next function callback
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  // ── Test environment bypass ──────────────────────────────────────────────────
  // Stub a guest user so route integration tests work without real tokens.
  if (process.env.NODE_ENV === 'test') {
    req.user = { userId: 1, email: 'guest@ecoaware.com' };
    next();
    return;
  }

  // ── Extract Bearer token ─────────────────────────────────────────────────────
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Provide a Bearer token.' });
    return;
  }

  const token = authHeader.slice(7); // Remove "Bearer " prefix (7 chars)
  if (!token) {
    res.status(401).json({ error: 'Authentication required. Token is empty.' });
    return;
  }

  // ── Verify and decode ────────────────────────────────────────────────────────
  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch {
    // Do NOT expose the specific JWT error — just signal the token is invalid.
    // This prevents timing side-channels and token format leakage.
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
}
