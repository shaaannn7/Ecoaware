// ─── TypeScript Type Specifications ────────────────────────────────────────────

/** Details profile information of the signed-in user. */
export interface User {
  id: number;
  email: string;
  name: string;
  avatarInitials: string;
  monthlyLimitKg: number;
}

/** Represents a dynamic recommendations list card. */
export interface Tip {
  id: string;
  category: 'transport' | 'energy' | 'diet' | 'waste';
  title: string;
  description: string;
  savingsKg: number;
}

/** Structure returned from successful authentication checks. */
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

/** Represents a single logged carbon expenditure. */
export interface Activity {
  id: number;
  userId: number;
  category: 'transport' | 'energy' | 'diet' | 'waste';
  description: string;
  co2Kg: number;
  date: string;
  createdAt: string;
}

/** Represents a target reduction limit threshold. */
export interface Goal {
  id: number;
  userId: number;
  title: string;
  targetCo2Kg: number;
  currentCo2Kg: number;
  deadline: string;
  status: 'active' | 'completed' | 'failed';
  createdAt: string;
}

/** Records user offset program purchases. */
export interface Offset {
  id: number;
  userId: number;
  provider: string;
  description: string;
  co2Kg: number;
  costUsd: number;
  date: string;
  createdAt: string;
}

/** Summarized overview metrics. */
export interface FootprintStats {
  totalTons: number;
  offsetTons: number;
  netTons: number;
  totalKg: number;
  offsetKg: number;
  netKg: number;
}

/** Single sector metrics for pie chart display. */
export interface BreakdownItem {
  name: string;
  category: string;
  value: number;
  kg: number;
  colorLight: string;
  colorDark: string;
}

/** Chronological historical bar chart items. */
export interface MonthlyItem {
  label: string;
  yearMonth: string;
  kg: number;
  percentage: number;
}

/** Scientific constant coefficients used to compute weights. */
export interface EmissionFactor {
  label: string;
  unit: string;
  co2PerUnit: number;
  category: 'transport' | 'energy' | 'diet' | 'waste';
}

// ─── Token Storage ────────────────────────────────────────────────────────────

// Keep tokens in memory references for high-speed lookups during requests.
let _accessToken: string | null = null;
let _refreshToken: string | null = null;

/**
 * Saves both temporary and permanent session tokens into runtime memory
 * and local storage backups respectively.
 */
export function setTokens(access: string, refresh: string) {
  _accessToken = access;
  _refreshToken = refresh;
  localStorage.setItem('refresh_token', refresh);
}

/**
 * Empties all active token variables, signing the user out.
 */
export function clearTokens() {
  _accessToken = null;
  _refreshToken = null;
  localStorage.removeItem('refresh_token');
}

/**
 * Restores session tokens from persistent localStorage storage keys.
 */
export function getStoredRefreshToken(): string | null {
  return localStorage.getItem('refresh_token');
}

// ─── Core Fetch Wrapper ───────────────────────────────────────────────────────

/**
 * Low-level API call wrapper that automatically adds Authorization headers,
 * parses JSON payloads, handles HTTP failures, and triggers automatic session refreshes.
 *
 * @param path - URL target appended to the base API path
 * @param options - Standard request configuration parameters (headers, body, method)
 * @param retry - Controls recursive execution fallback to prevent stack loops on recurring 401s.
 */
async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  retry = true
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (_accessToken) {
    headers['Authorization'] = `Bearer ${_accessToken}`;
  }

  const res = await fetch(`/api${path}`, { ...options, headers });

  // Intercept 401 Unauthorized status, indicating access token expiration.
  if (res.status === 401 && retry && _refreshToken) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      // Re-run original fetch request using the newly signed access token.
      return apiFetch<T>(path, options, false);
    } else {
      // Refresh failed or expired; drop authorization states and trigger redirect actions.
      clearTokens();
      throw new Error('SESSION_EXPIRED');
    }
  }

  // Parse server error descriptions if validation checks failed.
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ─── Refresh Token helper ─────────────────────────────────────────────────────

