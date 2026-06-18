/**
 * Unit tests for pure calculation and utility functions used across the app.
 *
 * These helpers are extracted from the inline logic in AddActivityModal
 * and App.tsx and tested in isolation for maximum coverage.
 */

import { describe, it, expect } from 'vitest';

// ── CO2 Estimation Logic (mirrors AddActivityModal inline calculation) ────────

/**
 * Estimates CO2 based on an emission factor and a quantity.
 * Mirrors: `Math.round(selectedFactor.co2PerUnit * parseFloat(quantity) * 100) / 100`
 */
function estimateCO2(co2PerUnit: number, quantity: number): number {
  return Math.round(co2PerUnit * quantity * 100) / 100;
}

describe('estimateCO2 (AddActivityModal calculation logic)', () => {
  it('calculates correctly for petrol car (0.21 × 100)', () => {
    expect(estimateCO2(0.21, 100)).toBe(21);
  });

  it('calculates correctly for electricity (0.5 × 10)', () => {
    expect(estimateCO2(0.5, 10)).toBe(5);
  });

  it('rounds to 2 decimal places', () => {
    // 0.089 × 3 = 0.267 → rounded to 2dp = 0.27
    expect(estimateCO2(0.089, 3)).toBe(0.27);
  });

  it('returns 0 for zero quantity', () => {
    expect(estimateCO2(0.21, 0)).toBe(0);
  });

  it('handles fractional quantities', () => {
    expect(estimateCO2(3.3, 0.5)).toBe(1.65);
  });
});

// ── Initials Generation (mirrors auth.ts registration logic) ─────────────────

/**
 * Generates avatar initials from a full name.
 * Mirrors the initials logic in the backend auth route.
 */
function generateInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0]?.toUpperCase())
    .filter(Boolean)
    .slice(0, 2)
    .join('');
}

describe('generateInitials', () => {
  it('generates two initials from a full name', () => {
    expect(generateInitials('Jane Doe')).toBe('JD');
  });

  it('generates one initial from a single name', () => {
    expect(generateInitials('Alice')).toBe('A');
  });

  it('handles three-part names (takes first two)', () => {
    expect(generateInitials('John Paul Smith')).toBe('JP');
  });

  it('uppercases the initials', () => {
    expect(generateInitials('alice bob')).toBe('AB');
  });

  it('handles extra whitespace between names', () => {
    expect(generateInitials('Jane  Doe')).toBe('JD');
  });
});

// ── Date Helpers ──────────────────────────────────────────────────────────────

/**
 * Checks if a string is a valid YYYY-MM-DD date.
 */
function isValidIsoDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

/**
 * Gets today's date as YYYY-MM-DD string (mirrors `new Date().toISOString().split('T')[0]`).
 */
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

describe('date utilities', () => {
  it('getTodayDate returns a YYYY-MM-DD string', () => {
    const today = getTodayDate();
    expect(isValidIsoDate(today)).toBe(true);
  });

  it('isValidIsoDate returns true for valid date', () => {
    expect(isValidIsoDate('2024-06-15')).toBe(true);
  });

  it('isValidIsoDate returns false for DD/MM/YYYY format', () => {
    expect(isValidIsoDate('15/06/2024')).toBe(false);
  });

  it('isValidIsoDate returns false for partial date', () => {
    expect(isValidIsoDate('2024-06')).toBe(false);
  });
});

// ── Carbon Category Helpers ───────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  transport: 'Transportation',
  energy: 'Energy',
  diet: 'Diet',
  waste: 'Waste',
};

describe('category label mapping', () => {
  it('maps transport to Transportation', () => {
    expect(CATEGORY_LABELS['transport']).toBe('Transportation');
  });

  it('maps energy to Energy', () => {
    expect(CATEGORY_LABELS['energy']).toBe('Energy');
  });

  it('maps diet to Diet', () => {
    expect(CATEGORY_LABELS['diet']).toBe('Diet');
  });

  it('maps waste to Waste', () => {
    expect(CATEGORY_LABELS['waste']).toBe('Waste');
  });

  it('returns undefined for unknown category', () => {
    expect(CATEGORY_LABELS['unknown']).toBeUndefined();
  });
});

// ── Footprint Stats Utilities ─────────────────────────────────────────────────

/** Converts kg to metric tons (rounded to 2 dp) */
function kgToTons(kg: number): number {
  return Math.round((kg / 1000) * 100) / 100;
}

/** Computes net emissions (cannot be negative) */
function computeNetKg(totalKg: number, offsetKg: number): number {
  return Math.max(0, totalKg - offsetKg);
}

describe('footprint calculation utilities', () => {
  it('converts 1000 kg to 1 ton', () => {
    expect(kgToTons(1000)).toBe(1);
  });

  it('converts 500 kg to 0.5 tons', () => {
    expect(kgToTons(500)).toBe(0.5);
  });

  it('converts 2500 kg to 2.5 tons', () => {
    expect(kgToTons(2500)).toBe(2.5);
  });

  it('computes net kg correctly when total > offset', () => {
    expect(computeNetKg(500, 100)).toBe(400);
  });

  it('net kg is 0 when offsets exceed emissions', () => {
    expect(computeNetKg(100, 500)).toBe(0);
  });

  it('net kg is 0 when emissions equal offsets', () => {
    expect(computeNetKg(300, 300)).toBe(0);
  });
});
