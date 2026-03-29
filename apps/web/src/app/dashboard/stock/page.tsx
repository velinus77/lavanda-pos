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

    if (cachedUser) {
      if (cachedUser.role === 'cashier') {
        setIsLoading(false);
        router.replace('/dashboard');
        return;
      }

      setIsAuthorized(true);
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    router.replace('/login');
  }, [router]);

  if (isLoading || !isAuthorized) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[var(--action)] border-t-transparent" />
          <p className="text-[var(--muted)]">{isRTL ? 'جاري التحميل...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  const titles =
    locale === 'ar'
      ? {
          overline: 'عمليات المخزون',
          main: 'إدارة المخزون',
          subtitle: 'راجع الدُفعات، عدّل الكميات، وراقب الصلاحية من مساحة عمل واحدة أوضح.',
          home: 'الرئيسية',
          adjustment: 'تعديل المخزون',
          expiry: 'مراقبة الصلاحية',
        }
      : {
          overline: 'Inventory operations',
          main: 'Stock Management',
          subtitle: 'Adjust quantities, manage batches, and stay ahead of expiry risk from one calmer workspace.',
          home: 'Home',
          adjustment: 'Stock Adjustment',
          expiry: 'Expiry Monitor',
        };

  return (
    <div className="lav-page">
      <div className="lav-page-hero">
        <nav className="mb-4 text-sm text-[var(--muted)]" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 rtl:flex-row-reverse">
            <li>
              <a href="/dashboard" className="transition-colors hover:text-[var(--foreground)]">
                {titles.home}
              </a>
            </li>
            <li className="text-[var(--accent)]">/</li>
            <li className="font-medium text-[var(--foreground)]">{titles.main}</li>
          </ol>
        </nav>
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
          {titles.overline}
        </p>
        <h1 className="mt-2 text-[30px] font-semibold tracking-[-0.04em] text-[var(--foreground)]">
          {titles.main}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">{titles.subtitle}</p>
      </div>

      <div className="lav-command-strip border-b-0 py-0">
        <nav className="-mb-px flex gap-6 rtl:flex-row-reverse" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('adjustment')}
            className={`border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'adjustment'
                ? 'border-[var(--action)] text-[var(--action)]'
                : 'border-transparent text-[var(--muted)] hover:border-[var(--border)] hover:text-[var(--foreground)]'
            }`}
          >
            {titles.adjustment}
          </button>
          <button
            onClick={() => setActiveTab('expiry')}
            className={`border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'expiry'
                ? 'border-[var(--action)] text-[var(--action)]'
                : 'border-transparent text-[var(--muted)] hover:border-[var(--border)] hover:text-[var(--foreground)]'
            }`}
          >
            {titles.expiry}
          </button>
        </nav>
      </div>

      {activeTab === 'adjustment' ? (
        <StockAdjustment locale={locale} theme={theme} />
      ) : (
        <ExpiryMonitor locale={locale} theme={theme} />
      )}
    </div>
  );
}
