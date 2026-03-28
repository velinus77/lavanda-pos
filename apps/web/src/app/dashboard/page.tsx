'use client';

import React, { useEffect, useState } from 'react';
import { getCachedUser, User, getAuthToken } from '@/lib/auth';
import { useLocale } from '@/contexts/LocaleProvider';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

interface DashboardStats {
  totalProducts: number;
  lowStock: number;
  expiringSoon: number;
  totalSalesToday: number;
  salesTodayCount: number;
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  alert?: boolean;
  alertLabel: string;
}

function StatCard({ label, value, icon, color, alert, alertLabel }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm flex items-start gap-4">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{label}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{value}</p>
        {alert && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400 mt-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {alertLabel}
          </span>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { locale } = useLocale();
  const isRTL = locale === 'ar';

  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsError, setStatsError] = useState(false);

  useEffect(() => {
    const cachedUser = getCachedUser();
    if (cachedUser) setUser(cachedUser);

    const token = getAuthToken();
    if (!token) { setLoading(false); return; }

    fetch(`${API_BASE}/reports/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((json) => {
        if (json && !json.error) setStats(json);
        else setStatsError(true);
      })
      .catch(() => setStatsError(true))
      .finally(() => setLoading(false));
  }, []);

  const t = {
    loading: isRTL ? '\u062C\u0627\u0631\u064A \u0627\u0644\u062A\u062D\u0645\u064A\u0644...' : 'Loading...',
    welcome: isRTL ? `\u0645\u0631\u062D\u0628\u0627\u064B\u060C ${user?.full_name}` : `Welcome back, ${user?.full_name}`,
    subtitle: isRTL ? '\u0625\u0644\u064A\u0643 \u0645\u0644\u062E\u0635 \u0623\u062F\u0627\u0621 \u0627\u0644\u0635\u064A\u062F\u0644\u064A\u0629 \u0627\u0644\u064A\u0648\u0645' : "Here's an overview of your pharmacy today",
    totalProducts: isRTL ? '\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A' : 'Total Products',
    lowStock: isRTL ? '\u0645\u062E\u0632\u0648\u0646 \u0645\u0646\u062E\u0641\u0636' : 'Low Stock',
    expiringSoon: isRTL ? '\u062A\u0646\u062A\u0647\u064A \u0635\u0644\u0627\u062D\u064A\u062A\u0647\u0627 \u0642\u0631\u064A\u0628\u0627\u064B' : 'Expiring Soon',
    salesToday: isRTL ? '\u0645\u0628\u064A\u0639\u0627\u062A \u0627\u0644\u064A\u0648\u0645' : 'Sales Today',
    needsAttention: isRTL ? '\u064A\u062D\u062A\u0627\u062C \u0627\u0646\u062A\u0628\u0627\u0647\u0627\u064B' : 'Needs attention',
    statsUnavailable: isRTL ? '\u062A\u0639\u0630\u064F\u0651\u0631 \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A' : 'Stats unavailable',
    quickLinks: isRTL ? '\u0631\u0648\u0627\u0628\u0637 \u0633\u0631\u064A\u0639\u0629' : 'Quick Links',
    goToPOS: isRTL ? '\u0627\u0644\u0630\u0647\u0627\u0628 \u0625\u0644\u0649 \u0646\u0642\u0637\u0629 \u0627\u0644\u0628\u064A\u0639' : 'Go to POS',
    viewSales: isRTL ? '\u0639\u0631\u0636 \u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A' : 'View Sales',
    manageInventory: isRTL ? '\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u062E\u0632\u0648\u0646' : 'Manage Inventory',
    suppliers: isRTL ? '\u0627\u0644\u0645\u0648\u0631\u062F\u0648\u0646' : 'Suppliers',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">{t.loading}</p>
        </div>
      </div>
    );
  }

  const totalProductsValue = statsError ? '--' : (stats?.totalProducts ?? 0);
  const lowStockValue = statsError ? '--' : (stats?.lowStock ?? 0);
  const expiringSoonValue = statsError ? '--' : (stats?.expiringSoon ?? 0);
  const salesTodayValue = statsError ? '--' : `${(stats?.totalSalesToday ?? 0).toFixed(2)} EGP`;

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Welcome banner */}
      <div className="mb-8 overflow-hidden rounded-[28px] border border-emerald-100 bg-[linear-gradient(135deg,_rgba(255,255,255,0.94),_rgba(236,253,245,0.94))] p-6 shadow-lg shadow-emerald-100/50 dark:border-emerald-500/10 dark:bg-[linear-gradient(135deg,_rgba(15,23,42,0.9),_rgba(6,78,59,0.26))] dark:shadow-black/20">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-600 dark:text-emerald-300">
              Daily summary
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">{t.welcome}</h1>
            <p className="mt-2 max-w-2xl text-gray-600 dark:text-gray-300">{t.subtitle}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm dark:border-white/10 dark:bg-slate-950/30">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Today</p>
              <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">{salesTodayValue}</p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm dark:border-white/10 dark:bg-slate-950/30">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Alerts</p>
              <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
                {statsError ? '--' : (stats?.lowStock ?? 0) + (stats?.expiringSoon ?? 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard
          label={t.totalProducts}
          value={totalProductsValue}
          color="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
          alertLabel={t.needsAttention}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          }
        />
        <StatCard
          label={t.lowStock}
          value={lowStockValue}
          color="bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
          alert={!statsError && (stats?.lowStock ?? 0) > 0}
          alertLabel={t.needsAttention}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
        />
        <StatCard
          label={t.expiringSoon}
          value={expiringSoonValue}
          color="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400"
          alert={!statsError && (stats?.expiringSoon ?? 0) > 0}
          alertLabel={t.needsAttention}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />
        <StatCard
          label={t.salesToday}
          value={salesTodayValue}
          color="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400"
          alertLabel={t.needsAttention}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Quick links */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t.quickLinks}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* POS quick link */}
          <a href="/dashboard/pos" className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 flex flex-col items-center gap-3 hover:border-green-400 hover:shadow-md transition-all group">
            <div className="w-12 h-12 bg-green-50 dark:bg-green-900/30 rounded-lg flex items-center justify-center group-hover:bg-green-100 dark:group-hover:bg-green-900/50 transition-colors">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.goToPOS}</span>
          </a>

          {/* Sales */}
          <a href="/dashboard/sales" className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 flex flex-col items-center gap-3 hover:border-green-400 hover:shadow-md transition-all group">
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.viewSales}</span>
          </a>

          {/* Inventory */}
          <a href="/dashboard/products" className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 flex flex-col items-center gap-3 hover:border-green-400 hover:shadow-md transition-all group">
            <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/30 rounded-lg flex items-center justify-center group-hover:bg-purple-100 dark:group-hover:bg-purple-900/50 transition-colors">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.manageInventory}</span>
          </a>

          {/* Suppliers */}
          <a href="/dashboard/suppliers" className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 flex flex-col items-center gap-3 hover:border-green-400 hover:shadow-md transition-all group">
            <div className="w-12 h-12 bg-cyan-50 dark:bg-cyan-900/30 rounded-lg flex items-center justify-center group-hover:bg-cyan-100 dark:group-hover:bg-cyan-900/50 transition-colors">
              <svg className="w-6 h-6 text-cyan-600 dark:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.suppliers}</span>
          </a>
        </div>
      </div>
    </div>
  );
}
