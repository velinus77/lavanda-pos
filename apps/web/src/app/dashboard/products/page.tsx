'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useLocale } from '@/contexts/LocaleProvider';
import { useTheme } from '@/contexts/ThemeProvider';
import { useDashboardAccess } from '@/lib/use-dashboard-access';

const ProductManager = dynamic(() => import('@/components/inventory/ProductManager'), {
  loading: () => <div className="lav-data-shell min-h-[420px] animate-pulse" />,
});

export default function ProductsPage() {
  const { locale } = useLocale();
  const { theme } = useTheme();
  const { isReady } = useDashboardAccess({ allowedRoles: ['admin', 'manager'] });

  if (!isReady) {
    return null;
  }

  const titles =
    locale === 'ar'
      ? {
          overline: 'كتالوج الأصناف',
          main: 'الأصناف',
          subtitle: 'راجع الأسعار والباركود وحالة المخزون من نفس الشاشة، من غير لف كتير.',
          home: 'الرئيسية',
        }
      : {
          overline: 'Catalog control',
          main: 'Products',
          subtitle: 'Manage pricing, barcodes, and stock-facing product data in the same calmer system.',
          home: 'Home',
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

      <ProductManager locale={locale} theme={theme} />
    </div>
  );
}
