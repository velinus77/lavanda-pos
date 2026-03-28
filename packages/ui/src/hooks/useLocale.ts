import { useState, useEffect } from 'react';
import { LOCALES, LOCALE_DIRS } from '@lavanda/shared';

const LOCALE_KEY = 'lavanda_locale';

export const useLocale = () => {
  const [locale, setLocale] = useState<'en' | 'ar'>('en');
  const [direction, setDirection] = useState<'ltr' | 'rtl'>('ltr');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCALE_KEY) as 'en' | 'ar' | null;
      if (stored) {
        setLocale(stored);
        setDirection(LOCALE_DIRS[stored]);
      }
    } catch {
      // Fall back to the default locale if storage is unavailable.
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    try {
      localStorage.setItem(LOCALE_KEY, locale);
    } catch {
      // Ignore persistence failures and still apply the locale.
    }
    setDirection(LOCALE_DIRS[locale]);
    document.documentElement.setAttribute('dir', LOCALE_DIRS[locale]);
    document.documentElement.setAttribute('lang', locale);
  }, [locale, isLoaded]);

  const toggle = () => {
    setLocale((prev) => (prev === 'en' ? 'ar' : 'en'));
  };

  return {
    locale,
    isArabic: locale === 'ar',
    direction,
    toggle,
    setLocale,
    isLoaded,
  };
};
