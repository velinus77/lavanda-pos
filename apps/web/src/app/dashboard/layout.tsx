'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { User, getCachedUser, isAuthenticated, logout } from '@/lib/auth';
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
    const cachedUser = getCachedUser();
    const hasToken = isAuthenticated();

    if (!hasToken || !cachedUser) {
      router.replace('/login');
      return;
    }

    setUser(cachedUser);
    setIsLoading(false);
  }, [router]);

  const handleLogout = useCallback(async () => {
    await logout();
    router.replace('/login');
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="rounded-3xl border border-white/10 bg-white/5 px-8 py-7 text-center shadow-2xl shadow-emerald-950/30 backdrop-blur">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full border-4 border-emerald-400 border-t-transparent animate-spin" />
          <p className="text-sm font-medium text-slate-200">{copy.loading}</p>
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
      className={`min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.12),_transparent_32%),linear-gradient(180deg,_#f5f7fb_0%,_#eef2f7_100%)] text-slate-900 dark:bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.16),_transparent_24%),linear-gradient(180deg,_#020617_0%,_#0f172a_58%,_#111827_100%)] dark:text-slate-100 ${isRTL ? 'rtl' : 'ltr'}`}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <Sidebar user={user} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className={isRTL ? 'lg:pr-72' : 'lg:pl-72'}>
        <header className="sticky top-0 z-30 px-4 pb-4 pt-4 sm:px-6">
          <div className="rounded-[28px] border border-white/60 bg-white/80 px-4 py-4 shadow-lg shadow-slate-200/50 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70 dark:shadow-black/20 sm:px-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="mt-1 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200/80 bg-white text-slate-600 shadow-sm transition hover:border-emerald-200 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-300 dark:hover:border-emerald-500/40 dark:hover:text-emerald-300 lg:hidden"
                  aria-label={copy.openSidebar}
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>

                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-600 dark:text-emerald-300">
                    {copy.workspace}
                  </p>
                  <h1 className="truncate text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
                    {pageTitle}
                  </h1>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {user.full_name} | {user.role}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={toggleTheme}
                  className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200/80 bg-white px-3 text-sm font-medium text-slate-600 shadow-sm transition hover:border-emerald-200 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-300 dark:hover:border-emerald-500/40 dark:hover:text-emerald-300"
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
                  className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200/80 bg-white px-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-emerald-200 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-300 dark:hover:border-emerald-500/40 dark:hover:text-emerald-300"
                  aria-label={copy.languageLabel}
                >
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {locale === 'ar' ? 'EN' : 'AR'}
                  </span>
                </button>

                <div className="hidden items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-950/60 sm:flex">
                  <div className="text-right rtl:text-left">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{user.full_name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-bold text-white shadow-lg shadow-emerald-500/25">
                    {user.full_name.charAt(0).toUpperCase()}
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-rose-200/70 bg-rose-50 text-rose-600 transition hover:bg-rose-100 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20"
                  aria-label={copy.logout}
                  title={copy.logout}
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="px-4 pb-8 sm:px-6">
          <div className="rounded-[32px] border border-white/55 bg-white/72 p-4 shadow-xl shadow-slate-200/40 backdrop-blur dark:border-white/10 dark:bg-slate-900/55 dark:shadow-black/20 sm:p-6">
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
