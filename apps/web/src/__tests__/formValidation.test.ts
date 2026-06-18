/**
 * Unit tests for form validation logic used throughout the EcoAware UI.
 *
 * These tests validate the same regex patterns and constraints
 * that the Zod schemas on the backend enforce, ensuring the frontend
 * can catch invalid input before making network requests.
 *
 * Covered validation rules:
 *  - Email format
 *  - Password minimum length
 *  - User name constraints
 *  - Activity date format (YYYY-MM-DD)
 *  - Carbon quantity must be positive
 */

import { describe, it, expect } from 'vitest';

// ── Pure validation helpers (mirrors the Zod constraints in auth.ts routes) ──

/** Validates an email address format. */
const isValidEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

/** Validates a password meets the minimum length of 6 characters. */
const isValidPassword = (password: string): boolean => password.length >= 6;

/** Validates a user name is between 2 and 50 characters. */
const isValidName = (name: string): boolean =>
  name.trim().length >= 2 && name.trim().length <= 50;

/** Validates activity date matches YYYY-MM-DD ISO format. */
const isValidActivityDate = (date: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(date);

/** Validates a carbon quantity is a strictly positive number. */
const isValidQuantity = (quantity: number): boolean =>
  typeof quantity === 'number' && isFinite(quantity) && quantity > 0;

// ── Email Validation Tests ───────────────────────────────────────────────────

describe('Email validation', () => {
  it('accepts a standard valid email address', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
  });

  it('accepts an email with subdomains', () => {
    expect(isValidEmail('user@mail.ecoaware.io')).toBe(true);
  });

  it('rejects an email missing the @ symbol', () => {
    expect(isValidEmail('userexample.com')).toBe(false);
  });

  it('rejects an email missing the domain part', () => {
    expect(isValidEmail('user@')).toBe(false);
  });

  it('rejects a plain string with no email structure', () => {
    expect(isValidEmail('notanemail')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isValidEmail('')).toBe(false);
  });
});

// ── Password Validation Tests ────────────────────────────────────────────────

describe('Password validation', () => {
  it('accepts a password with exactly 6 characters', () => {
    expect(isValidPassword('abc123')).toBe(true);
  });

  it('accepts a long password', () => {
    expect(isValidPassword('a-very-secure-password-123!')).toBe(true);
  });

  it('rejects a password with fewer than 6 characters', () => {
    expect(isValidPassword('abc')).toBe(false);
  });

  it('rejects an empty password', () => {
    expect(isValidPassword('')).toBe(false);
  });
});

// ── User Name Validation Tests ───────────────────────────────────────────────

describe('User name validation', () => {
  it('accepts a name with exactly 2 characters', () => {
    expect(isValidName('Jo')).toBe(true);
  });

  it('accepts a typical full name', () => {
    expect(isValidName('Jane Doe')).toBe(true);
  });

  it('rejects a single-character name', () => {
    expect(isValidName('J')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isValidName('')).toBe(false);
  });

  it('rejects a name exceeding 50 characters', () => {
    expect(isValidName('A'.repeat(51))).toBe(false);
  });
});

// ── Activity Date Validation Tests ───────────────────────────────────────────

describe('Activity date (YYYY-MM-DD) validation', () => {
  it('accepts a correctly formatted date', () => {
    expect(isValidActivityDate('2024-06-15')).toBe(true);
  });

  it('rejects a date in DD/MM/YYYY format', () => {
    expect(isValidActivityDate('15/06/2024')).toBe(false);
  });

  it('rejects a date with only year and month', () => {
    expect(isValidActivityDate('2024-06')).toBe(false);
  });

  it('rejects a free-form date string', () => {
    expect(isValidActivityDate('June 15 2024')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isValidActivityDate('')).toBe(false);
  });
});

// ── Quantity Validation Tests ────────────────────────────────────────────────

describe('Carbon quantity validation', () => {
  it('accepts a positive integer quantity', () => {
    expect(isValidQuantity(100)).toBe(true);
  });

  it('accepts a positive fractional quantity', () => {
    expect(isValidQuantity(0.5)).toBe(true);
  });

  it('rejects zero', () => {
    expect(isValidQuantity(0)).toBe(false);
  });

  it('rejects a negative number', () => {
    expect(isValidQuantity(-10)).toBe(false);
  });
});
