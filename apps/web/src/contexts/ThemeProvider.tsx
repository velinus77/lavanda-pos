'use client';

import React, { createContext, useContext } from 'react';
import { useTheme as useThemeHook } from '@lavanda/ui';

const ThemeContext = createContext<ReturnType<typeof useThemeHook> | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const themeState = useThemeHook();

  if (!themeState.isLoaded) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <ThemeContext.Provider value={themeState}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useAppTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within ThemeProvider');
  }
  return context;
};
