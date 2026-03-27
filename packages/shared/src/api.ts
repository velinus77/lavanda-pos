// API helper utilities

export interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
}

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const createApiUrl = (path: string): string => {
  return `${API_BASE_URL}${path}`;
};

export const fetchApi = async <T>(url: string, options: FetchOptions = {}): Promise<T> => {
  const { method = 'GET', headers = {}, body, timeout = 30000 } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(error.message || 'Request failed', response.status);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError('Request timeout', 408);
    }
    throw new ApiError('Network error', 500);
  }
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// HTTP method helpers
export const api = {
  get: <T>(url: string) => fetchApi<T>(url, { method: 'GET' }),
  post: <T>(url: string, body: unknown) => fetchApi<T>(url, { method: 'POST', body }),
  put: <T>(url: string, body: unknown) => fetchApi<T>(url, { method: 'PUT', body }),
  patch: <T>(url: string, body: unknown) => fetchApi<T>(url, { method: 'PATCH', body }),
  delete: <T>(url: string) => fetchApi<T>(url, { method: 'DELETE' }),
};
