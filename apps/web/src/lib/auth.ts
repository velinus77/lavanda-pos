/**
 * Frontend Authentication Library
 * Handles login, logout, token refresh, and user session management
 */

const API_BASE = '/api';
const ACCESS_TOKEN_KEY = 'lavanda_access_token';
const REFRESH_TOKEN_KEY = 'lavanda_refresh_token';
const USER_KEY = 'lavanda_user';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: 'admin' | 'manager' | 'cashier';
  language: 'ar' | 'en';
  theme: 'light' | 'dark';
  is_active: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token: string;
}

export interface AuthError {
  message: string;
  code: 'invalid_credentials' | 'account_locked' | 'network_error' | 'unknown';
  lockUntil?: string;
}

/**
 * Store tokens and user data in localStorage
 */
function setSession(user: User, accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/**
 * Clear all session data from localStorage
 */
function clearSession(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
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

/**
 * Get stored refresh token
 */
function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/**
 * Get stored user data
 */
function getStoredUser(): User | null {
  const userStr = localStorage.getItem(USER_KEY);
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
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
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    const data = await response.json();

    if (!response.ok) {
      if (data.code === 'account_locked') {
        return {
          message: data.message || 'Account is temporarily locked due to too many failed attempts',
          code: 'account_locked',
          lockUntil: data.lock_until,
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

    setSession(data.user, data.access_token, data.refresh_token);

    return {
      user: data.user,
      access_token: data.access_token,
      refresh_token: data.refresh_token,
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
  const refreshToken = getRefreshToken();
  
  if (refreshToken) {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    } catch (error) {
      console.error('Logout backend call failed:', error);
    }
  }
  
  clearSession();
}

/**
 * Refresh access token using refresh token
 */
export async function refreshToken(): Promise<{ access_token: string } | AuthError> {
  const token = getRefreshToken();
  
  if (!token) {
    return {
      message: 'No refresh token available',
      code: 'unknown',
    };
  }

  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: token }),
    });

    const data = await response.json();

    if (!response.ok) {
      clearSession();
      return {
        message: 'Session expired. Please login again.',
        code: 'invalid_credentials',
      };
    }

    localStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);

    return { access_token: data.access_token };
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
  const token = getAccessToken();
  
  if (!token) {
    return null;
  }

  try {
    const response = await fetch(`${API_BASE}/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        const refreshResult = await refreshToken();
        if ('access_token' in refreshResult) {
          const retryResponse = await fetch(`${API_BASE}/auth/me`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${refreshResult.access_token}`,
              'Content-Type': 'application/json',
            },
          });
          if (retryResponse.ok) {
            return retryResponse.json();
          }
        }
      }
      return null;
    }

    const user = await response.json();
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
