'use client';

import React, { createContext, useContext } from 'react';
import { useLocale as useLocaleHook } from '@lavanda/ui';

const LocaleContext = createContext<ReturnType<typeof useLocaleHook> | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const localeState = useLocaleHook();

  return (
    <LocaleContext.Provider value={localeState}>
      {children}
    </LocaleContext.Provider>
  );
}

export const useAppLocale = () => {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useAppLocale must be used within LocaleProvider');
  }
  return context;
};

/** @deprecated Use useAppLocale instead */
export const useLocale = useAppLocale;
