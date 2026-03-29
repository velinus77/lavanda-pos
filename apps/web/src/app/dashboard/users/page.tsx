'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserManager } from '@/components/admin/UserManager';
import { getCachedUser } from '@/lib/auth';
import { useTheme } from '@/contexts/ThemeProvider';
import { useLocale } from '@/contexts/LocaleProvider';

export default function UsersPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const { locale } = useLocale();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuthorization = () => {
      const user = getCachedUser();

      if (!user) {
        router.replace('/login');
        return;
      }

      if (user.role !== 'admin') {
        router.replace('/dashboard');
        return;
      }

      setIsAuthorized(true);
      setIsLoading(false);
    };

    checkAuthorization();
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[var(--action)] border-t-transparent" />
          <p className={`text-sm ${theme === 'dark' ? 'text-[var(--muted)]' : 'text-[var(--muted)]'}`}>
            {locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  const t =
    locale === 'ar'
      ? {
          overline: 'صلاحيات الفريق',
          title: 'المستخدمون',
          subtitle: 'تحكم في الأدوار والحسابات النشطة من نفس لغة الواجهة التشغيلية.',
          home: 'الرئيسية',
        }
      : {
          overline: 'Team access',
          title: 'Users',
          subtitle: 'Manage roles, account access, and operational permissions in the same design language.',
          home: 'Home',
        };

  return (
    <div className="space-y-6">
      <div className="rounded-[var(--radius-xl)] border border-[color:color-mix(in_srgb,var(--accent)_18%,transparent)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--accent)_10%,var(--card)_90%),color-mix(in_srgb,var(--surface)_86%,transparent))] p-6 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
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
