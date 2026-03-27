// Application-wide constants

export const APP_NAME = 'Lavanda POS';
export const APP_VERSION = '0.0.1';

export const LOCALES = {
  EN: 'en' as const,
  AR: 'ar' as const,
};

export const CURRENCIES = {
  IQD: 'IQD', // Iraqi Dinar
  USD: 'USD', // US Dollar
};

export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

export const DATE_FORMATS = {
  DISPLAY: 'yyyy-MM-dd',
  DATETIME: "yyyy-MM-dd'T'HH:mm:ss",
};

export const TIMEZONE = 'Asia/Baghdad';

export const API_ROUTES = {
  PRODUCTS: '/api/products',
  CATEGORIES: '/api/categories',
  INVENTORY: '/api/inventory',
  SALES: '/api/sales',
  USERS: '/api/users',
} as const;

export const STORAGE_KEYS = {
  THEME: 'lavanda_theme',
  LOCALE: 'lavanda_locale',
  TOKEN: 'lavanda_token',
} as const;

// RTL/LTR support
export const LOCALE_DIRS = {
  en: 'ltr' as const,
  ar: 'rtl' as const,
};
