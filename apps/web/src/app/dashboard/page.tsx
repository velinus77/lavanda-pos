'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { authenticatedFetch, getCachedUser, User } from '@/lib/auth';
import { useLocale } from '@/contexts/LocaleProvider';

const RAW_API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const API_BASE = RAW_API_BASE.endsWith('/api') ? RAW_API_BASE : `${RAW_API_BASE}/api`;

interface DashboardOverview {
  summary: {
    totalProducts: number;
    lowStock: number;
    expiringSoon: number;
    totalSalesToday: number;
    salesTodayCount: number;
    averageBasket: number;
    bestSalesDay: {
      date: string;
      total: number;
      transactions: number;
    } | null;
  };
  actionQueue: Array<{
    id: string;
    level: 'warning' | 'danger' | 'info';
    title: string;
    description: string;
    href: string;
    cta: string;
  }>;
  insights: {
    topProducts: Array<{
      productId: string;
      productName: string;
      revenue: number;
      quantity: number;
    }>;
    slowMovers: Array<{
      productId: string;
      productName: string;
      minStockLevel: number;
    }>;
    lowStockProducts: Array<{
      productId: string;
      productName: string;
      currentQuantity: number;
      minStockLevel: number;
      shortage: number;
      isControlled: boolean;
    }>;
    expiringSoon: Array<{
      productId: string;
      productName: string;
      batchId: string;
      batchNumber: string;
      quantity: number;
      expiryDate: string;
      daysUntilExpiry: number;
    }>;
    paymentMix: Array<{
      paymentMethod: string;
      total: number;
      transactions: number;
    }>;
    currencyMix: Array<{
      currency: string;
      total: number;
      transactions: number;
    }>;
    controlledProductsAtRisk: Array<{
      id: string;
      name: string;
    }>;
  };
  exchangeStatus: {
    source: string;
    updatedAt: string | null;
    stale: boolean;
    offlineMode: boolean;
    trackedCurrencies: string[];
  };
  rolePlaybook: Array<{
    title: string;
    description: string;
    href: string;
  }>;
}

function formatCurrency(value: number, locale: string) {
  if (locale === 'ar') {
    return `${value.toLocaleString('ar-EG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ج.م`;
  }

  return `${value.toFixed(2)} EGP`;
}

