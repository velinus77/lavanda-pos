// i18n package exports
import { en, type Translations as EnTranslations } from './locales/en';
import { ar, type Translations as ArTranslations } from './locales/ar';

export { en, ar };
export type { EnTranslations, ArTranslations };

export const translations = {
  en,
  ar,
} as const;

export type Locale = keyof typeof translations;
export type TranslationKey = keyof typeof en;

/**
 * Get translation by key with optional interpolation
 */
export function t(
  locale: Locale,
  section: TranslationKey,
  key: string,
  params?: Record<string, string | number>
): string {
  const sectionObj = translations[locale][section] as unknown as Record<string, string>;
  let value = sectionObj?.[key] ?? key;

  // Simple interpolation for {placeholder}
  if (params) {
    Object.entries(params).forEach(([param, val]) => {
      value = value.replace(new RegExp(`{${param}}`, 'g'), String(val));
    });
  }

  return value;
}

export type { Translations } from './locales/en';
