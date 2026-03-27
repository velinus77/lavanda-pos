// Shared utility functions

export const formatCurrency = (
  amount: number,
  currency: string = 'IQD',
  locale: 'en' | 'ar' = 'en'
): string => {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-IQ' : 'en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatNumber = (num: number, locale: 'en' | 'ar' = 'en'): string => {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-IQ' : 'en-US').format(num);
};

export const formatDate = (
  date: string | Date,
  locale: 'en' | 'ar' = 'en',
  options?: Intl.DateTimeFormatOptions
): string => {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };

  return new Intl.DateTimeFormat(
    locale === 'ar' ? 'ar-IQ' : 'en-US',
    options || defaultOptions
  ).format(new Date(date));
};

export const generateId = (): string => {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
};

export const debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

export const truncate = (str: string, length: number): string => {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
};

export const clamp = (num: number, min: number, max: number): number => {
  return Math.min(Math.max(num, min), max);
};

export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