function formatDate(value: string, locale: string) {
  return new Date(value).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatPaymentMethod(method: string, locale: string) {
  if (locale !== 'ar') return method;

  const labels: Record<string, string> = {
    cash: 'كاش',
    card: 'كارت',
    transfer: 'تحويل',
    mixed: 'مختلط',
  };

  return labels[method] ?? method;
}

function getLocalizedAction(
  item: DashboardOverview['actionQueue'][number],
  isArabic: boolean
) {
  if (!isArabic) return item;

  const translations: Record<string, { title: string; cta: string; description: string }> = {
    'low-stock': {
      title: 'فيه أصناف محتاجة طلب شراء',
      cta: 'افتح شاشة المخزون',
      description: item.description.replace('is at', 'فاضل منه').replace('units.', 'وحدة.'),
    },
    'expiry-risk': {
      title: 'فيه باتشات قربت تنتهي',
      cta: 'راجع الصلاحيات',
      description: item.description.replace('expires in', 'هتنتهي بعد').replace('days.', 'يوم.'),
    },
    'exchange-rates': {
      title: 'أسعار الصرف محتاجة متابعة',
      cta: 'راجع العملات',
      description: item.description
        .replace('Last updated', 'آخر تحديث')
        .replace(
          'Manual confirmation is recommended before foreign-currency checkout.',
          'يفضل تراجع السعر يدوي قبل أي عملية بعملة أجنبية.'
        ),
    },
    'slow-movers': {
      title: 'فيه أصناف ما اتحركتش الأسبوع ده',
      cta: 'راجع الأصناف',
      description: item.description.replace(
        'may be tying up shelf space.',
        'ممكن يكون واخد مكان على الرف من غير حركة.'
      ),
    },
  };

  return translations[item.id] ? { ...item, ...translations[item.id] } : item;
}

function getLocalizedRolePlaybook(
  item: DashboardOverview['rolePlaybook'][number],
  isArabic: boolean
) {
  if (!isArabic) return item;

  const byHref: Record<string, { title: string; description: string }> = {
    '/dashboard/settings': {
      title: 'صحة النظام',
      description: 'راجع المستخدمين، وتأكد إن أسعار الصرف محدثة، وتابع التنبيهات التشغيلية.',
    },
    '/dashboard/sales': {
      title: 'متابعة المبيعات',
      description: 'افتح التحليلات وشوف أقوى الأيام، وأكتر الأصناف حركة، وأنسب طرق الدفع.',
    },
    '/dashboard/stock': {
      title: 'أولوية المخزون',
      description: 'ابدأ بالنواقص، وتواريخ الصلاحية القريبة، والأصناف اللي محتاجة متابعة مع الموردين.',
    },
    '/dashboard/products': {
      title: 'مراجعة الأصناف',
      description: 'راجع السريع في البيع، والبطيء في الحركة، وجودة التسعير على الرف.',
    },
    '/dashboard/pos': {
      title: 'بيع سريع',
      description: 'ابدأ فاتورة جديدة، وامسح الباركود بسرعة، واطبع الإيصال من غير تعطيل.',
    },
  };

  return byHref[item.href] ? { ...item, ...byHref[item.href] } : item;
}

function StatCard({
  label,
  value,
  helper,
  tone,
  icon,
}: {
  label: string;
  value: string | number;
  helper?: string;
  tone: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4 rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
      <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl ${tone}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm text-[var(--muted)]">{label}</p>
        <p className="mt-0.5 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">{value}</p>
        {helper && <p className="mt-1 text-xs text-[var(--muted)]">{helper}</p>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { locale } = useLocale();
  const isArabic = locale === 'ar';

  const [user, setUser] = useState<User | null>(null);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const cachedUser = getCachedUser();
    if (cachedUser) setUser(cachedUser);

    authenticatedFetch(`${API_BASE}/dashboard/overview`)
      .then((response) => response.json())
      .then((json) => {
        if (json && !json.error) {
          setOverview(json);
        } else {
          setHasError(true);
        }
      })
      .catch(() => setHasError(true))
      .finally(() => setLoading(false));
  }, []);

  const t = useMemo(
    () => ({
      loading: isArabic ? 'جاري تحميل مركز التشغيل...' : 'Loading command center...',
      heroOverline: isArabic ? 'مركز التشغيل' : 'Command center',
      welcome: isArabic ? `أهلاً، ${user?.full_name ?? ''}` : `Welcome back, ${user?.full_name ?? 'team'}`,
      subtitle: isArabic
        ? 'ابدأ بالحاجات اللي محتاجة تدخل دلوقتي، وبعدها روح مباشرة للشغل اللي يهمك.'
        : 'Start with what needs attention now, then jump straight into the right workflow.',
      todayRevenue: isArabic ? 'مبيعات النهارده' : 'Revenue today',
      transactions: isArabic ? 'عدد العمليات' : 'Transactions',
      avgBasket: isArabic ? 'متوسط الفاتورة' : 'Average basket',
      bestDay: isArabic ? 'أقوى يوم الأسبوع ده' : 'Best day this week',
      totalProducts: isArabic ? 'الأصناف النشطة' : 'Active products',
      lowStock: isArabic ? 'أصناف ناقصة' : 'Low stock',
      expiringSoon: isArabic ? 'قربت تنتهي' : 'Expiring soon',
      actionQueue: isArabic ? 'محتاج تدخل دلوقتي' : 'Needs action now',
      topProducts: isArabic ? 'أكتر الأصناف مبيعاً' : 'Top products',
      lowStockList: isArabic ? 'قائمة إعادة الطلب' : 'Reorder queue',
      expiryWatch: isArabic ? 'متابعة الصلاحية' : 'Expiry watch',
      paymentMix: isArabic ? 'توزيع طرق الدفع' : 'Payment mix',
      rolePlaybook: isArabic ? 'أولويات شغلك' : 'Your operating focus',
      noActions: isArabic ? 'مافيش تنبيهات عاجلة دلوقتي' : 'No urgent actions right now',
      noData: isArabic ? 'تعذر تحميل بيانات مركز التشغيل' : 'Failed to load dashboard overview',
      units: isArabic ? 'وحدة' : 'units',
      days: isArabic ? 'يوم' : 'days',
      sales: isArabic ? 'عملية' : 'sales',
      trackedCurrencies: isArabic ? 'العملات المتابعة' : 'Tracked currencies',
      exchangeHealth: isArabic ? 'حالة أسعار الصرف' : 'Exchange-rate health',
      offlineMode: isArabic ? 'شغال بآخر سعر محفوظ' : 'Offline mode',
      staleRates: isArabic ? 'محتاج تحديث' : 'Needs refresh',
      liveRates: isArabic ? 'محدثة' : 'Live / fresh',
      slowMovers: isArabic ? 'أصناف بطيئة الحركة' : 'Slow movers',
      controlledRisk: isArabic ? 'أدوية رقابية محتاجة متابعة' : 'Controlled products at risk',
      paymentTypes: isArabic ? 'طرق دفع' : 'payment types',
      controlled: isArabic ? 'رقابي' : 'Controlled',
      minLevel: isArabic ? 'الحد الأدنى' : 'Min level',
      urgent: isArabic ? 'عاجل' : 'danger',
      warning: isArabic ? 'تنبيه' : 'warning',
      info: isArabic ? 'معلومة' : 'info',
    }),
    [isArabic, user]
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[var(--accent)] border-t-transparent" />
          <p className="text-[var(--muted)]">{t.loading}</p>
        </div>
      </div>
    );
  }

  if (hasError || !overview) {
    return (
      <div className="lav-data-shell flex items-center justify-center px-6 py-16" dir={isArabic ? 'rtl' : 'ltr'}>
        <p className="text-sm text-[var(--danger)]">{t.noData}</p>
      </div>
    );
  }

  const exchangeTone = overview.exchangeStatus.offlineMode
    ? 'text-[var(--danger)]'
    : overview.exchangeStatus.stale
      ? 'text-[var(--warning)]'
      : 'text-[var(--action)]';

  return (
    <div dir={isArabic ? 'rtl' : 'ltr'} className="lav-page">
      <div className="lav-page-hero">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--accent)]">{t.heroOverline}</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">{t.welcome}</h1>
            <p className="mt-2 max-w-2xl text-[var(--muted)]">{t.subtitle}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[22px] border border-[var(--border)] bg-[var(--card)] px-4 py-3 shadow-sm">
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">{t.bestDay}</p>
              <p className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
                {overview.summary.bestSalesDay ? formatCurrency(overview.summary.bestSalesDay.total, locale) : '--'}
              </p>
              {overview.summary.bestSalesDay && (
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {formatDate(overview.summary.bestSalesDay.date, locale)} • {overview.summary.bestSalesDay.transactions} {t.sales}
                </p>
              )}
            </div>
            <div className="rounded-[22px] border border-[var(--border)] bg-[var(--card)] px-4 py-3 shadow-sm">
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">{t.exchangeHealth}</p>
              <p className={`mt-2 text-xl font-semibold tracking-[-0.03em] ${exchangeTone}`}>
                {overview.exchangeStatus.offlineMode
                  ? t.offlineMode
                  : overview.exchangeStatus.stale
                    ? t.staleRates
                    : t.liveRates}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {t.trackedCurrencies}: {overview.exchangeStatus.trackedCurrencies.join(', ')}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t.todayRevenue}
          value={formatCurrency(overview.summary.totalSalesToday, locale)}
          helper={`${overview.summary.salesTodayCount} ${t.sales}`}
          tone="bg-[#e4ece4] text-[#46614e] dark:bg-[#1a2921] dark:text-[#9cc0a2]"
          icon={<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V7m0 1v8m0 0v1m0-1a3.001 3.001 0 01-2.599-1.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          label={t.transactions}
          value={overview.summary.salesTodayCount}
          helper={overview.summary.bestSalesDay ? formatDate(overview.summary.bestSalesDay.date, locale) : undefined}
          tone="bg-[#e8edf5] text-[#35506f] dark:bg-[#1b2839] dark:text-[#9cb7d5]"
          icon={<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 5a2 2 0 002 2h2a2 2 0 002-2" /></svg>}
        />
        <StatCard
          label={t.avgBasket}
          value={formatCurrency(overview.summary.averageBasket, locale)}
          helper={`${overview.insights.paymentMix.length} ${t.paymentTypes}`}
          tone="bg-[#ece7dd] text-[#66573f] dark:bg-[#2a241c] dark:text-[#d0c0a0]"
          icon={<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c1.11 0 2.08.402 2.599 1M12 8c-1.657 0-3 .895-3 2m3-2V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M9 10c0 1.105 1.343 2 3 2s3 .895 3 2-1.343 2-3 2m0-8c1.657 0 3 .895 3 2" /></svg>}
        />
        <StatCard
          label={t.totalProducts}
          value={overview.summary.totalProducts}
          helper={
            isArabic
              ? `${overview.summary.lowStock} ${t.lowStock} • ${overview.summary.expiringSoon} ${t.expiringSoon}`
              : `${overview.summary.lowStock} ${t.lowStock.toLowerCase()} • ${overview.summary.expiringSoon} ${t.expiringSoon.toLowerCase()}`
          }
          tone="bg-[#efe0dd] text-[#8c4d40] dark:bg-[#351c1b] dark:text-[#e6a59a]"
          icon={<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className="lav-data-shell">
          <div className="border-b border-[var(--border)] px-5 py-4">
            <h2 className="text-base font-semibold text-[var(--foreground)]">{t.actionQueue}</h2>
          </div>
          <div className="p-5">
            {overview.actionQueue.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">{t.noActions}</p>
            ) : (
              <div className="space-y-3">
                {overview.actionQueue.map((item) => {
                  const localizedItem = getLocalizedAction(item, isArabic);
                  const levelLabel = item.level === 'danger' ? t.urgent : item.level === 'warning' ? t.warning : t.info;

                  return (
                    <a
                      key={item.id}
                      href={item.href}
                      className="block rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-4 transition-all hover:-translate-y-0.5 hover:border-[var(--accent)]"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div
                            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                              item.level === 'danger'
                                ? 'bg-[var(--danger-soft)] text-[var(--danger)]'
                                : item.level === 'warning'
                                  ? 'bg-[var(--warning-soft)] text-[var(--warning)]'
                                  : 'bg-[var(--info-soft)] text-[var(--info)]'
                            }`}
                          >
                            {levelLabel}
                          </div>
                          <p className="mt-3 text-base font-semibold text-[var(--foreground)]">{localizedItem.title}</p>
                          <p className="mt-1 text-sm text-[var(--muted)]">{localizedItem.description}</p>
                        </div>
                        <span className="whitespace-nowrap text-sm font-semibold text-[var(--action)]">{localizedItem.cta}</span>
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="lav-data-shell">
          <div className="border-b border-[var(--border)] px-5 py-4">
            <h2 className="text-base font-semibold text-[var(--foreground)]">{t.rolePlaybook}</h2>
          </div>
          <div className="space-y-3 p-5">
            {overview.rolePlaybook.map((item) => {
              const localizedItem = getLocalizedRolePlaybook(item, isArabic);

              return (
                <a
                  key={item.href}
                  href={item.href}
                  className="block rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-4 transition-all hover:-translate-y-0.5 hover:border-[var(--action)]"
                >
                  <p className="text-sm font-semibold text-[var(--foreground)]">{localizedItem.title}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{localizedItem.description}</p>
                </a>
              );
            })}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="lav-data-shell">
          <div className="border-b border-[var(--border)] px-5 py-4">
            <h2 className="text-base font-semibold text-[var(--foreground)]">{t.topProducts}</h2>
          </div>
          <div className="divide-y divide-[color:color-mix(in_srgb,var(--border)_58%,transparent)]">
            {overview.insights.topProducts.map((product) => (
              <div key={`${product.productId}-${product.productName}`} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--foreground)]">{product.productName}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">{product.quantity} {t.units}</p>
                </div>
                <p className="text-sm font-semibold text-[var(--action)]">{formatCurrency(product.revenue, locale)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="lav-data-shell">
          <div className="border-b border-[var(--border)] px-5 py-4">
            <h2 className="text-base font-semibold text-[var(--foreground)]">{t.lowStockList}</h2>
          </div>
          <div className="divide-y divide-[color:color-mix(in_srgb,var(--border)_58%,transparent)]">
            {overview.insights.lowStockProducts.map((product) => (
              <div key={product.productId} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--foreground)]">{product.productName}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {product.currentQuantity} / {product.minStockLevel} {t.units}
                    {product.isControlled ? ` • ${t.controlled}` : ''}
                  </p>
                </div>
                <p className="text-sm font-semibold text-[var(--warning)]">-{product.shortage}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="lav-data-shell">
          <div className="border-b border-[var(--border)] px-5 py-4">
            <h2 className="text-base font-semibold text-[var(--foreground)]">{t.expiryWatch}</h2>
          </div>
          <div className="divide-y divide-[color:color-mix(in_srgb,var(--border)_58%,transparent)]">
            {overview.insights.expiringSoon.map((batch) => (
              <div key={batch.batchId} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--foreground)]">{batch.productName}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">{batch.batchNumber}</p>
                </div>
                <div className="text-right rtl:text-left">
                  <p className="text-sm font-semibold text-[var(--danger)]">{batch.daysUntilExpiry} {t.days}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">{batch.quantity} {t.units}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_1fr_1fr]">
        <section className="lav-data-shell">
          <div className="border-b border-[var(--border)] px-5 py-4">
            <h2 className="text-base font-semibold text-[var(--foreground)]">{t.paymentMix}</h2>
          </div>
          <div className="space-y-4 p-5">
            {overview.insights.paymentMix.map((payment) => {
              const share =
                overview.summary.totalSalesToday > 0
                  ? Math.min((payment.total / overview.summary.totalSalesToday) * 100, 100)
                  : 0;

              return (
                <div key={payment.paymentMethod}>
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm font-semibold capitalize text-[var(--foreground)]">
                      {formatPaymentMethod(payment.paymentMethod, locale)}
                    </p>
                    <p className="text-sm font-semibold text-[var(--action)]">{formatCurrency(payment.total, locale)}</p>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-[var(--surface)]">
                    <div className="h-2 rounded-full bg-[var(--action)]" style={{ width: `${share}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="lav-data-shell">
          <div className="border-b border-[var(--border)] px-5 py-4">
            <h2 className="text-base font-semibold text-[var(--foreground)]">{t.slowMovers}</h2>
          </div>
          <div className="divide-y divide-[color:color-mix(in_srgb,var(--border)_58%,transparent)]">
            {overview.insights.slowMovers.map((product) => (
              <div key={product.productId} className="px-5 py-4">
                <p className="text-sm font-semibold text-[var(--foreground)]">{product.productName}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">{t.minLevel}: {product.minStockLevel}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="lav-data-shell">
          <div className="border-b border-[var(--border)] px-5 py-4">
            <h2 className="text-base font-semibold text-[var(--foreground)]">{t.controlledRisk}</h2>
          </div>
          <div className="p-5">
            {overview.insights.controlledProductsAtRisk.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">{t.noActions}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {overview.insights.controlledProductsAtRisk.map((item) => (
                  <span
                    key={item.id}
                    className="inline-flex rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)]"
                  >
                    {item.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