/**
 * Contacts token refresh routes to trade a saved refresh token for a brand new access token.
 */
async function tryRefresh(): Promise<boolean> {
  try {
    const storedRefresh = _refreshToken ?? getStoredRefreshToken();
    if (!storedRefresh) return false;
    
    const data = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: storedRefresh }),
    }).then((r) => r.json());
    
    if (data.accessToken) {
      _accessToken = data.accessToken;
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// ─── Auth API ─────────────────────────────────────────────────────────────────
export const auth = {
  register: (email: string, name: string, password: string) =>
    apiFetch<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, name, password }),
    }),

  login: (email: string, password: string) =>
    apiFetch<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () => apiFetch<{ user: User }>('/auth/me'),

  updateProfile: (data: {
    name?: string;
    email?: string;
    monthlyLimitKg?: number;
    currentPassword?: string;
    newPassword?: string;
  }) =>
    apiFetch<{ user: User }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  logout: () =>
    apiFetch<{ message: string }>('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: _refreshToken }),
    }),
};

// ─── Activities API ───────────────────────────────────────────────────────────
export const activitiesApi = {
  list: () => apiFetch<{ activities: Activity[] }>('/activities'),

  create: (data: {
    category: string;
    description: string;
    date: string;
    factorKey?: string;
    quantity?: number;
    co2Kg?: number;
  }) =>
    apiFetch<{ activity: Activity }>('/activities', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    apiFetch<{ message: string }>(`/activities/${id}`, { method: 'DELETE' }),

  emissionFactors: () =>
    apiFetch<{ factors: Record<string, EmissionFactor> }>('/activities/emission-factors'),
};

// ─── Goals API ────────────────────────────────────────────────────────────────
export const goalsApi = {
  list: () => apiFetch<{ goals: Goal[] }>('/goals'),

  create: (data: { title: string; targetCo2Kg: number; deadline: string }) =>
    apiFetch<{ goal: Goal }>('/goals', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    apiFetch<{ message: string }>(`/goals/${id}`, { method: 'DELETE' }),
};

// ─── Offsets API ──────────────────────────────────────────────────────────────
export const offsetsApi = {
  list: () => apiFetch<{ offsets: Offset[] }>('/offsets'),

  create: (data: {
    provider: string;
    description: string;
    co2Kg: number;
    costUsd: number;
    date: string;
  }) =>
    apiFetch<{ offset: Offset }>('/offsets', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    apiFetch<{ message: string }>(`/offsets/${id}`, { method: 'DELETE' }),
};

// ─── Stats API ────────────────────────────────────────────────────────────────
export const statsApi = {
  footprint: () => apiFetch<FootprintStats>('/stats/footprint'),
  breakdown: () => apiFetch<{ breakdown: BreakdownItem[]; totalKg: number }>('/stats/breakdown'),
  monthly: () => apiFetch<{ monthly: MonthlyItem[] }>('/stats/monthly'),
  recentActivities: () => apiFetch<{ activities: Activity[] }>('/stats/recent-activities'),
  tips: () => apiFetch<{ tips: Tip[] }>('/stats/tips'),
};

// ─── Assistant API ────────────────────────────────────────────────────────────
export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: 'award' | 'zap' | 'shield' | 'leaf' | 'globe' | 'sparkles';
  unlocked: boolean;
  progress: number;
  target: number;
}

export interface LeaderboardUser {
  name: string;
  netKg: number;
  isCurrentUser?: boolean;
}

export interface CommunityResponse {
  success: boolean;
  communityAverageKg: number;
  userNetKg: number;
  userRank: number;
  totalCompetitors: number;
  leaderboard: LeaderboardUser[];
}

export interface ChatResponse {
  success: boolean;
  response: string;
  timestamp: string;
}

export const assistantApi = {
  chat: (message: string) =>
    apiFetch<ChatResponse>('/assistant/chat', {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),

  badges: () => apiFetch<{ badges: Badge[] }>('/assistant/badges'),

  community: () => apiFetch<CommunityResponse>('/assistant/community'),
};


