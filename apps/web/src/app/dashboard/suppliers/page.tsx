'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCachedUser } from '@/lib/auth';
import { useLocale } from '@/contexts/LocaleProvider';
import { useTheme } from '@/contexts/ThemeProvider';
import SupplierManager from '@/components/inventory/SupplierManager';

export default function SuppliersPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const { theme } = useTheme();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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
    } else {
      setIsLoading(false);
      router.replace('/login');
    }
  }, [router]);

  if (isLoading || !isAuthorized) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[var(--action)] border-t-transparent" />
          <p className="text-[var(--muted)]">{locale === 'ar' ? 'جارٍ التحميل...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  const titles =
    locale === 'ar'
      ? {
          overline: 'شبكة التوريد',
          main: 'الموردين',
          subtitle: 'خلّي بيانات الموردين وطرق التواصل معاهم متجمعة وواضحة قدام الفريق.',
          home: 'الرئيسية',
        }
      : {
          overline: 'Supply network',
          main: 'Suppliers',
          subtitle: 'Keep supplier records, contacts, and status in one clearer operational view.',
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

      <SupplierManager locale={locale} theme={theme} />
    </div>
  );
}
