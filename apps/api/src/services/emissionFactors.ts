/**
 * CO2 Emission Factors Service
 * 
 * Defines standard conversion factors based on IPCC & EPA carbon footprint estimates.
 * All values represent kilograms of CO2 equivalent (kg CO2e) emitted per unit of consumption.
 */

/**
 * Structure of a single CO2 emission factor.
 */
export interface EmissionFactor {
  /** Descriptive name of the activity or consumption type */
  label: string;
  /** Unit of measurement (e.g. km, kWh, meal, kg) */
  unit: string;
  /** Kilograms of CO2 equivalent per unit of consumption */
  co2PerUnit: number;
  /** Main categorization for analytics aggregations */
  category: 'transport' | 'energy' | 'diet' | 'waste';
}

/**
 * Seed data dictionary mapping specific activity types to their emission factors.
 */
export const EMISSION_FACTORS: Record<string, EmissionFactor> = {
  // ── Transport (Emissions per Kilometer) ───────────────────────────────────
  car_petrol: { label: 'Car (Petrol)', unit: 'km', co2PerUnit: 0.21, category: 'transport' },
  car_diesel: { label: 'Car (Diesel)', unit: 'km', co2PerUnit: 0.17, category: 'transport' },
  car_electric: { label: 'Car (Electric)', unit: 'km', co2PerUnit: 0.05, category: 'transport' },
  motorcycle: { label: 'Motorcycle', unit: 'km', co2PerUnit: 0.11, category: 'transport' },
  bus: { label: 'Bus', unit: 'km', co2PerUnit: 0.089, category: 'transport' },
  train: { label: 'Train', unit: 'km', co2PerUnit: 0.041, category: 'transport' },
  flight_short: { label: 'Short-haul Flight', unit: 'km', co2PerUnit: 0.255, category: 'transport' },
  flight_long: { label: 'Long-haul Flight', unit: 'km', co2PerUnit: 0.195, category: 'transport' },

  // ── Energy (Emissions per kWh, cubic meter, or litre) ─────────────────────
  electricity: { label: 'Electricity', unit: 'kWh', co2PerUnit: 0.5, category: 'energy' },
  natural_gas: { label: 'Natural Gas', unit: 'cubic meter', co2PerUnit: 2.0, category: 'energy' },
  heating_oil: { label: 'Heating Oil', unit: 'litre', co2PerUnit: 2.68, category: 'energy' },

  // ── Diet (Emissions per Meal depending on ingredients footprint) ───────────
  beef_meal: { label: 'Beef Meal', unit: 'meal', co2PerUnit: 3.3, category: 'diet' },
  lamb_meal: { label: 'Lamb/Mutton Meal', unit: 'meal', co2PerUnit: 2.4, category: 'diet' },
  pork_meal: { label: 'Pork Meal', unit: 'meal', co2PerUnit: 1.3, category: 'diet' },
  chicken_meal: { label: 'Chicken Meal', unit: 'meal', co2PerUnit: 0.86, category: 'diet' },
  fish_meal: { label: 'Fish Meal', unit: 'meal', co2PerUnit: 0.68, category: 'diet' },
  vegetarian_meal: { label: 'Vegetarian Meal', unit: 'meal', co2PerUnit: 0.3, category: 'diet' },
  vegan_meal: { label: 'Vegan Meal', unit: 'meal', co2PerUnit: 0.16, category: 'diet' },

  // ── Waste (Emissions per Kilogram of waste processed) ─────────────────────
  landfill_waste: { label: 'Landfill Waste', unit: 'kg', co2PerUnit: 0.57, category: 'waste' },
  recycled: { label: 'Recycled Waste', unit: 'kg', co2PerUnit: 0.02, category: 'waste' },
  composted: { label: 'Composted Waste', unit: 'kg', co2PerUnit: 0.01, category: 'waste' },
};

/**
 * Calculates total kg CO2 equivalent for a given activity factor and quantity.
 * 
 * @param factorKey - The lookup key in the EMISSION_FACTORS dictionary
 * @param quantity - The quantitative input (distance, energy quantity, etc.)
 * @returns Total calculated kg CO2e, rounded to 3 decimal places.
 * @throws Error if the factorKey is invalid.
 */
export function calculateCO2(factorKey: string, quantity: number): number {
  const factor = EMISSION_FACTORS[factorKey];
  if (!factor) {
    throw new Error(`Unknown emission factor: ${factorKey}`);
  }
  // Math.round logic avoids floating-point precision overflow problems (e.g. 0.1 + 0.2 = 0.3000000004).
  return Math.round(factor.co2PerUnit * quantity * 1000) / 1000;
}

