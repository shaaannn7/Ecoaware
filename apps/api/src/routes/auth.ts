import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { db } from '../db/connection.js';
import { users, refreshTokens } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../services/jwt.js';
import { authenticate } from '../middleware/auth.js';
import {
  encryptName,
  encryptDeterministic,
  decryptUserField,
} from '../services/crypto.js';

const router = Router();

/**
 * Zod validation schema for new user registration requests.
 */
const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(50),
  password: z.string().min(6),
});

/**
 * Zod validation schema for credentials authentication.
 */
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

/**
 * POST /api/auth/register
 * Registers a new user, hashes their password, generates avatar initials,
 * and creates initial access/refresh tokens.
 */
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  try {
    const { email, name, password } = parsed.data;

    const existing = await db.select().from(users).where(eq(users.email, encryptDeterministic(email))).limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const initials = name
      .split(' ')
      .map((n) => n[0].toUpperCase())
      .slice(0, 2)
      .join('');

    const [user] = await db
      .insert(users)
      .values({
        email: encryptDeterministic(email),
        name: encryptName(name),
        passwordHash,
        avatarInitials: initials,
      })
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        avatarInitials: users.avatarInitials,
        monthlyLimitKg: users.monthlyLimitKg,
      });

    const decryptedEmail = decryptUserField(user.email);
    const decryptedName = decryptUserField(user.name);

    const accessToken = signAccessToken({ userId: user.id, email: decryptedEmail });
    const refreshToken = signRefreshToken({ userId: user.id, email: decryptedEmail });

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await db.insert(refreshTokens).values({ userId: user.id, token: refreshToken, expiresAt });

    res.status(201).json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: decryptedEmail,
        name: decryptedName,
        avatarInitials: user.avatarInitials,
        monthlyLimitKg: user.monthlyLimitKg,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/login
 * Authenticates user credentials and returns active access/refresh tokens.
 */
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  try {
    const { email, password } = parsed.data;

    const rows = await db.select().from(users).where(eq(users.email, encryptDeterministic(email))).limit(1);
    const user = rows[0];
    // Use constant-time comparison message — do not distinguish "email not found" from "wrong password"
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const decryptedEmail = decryptUserField(user.email);
    const decryptedName = decryptUserField(user.name);

    const accessToken = signAccessToken({ userId: user.id, email: decryptedEmail });
    const refreshToken = signRefreshToken({ userId: user.id, email: decryptedEmail });

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await db.insert(refreshTokens).values({ userId: user.id, token: refreshToken, expiresAt });

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: decryptedEmail,
        name: decryptedName,
        avatarInitials: user.avatarInitials,
        monthlyLimitKg: user.monthlyLimitKg,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/refresh
 * Verifies validity of refresh token and issues a new access token.
 */
router.post('/refresh', async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    res.status(400).json({ error: 'Refresh token required' });
    return;
  }

  try {
    const payload = verifyRefreshToken(refreshToken);

    // Verify token exists in the database token store (meaning it hasn't been revoked/logged out).
    const stored = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.token, refreshToken))
      .limit(1);

    if (stored.length === 0) {
      res.status(401).json({ error: 'Invalid refresh token' });
      return;
    }

    // Explicit check for expiration timestamps.
    if (new Date(stored[0].expiresAt) < new Date()) {
      await db.delete(refreshTokens).where(eq(refreshTokens.token, refreshToken));
      res.status(401).json({ error: 'Refresh token expired' });
      return;
    }

    const newAccessToken = signAccessToken({ userId: payload.userId, email: payload.email });
    res.json({ accessToken: newAccessToken });
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

/**
 * GET /api/auth/me
 * Retrieves current profile details of the authenticated requester.
 */
router.get('/me', authenticate, async (req: Request, res: Response) => {
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      avatarInitials: users.avatarInitials,
      monthlyLimitKg: users.monthlyLimitKg,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, req.user!.userId))
    .limit(1);

  if (rows.length === 0) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const user = rows[0];
  res.json({
    user: {
      id: user.id,
      email: decryptUserField(user.email),
      name: decryptUserField(user.name),
      avatarInitials: user.avatarInitials,
      monthlyLimitKg: user.monthlyLimitKg,
      createdAt: user.createdAt,
    },
  });
});

/**
 * Zod validation schema for updates to the user profile.
 */
const profileUpdateSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  email: z.string().email().optional(),
  monthlyLimitKg: z.number().positive().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6).optional(),
});

/**
 * PUT /api/auth/profile
 * Updates authenticated user's name, email, carbon allowance limit, or password credentials.
 */
router.put('/profile', authenticate, async (req: Request, res: Response) => {
  const parsed = profileUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const { name, email, monthlyLimitKg, currentPassword, newPassword } = parsed.data;
  const userId = req.user!.userId;

  const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const user = userRows[0];
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const updates: Partial<typeof users.$inferInsert> = {};

  // Verify email uniqueness if changed.
  const decryptedOldEmail = decryptUserField(user.email);
  if (email && email !== decryptedOldEmail) {
    const emailCheck = await db.select().from(users).where(eq(users.email, encryptDeterministic(email))).limit(1);
    if (emailCheck.length > 0) {
      res.status(409).json({ error: 'Email already in use' });
      return;
    }
    updates.email = encryptDeterministic(email);
  }

  // Generate initials if profile name is updated.
  if (name) {
    updates.name = encryptName(name);
    updates.avatarInitials = name
      .split(' ')
      .map((n) => n[0].toUpperCase())
      .slice(0, 2)
      .join('');
  }

  if (monthlyLimitKg !== undefined) {
    updates.monthlyLimitKg = monthlyLimitKg;
  }

  // Handle password rotation updates securely.
  if (newPassword) {
    if (!currentPassword) {
      res.status(400).json({ error: 'Current password is required to set a new password' });
      return;
    }
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Incorrect current password' });
      return;
    }
    updates.passwordHash = await bcrypt.hash(newPassword, 12);
  }

  // Return quickly if no fields need changing.
  if (Object.keys(updates).length === 0) {
    res.json({
      user: {
        id: user.id,
        email: decryptedOldEmail,
        name: decryptUserField(user.name),
        avatarInitials: user.avatarInitials,
        monthlyLimitKg: user.monthlyLimitKg,
      },
    });
    return;
  }

  const [updatedUser] = await db
    .update(users)
    .set(updates)
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      avatarInitials: users.avatarInitials,
      monthlyLimitKg: users.monthlyLimitKg,
    });

  res.json({
    user: {
      id: updatedUser.id,
      email: decryptUserField(updatedUser.email),
      name: decryptUserField(updatedUser.name),
      avatarInitials: updatedUser.avatarInitials,
      monthlyLimitKg: updatedUser.monthlyLimitKg,
    },
  });
});

/**
 * POST /api/auth/logout
 * Deletes the specified refresh token from the database store, invalidating the session.
 */
router.post('/logout', async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await db.delete(refreshTokens).where(eq(refreshTokens.token, refreshToken));
  }
  res.json({ message: 'Logged out successfully' });
});

export default router;

