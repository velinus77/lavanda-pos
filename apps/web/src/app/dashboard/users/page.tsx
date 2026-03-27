'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Metadata } from 'next';
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

      // Admin-only page
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            {locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <div>
      <UserManager locale={locale} theme={theme} />
    </div>
  );
}
