/**
 * Unit tests for the Carbon Emission Factors Service.
 *
 * Covers:
 *  - Correct CO2 calculation for known activity types
 *  - Floating-point precision handling
 *  - Error handling for unknown factor keys
 *  - Data integrity of the EMISSION_FACTORS dictionary
 */

import { describe, it, expect } from 'vitest';
import {
  calculateCO2,
  EMISSION_FACTORS,
} from '../services/emissionFactors.js';

describe('calculateCO2', () => {
  // ── Basic Calculations ───────────────────────────────────────────────────

  it('calculates CO2 correctly for car_petrol over 100 km', () => {
    // 0.21 kg/km × 100 km = 21 kg
    expect(calculateCO2('car_petrol', 100)).toBe(21);
  });

  it('calculates CO2 correctly for electricity usage (10 kWh)', () => {
    // 0.5 kg/kWh × 10 kWh = 5 kg
    expect(calculateCO2('electricity', 10)).toBe(5);
  });

  it('calculates CO2 correctly for a single beef meal', () => {
    // 3.3 kg/meal × 1 meal = 3.3 kg
    expect(calculateCO2('beef_meal', 1)).toBe(3.3);
  });

  it('calculates CO2 correctly for five vegan meals', () => {
    // 0.16 kg/meal × 5 meals = 0.8 kg
    expect(calculateCO2('vegan_meal', 5)).toBe(0.8);
  });

  it('calculates CO2 correctly for landfill waste (10 kg)', () => {
    // 0.57 kg/kg × 10 kg = 5.7 kg
    expect(calculateCO2('landfill_waste', 10)).toBe(5.7);
  });

  // ── Floating-Point Precision ─────────────────────────────────────────────

  it('avoids floating-point precision errors for bus travel (3 km)', () => {
    // 0.089 kg/km × 3 = 0.267 (not 0.26700000000000005)
    expect(calculateCO2('bus', 3)).toBe(0.267);
  });

  it('avoids floating-point precision errors for train travel (7 km)', () => {
    // 0.041 × 7 = 0.287 (not 0.28700000000000003)
    expect(calculateCO2('train', 7)).toBe(0.287);
  });

  // ── Error Handling ───────────────────────────────────────────────────────

  it('throws an error for an unknown factor key', () => {
    expect(() => calculateCO2('unknown_activity', 10)).toThrow(
      'Unknown emission factor: unknown_activity'
    );
  });
});

describe('EMISSION_FACTORS dictionary integrity', () => {
  const entries = Object.entries(EMISSION_FACTORS);

  it('contains at least one entry per category', () => {
    const categories = new Set(entries.map(([, f]) => f.category));
    expect(categories.has('transport')).toBe(true);
    expect(categories.has('energy')).toBe(true);
    expect(categories.has('diet')).toBe(true);
    expect(categories.has('waste')).toBe(true);
  });

  it('every factor has a positive co2PerUnit value', () => {
    for (const [key, factor] of entries) {
      expect(factor.co2PerUnit, `${key} co2PerUnit should be positive`).toBeGreaterThan(0);
    }
  });

  it('every factor has a valid category enum value', () => {
    const validCategories = new Set(['transport', 'energy', 'diet', 'waste']);
    for (const [key, factor] of entries) {
      expect(
        validCategories.has(factor.category),
        `${key} has invalid category: ${factor.category}`
      ).toBe(true);
    }
  });

  it('every factor has a non-empty label and unit', () => {
    for (const [key, factor] of entries) {
      expect(factor.label, `${key} label should not be empty`).toBeTruthy();
      expect(factor.unit, `${key} unit should not be empty`).toBeTruthy();
    }
  });
});
