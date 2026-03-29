"use client";

import React, { useEffect, useState, useCallback } from "react";
import { authenticatedFetch, getTokenForRequest } from "@/lib/auth";
import { useLocale } from "@/contexts/LocaleProvider";
import { useDashboardAccess } from "@/lib/use-dashboard-access";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Sale {
  id: string;
  receiptNumber: string;
  cashierId: string;
  cashierName?: string;
  totalAmount: number;
  totalAmountForeign?: number | null;
  subtotalForeign?: number | null;
  currency?: string;
  exchangeRate?: number;
  taxAmount: number;
  subtotal: number;
  paymentMethod: string;
  createdAt: string;
  itemCount?: number;
}

interface SalesResponse {
  sales: Sale[];
  total: number;
  page: number;
  limit: number;
}

interface SalesAnalytics {
  summary: {
    totalSales: number;
    totalTransactions: number;
    averageOrderValue: number;
    bestSalesDay: { date: string; total: number; count: number } | null;
    bestSalesHour: { hour: string; revenue: number; transactions: number } | null;
    topProducts: Array<{
      productId: string;
      productName: string;
      revenue: number;
      quantity: number;
    }>;
    paymentMix: Array<{
      paymentMethod: string;
      revenue: number;
      transactions: number;
      share: number;
    }>;
    currencyMix: Array<{
      currency: string;
      revenue: number;
      transactions: number;
      share: number;
    }>;
  };
  chart: Array<{
    date: string;
    total: number;
    count: number;
  }>;
  topDays: Array<{
    date: string;
    total: number;
    count: number;
  }>;
  hourlyBreakdown: Array<{
    hour: string;
    revenue: number;
    transactions: number;
  }>;
}

// ─── API helpers ──────────────────────────────────────────────────────────────

const RAW_API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const API_BASE = RAW_API_BASE.endsWith("/api") ? RAW_API_BASE : `${RAW_API_BASE}/api`;

