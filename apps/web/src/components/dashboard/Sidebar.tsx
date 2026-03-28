'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User } from '@/lib/auth';
import { useLocale } from '@/contexts/LocaleProvider';

interface SidebarProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  href: string;
  labelEn: string;
  labelAr: string;
  icon: React.ReactNode;
  allowedRoles: User['role'][];
}

const navItems: NavItem[] = [
  {
    href: '/dashboard',
    labelEn: 'Dashboard',
    labelAr: '\u0644\u0648\u062d\u0629 \u0627\u0644\u062a\u062d\u0643\u0645',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    allowedRoles: ['admin', 'manager', 'cashier'],
  },
  {
    href: '/dashboard/pos',
    labelEn: 'POS / Checkout',
    labelAr: '\u0646\u0642\u0637\u0629 \u0627\u0644\u0628\u064a\u0639',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    allowedRoles: ['admin', 'manager', 'cashier'],
  },
  {
    href: '/dashboard/products',
    labelEn: 'Products',
    labelAr: '\u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    allowedRoles: ['admin', 'manager'],
  },
  {
    href: '/dashboard/stock',
    labelEn: 'Stock',
    labelAr: '\u0627\u0644\u0645\u062e\u0632\u0648\u0646',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
    allowedRoles: ['admin', 'manager'],
  },
  {
    href: '/dashboard/categories',
    labelEn: 'Categories',
    labelAr: '\u0627\u0644\u062a\u0635\u0646\u064a\u0641\u0627\u062a',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
    ),
    allowedRoles: ['admin', 'manager'],
  },
  {
    href: '/dashboard/suppliers',
    labelEn: 'Suppliers',
    labelAr: '\u0627\u0644\u0645\u0648\u0631\u062f\u0648\u0646',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    allowedRoles: ['admin', 'manager'],
  },
  {
    href: '/dashboard/sales',
    labelEn: 'Sales',
    labelAr: '\u0627\u0644\u0645\u0628\u064a\u0639\u0627\u062a',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    allowedRoles: ['admin', 'manager'],
  },
  {
    href: '/dashboard/users',
    labelEn: 'Users',
    labelAr: '\u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645\u0648\u0646',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    allowedRoles: ['admin'],
  },
  {
    href: '/dashboard/settings',
    labelEn: 'Settings',
    labelAr: '\u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    allowedRoles: ['admin'],
  },
];

const copy = {
  en: {
    brand: 'Lavanda',
    brandSubtitle: 'Pharmacy POS',
    role: 'Role',
    closeSidebar: 'Close sidebar',
  },
  ar: {
    brand: '\u0644\u0627\u0641\u0627\u0646\u062f\u0627',
    brandSubtitle: '\u0646\u0642\u0637\u0629 \u0628\u064a\u0639 \u0627\u0644\u0635\u064a\u062f\u0644\u064a\u0629',
    role: '\u0627\u0644\u0635\u0644\u0627\u062d\u064a\u0629',
    closeSidebar: '\u0625\u063a\u0644\u0627\u0642 \u0627\u0644\u0642\u0627\u0626\u0645\u0629',
  },
} as const;

export function Sidebar({ user, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { locale } = useLocale();
  const isRTL = locale === 'ar';
  const t = copy[locale];

  const visibleItems = navItems.filter((item) => item.allowedRoles.includes(user.role));

  const sidebarClasses = `
    fixed inset-y-0 z-50 w-72 overflow-hidden border-r border-white/5 bg-[#09111d] text-[var(--sidebar-foreground)]
    shadow-[0_24px_80px_rgba(2,8,20,0.48)] transition-transform duration-300 ease-out
    lg:translate-x-0
    ${isRTL ? 'right-0 border-l border-r-0' : 'left-0'}
    ${isOpen ? 'translate-x-0' : isRTL ? 'translate-x-full' : '-translate-x-full'}
  `;

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/55 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={sidebarClasses}>
        <div className="absolute inset-0 bg-[linear-gradient(180deg,_rgba(18,26,40,0.98)_0%,_rgba(7,13,23,1)_100%)]" />
        <div className="absolute inset-y-0 right-0 w-px bg-white/10" />
        <div className="relative flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-white/8 px-5 py-6">
            <Link href="/dashboard" className="flex items-center gap-3" onClick={() => onClose()}>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#c8ab76]/25 bg-[#182235] text-lg font-extrabold tracking-[0.16em] text-[#d2ae71]">
                L
              </div>
              <div>
                <p className="text-lg font-semibold tracking-tight text-white">{t.brand}</p>
                <p className="text-xs uppercase tracking-[0.22em] text-[#b8a58b]">{t.brandSubtitle}</p>
              </div>
            </Link>

            <button
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 text-slate-300 transition hover:border-[#c8ab76]/30 hover:text-[#d2ae71] lg:hidden"
              aria-label={t.closeSidebar}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="px-5 pt-5">
            <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.28em] text-[#8f9aad]">{t.role}</p>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-[#162133] text-sm font-bold text-white">
                  {user.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{user.full_name}</p>
                  <p className="truncate text-xs text-[#97a3b8]">{user.email}</p>
                </div>
              </div>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 py-6">
            <ul className="space-y-2">
              {visibleItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => onClose()}
                      className={`group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                        isActive
                          ? 'border border-[#c8ab76]/20 bg-[#182235] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
                          : 'border border-transparent text-[#c3ccda] hover:border-white/8 hover:bg-white/[0.03] hover:text-white'
                      }`}
                    >
                      <span
                        className={`flex h-10 w-10 items-center justify-center rounded-2xl transition ${
                          isActive
                            ? 'bg-[#d2ae71]/12 text-[#d2ae71]'
                            : 'bg-white/[0.04] text-[#9eabc0] group-hover:bg-white/[0.06] group-hover:text-white'
                        }`}
                      >
                        {item.icon}
                      </span>
                      <span className="truncate">{isRTL ? item.labelAr : item.labelEn}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </aside>
    </>
  );
}
