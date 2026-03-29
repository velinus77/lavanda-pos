'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useTheme } from '@/contexts/ThemeProvider';
import { useLocale } from '@/contexts/LocaleProvider';
import { useDashboardAccess } from '@/lib/use-dashboard-access';

const UserManager = dynamic(
  () => import('@/components/admin/UserManager').then((mod) => mod.UserManager),
  {
    loading: () => <div className="lav-data-shell min-h-[360px] animate-pulse" />,
  }
);

export default function UsersPage() {
  const { theme } = useTheme();
  const { locale } = useLocale();
  const { isReady } = useDashboardAccess({ allowedRoles: ['admin'] });

  if (!isReady) {
    return null;
  }

  const t =
    locale === 'ar'
      ? {
          overline: 'صلاحيات الفريق',
          title: 'المستخدمين',
          subtitle: 'تحكم في الأدوار والحسابات النشطة من نفس واجهة التشغيل، من غير تعقيد.',
          home: 'الرئيسية',
        }
      : {
          overline: 'Team access',
          title: 'Users',
          subtitle: 'Manage roles, account access, and operational permissions in the same design language.',
          home: 'Home',
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

      <UserManager locale={locale} theme={theme} />
    </div>
  );
}