async function fetchSales(
  token: string,
  params: { page: number; limit: number; date_from?: string; date_to?: string; cashier_id?: string }
): Promise<SalesResponse> {
  const query = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
    ...(params.date_from ? { date_from: params.date_from } : {}),
    ...(params.date_to ? { date_to: params.date_to } : {}),
    ...(params.cashier_id ? { cashier_id: params.cashier_id } : {}),
  });
  const res = await authenticatedFetch(`${API_BASE}/pos?${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw await res.json();
  return res.json();
}

async function fetchSalesAnalytics(
  token: string,
  params: { startDate?: string; endDate?: string; groupBy?: "day" | "week" | "month" }
): Promise<SalesAnalytics> {
  const query = new URLSearchParams({
    ...(params.startDate ? { startDate: params.startDate } : {}),
    ...(params.endDate ? { endDate: params.endDate } : {}),
    groupBy: params.groupBy ?? "day",
  });
  const res = await authenticatedFetch(`${API_BASE}/reports/sales?${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw await res.json();
  return res.json();
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SalesPage() {
  const { locale } = useLocale();
  const isRTL = locale === "ar";
  const { isReady } = useDashboardAccess({ allowedRoles: ["admin", "manager"] });

  // Table state
  const [sales, setSales] = useState<Sale[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<SalesAnalytics | null>(null);

  // Filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Receipt preview
  const [previewReceiptId, setPreviewReceiptId] = useState<string | null>(null);
  const [receiptBlobUrl, setReceiptBlobUrl] = useState<string | null>(null);

  // ── Fetch receipt blob URL whenever previewReceiptId changes ──
  useEffect(() => {
    if (!previewReceiptId) return;
    const token = getTokenForRequest();
    if (!token) return;
    let objectUrl: string;
    authenticatedFetch(`${API_BASE}/pos/receipt/${previewReceiptId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.blob())
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setReceiptBlobUrl(objectUrl);
      });
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setReceiptBlobUrl(null);
    };
  }, [previewReceiptId]);

  // ── Fetch sales ──
  const loadSales = useCallback(
    async (pageNum: number = page, overrides?: { dateFrom?: string; dateTo?: string }) => {
      setIsFetching(true);
      setFetchError(null);
      try {
        const token = getTokenForRequest() ?? "";
        const effectiveDateFrom = overrides?.dateFrom !== undefined ? overrides.dateFrom : dateFrom;
        const effectiveDateTo = overrides?.dateTo !== undefined ? overrides.dateTo : dateTo;
        const [data, analyticsData] = await Promise.all([
          fetchSales(token, {
            page: pageNum,
            limit,
            date_from: effectiveDateFrom || undefined,
            date_to: effectiveDateTo || undefined,
          }),
          fetchSalesAnalytics(token, {
            startDate: effectiveDateFrom || undefined,
            endDate: effectiveDateTo || undefined,
            groupBy: "day",
          }),
        ]);
        setSales(data.sales ?? []);
        setTotal(data.total ?? 0);
        setAnalytics(analyticsData);
      } catch {
        setFetchError(
          isRTL
            ? "\u0641\u0634\u0644 \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A"
            : "Failed to load sales"
        );
        setAnalytics(null);
      } finally {
        setIsFetching(false);
      }
    },
    [dateFrom, dateTo, isRTL]
  );

  useEffect(() => {
    if (isReady) loadSales(page);
  }, [isReady, page, loadSales]);

  const handleFilter = () => {
    setPage(1);
    loadSales(1);
  };

  const handleClearFilter = () => {
    setDateFrom("");
    setDateTo("");
    setPage(1);
    loadSales(1, { dateFrom: "", dateTo: "" });
  };

  const totalPages = Math.ceil(total / limit);

  const formatEgp = (value: number) => `${value.toFixed(2)} EGP`;
  const formatForeign = (value: number, currency: string) => `${value.toFixed(2)} ${currency}`;

  // ─────────────────────────────────────────────────────────────────────────────

  if (!isReady) return null;

  const t = {
    title: isRTL
      ? "\u0633\u062C\u0644 \u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A"
      : "Sales History",
    subtitle: isRTL
      ? "\u0639\u0631\u0636 \u0648\u062A\u0635\u0641\u064A\u0629 \u062C\u0645\u064A\u0639 \u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A \u0627\u0644\u0645\u0646\u062C\u0632\u0629"
      : "View and filter all completed sales",
    analyticsLabel: isRTL
      ? "\u0623\u062F\u0627\u0621 \u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A"
      : "Sales performance",
    totalRevenue: isRTL
      ? "\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0625\u064A\u0631\u0627\u062F"
      : "Total revenue",
    transactions: isRTL
      ? "\u0639\u062F\u062F \u0627\u0644\u0639\u0645\u0644\u064A\u0627\u062A"
      : "Transactions",
    averageSale: isRTL
      ? "\u0645\u062A\u0648\u0633\u0637 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629"
      : "Average sale",
    bestDay: isRTL
      ? "\u0623\u0642\u0648\u0649 \u064A\u0648\u0645 \u0645\u0628\u064A\u0639\u0627\u062A"
      : "Best day",
    bestHour: isRTL
      ? "\u0623\u0643\u062B\u0631 \u0633\u0627\u0639\u0629 \u0646\u0634\u0627\u0637\u0627\u064B"
      : "Busiest hour",
    topProducts: isRTL
      ? "\u0627\u0644\u0623\u0635\u0646\u0627\u0641 \u0627\u0644\u0623\u0643\u062B\u0631 \u0628\u064A\u0639\u0627\u064B"
      : "Top products",
    topDays: isRTL
      ? "\u0623\u0641\u0636\u0644 \u0623\u064A\u0627\u0645 \u0627\u0644\u0628\u064A\u0639"
      : "Best sales days",
    paymentMix: isRTL
      ? "\u062A\u0648\u0632\u064A\u0639 \u0627\u0644\u062F\u0641\u0639"
      : "Payment mix",
    currencyMix: isRTL
      ? "\u062A\u0648\u0632\u064A\u0639 \u0627\u0644\u0639\u0645\u0644\u0627\u062A"
      : "Currency mix",
    units: isRTL ? "\u0648\u062D\u062F\u0627\u062A" : "units",
    salesCount: isRTL ? "\u0639\u0645\u0644\u064A\u0627\u062A" : "sales",
    peakWindow: isRTL ? "\u0630\u0631\u0648\u0629 \u0627\u0644\u0628\u064A\u0639" : "Peak window",
    receiptNo: isRTL
      ? "\u0631\u0642\u0645 \u0627\u0644\u0625\u064A\u0635\u0627\u0644"
      : "Receipt No.",
    date: isRTL ? "\u0627\u0644\u062A\u0627\u0631\u064A\u062E" : "Date",
    cashier: isRTL ? "\u0627\u0644\u0643\u0627\u0634\u064A\u0631" : "Cashier",
    payment: isRTL ? "\u0637\u0631\u064A\u0642\u0629 \u0627\u0644\u062F\u0641\u0639" : "Payment",
    total: isRTL ? "\u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A" : "Total",
    actions: isRTL ? "\u0625\u062C\u0631\u0627\u0621\u0627\u062A" : "Actions",
    viewReceipt: isRTL
      ? "\u0639\u0631\u0636 \u0627\u0644\u0625\u064A\u0635\u0627\u0644"
      : "View Receipt",
    from: isRTL ? "\u0645\u0646" : "From",
    to: isRTL ? "\u0625\u0644\u0649" : "To",
    filter: isRTL ? "\u062A\u0635\u0641\u064A\u0629" : "Filter",
    clear: isRTL ? "\u0645\u0633\u062D" : "Clear",
    noSales: isRTL
      ? "\u0644\u0627 \u062A\u0648\u062C\u062F \u0645\u0628\u064A\u0639\u0627\u062A"
      : "No sales found",
    showing: isRTL ? "\u0639\u0631\u0636" : "Showing",
    of: isRTL ? "\u0645\u0646" : "of",
    results: isRTL ? "\u0646\u062A\u064A\u062C\u0629" : "results",
    prev: isRTL ? "\u0627\u0644\u0633\u0627\u0628\u0642" : "Previous",
    next: isRTL ? "\u0627\u0644\u062A\u0627\u0644\u064A" : "Next",
    cash: isRTL ? "\u0646\u0642\u062F\u0627\u064B" : "Cash",
    card: isRTL ? "\u0628\u0637\u0627\u0642\u0629" : "Card",
    closePreview: isRTL ? "\u0625\u063A\u0644\u0627\u0642" : "Close",
  };

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="lav-page">
      <div className="lav-page-hero">
        <nav className="mb-4 text-sm text-[var(--muted)]">
          <ol className="flex items-center gap-2 rtl:flex-row-reverse">
            <li>
              <a href="/dashboard" className="transition-colors hover:text-[var(--foreground)]">
                {isRTL ? "\u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629" : "Home"}
              </a>
            </li>
            <li className="text-[var(--accent)]">/</li>
            <li className="font-medium text-[var(--foreground)]">{t.title}</li>
          </ol>
        </nav>
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
          {isRTL ? "المعاملات اليومية" : "Daily transactions"}
        </p>
        <h1 className="mt-2 text-[30px] font-semibold tracking-[-0.04em] text-[var(--foreground)]">
          {t.title}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{t.subtitle}</p>
      </div>

      {!fetchError && analytics && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {[
              {
                label: t.totalRevenue,
                value: `${analytics.summary.totalSales.toFixed(2)} EGP`,
                tone: "bg-[#e4ece4] text-[#46614e] dark:bg-[#1a2921] dark:text-[#9cc0a2]",
              },
              {
                label: t.transactions,
                value: analytics.summary.totalTransactions,
                tone: "bg-[#e8edf5] text-[#35506f] dark:bg-[#1b2839] dark:text-[#9cb7d5]",
              },
              {
                label: t.averageSale,
                value: `${analytics.summary.averageOrderValue.toFixed(2)} EGP`,
                tone: "bg-[#ece7dd] text-[#66573f] dark:bg-[#2a241c] dark:text-[#d0c0a0]",
              },
              {
                label: t.bestDay,
                value: analytics.summary.bestSalesDay
                  ? `${analytics.summary.bestSalesDay.total.toFixed(2)} EGP`
                  : "--",
                subtext: analytics.summary.bestSalesDay?.date,
                tone: "bg-[#efe0dd] text-[#8c4d40] dark:bg-[#351c1b] dark:text-[#e6a59a]",
              },
              {
                label: t.bestHour,
                value: analytics.summary.bestSalesHour?.hour ?? "--",
                subtext: analytics.summary.bestSalesHour
                  ? `${analytics.summary.bestSalesHour.revenue.toFixed(2)} EGP`
                  : undefined,
                tone: "bg-[#e5ebea] text-[#3f5d5d] dark:bg-[#182526] dark:text-[#96b7b8]",
              },
            ].map((card) => (
              <div
                key={card.label}
                className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)]"
              >
                <div
                  className={`mb-4 inline-flex rounded-2xl px-3 py-1.5 text-xs font-semibold ${card.tone}`}
                >
                  {card.label}
                </div>
                <div className="text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
                  {card.value}
                </div>
                {card.subtext && (
                  <div className="mt-2 text-sm text-[var(--muted)]">{card.subtext}</div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-4">
            <section className="lav-data-shell xl:col-span-2">
              <div className="border-b border-[var(--border)] px-5 py-4">
                <h2 className="text-base font-semibold text-[var(--foreground)]">
                  {t.topProducts}
                </h2>
              </div>
              <div className="divide-y divide-[color:color-mix(in_srgb,var(--border)_58%,transparent)]">
                {analytics.summary.topProducts.slice(0, 5).map((product, index) => (
                  <div
                    key={`${product.productId}-${index}`}
                    className="flex items-center justify-between px-5 py-4 gap-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                        {product.productName}
                      </p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {product.quantity} {t.units}
                      </p>
                    </div>
                    <div className="text-right rtl:text-left">
                      <p className="text-sm font-semibold text-[var(--action)]">
                        {product.revenue.toFixed(2)} EGP
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="lav-data-shell">
              <div className="border-b border-[var(--border)] px-5 py-4">
                <h2 className="text-base font-semibold text-[var(--foreground)]">{t.topDays}</h2>
              </div>
              <div className="divide-y divide-[color:color-mix(in_srgb,var(--border)_58%,transparent)]">
                {analytics.topDays.slice(0, 5).map((day) => (
                  <div key={day.date} className="flex items-center justify-between px-5 py-4 gap-4">
                    <div>
                      <p className="text-sm font-semibold text-[var(--foreground)]">{day.date}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {day.count} {t.salesCount}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-[var(--action)]">
                      {day.total.toFixed(2)} EGP
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="lav-data-shell">
              <div className="border-b border-[var(--border)] px-5 py-4">
                <h2 className="text-base font-semibold text-[var(--foreground)]">{t.paymentMix}</h2>
              </div>
              <div className="divide-y divide-[color:color-mix(in_srgb,var(--border)_58%,transparent)]">
                {analytics.summary.paymentMix.slice(0, 4).map((payment) => (
                  <div key={payment.paymentMethod} className="px-5 py-4">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm font-semibold capitalize text-[var(--foreground)]">
                        {payment.paymentMethod}
                      </p>
                      <p className="text-sm font-semibold text-[var(--action)]">
                        {payment.share.toFixed(1)}%
                      </p>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-[var(--surface)]">
                      <div
                        className="h-2 rounded-full bg-[var(--action)]"
                        style={{ width: `${Math.min(payment.share, 100)}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-[var(--muted)]">
                      {payment.revenue.toFixed(2)} EGP
                    </p>
                  </div>
                ))}
              </div>
              {analytics.summary.currencyMix.length > 0 && (
                <div className="border-t border-[var(--border)] px-5 py-4">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                    {t.currencyMix}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {analytics.summary.currencyMix.map((currency) => (
                      <span
                        key={currency.currency}
                        className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)]"
                      >
                        {currency.currency}
                        <span className="text-[var(--muted)]">{currency.transactions}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>
        </>
      )}

      {/* Filters */}
      <div className="lav-command-strip">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--muted)]">{t.from}</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="lav-input px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--muted)]">{t.to}</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="lav-input px-3 py-2"
            />
          </div>
          <button onClick={handleFilter} className="lav-button-primary">
            {t.filter}
          </button>
          {(dateFrom || dateTo) && (
            <button onClick={handleClearFilter} className="lav-button-secondary">
              {t.clear}
            </button>
          )}
          <div className="ml-auto self-center text-sm text-[var(--muted)] rtl:mr-auto rtl:ml-0">
            {!isFetching && (
              <span>
                {t.showing} {sales.length} {t.of} {total} {t.results}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="lav-data-shell">
        {fetchError ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-[var(--danger)]">{fetchError}</p>
          </div>
        ) : isFetching ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--action)] border-t-transparent" />
          </div>
        ) : sales.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <svg
              className="mb-3 h-12 w-12 text-[var(--muted)]/50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <p className="text-sm text-[var(--muted)]">{t.noSales}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="lav-table-head border-b border-[var(--border)]">
                  {[t.receiptNo, t.date, t.cashier, t.payment, t.total, t.actions].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] rtl:text-right"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:color-mix(in_srgb,var(--border)_58%,transparent)]">
                {sales.map((sale) => (
                  <tr
                    key={sale.id}
                    className="transition-colors hover:bg-[color:color-mix(in_srgb,var(--surface)_54%,transparent)]"
                  >
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-[var(--surface)] px-2 py-0.5 font-mono text-xs font-semibold text-[var(--foreground)]">
                        {sale.receiptNumber}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--foreground)]">
                      {new Date(sale.createdAt).toLocaleDateString(
                        locale === "ar" ? "ar-EG" : "en-GB",
                        {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </td>
                    <td className="px-4 py-3 text-[var(--foreground)]">
                      {sale.cashierName ?? sale.cashierId.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--info-soft)] px-2.5 py-1 text-xs font-medium text-[var(--info)]">
                        {sale.paymentMethod === "cash" ? t.cash : t.card}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-[var(--action)]">
                        {sale.currency && sale.currency !== "EGP" && sale.totalAmountForeign
                          ? formatForeign(sale.totalAmountForeign, sale.currency)
                          : formatEgp(sale.totalAmount)}
                      </div>
                      {sale.currency && sale.currency !== "EGP" && sale.totalAmountForeign && (
                        <div className="mt-1 text-xs text-[var(--muted)]">
                          {formatEgp(sale.totalAmount)}
                          {sale.exchangeRate
                            ? ` • 1 ${sale.currency} = ${sale.exchangeRate.toFixed(4)} EGP`
                            : ""}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setPreviewReceiptId(sale.id)}
                        className="flex items-center gap-1 text-xs font-medium text-[var(--action)] transition-colors hover:text-[var(--action-strong)]"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                          />
                        </svg>
                        {t.viewReceipt}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-3">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="lav-button-secondary px-3 py-1.5 disabled:opacity-40"
            >
              {t.prev}
            </button>
            <span className="text-sm text-[var(--muted)]">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="lav-button-secondary px-3 py-1.5 disabled:opacity-40"
            >
              {t.next}
            </button>
          </div>
        )}
      </div>

      {/* Receipt preview modal */}
      {previewReceiptId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(9,17,29,0.58)] p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-lg overflow-hidden rounded-[var(--radius-xl)] border border-[color:color-mix(in_srgb,var(--border)_72%,transparent)] bg-[color:color-mix(in_srgb,var(--card)_96%,transparent)] shadow-[0_30px_80px_rgba(9,17,29,0.28)]">
            <div className="flex items-center justify-between border-b border-[color:color-mix(in_srgb,var(--border)_72%,transparent)] px-5 py-4">
              <h3 className="font-semibold text-[var(--foreground)]">{t.viewReceipt}</h3>
              <button
                onClick={() => setPreviewReceiptId(null)}
                className="rounded-[var(--radius-md)] border border-transparent p-2 text-[var(--muted)] transition-colors hover:border-[var(--border)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="p-2 h-[500px]">
              <iframe
                src={receiptBlobUrl ?? undefined}
                className="h-full w-full rounded-[var(--radius-lg)] border border-[var(--border)] bg-white"
                title="Receipt Preview"
              />
            </div>
            <div className="flex justify-end gap-3 border-t border-[color:color-mix(in_srgb,var(--border)_72%,transparent)] px-5 py-3">
              <button onClick={() => setPreviewReceiptId(null)} className="lav-button-secondary">
                {t.closePreview}
              </button>
              <button
                onClick={() => {
                  if (receiptBlobUrl) window.open(receiptBlobUrl, "_blank", "width=400,height=600");
                }}
                className="lav-button-primary"
              >
                {isRTL ? "\u0637\u0628\u0627\u0639\u0629" : "Print"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
