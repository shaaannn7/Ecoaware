export interface Tip {
  id: string;
  category: 'transport' | 'energy' | 'diet' | 'waste';
  title: string;
  description: string;
  savingsKg: number;
}

export const TIPS_LIBRARY: Tip[] = [
  {
    id: 't1',
    category: 'transport',
    title: 'Commute via Public Transit',
    description: 'Opt for trains or buses instead of driving solo. This reduces travel emissions by up to 60%.',
    savingsKg: 85,
  },
  {
    id: 't2',
    category: 'transport',
    title: 'Try Biking or Walking',
    description: 'For short trips under 2 miles, walk or cycle. It is 100% emission-free and keeps you healthy!',
    savingsKg: 20,
  },
  {
    id: 't3',
    category: 'transport',
    title: 'Maintain Eco-Driving Habits',
    description: 'Keep tires inflated, avoid aggressive acceleration, and clear unnecessary weight from your trunk.',
    savingsKg: 15,
  },
  {
    id: 't4',
    category: 'energy',
    title: 'Switch to Smart LEDs',
    description: 'Replace standard light bulbs with Energy Star LEDs. They use 75-80% less power and last longer.',
    savingsKg: 40,
  },
  {
    id: 't5',
    category: 'energy',
    title: 'Adjust Thermostat by 2°F',
    description: 'Lower heating in winter or raise AC in summer. A small adjustment makes a massive difference on the grid.',
    savingsKg: 50,
  },
  {
    id: 't6',
    category: 'energy',
    title: 'Unplug Phantom Loads',
    description: 'Unplug TVs, chargers, and appliances when not in use. Standby energy represents 10% of home electricity use.',
    savingsKg: 12,
  },
  {
    id: 't7',
    category: 'diet',
    title: 'Adopt Meatless Mondays',
    description: 'Swapping beef/lamb for plant-based alternatives just one day a week saves significant agricultural emissions.',
    savingsKg: 35,
  },
  {
    id: 't8',
    category: 'diet',
    title: 'Minimize Food Waste',
    description: 'Plan your meals, utilize leftovers, and freeze extras. Landfilled food produces potent greenhouse gases.',
    savingsKg: 25,
  },
  {
    id: 't9',
    category: 'diet',
    title: 'Select Local & Seasonal Food',
    description: 'Buy local produce to cut down on food miles (transport emissions) and support sustainable farming.',
    savingsKg: 18,
  },
  {
    id: 't10',
    category: 'waste',
    title: 'Ditch Single-Use Plastics',
    description: 'Use reusable shopping bags, water bottles, and coffee cups to decrease manufacturing and processing waste.',
    savingsKg: 8,
  },
  {
    id: 't11',
    category: 'waste',
    title: 'Start Organic Composting',
    description: 'Compost fruit scraps and coffee grounds. Diverting organic waste from landfills stops anaerobic methane generation.',
    savingsKg: 30,
  },
  {
    id: 't12',
    category: 'waste',
    title: 'Buy Secondhand or Bulk',
    description: 'Shopping secondhand items or buying staples in bulk reduces excess packaging materials and production demand.',
    savingsKg: 15,
  },
];
