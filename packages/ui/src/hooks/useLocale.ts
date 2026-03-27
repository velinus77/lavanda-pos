import { useState, useEffect } from 'react';
import { LOCALES, LOCALE_DIRS } from '@lavanda/shared';

const LOCALE_KEY = 'lavanda_locale';

export const useLocale = () => {
  const [locale, setLocale] = useState<'en' | 'ar'>('en');
  const [direction, setDirection] = useState<'ltr' | 'rtl'>('ltr');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Initialize from localStorage on mount
    const stored = localStorage.getItem(LOCALE_KEY) as 'en' | 'ar' | null;
    if (stored) {
      setLocale(stored);
      setDirection(LOCALE_DIRS[stored]);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    // Update localStorage and document direction
    localStorage.setItem(LOCALE_KEY, locale);
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
