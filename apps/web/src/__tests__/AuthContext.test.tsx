/**
 * Unit tests for the AuthContext and useAuth hook.
 *
 * Verifies that:
 *  - useAuth throws when used outside AuthProvider
 *  - Provider initializes with the guest user
 *  - isAuthenticated reflects user state
 *  - login/register/logout/updateUser work correctly
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { AuthProvider, useAuth } from '../contexts/AuthContext.js';

// Mock the api service so no real network calls are made
vi.mock('../services/api.js', () => ({
  auth: {
    login: vi.fn().mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: {
        id: 99,
        email: 'alex@ecoaware.com',
        name: 'Alex',
        avatarInitials: 'AL',
        monthlyLimitKg: 1000,
      },
    }),
    register: vi.fn().mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: {
        id: 100,
        email: 'new@ecoaware.com',
        name: 'New User',
        avatarInitials: 'NU',
        monthlyLimitKg: 1000,
      },
    }),
    logout: vi.fn().mockResolvedValue({ message: 'Logged out successfully' }),
  },
  setTokens: vi.fn(),
  clearTokens: vi.fn(),
  getStoredRefreshToken: vi.fn().mockReturnValue(null),
}));

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(AuthProvider, null, children);

describe('useAuth', () => {
  it('throws when used outside AuthProvider', () => {
    // Suppress React error boundary noise
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth must be used within AuthProvider'
    );
  });

  it('initializes with the guest user', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.user).not.toBeNull();
    expect(result.current.user?.email).toBe('guest@ecoaware.com');
  });

  it('isAuthenticated is true when user exists', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('isLoading starts as false', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isLoading).toBe(false);
  });

  it('login updates user state', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await result.current.login('alex@ecoaware.com', 'password123');
    });
    expect(result.current.user?.email).toBe('alex@ecoaware.com');
    expect(result.current.user?.id).toBe(99);
  });

  it('register updates user state with new user', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await result.current.register('new@ecoaware.com', 'New User', 'password123');
    });
    expect(result.current.user?.email).toBe('new@ecoaware.com');
  });

  it('logout sets user to null', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await result.current.logout();
    });
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('updateUser updates the user state', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    const updatedUser = {
      id: 1,
      email: 'updated@ecoaware.com',
      name: 'Updated Name',
      avatarInitials: 'UN',
      monthlyLimitKg: 800,
    };
    act(() => {
      result.current.updateUser(updatedUser);
    });
    expect(result.current.user?.email).toBe('updated@ecoaware.com');
  });
});
