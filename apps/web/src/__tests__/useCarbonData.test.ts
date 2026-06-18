import { renderHook, waitFor } from '@testing-library/react';
import { useCarbonData } from '../hooks/useCarbonData';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';

// Mock the API calls to avoid network requests
vi.mock('../services/api', () => ({
  statsApi: {
    footprint: vi.fn().mockResolvedValue({ totalKg: 100 }),
    breakdown: vi.fn().mockResolvedValue({ breakdown: [] }),
    monthly: vi.fn().mockResolvedValue({ monthly: [] }),
    recentActivities: vi.fn().mockResolvedValue({ activities: [] }),
    tips: vi.fn().mockResolvedValue({ tips: [] }),
  },
  goalsApi: {
    list: vi.fn().mockResolvedValue({ goals: [] }),
  },
  offsetsApi: {
    list: vi.fn().mockResolvedValue({ offsets: [] }),
  },
  activitiesApi: {
    emissionFactors: vi.fn().mockResolvedValue({ factors: {} }),
  },
}));

describe('useCarbonData Hook', () => {
  it('fetches carbon data successfully when authenticated is true', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useCarbonData(true), { wrapper });

    await waitFor(() => {
      if (result.current.isError) {
        console.error('QUERY ERROR:', result.current.error);
      }
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.footprint?.totalKg).toBe(100);
  });

  it('does not fetch carbon data when authenticated is false', () => {
    const queryClient = new QueryClient();

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useCarbonData(false), { wrapper });

    expect(result.current.isFetching).toBe(false);
  });
});
