'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useTheme } from '@/contexts/ThemeProvider';
import { useLocale } from '@/contexts/LocaleProvider';
import { useDashboardAccess } from '@/lib/use-dashboard-access';

const SettingsManager = dynamic(
  () => import('@/components/admin/SettingsManager').then((mod) => mod.SettingsManager),
  {
    loading: () => <div className="lav-data-shell min-h-[360px] animate-pulse" />,
  }
);

export default function SettingsPage() {
  const { theme } = useTheme();
  const { locale } = useLocale();
  const { isReady } = useDashboardAccess({ allowedRoles: ['admin'] });

  if (!isReady) {
    return null;
  }

  const t =
    locale === 'ar'
      ? {
          home: 'الرئيسية',
          overline: 'تشغيل النظام',
          title: 'الإعدادات',
          subtitle:
            'اضبط تفضيلات الصيدلية واللغة والضرائب وقواعد المخزون من مساحة تشغيل أوضح وأكثر هدوءًا.',
        }
      : {
          home: 'Home',
          overline: 'System operations',
          title: 'Settings',
          subtitle:
            'Manage pharmacy preferences, localization, tax defaults, and inventory rules from one calmer control surface.',
        };

  return (
    <div className="lav-page">
      <div className="lav-page-hero">
        <nav className="mb-4 text-sm text-[var(--muted)]" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 rtl:flex-row-reverse">
            <li>
              <a href="/dashboard" className="transition-colors hover:text-[var(--foreground)]">
                {t.home}
              </a>
            </li>
            <li className="text-[var(--accent)]">/</li>
            <li className="font-medium text-[var(--foreground)]">{t.title}</li>
          </ol>
        </nav>
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
          {t.overline}
        </p>
        <h1 className="mt-2 text-[30px] font-semibold tracking-[-0.04em] text-[var(--foreground)]">
          {t.title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">{t.subtitle}</p>
      </div>

      <SettingsManager locale={locale} theme={theme} />
    </div>
  );
}
