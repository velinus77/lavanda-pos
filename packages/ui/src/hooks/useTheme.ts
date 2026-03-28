import { useState, useEffect } from 'react';

const THEME_KEY = 'lavanda_theme';

export const useTheme = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(THEME_KEY) as 'light' | 'dark' | null;
      if (stored) {
        setTheme(stored);
      } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setTheme('dark');
      }
    } catch {
      // Fall back to the default theme if storage is unavailable.
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Ignore persistence failures and still apply the theme.
    }
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme, isLoaded]);

  const toggle = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return {
    theme,
    isDark: theme === 'dark',
    toggle,
    setTheme,
    isLoaded,
  };
};
