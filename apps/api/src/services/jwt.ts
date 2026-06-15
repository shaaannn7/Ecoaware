import jwt from 'jsonwebtoken';

/**
 * Secrets configured via environment variables.
 * Fallbacks are provided for local development, but distinct keys should be defined in production.
 */
const JWT_SECRET = process.env.JWT_SECRET || 'carbon-platform-dev-secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'carbon-platform-refresh-dev-secret';

/**
 * Payload structure encoded inside the JWT tokens.
 */
export interface JwtPayload {
  /** The unique numeric ID of the user */
  userId: number;
  /** The email address of the authenticated user */
  email: string;
}

/**
 * Signs a short-lived access token valid for 15 minutes.
 * Used for authentication of regular API request payloads.
 *
 * @param payload - User data to embed in the token
 * @returns Signed JWT string
 */
export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
}

/**
 * Signs a long-lived refresh token valid for 7 days.
 * Used to fetch a new access token when the original expires.
 *
 * @param payload - User data to embed in the token
 * @returns Signed JWT string
 */
export function signRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });
}

/**
 * Verifies and decodes an access token.
 *
 * @param token - The raw access token string
 * @returns The decoded payload if validation succeeds, throws an error otherwise.
 */
export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

/**
 * Verifies and decodes a refresh token.
 *
 * @param token - The raw refresh token string
 * @returns The decoded payload if validation succeeds, throws an error otherwise.
 */
export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_REFRESH_SECRET) as JwtPayload;
}

