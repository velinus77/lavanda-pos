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
    <div className="flex items-start gap-4 rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
      <div className={`h-12 w-12 flex-shrink-0 rounded-2xl flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm text-[var(--muted)]">{label}</p>
        <p className="mt-0.5 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">{value}</p>
        {alert && (
          <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-[#a06f23] dark:text-[#e3bc79]">
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
          <div className="mx-auto mb-4 h-10 w-10 rounded-full border-4 border-[var(--accent)] border-t-transparent animate-spin" />
          <p className="text-[var(--muted)]">{t.loading}</p>
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
      <div className="mb-8 overflow-hidden rounded-[30px] border border-[var(--border)] bg-[linear-gradient(135deg,rgba(255,253,248,0.98),rgba(242,237,229,0.92))] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)] dark:bg-[linear-gradient(135deg,rgba(17,26,39,0.98),rgba(13,20,32,0.98))]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--accent)]">
              Executive overview
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">{t.welcome}</h1>
            <p className="mt-2 max-w-2xl text-[var(--muted)]">{t.subtitle}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[22px] border border-[var(--border)] bg-[var(--card)] px-4 py-3 shadow-sm">
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Today</p>
              <p className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">{salesTodayValue}</p>
            </div>
            <div className="rounded-[22px] border border-[var(--border)] bg-[var(--card)] px-4 py-3 shadow-sm">
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Alerts</p>
              <p className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
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
          color="bg-[#e8edf5] text-[#35506f] dark:bg-[#1b2839] dark:text-[#9cb7d5]"
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
          color="bg-[#f2e9d9] text-[#8d6526] dark:bg-[#352718] dark:text-[#e0ba79]"
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
          color="bg-[#efe0dd] text-[#8c4d40] dark:bg-[#351c1b] dark:text-[#e6a59a]"
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
          color="bg-[#e4ece4] text-[#46614e] dark:bg-[#1a2921] dark:text-[#9cc0a2]"
          alertLabel={t.needsAttention}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      <div className="mb-4">
        <h2 className="mb-4 text-lg font-semibold tracking-[-0.02em] text-[var(--foreground)]">{t.quickLinks}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <a href="/dashboard/pos" className="group flex flex-col items-center gap-3 rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5 transition-all hover:-translate-y-0.5 hover:border-[var(--accent)] hover:shadow-[0_18px_36px_rgba(15,23,42,0.08)]">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e4ece4] text-[#46614e] transition-colors group-hover:bg-[#dce7dc] dark:bg-[#1a2921] dark:text-[#9cc0a2]">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <span className="text-center text-sm font-medium text-[var(--foreground)]">{t.goToPOS}</span>
          </a>

          <a href="/dashboard/sales" className="group flex flex-col items-center gap-3 rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5 transition-all hover:-translate-y-0.5 hover:border-[var(--accent)] hover:shadow-[0_18px_36px_rgba(15,23,42,0.08)]">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8edf5] text-[#35506f] transition-colors group-hover:bg-[#dde6f2] dark:bg-[#1b2839] dark:text-[#9cb7d5]">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <span className="text-center text-sm font-medium text-[var(--foreground)]">{t.viewSales}</span>
          </a>

          <a href="/dashboard/products" className="group flex flex-col items-center gap-3 rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5 transition-all hover:-translate-y-0.5 hover:border-[var(--accent)] hover:shadow-[0_18px_36px_rgba(15,23,42,0.08)]">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ece7dd] text-[#66573f] transition-colors group-hover:bg-[#e6dfd2] dark:bg-[#2a241c] dark:text-[#d0c0a0]">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <span className="text-center text-sm font-medium text-[var(--foreground)]">{t.manageInventory}</span>
          </a>

          <a href="/dashboard/suppliers" className="group flex flex-col items-center gap-3 rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5 transition-all hover:-translate-y-0.5 hover:border-[var(--accent)] hover:shadow-[0_18px_36px_rgba(15,23,42,0.08)]">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e5ebea] text-[#3f5d5d] transition-colors group-hover:bg-[#dbe5e3] dark:bg-[#182526] dark:text-[#96b7b8]">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <span className="text-center text-sm font-medium text-[var(--foreground)]">{t.suppliers}</span>
          </a>
        </div>
      </div>
    </div>
  );
}
