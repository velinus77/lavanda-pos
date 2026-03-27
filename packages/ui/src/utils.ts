import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind classes with clsx for conditional classes
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Get direction based on locale
 */
export function getDirection(locale: 'en' | 'ar'): 'ltr' | 'rtl' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}

/**
 * Generate responsive classes with RTL awareness
 */
export function rtlAware(classes: {
  ltr: string;
  rtl: string;
  locale: 'en' | 'ar';
}): string {
  return classes.locale === 'ar' ? classes.rtl : classes.ltr;
}
