'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User } from '@/lib/auth';

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
    labelAr: 'لوحة التحكم',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    allowedRoles: ['admin', 'manager', 'cashier'],
  },
  {
    href: '/dashboard/pos',
    labelEn: 'POS / Checkout',
    labelAr: 'نقطة البيع',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 36v-3m-3 3h.01M9 17h.01M9 21h5a1 1 0 001-1V3a1 1 0 00-1-1H9a1 1 0 00-1 1v16a1 1 0 001 1z" />
      </svg>
    ),
    allowedRoles: ['admin', 'manager', 'cashier'],
  },
  {
    href: '/dashboard/products',
    labelEn: 'Products',
    labelAr: 'المنتجات',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    allowedRoles: ['admin', 'manager'],
  },
  {
    href: '/dashboard/categories',
    labelEn: 'Categories',
    labelAr: 'التصنيفات',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
    ),
    allowedRoles: ['admin', 'manager'],
  },
  {
    href: '/dashboard/suppliers',
    labelEn: 'Suppliers',
    labelAr: 'الموردون',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    allowedRoles: ['admin', 'manager'],
  },
  {
    href: '/dashboard/stock',
    labelEn: 'Stock Management',
    labelAr: 'إدارة المخزون',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
    allowedRoles: ['admin', 'manager'],
  },
  {
    href: '/dashboard/users',
    labelEn: 'Users',
    labelAr: 'المستخدمون',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    allowedRoles: ['admin'],
  },
  {
    href: '/dashboard/settings',
    labelEn: 'Settings',
    labelAr: 'الإعدادات',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    allowedRoles: ['admin'],
  },
];

export function Sidebar({ user, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const isRTL = user.language === 'ar';

  const visibleItems = navItems.filter((item) =>
    item.allowedRoles.includes(user.role)
  );

  const sidebarClasses = `
    fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700
    transform transition-transform duration-300 ease-in-out
    lg:translate-x-0 lg:static lg:inset-0
    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
    ${isRTL ? 'left-auto right-0 lg:right-0' : ''}
  `;

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside className={sidebarClasses}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
            <Link href="/dashboard" className="flex items-center space-x-2 rtl:space-x-reverse">
              <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">L</span>
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                {isRTL ? 'لافندا' : 'Lavanda'}
              </span>
            </Link>
            <button
              onClick={onClose}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Close sidebar"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4">
            <ul className="space-y-1 px-3">
              {visibleItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => onClose()}
                      className={`
                        flex items-center px-3 py-2.5 rounded-lg text-sm font-medium
                        transition-colors duration-150
                        ${
                          isActive
                            ? 'bg-green-600 text-white'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }
                      `}
                    >
                      <span className={`${isRTL ? 'ml-3' : 'mr-3'}`}>{item.icon}</span>
                      {isRTL ? item.labelAr : item.labelEn}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* User role badge */}
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {isRTL ? 'الصلاحية: ' : 'Role: '}
              </span>
              <span className="ml-2 text-xs font-semibold text-green-700 dark:text-green-400 uppercase">
                {user.role}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

