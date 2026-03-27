'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCachedUser, User } from '@/lib/auth';
import { useLocale } from '@/contexts/LocaleProvider';
import { useTheme } from '@/contexts/ThemeProvider';
import SupplierManager from '@/components/inventory/SupplierManager';

export default function SuppliersPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const { theme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const isRTL = locale === 'ar';

  useEffect(() => {
    const cachedUser = getCachedUser();
    setUser(cachedUser || null);

    // Check role authorization - cashier should be redirected
    if (cachedUser) {
      if (cachedUser.role === 'cashier') {
        router.replace('/dashboard');
        return;
      }
      setIsAuthorized(true);
    } else {
      router.replace('/login');
      return;
    }

    setIsLoading(false);
  }, [router]);

  if (isLoading || !isAuthorized) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">
            {isRTL ? 'جاري التحميل...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  const pageTitles = {
    ar: {
      main: 'الموردون',
      breadcrumb: 'الرئيسية / الموردون',
    },
    en: {
      main: 'Suppliers',
      breadcrumb: 'Home / Suppliers',
    },
  };

  const titles = pageTitles[locale];

  return (
    <div>
      {/* Page header with breadcrumb */}
      <div className="mb-6">
        <nav className="text-sm text-gray-500 dark:text-gray-400 mb-2" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 rtl:space-x-reverse">
            <li>
              <a href="/dashboard" className="hover:text-gray-700 dark:hover:text-gray-300">
                {locale === 'ar' ? 'الرئيسية' : 'Home'}
              </a>
            </li>
            <li className="flex items-center">
              <svg className="w-4 h-4 mx-2 rtl:rotate-180" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-gray-900 dark:text-white font-medium">{titles.main}</span>
            </li>
          </ol>
        </nav>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{titles.main}</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {isRTL
            ? 'إدارة موردّي الصيدلية ومعلومات الاتصال'
            : 'Manage pharmacy suppliers and contact information'}
        </p>
      </div>

      {/* Supplier Manager Component */}
      <SupplierManager locale={locale} theme={theme} />
    </div>
  );
}

