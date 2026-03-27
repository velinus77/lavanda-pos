import { useState, useEffect } from 'react';

const THEME_KEY = 'lavanda_theme';

export const useTheme = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Initialize from localStorage on mount
    const stored = localStorage.getItem(THEME_KEY) as 'light' | 'dark' | null;
    if (stored) {
      setTheme(stored);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    // Update localStorage and document class
    localStorage.setItem(THEME_KEY, theme);
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
