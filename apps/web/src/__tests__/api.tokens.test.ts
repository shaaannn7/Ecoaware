/**
 * Unit tests for the token management utilities in services/api.ts.
 *
 * These functions manage in-memory and localStorage-backed auth token state.
 *
 * We mock `localStorage` using a Map-backed stub so these tests run in any
 * environment without requiring jsdom or a browser context. The token logic
 * under test only calls getItem / setItem / removeItem on localStorage.
 *
 * Covered:
 *  - setTokens writes the refresh token to localStorage
 *  - clearTokens removes the refresh token from localStorage
 *  - getStoredRefreshToken reads back the stored token correctly
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── Stub localStorage with an in-memory Map ───────────────────────────────────
// This avoids any dependency on jsdom or the browser environment.
const localStorageStub = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

vi.stubGlobal('localStorage', localStorageStub);

// Import AFTER stubbing globals so the module captures the stubbed localStorage.
const { setTokens, clearTokens, getStoredRefreshToken } = await import('../services/api.js');

beforeEach(() => {
  localStorageStub.clear();
  // Also clear the in-memory _accessToken/_refreshToken module-level variables.
  clearTokens();
});

describe('setTokens', () => {
  it('persists the refresh token in localStorage', () => {
    setTokens('access-abc', 'refresh-xyz');
    expect(localStorageStub.getItem('refresh_token')).toBe('refresh-xyz');
  });

  it('overwrites any previously stored refresh token', () => {
    setTokens('access-1', 'refresh-old');
    setTokens('access-2', 'refresh-new');
    expect(localStorageStub.getItem('refresh_token')).toBe('refresh-new');
  });
});

describe('clearTokens', () => {
  it('removes the refresh token from localStorage', () => {
    setTokens('access-abc', 'refresh-xyz');
    clearTokens();
    expect(localStorageStub.getItem('refresh_token')).toBeNull();
  });

  it('is safe to call even when no token has been set', () => {
    expect(() => clearTokens()).not.toThrow();
    expect(localStorageStub.getItem('refresh_token')).toBeNull();
  });
});

describe('getStoredRefreshToken', () => {
  it('returns the token previously saved via setTokens', () => {
    setTokens('access-abc', 'refresh-xyz');
    expect(getStoredRefreshToken()).toBe('refresh-xyz');
  });

  it('returns null when no token has been stored', () => {
    expect(getStoredRefreshToken()).toBeNull();
  });

  it('returns null after tokens are cleared', () => {
    setTokens('access-abc', 'refresh-xyz');
    clearTokens();
    expect(getStoredRefreshToken()).toBeNull();
  });
});
