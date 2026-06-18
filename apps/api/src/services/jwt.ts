import jwt from 'jsonwebtoken';

/**
 * Secrets configured via environment variables.
 * Fallbacks are provided for local development, but distinct keys should be defined in production.
 *
 * Security note: In production, set these to cryptographically random 256-bit secrets.
 * Generate with: `openssl rand -hex 32`
 */
const JWT_SECRET = process.env.JWT_SECRET || 'carbon-platform-dev-secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'carbon-platform-refresh-dev-secret';

// Security validation guard for production environments
if (process.env.NODE_ENV === 'production') {
  if (
    !process.env.JWT_SECRET ||
    process.env.JWT_SECRET === 'carbon-platform-dev-secret' ||
    process.env.JWT_SECRET === 'change-me-in-production'
  ) {
    throw new Error('FATAL: JWT_SECRET is unconfigured or set to a development/placeholder value in production!');
  }
  if (
    !process.env.JWT_REFRESH_SECRET ||
    process.env.JWT_REFRESH_SECRET === 'carbon-platform-refresh-dev-secret' ||
    process.env.JWT_REFRESH_SECRET === 'change-me-refresh-in-production'
  ) {
    throw new Error('FATAL: JWT_REFRESH_SECRET is unconfigured or set to a development/placeholder value in production!');
  }
}

/**
 * JWT algorithm. Explicitly set to prevent algorithm confusion attacks
 * where an attacker switches to 'none' or 'HS256' with a public key.
 */
const JWT_ALGORITHM = 'HS256' as const;

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
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '15m',
    algorithm: JWT_ALGORITHM,
    issuer: 'ecoaware-api',
    audience: 'ecoaware-client',
  });
}

/**
 * Signs a long-lived refresh token valid for 7 days.
 * Used to fetch a new access token when the original expires.
 *
 * @param payload - User data to embed in the token
 * @returns Signed JWT string
 */
export function signRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: '7d',
    algorithm: JWT_ALGORITHM,
    issuer: 'ecoaware-api',
    audience: 'ecoaware-client',
  });
}

/**
 * Verifies and decodes an access token.
 *
 * @param token - The raw access token string
 * @returns The decoded payload if validation succeeds, throws an error otherwise.
 */
export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET, {
    algorithms: [JWT_ALGORITHM],
    issuer: 'ecoaware-api',
    audience: 'ecoaware-client',
  }) as JwtPayload;
}

/**
 * Verifies and decodes a refresh token.
 *
 * @param token - The raw refresh token string
 * @returns The decoded payload if validation succeeds, throws an error otherwise.
 */
export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_REFRESH_SECRET, {
    algorithms: [JWT_ALGORITHM],
    issuer: 'ecoaware-api',
    audience: 'ecoaware-client',
  }) as JwtPayload;
}
