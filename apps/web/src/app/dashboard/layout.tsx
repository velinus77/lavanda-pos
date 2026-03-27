'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { User, getCachedUser, isAuthenticated, logout } from '@/lib/auth';
import { useTheme } from '@/contexts/ThemeProvider';
import { useLocale } from '@/contexts/LocaleProvider';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggle: toggleTheme } = useTheme();
  const { locale, toggle: toggleLocale } = useLocale();
  const [user, setUser] = useState<User | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const isRTL = locale === 'ar';

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const cachedUser = getCachedUser();
      const hasToken = isAuthenticated();

      if (!hasToken || !cachedUser) {
        router.replace('/login');
        return;
      }

      setUser(cachedUser);
      setIsLoading(false);
    };

    checkAuth();
  }, [router]);

  // Handle logout
  const handleLogout = useCallback(async () => {
    await logout();
    router.replace('/login');
  }, [router]);

  // Handle language switch
  const handleLanguageSwitch = useCallback(() => {
    toggleLocale();
  }, [toggleLocale]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className={`min-h-screen bg-gray-100 dark:bg-gray-900 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <Sidebar
        user={user}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content area */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6">
            {/* Left side: Menu button + Page title */}
            <div className="flex items-center space-x-4 rtl:space-x-reverse">
              {/* Hamburger menu for mobile */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
                aria-label="Open sidebar"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {/* Page title from pathname */}
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white hidden sm:block">
                {getPageTitle(pathname, locale)}
              </h1>
            </div>

            {/* Right side: Actions */}
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
                aria-label="Toggle theme"
                title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
              >
                {theme === 'dark' ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>

              {/* Language switch */}
              <button
                onClick={handleLanguageSwitch}
                className="px-3 py-1.5 text-sm font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600"
                aria-label="Switch language"
              >
                {locale === 'ar' ? 'EN' : 'ع'}
              </button>

              {/* User menu */}
              <div className="flex items-center space-x-3 rtl:space-x-reverse ml-2 rtl:mr-2">
                <div className="hidden sm:block text-right rtl:text-left">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{user.full_name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                </div>
                <div className="w-9 h-9 bg-green-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {user.full_name.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Logout button */}
              <button
                onClick={handleLogout}
                className="ml-2 rtl:ml-0 rtl:mr-2 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                aria-label="Logout"
                title={locale === 'ar' ? 'تسجيل خروج' : 'Logout'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

/**
 * Get page title from pathname based on locale
 */
function getPageTitle(pathname: string, locale: 'ar' | 'en'): string {
  const titles: Record<string, { ar: string; en: string }> = {
    '/dashboard': { ar: 'لوحة التحكم', en: 'Dashboard' },
    '/dashboard/pos': { ar: 'نقطة البيع', en: 'POS / Checkout' },
    '/dashboard/products': { ar: 'المنتجات', en: 'Products' },
    '/dashboard/categories': { ar: 'التصنيفات', en: 'Categories' },
    '/dashboard/suppliers': { ar: 'الموردون', en: 'Suppliers' },
    '/dashboard/sales': { ar: 'سجل المبيعات', en: 'Sales History' },
    '/dashboard/stock': { ar: 'إدارة المخزون', en: 'Stock Management' },
    '/dashboard/users': { ar: 'المستخدمون', en: 'Users' },
    '/dashboard/settings': { ar: 'الإعدادات', en: 'Settings' },
  };

  // Find matching title or default to Dashboard
  for (const [path, title] of Object.entries(titles)) {
    if (pathname === path || pathname.startsWith(`${path}/`)) {
      return locale === 'ar' ? title.ar : title.en;
    }
  }

  return locale === 'ar' ? 'لوحة التحكم' : 'Dashboard';
}

