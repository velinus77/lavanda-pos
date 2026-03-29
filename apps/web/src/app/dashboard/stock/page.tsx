'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { useLocale } from '@/contexts/LocaleProvider';
import { useTheme } from '@/contexts/ThemeProvider';
import { useDashboardAccess } from '@/lib/use-dashboard-access';

const StockAdjustment = dynamic(() => import('@/components/inventory/StockAdjustment'), {
  loading: () => <div className="lav-data-shell min-h-[420px] animate-pulse" />,
});

const ExpiryMonitor = dynamic(() => import('@/components/inventory/ExpiryMonitor'), {
  loading: () => <div className="lav-data-shell min-h-[420px] animate-pulse" />,
});

export default function StockPage() {
  const { locale } = useLocale();
  const { theme } = useTheme();
  const { isReady } = useDashboardAccess({ allowedRoles: ['admin', 'manager'] });
  const [activeTab, setActiveTab] = useState<'adjustment' | 'expiry'>('adjustment');

  if (!isReady) {
    return null;
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
