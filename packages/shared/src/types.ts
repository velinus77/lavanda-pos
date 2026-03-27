// Shared types across the entire application

export interface BaseEntity {
  id: number;
  createdAt: string;
  updatedAt: string;
}

export interface User extends BaseEntity {
  username: string;
  email?: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt?: string;
}

export type UserRole = 'admin' | 'manager' | 'cashier';

// API response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiErrorShape {
  code: string;
  message: string;
  details?: Record<string, string>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Common domain types
export interface Money {
  amount: number;
  currency: string;
}

export interface NamedEntity {
  name: string;
  nameAr?: string;
}

export type Locales = 'en' | 'ar';

// UI types
export interface ThemeConfig {
  mode: 'light' | 'dark';
  primaryColor: string;
}
