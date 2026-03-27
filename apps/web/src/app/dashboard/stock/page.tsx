'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCachedUser } from '@/lib/auth';
import { useLocale } from '@/contexts/LocaleProvider';
import { useTheme } from '@/contexts/ThemeProvider';
import StockAdjustment from '@/components/inventory/StockAdjustment';
import ExpiryMonitor from '@/components/inventory/ExpiryMonitor';

export default function StockPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const { theme } = useTheme();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'adjustment' | 'expiry'>('adjustment');

  const isRTL = locale === 'ar';

  useEffect(() => {
    const cachedUser = getCachedUser();

    // Check role authorization - cashier should be redirected
    if (cachedUser) {
      if (cachedUser.role === 'cashier') {
        setIsLoading(false);
        router.replace('/dashboard');
        return;
      }
      setIsAuthorized(true);
      setIsLoading(false);
    } else {
      setIsLoading(false);
      router.replace('/login');
      return;
    }
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
      main: 'إدارة المخزون',
      breadcrumb: 'الرئيسية / إدارة المخزون',
    },
    en: {
      main: 'Stock Management',
      breadcrumb: 'Home / Stock Management',
    },
  };

  const tabLabels = {
    ar: {
      adjustment: 'تعديل المخزون',
      expiry: 'مراقبة الصلاحية',
    },
    en: {
      adjustment: 'Stock Adjustment',
      expiry: 'Expiry Monitor',
    },
  };

  const titles = pageTitles[locale];
  const tabs = tabLabels[locale];

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
            ? 'تعديل المخزون ومراقبة تواريخ الصلاحية'
            : 'Adjust stock levels and monitor expiry dates'}
        </p>
      </div>

      {/* Tab navigation */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-6 rtl:space-x-reverse" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('adjustment')}
            className={`
              py-3 px-1 border-b-2 font-medium text-sm transition-colors
              ${activeTab === 'adjustment'
                ? 'border-green-500 text-green-600 dark:text-green-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }
            `}
          >
            {tabs.adjustment}
          </button>
          <button
            onClick={() => setActiveTab('expiry')}
            className={`
              py-3 px-1 border-b-2 font-medium text-sm transition-colors
              ${activeTab === 'expiry'
                ? 'border-green-500 text-green-600 dark:text-green-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }
            `}
          >
            {tabs.expiry}
          </button>
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'adjustment' ? (
        <StockAdjustment locale={locale} theme={theme} />
      ) : (
        <ExpiryMonitor locale={locale} theme={theme} />
      )}
    </div>
  );
}
