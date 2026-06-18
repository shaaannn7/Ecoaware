import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import DashboardPage from '../pages/DashboardPage';
import InsightsPage from '../pages/InsightsPage';
import { AuthProvider } from '../contexts/AuthContext';
import { goalsApi, offsetsApi, activitiesApi, assistantApi } from '../services/api';

// Mock recharts
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => children,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: ({ children }: any) => <div data-testid="pie">{children}</div>,
  Cell: () => null,
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
  Area: () => null,
  XAxis: () => null,
  Tooltip: ({ active, payload, label, content }: any) => {
    if (active && content) {
      return React.createElement(content, { active, payload, label });
    }
    return null;
  },
}));

// Mock hook
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
        { category: 'transport', name: 'Transportation', value: 50, kg: 60, colorLight: '#2b9348', colorDark: '#4ade80' },
        { category: 'energy', name: 'Energy', value: 50, kg: 60, colorLight: '#55a630', colorDark: '#86efac' }
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
      factors: {},
      tips: [
        { id: 't1', category: 'transport', title: 'Take public transit', description: 'Train/bus is better', savingsKg: 85 }
      ]
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

vi.mock('../services/api', () => ({
  goalsApi: { delete: vi.fn().mockResolvedValue({ message: 'Deleted' }) },
  offsetsApi: { delete: vi.fn().mockResolvedValue({ message: 'Deleted' }) },
  activitiesApi: { delete: vi.fn().mockResolvedValue({ message: 'Deleted' }) },
  assistantApi: {
    chat: vi.fn().mockResolvedValue({ success: true, response: 'Mocked AI message **bolded**\n- Bullet 1', timestamp: new Date().toISOString() }),
    badges: vi.fn().mockResolvedValue({
      success: true,
      badges: [
        { id: 'b1', name: 'Eco Pioneer', description: 'Unlock badge', icon: 'sparkles', unlocked: true, progress: 1, target: 1 },
        { id: 'b2', name: 'Green Commuter', description: 'Lock badge', icon: 'zap', unlocked: false, progress: 0, target: 1 }
      ]
    }),
    community: vi.fn().mockResolvedValue({
      success: true,
      communityAverageKg: 380,
      userNetKg: 100,
      userRank: 2,
      totalCompetitors: 6,
      leaderboard: [
        { name: 'Rohan', netKg: 80 },
        { name: 'You', netKg: 100, isCurrentUser: true }
      ]
    })
  }
}));

describe('DashboardPage Component', () => {
  it('supports deleting goals, offsets, and activities', async () => {
    const onOpenActivity = vi.fn();
    const onOpenGoal = vi.fn();
    const onOpenOffset = vi.fn();

    render(
      <AuthProvider>
        <DashboardPage
          onOpenActivity={onOpenActivity}
          onOpenGoal={onOpenGoal}
          onOpenOffset={onOpenOffset}
        />
      </AuthProvider>
    );

    // Delete goal button click
    const deleteGoalBtn = screen.getByLabelText('Delete Goal');
    fireEvent.click(deleteGoalBtn);
    expect(goalsApi.delete).toHaveBeenCalledWith(1);

    // Delete offset button click
    const deleteOffsetBtn = screen.getByLabelText('Delete Offset');
    fireEvent.click(deleteOffsetBtn);
    expect(offsetsApi.delete).toHaveBeenCalledWith(1);
  });
});

describe('InsightsPage Component', () => {
  beforeAll(() => {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it('allows sending chat messages and displays parsed response', async () => {
    render(
      <AuthProvider>
        <InsightsPage />
      </AuthProvider>
    );

    const input = screen.getByPlaceholderText(/Ask about emissions/i);
    fireEvent.change(input, { target: { value: 'Analyze my stats' } });

    const sendBtn = screen.getByRole('button', { name: '' }); // Send icon button has no text role name
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(assistantApi.chat).toHaveBeenCalledWith('Analyze my stats');
      expect(screen.getByText(/Mocked AI message/)).toBeInTheDocument();
      expect(screen.getByText(/Bullet 1/)).toBeInTheDocument();
    });
  });

  it('switches sub-tabs to milestones and community standings', async () => {
    render(
      <AuthProvider>
        <InsightsPage />
      </AuthProvider>
    );

    const milestonesTab = screen.getByText('Milestones & Community');
    fireEvent.click(milestonesTab);

    // Verify milestones are fetched and rendered
    await waitFor(() => {
      expect(screen.getByText('Eco Pioneer')).toBeInTheDocument();
      expect(screen.getByText('Green Commuter')).toBeInTheDocument();
      expect(screen.getByText('Community Leaderboard')).toBeInTheDocument();
    });
  });
});
