'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useLocale } from '@/contexts/LocaleProvider';
import { useTheme } from '@/contexts/ThemeProvider';
import { useDashboardAccess } from '@/lib/use-dashboard-access';

const CategoryManager = dynamic(() => import('@/components/inventory/CategoryManager'), {
  loading: () => <div className="lav-data-shell min-h-[360px] animate-pulse" />,
});

export default function CategoriesPage() {
  const { locale } = useLocale();
  const { theme } = useTheme();
  const { isReady } = useDashboardAccess({ allowedRoles: ['admin', 'manager'] });

  if (!isReady) {
    return null;
  }

  const titles =
    locale === 'ar'
      ? {
          overline: 'تنظيم المخزون',
          main: 'التصنيفات',
          subtitle: 'رتّب المجموعات الدوائية والتجارية بشكل أوضح علشان الفريق يلاقي الصنف أسرع.',
          home: 'الرئيسية',
        }
      : {
          overline: 'Inventory structure',
          main: 'Categories',
          subtitle: 'Organize product groupings and keep the catalog easier to scan and manage.',
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

      <CategoryManager locale={locale} theme={theme} />
    </div>
  );
}
