import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import App from '../App';
import { AuthProvider } from '../contexts/AuthContext';

// Mock recharts to avoid jsdom sizing and rendering issues
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => children,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: ({ children }: any) => <div data-testid="pie">{children}</div>,
  Cell: () => null,
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
  Area: () => null,
  XAxis: () => null,
  Tooltip: () => null,
}));

// Mock the carbon data hook
vi.mock('../hooks/useCarbonData', () => ({
  useCarbonData: vi.fn().mockReturnValue({
    data: {
      footprint: {
        totalKg: 120,
        offsetKg: 20,
        netKg: 100,
        totalTons: 0.12,
        offsetTons: 0.02,
        netTons: 0.1,
      },
      breakdown: [
        { category: 'transport', name: 'Transportation', value: 50, kg: 60, colorLight: '#2b9348', colorDark: '#4ade80' }
      ],
      monthly: [
        { label: 'Jan', yearMonth: '2026-01', kg: 120, percentage: 100 }
      ],
      recentActivities: [
        { id: 1, userId: 1, category: 'transport', description: 'Drive', co2Kg: 60, date: '2026-06-15', createdAt: '2026-06-15' }
      ],
      goals: [
        { id: 1, userId: 1, title: 'Reduce driving', targetCo2Kg: 50, currentCo2Kg: 0, deadline: '2026-07-01', status: 'active', createdAt: '2026-06-15' }
      ],
      offsets: [
        { id: 1, userId: 1, provider: 'EcoTree', description: 'Planted trees', co2Kg: 20, costUsd: 10, date: '2026-06-15', createdAt: '2026-06-15' }
      ],
      factors: {
        car_petrol: { category: 'transport', co2PerUnit: 0.21, label: 'Petrol Car', unit: 'km' }
      },
      tips: [
        { id: 't1', category: 'transport', title: 'Take public transit', description: 'Train/bus is better', savingsKg: 85 }
      ]
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

// Mock assistant API endpoints
vi.mock('../services/api', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    assistantApi: {
      chat: vi.fn().mockResolvedValue({ success: true, response: 'Hello user', timestamp: new Date().toISOString() }),
      badges: vi.fn().mockResolvedValue({
        success: true,
        badges: [
          { id: 'b1', name: 'Eco Pioneer', description: 'Log first activity', icon: 'sparkles', unlocked: true, progress: 1, target: 1 }
        ]
      }),
      community: vi.fn().mockResolvedValue({
        success: true,
        communityAverageKg: 380,
        userNetKg: 100,
        userRank: 2,
        totalCompetitors: 6,
        leaderboard: [
          { name: 'Rohan Mehta', netKg: 80 },
          { name: 'Guest User', netKg: 100, isCurrentUser: true }
        ]
      })
    },
    activitiesApi: {
      create: vi.fn().mockResolvedValue({ activity: { id: 2, category: 'diet', description: 'Eat salad', co2Kg: 0.5, date: '2026-06-16' } }),
      delete: vi.fn().mockResolvedValue({ message: 'Deleted' }),
      emissionFactors: vi.fn().mockResolvedValue({ factors: {} }),
    },
    goalsApi: {
      create: vi.fn().mockResolvedValue({ goal: { id: 2, title: 'Less energy', targetCo2Kg: 30, deadline: '2026-07-15', status: 'active' } }),
      delete: vi.fn().mockResolvedValue({ message: 'Deleted' }),
    },
    offsetsApi: {
      create: vi.fn().mockResolvedValue({ offset: { id: 2, provider: 'EcoGrass', co2Kg: 10, date: '2026-06-16' } }),
      delete: vi.fn().mockResolvedValue({ message: 'Deleted' }),
    }
  };
});

describe('App Component', () => {
  beforeAll(() => {
    // Stub Element.prototype.scrollIntoView because jsdom doesn't implement it
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it('renders the application shell and navigation header', () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    expect(screen.getByText('Carbon Tracker')).toBeInTheDocument();
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Eco Insights').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Settings').length).toBeGreaterThan(0);
    expect(screen.getByText('Guest')).toBeInTheDocument();
  });

  it('switches tabs correctly when clicked', async () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    // Initial state shows DashboardPage elements
    expect(screen.getByText('Net Footprint')).toBeInTheDocument();

    // Click Eco Insights tab
    const insightsTab = screen.getAllByText('Eco Insights')[0];
    fireEvent.click(insightsTab);

    // Verify insights page content is shown
    expect(screen.getByText('AI Insights & Milestones')).toBeInTheDocument();
    expect(screen.getAllByText('AI Eco-Assistant').length).toBeGreaterThan(0);

    // Click Settings tab
    const settingsTab = screen.getAllByText('Settings')[0];
    fireEvent.click(settingsTab);

    // Verify settings page content is shown
    expect(screen.getByText('Profile Settings')).toBeInTheDocument();
    expect(screen.getByText('Monthly Carbon Limit (kg CO₂e)')).toBeInTheDocument();
  });

  it('toggles dark mode when theme button is clicked', () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    const toggleBtn = screen.getByLabelText('Toggle Dark Mode');
    expect(toggleBtn).toBeInTheDocument();

    fireEvent.click(toggleBtn);
    expect(document.body.classList.contains('dark')).toBe(true);

    fireEvent.click(toggleBtn);
    expect(document.body.classList.contains('dark')).toBe(false);
  });

  it('can open and close modals', async () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    // Open Add Activity Modal
    const logActivityBtn = screen.getByText('Log Activity');
    fireEvent.click(logActivityBtn);

    expect(screen.getByText('Log Activity', { selector: 'h3' })).toBeInTheDocument();

    // Close Modal
    const closeBtn = screen.getByLabelText('Close Modal');
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText('Log Activity', { selector: 'h3' })).not.toBeInTheDocument();
    });
  });
});
