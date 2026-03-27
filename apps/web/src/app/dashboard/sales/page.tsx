'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getCachedUser, User, getAuthToken } from '@/lib/auth';
import { useLocale } from '@/contexts/LocaleProvider';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Sale {
  id: string;
  receiptNumber: string;
  cashierId: string;
  cashierName?: string;
  totalAmount: number;
  taxAmount: number;
  subtotalAmount: number;
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

// ─── API helpers ──────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

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
  const res = await fetch(`${API_BASE}/pos?${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw await res.json();
  return res.json();
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SalesPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const isRTL = locale === 'ar';

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Table state
  const [sales, setSales] = useState<Sale[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Receipt preview
  const [previewReceiptId, setPreviewReceiptId] = useState<string | null>(null);
  const [receiptBlobUrl, setReceiptBlobUrl] = useState<string | null>(null);

  // ── Auth ──
  useEffect(() => {
    const cachedUser = getCachedUser();
    if (!cachedUser) { router.replace('/login'); return; }
    if (cachedUser.role === 'cashier') { router.replace('/dashboard'); return; }
    setUser(cachedUser);
    setIsLoading(false);
  }, [router]);

  // ── Fetch receipt blob URL whenever previewReceiptId changes ──
  useEffect(() => {
    if (!previewReceiptId) return;
    const token = getAuthToken();
    if (!token) return;
    let objectUrl: string;
    fetch(`${API_BASE}/pos/receipt/${previewReceiptId}`, {
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
  const loadSales = useCallback(async (
    pageNum: number = page,
    overrides?: { dateFrom?: string; dateTo?: string }
  ) => {
    setIsFetching(true);
    setFetchError(null);
    try {
      const token = getAuthToken() ?? '';
      const effectiveDateFrom = overrides?.dateFrom !== undefined ? overrides.dateFrom : dateFrom;
      const effectiveDateTo = overrides?.dateTo !== undefined ? overrides.dateTo : dateTo;
      const data = await fetchSales(token, {
        page: pageNum,
        limit,
        date_from: effectiveDateFrom || undefined,
        date_to: effectiveDateTo || undefined,
      });
      setSales(data.sales ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setFetchError(isRTL ? 'فشل تحميل المبيعات' : 'Failed to load sales');
    } finally {
      setIsFetching(false);
    }
  }, [dateFrom, dateTo, isRTL, page]);

  useEffect(() => {
    if (!isLoading) loadSales(page);
  }, [isLoading, page, loadSales]);

  const handleFilter = () => {
    setPage(1);
    loadSales(1);
  };

  const handleClearFilter = () => {
    setDateFrom('');
    setDateTo('');
    setPage(1);
    loadSales(1, { dateFrom: '', dateTo: '' });
  };

  const totalPages = Math.ceil(total / limit);

  // ─────────────────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const t = {
    title: isRTL ? 'سجل المبيعات' : 'Sales History',
    subtitle: isRTL ? 'عرض وتصفية جميع المبيعات المنجزة' : 'View and filter all completed sales',
    receiptNo: isRTL ? 'رقم الإيصال' : 'Receipt No.',
    date: isRTL ? 'التاريخ' : 'Date',
    cashier: isRTL ? 'الكاشير' : 'Cashier',
    payment: isRTL ? 'طريقة الدفع' : 'Payment',
    total: isRTL ? 'الإجمالي' : 'Total',
    actions: isRTL ? 'إجراءات' : 'Actions',
    viewReceipt: isRTL ? 'عرض الإيصال' : 'View Receipt',
    from: isRTL ? 'من' : 'From',
    to: isRTL ? 'إلى' : 'To',
    filter: isRTL ? 'تصفية' : 'Filter',
    clear: isRTL ? 'مسح' : 'Clear',
    noSales: isRTL ? 'لا توجد مبيعات' : 'No sales found',
    showing: isRTL ? 'عرض' : 'Showing',
    of: isRTL ? 'من' : 'of',
    results: isRTL ? 'نتيجة' : 'results',
    prev: isRTL ? 'السابق' : 'Previous',
    next: isRTL ? 'التالي' : 'Next',
    cash: isRTL ? 'نقداً' : 'Cash',
    card: isRTL ? 'بطاقة' : 'Card',
    closePreview: isRTL ? 'إغلاق' : 'Close',
  };

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="mb-6">
        <nav className="text-sm text-gray-500 dark:text-gray-400 mb-2">
          <ol className="flex items-center space-x-2 rtl:space-x-reverse">
            <li><a href="/dashboard" className="hover:text-gray-700 dark:hover:text-gray-300">{isRTL ? 'الرئيسية' : 'Home'}</a></li>
            <li className="flex items-center">
              <svg className="w-4 h-4 mx-2 rtl:rotate-180" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-gray-900 dark:text-white font-medium">{t.title}</span>
            </li>
          </ol>
        </nav>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t.title}</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">{t.subtitle}</p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t.from}</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t.to}</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <button
            onClick={handleFilter}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {t.filter}
          </button>
          {(dateFrom || dateTo) && (
            <button
              onClick={handleClearFilter}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {t.clear}
            </button>
          )}
          <div className="ml-auto rtl:mr-auto rtl:ml-0 text-sm text-gray-500 dark:text-gray-400 self-center">
            {!isFetching && (
              <span>{t.showing} {sales.length} {t.of} {total} {t.results}</span>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
        {fetchError ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-red-500 text-sm">{fetchError}</p>
          </div>
        ) : isFetching ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sales.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <svg className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-gray-500 dark:text-gray-400 text-sm">{t.noSales}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                  {[t.receiptNo, t.date, t.cashier, t.payment, t.total, t.actions].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left rtl:text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {sales.map((sale) => (
                  <tr
                    key={sale.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                        {sale.receiptNumber}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                      {new Date(sale.createdAt).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-GB', {
                        year: 'numeric', month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                      {sale.cashierName ?? sale.cashierId.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                        {sale.paymentMethod === 'cash' ? t.cash : t.card}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-green-600">
                      {sale.totalAmount.toFixed(2)} EGP
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setPreviewReceiptId(sale.id)}
                        className="text-xs text-green-600 hover:text-green-800 dark:hover:text-green-400 font-medium transition-colors flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
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
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors"
            >
              {t.prev}
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors"
            >
              {t.next}
            </button>
          </div>
        )}
      </div>

      {/* Receipt preview modal */}
      {previewReceiptId && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">{t.viewReceipt}</h3>
              <button
                onClick={() => setPreviewReceiptId(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-2" style={{ height: '500px' }}>
              <iframe
                src={receiptBlobUrl ?? undefined}
                className="w-full h-96 border rounded"
                title="Receipt Preview"
              />
            </div>
            <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setPreviewReceiptId(null)}
                className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {t.closePreview}
              </button>
              <button
                onClick={() => {
                  if (receiptBlobUrl) window.open(receiptBlobUrl, '_blank', 'width=400,height=600');
                }}
                className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
              >
                {isRTL ? 'طباعة' : 'Print'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
