/**
 * Frontend Authentication Library
 * Handles login, logout, token refresh, and user session management
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const ACCESS_TOKEN_KEY = 'lavanda_access_token';
const USER_KEY = 'lavanda_user';

export interface User {
  id: string;
  email: string;
  username: string;
  fullName: string;
  full_name: string;
  role: 'admin' | 'manager' | 'cashier';
  isActive: boolean;
  is_active: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface AuthError {
  message: string;
  code: 'invalid_credentials' | 'account_locked' | 'network_error' | 'unknown';
  lockUntil?: string;
}

function normalizeUser(user: User): User {
  return {
    ...user,
    fullName: user.fullName ?? user.full_name,
    full_name: user.full_name ?? user.fullName,
    isActive: user.isActive ?? user.is_active,
    is_active: user.is_active ?? user.isActive,
  };
}

/**
 * Store tokens and user data in localStorage
 */
function setSession(user: User, accessToken: string): void {
  const normalizedUser = normalizeUser(user);
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify(normalizedUser));
}

/**
 * Clear all session data from localStorage
 */
function clearSession(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/**
 * Get stored access token
 */
function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getAuthToken(): string | null {
  return getAccessToken();
}

async function resolveAccessToken(): Promise<string | null> {
  const existingToken = getAccessToken();
  if (existingToken) {
    return existingToken;
  }

  const refreshResult = await refreshToken();
  if ('accessToken' in refreshResult) {
    return refreshResult.accessToken;
  }

  return null;
}

/**
 * Get stored user data
 */
function getStoredUser(): User | null {
  const userStr = localStorage.getItem(USER_KEY);
  if (!userStr) return null;
  try {
    return normalizeUser(JSON.parse(userStr));
  } catch {
    return null;
  }
}

/**
 * Login with email and password
 * Returns tokens and user info on success, or error on failure
 */
export async function login(credentials: LoginCredentials): Promise<AuthResponse | AuthError> {
  try {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    const data = await response.json();

    if (!response.ok) {
      if (data.code === 'account_locked' || response.status === 423) {
        return {
          message: data.message || 'Account is temporarily locked due to too many failed attempts',
          code: 'account_locked',
          lockUntil: data.lockUntil,
        };
      }
      if (data.code === 'invalid_credentials' || response.status === 401) {
        return {
          message: data.message || 'Invalid email or password',
          code: 'invalid_credentials',
        };
      }
      return {
        message: data.message || 'Login failed',
        code: 'unknown',
      };
    }

    setSession(data.user, data.accessToken);

    return {
      user: data.user,
      accessToken: data.accessToken,
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      message: 'Network error. Please check your connection.',
      code: 'network_error',
    };
  }
}

/**
 * Logout - clears session data and calls backend logout endpoint
 */
export async function logout(): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch (error) {
    console.error('Logout backend call failed:', error);
  }

  clearSession();
}

/**
 * Refresh access token using refresh token
 */
export async function refreshToken(): Promise<{ accessToken: string } | AuthError> {
  try {
    const response = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      clearSession();
      return {
        message: 'Session expired. Please login again.',
        code: 'invalid_credentials',
      };
    }

    localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);

    return { accessToken: data.accessToken };
  } catch (error) {
    console.error('Token refresh error:', error);
    return {
      message: 'Failed to refresh session',
      code: 'network_error',
    };
  }
}

/**
 * Get current authenticated user from /api/auth/me
 */
export async function getCurrentUser(): Promise<User | null> {
  const token = await resolveAccessToken();
  
  if (!token) {
    return null;
  }

  try {
    const response = await fetch(`${API_BASE}/api/auth/me`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        const refreshResult = await refreshToken();
        if ('accessToken' in refreshResult) {
          const retryResponse = await fetch(`${API_BASE}/api/auth/me`, {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Authorization': `Bearer ${refreshResult.accessToken}`,
              'Content-Type': 'application/json',
            },
          });
          if (retryResponse.ok) {
            const retryData = await retryResponse.json();
            const retryUser = normalizeUser(retryData.user);
            localStorage.setItem(USER_KEY, JSON.stringify(retryUser));
            return retryUser;
          }
        }
      }
      return null;
    }

    const data = await response.json();
    const user = normalizeUser(data.user);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    return user;
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
}

/**
 * Get currently stored user from localStorage
 */
export function getCachedUser(): User | null {
  return getStoredUser();
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!getAccessToken();
}

/**
 * Get stored access token for API requests
 */
export function getTokenForRequest(): string | null {
  return getAccessToken();
}

export async function authenticatedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const token = await resolveAccessToken();
  const headers = new Headers(init.headers);

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response = await fetch(input, {
    ...init,
    credentials: init.credentials ?? 'include',
    headers,
  });

  if (response.status !== 401) {
    return response;
  }

  const refreshResult = await refreshToken();
  if (!('accessToken' in refreshResult)) {
    return response;
  }

  const retryHeaders = new Headers(init.headers);
  retryHeaders.set('Authorization', `Bearer ${refreshResult.accessToken}`);

  response = await fetch(input, {
    ...init,
    credentials: init.credentials ?? 'include',
    headers: retryHeaders,
  });

  return response;
}
