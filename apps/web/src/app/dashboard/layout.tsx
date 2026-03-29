'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { User, getCachedUser, getCurrentUser, isAuthenticated, logout } from '@/lib/auth';
import { useTheme } from '@/contexts/ThemeProvider';
import { useLocale } from '@/contexts/LocaleProvider';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const pageTitles: Record<string, { ar: string; en: string }> = {
  '/dashboard': { ar: '\u0644\u0648\u062d\u0629 \u0627\u0644\u062a\u062d\u0643\u0645', en: 'Dashboard' },
  '/dashboard/pos': { ar: '\u0646\u0642\u0637\u0629 \u0627\u0644\u0628\u064a\u0639', en: 'POS / Checkout' },
  '/dashboard/products': { ar: '\u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a', en: 'Products' },
  '/dashboard/categories': { ar: '\u0627\u0644\u062a\u0635\u0646\u064a\u0641\u0627\u062a', en: 'Categories' },
  '/dashboard/suppliers': { ar: '\u0627\u0644\u0645\u0648\u0631\u062f\u0648\u0646', en: 'Suppliers' },
  '/dashboard/sales': { ar: '\u0633\u062c\u0644 \u0627\u0644\u0645\u0628\u064a\u0639\u0627\u062a', en: 'Sales History' },
  '/dashboard/stock': { ar: '\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0645\u062e\u0632\u0648\u0646', en: 'Stock Management' },
  '/dashboard/users': { ar: '\u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645\u0648\u0646', en: 'Users' },
  '/dashboard/settings': { ar: '\u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a', en: 'Settings' },
};

const shellCopy = {
  en: {
    loading: 'Loading workspace...',
    workspace: 'Pharmacy operations',
    themeLabel: 'Theme',
    languageLabel: 'Language',
    lightMode: 'Light mode',
    darkMode: 'Dark mode',
    logout: 'Logout',
    openSidebar: 'Open sidebar',
  },
  ar: {
    loading: '\u062c\u0627\u0631\u064a \u062a\u062d\u0645\u064a\u0644 \u0648\u0627\u062c\u0647\u0629 \u0627\u0644\u0639\u0645\u0644...',
    workspace: '\u062a\u0634\u063a\u064a\u0644 \u0627\u0644\u0635\u064a\u062f\u0644\u064a\u0629',
    themeLabel: '\u0627\u0644\u0645\u0638\u0647\u0631',
    languageLabel: '\u0627\u0644\u0644\u063a\u0629',
    lightMode: '\u0648\u0636\u0639 \u0641\u0627\u062a\u062d',
    darkMode: '\u0648\u0636\u0639 \u062f\u0627\u0643\u0646',
    logout: '\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062e\u0631\u0648\u062c',
    openSidebar: '\u0641\u062a\u062d \u0627\u0644\u0642\u0627\u0626\u0645\u0629',
  },
} as const;

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggle: toggleTheme } = useTheme();
  const { locale, toggle: toggleLocale } = useLocale();
  const [user, setUser] = useState<User | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const isRTL = locale === 'ar';
  const copy = shellCopy[locale];

  useEffect(() => {
    let cancelled = false;

    const initializeSession = async () => {
      const cachedUser = getCachedUser();
      const hasToken = isAuthenticated();

      if (cachedUser && hasToken) {
        if (!cancelled) {
          setUser(cachedUser);
          setIsLoading(false);
        }
        return;
      }

      const restoredUser = await getCurrentUser();

      if (cancelled) {
        return;
      }

      if (restoredUser) {
        setUser(restoredUser);
        setIsLoading(false);
        return;
      }

      setIsLoading(false);
      router.replace('/login');
    };

    void initializeSession();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleLogout = useCallback(async () => {
    await logout();
    router.replace('/login');
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
        <div className="rounded-[28px] border border-[var(--border)] bg-[var(--card)] px-8 py-7 text-center shadow-[0_24px_60px_rgba(15,23,42,0.08)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.28)]">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full border-4 border-[var(--accent)] border-t-transparent animate-spin" />
          <p className="text-sm font-medium text-[var(--foreground)]">{copy.loading}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const pageTitle = getPageTitle(pathname, locale);

  return (
    <div
      className={`min-h-screen bg-[var(--background)] text-[var(--foreground)] ${isRTL ? 'rtl' : 'ltr'}`}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="fixed inset-x-0 top-0 h-64 bg-[linear-gradient(180deg,rgba(156,122,69,0.08),transparent)] dark:bg-[linear-gradient(180deg,rgba(184,148,90,0.10),transparent)]" aria-hidden="true" />
      <Sidebar user={user} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className={`relative ${isRTL ? 'lg:pr-72' : 'lg:pl-72'}`}>
        <header className="sticky top-0 z-30 border-b border-[color:color-mix(in_srgb,var(--border)_70%,transparent)] bg-[color:color-mix(in_srgb,var(--background)_84%,transparent)] px-4 py-4 backdrop-blur sm:px-6">
          <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="mt-1 inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent-strong)] lg:hidden"
                  aria-label={copy.openSidebar}
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>

                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
                    {copy.workspace}
                  </p>
                  <h1 className="truncate text-[28px] font-semibold tracking-[-0.04em] text-[var(--foreground)]">
                    {pageTitle}
                  </h1>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {user.full_name} | {user.role}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={toggleTheme}
                  className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-medium text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent-strong)]"
                  aria-label={copy.themeLabel}
                  title={theme === 'dark' ? copy.lightMode : copy.darkMode}
                >
                  {theme === 'dark' ? (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  )}
                  <span className="hidden sm:inline">{theme === 'dark' ? copy.lightMode : copy.darkMode}</span>
                </button>

                <button
                  onClick={toggleLocale}
                  className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent-strong)]"
                  aria-label={copy.languageLabel}
                >
                  <span className="rounded-full border border-[var(--border)] bg-[var(--card)] px-2 py-0.5 text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
                    {locale === 'ar' ? 'EN' : 'AR'}
                  </span>
                </button>

                <div className="hidden items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 sm:flex">
                  <div className="text-right rtl:text-left">
                    <p className="text-sm font-semibold text-[var(--foreground)]">{user.full_name}</p>
                    <p className="text-xs text-[var(--muted)]">{user.email}</p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-strong)] text-sm font-bold text-[var(--accent-strong)]">
                    {user.full_name.charAt(0).toUpperCase()}
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-[var(--danger)] transition hover:border-[color:color-mix(in_srgb,var(--danger)_55%,transparent)] hover:bg-[var(--danger-soft)]"
                  aria-label={copy.logout}
                  title={copy.logout}
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            </div>
        </header>

        <main className="px-4 pb-8 sm:px-6">
          <div className="rounded-[var(--radius-shell)] border border-[color:color-mix(in_srgb,var(--border)_72%,transparent)] bg-[color:color-mix(in_srgb,var(--card)_94%,transparent)] p-4 shadow-[0_18px_44px_rgba(15,23,42,0.05)] backdrop-blur sm:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function getPageTitle(pathname: string, locale: 'ar' | 'en'): string {
  for (const [path, title] of Object.entries(pageTitles)) {
    if (pathname === path || pathname.startsWith(`${path}/`)) {
      return locale === 'ar' ? title.ar : title.en;
    }
  }

  return locale === 'ar' ? pageTitles['/dashboard'].ar : pageTitles['/dashboard'].en;
}
