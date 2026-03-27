'use client';

import React, { useEffect, useState } from 'react';
import { getCachedUser, User } from '@/lib/auth';

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStock: 0,
    expiringSoon: 0,
    totalSales: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cachedUser = getCachedUser();
    if (cachedUser) {
      setUser(cachedUser);
    }

    // TODO: Fetch real stats from API
    // Simulating stats for now
    setTimeout(() => {
      setStats({
        totalProducts: 156,
        lowStock: 12,
        expiringSoon: 8,
        totalSales: 24500,
      });
      setLoading(false);
    }, 500);
  }, []);

  const isRTL = user?.language === 'ar';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">
            {isRTL ? 'جاري التحميل...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Welcome banner */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {isRTL ? `مرحباً، ${user?.full_name}` : `Welcome back, ${user?.full_name}`}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {isRTL
            ? 'إليك ملخص أداء الصيدلية اليوم'
            : "Here's an overview of your pharmacy today"}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title={isRTL ? 'إجمالي المنتجات' : 'Total Products'}
          value={stats.totalProducts.toString()}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          }
          color="blue"
        />
        <StatCard
          title={isRTL ? 'مخزون منخفض' : 'Low Stock'}
          value={stats.lowStock.toString()}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
          color="yellow"
          alert={stats.lowStock > 0}
        />
        <StatCard
          title={isRTL ? 'تنتهي قريباً' : 'Expiring Soon'}
          value={stats.expiringSoon.toString()}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color="red"
          alert={stats.expiringSoon > 0}
        />
        <StatCard
          title={isRTL ? 'إجمالي المبيعات' : 'Total Sales'}
          value={`${stats.totalSales.toLocaleString()} EGP`}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color="green"
        />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent activity */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {isRTL ? 'النشاط الأخير' : 'Recent Activity'}
          </h3>
          <div className="space-y-4">
            <ActivityItem
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              }
              title={isRTL ? 'تم إضافة منتج جديد' : 'New product added'}
              time={isRTL ? 'منذ 15 دقيقة' : '15 minutes ago'}
              color="green"
            />
            <ActivityItem
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
              title={isRTL ? 'تم تعديل المخزون' : 'Stock adjusted'}
              time={isRTL ? 'منذ ساعة واحدة' : '1 hour ago'}
              color="blue"
            />
            <ActivityItem
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              title={isRTL ? 'تمت عملية بيع' : 'Sale completed'}
              time={isRTL ? 'منذ ساعتين' : '2 hours ago'}
              color="green"
            />
          </div>
        </div>

        {/* Quick links */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {isRTL ? 'روابط سريعة' : 'Quick Links'}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <QuickLink
              href="/dashboard/pos"
              title={isRTL ? 'نقطة البيع' : 'POS System'}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 36v-3m-3 3h.01M9 17h.01M9 21h5a1 1 0 001-1V3a1 1 0 00-1-1H9a1 1 0 00-1 1v16a1 1 0 001 1z" />
                </svg>
              }
              color="green"
            />
            <QuickLink
              href="/dashboard/products"
              title={isRTL ? 'المنتجات' : 'Products'}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              }
              color="blue"
            />
            <QuickLink
              href="/dashboard/stock"
              title={isRTL ? 'المخزون' : 'Stock'}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              }
              color="yellow"
            />
            <QuickLink
              href="/dashboard/users"
              title={isRTL ? 'المستخدمون' : 'Users'}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              }
              color="purple"
              allowedRoles={['admin']}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: 'blue' | 'yellow' | 'red' | 'green';
  alert?: boolean;
}

function StatCard({ title, value, icon, color, alert }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    yellow: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
    red: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
      {alert && (
        <div className="mt-3 flex items-center text-sm text-red-600 dark:text-red-400">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span>Needs attention</span>
        </div>
      )}
    </div>
  );
}

interface ActivityItemProps {
  icon: React.ReactNode;
  title: string;
  time: string;
  color: 'green' | 'blue' | 'red' | 'yellow';
}

function ActivityItem({ icon, title, time, color }: ActivityItemProps) {
  const colorClasses = {
    green: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30',
    blue: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30',
    red: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30',
    yellow: 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30',
  };

  return (
    <div className="flex items-center space-x-3 rtl:space-x-reverse">
      <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900 dark:text-white">{title}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{time}</p>
      </div>
    </div>
  );
}

interface QuickLinkProps {
  href: string;
  title: string;
  icon: React.ReactNode;
  color: 'green' | 'blue' | 'yellow' | 'purple';
  allowedRoles?: string[];
}

function QuickLink({ href, title, icon, color, allowedRoles }: QuickLinkProps) {
  const user = getCachedUser();
  
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return null;
  }

  const colorClasses = {
    green: 'hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 dark:text-green-400',
    blue: 'hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    yellow: 'hover:bg-yellow-50 dark:hover:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400',
    purple: 'hover:bg-purple-50 dark:hover:bg-purple-900/20 text-purple-600 dark:text-purple-400',
  };

  return (
    <a
      href={href}
      className={`flex flex-col items-center justify-center p-4 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors ${colorClasses[color]}`}
    >
      <div className="mb-2">{icon}</div>
      <span className="text-sm font-medium text-center">{title}</span>
    </a>
  );
}

