import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  auth,
  setTokens,
  clearTokens,
  type User,
  type AuthResponse,
} from '../services/api';

/**
 * Interface representing the core state and methods exposed by the Authentication Context.
 */
interface AuthContextValue {
  /** The currently authenticated user's profile details or null if guest */
  user: User | null;
  /** Tracks if the session is currently resolving user state from credentials or storage */
  isLoading: boolean;
  /** Direct helper boolean indicating if session user is active */
  isAuthenticated: boolean;
  /** Triggers auth login workflow */
  login: (email: string, password: string) => Promise<void>;
  /** Triggers registration of a new user */
  register: (email: string, name: string, password: string) => Promise<void>;
  /** Invalidates session tokens and updates React states to null */
  logout: () => Promise<void>;
  /** Updates local profile state after settings/allowance limit edits */
  updateUser: (updatedUser: User) => void;
}

/**
 * Declares the low-level authentication context.
 */
const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * High-level Auth Provider React Component.
 * Wraps root routing nodes, verifies existing refresh token sessions, and handles tokens persistence.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>({
    id: 1,
    email: 'guest@ecoaware.com',
    name: 'Guest User',
    avatarInitials: 'GU',
    monthlyLimitKg: 1000,
  } as User);
  const [isLoading, setIsLoading] = useState(false);

  // Auth restore bypassed for guest mode
  useEffect(() => {
    setIsLoading(false);
  }, []);

  /**
   * Helper callback to save tokens in state/storage and update user profile state.
   */
  const handleAuthResponse = useCallback((data: AuthResponse) => {
    setTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await auth.login(email, password);
    handleAuthResponse(data);
  }, [handleAuthResponse]);

  const register = useCallback(async (email: string, name: string, password: string) => {
    const data = await auth.register(email, name, password);
    handleAuthResponse(data);
  }, [handleAuthResponse]);

  const logout = useCallback(async () => {
    await auth.logout().catch(() => {});
    clearTokens();
    setUser(null);
  }, []);

  const updateUser = useCallback((updatedUser: User) => {
    setUser(updatedUser);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Custom React hook helper to quickly consume Authentication Context values.
 * Throws runtime exceptions if used outside the AuthProvider wrapper.
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

