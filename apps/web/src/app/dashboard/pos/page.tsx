'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getCachedUser, User, getAuthToken } from '@/lib/auth';
import { useLocale } from '@/contexts/LocaleProvider';
import { useTheme } from '@/contexts/ThemeProvider';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Product {
  id: string;
  name: string;
  nameAr?: string;
  barcode?: string;
  price: number;
  currentQuantity: number;
  unit?: string;
  categoryName?: string;
}

interface CartItem {
  productId: string;
  name: string;
  nameAr?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  availableQty: number;
}

interface CheckoutResult {
  sale: {
    id: string;
    receiptNumber: string;
    totalAmount: number;
    taxAmount: number;
    subtotalAmount: number;
    createdAt: string;
  };
  items: {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }[];
  receiptUrl: string;
}

// ─── API helpers ──────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

async function searchProducts(query: string, token: string): Promise<Product[]> {
  const params = new URLSearchParams({ search: query, limit: '10' });
  const res = await fetch(`${API_BASE}/products?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.products ?? data ?? [];
}

async function postCheckout(
  items: { productId: string; quantity: number }[],
  token: string
): Promise<CheckoutResult> {
  const res = await fetch(`${API_BASE}/pos/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ items, paymentMethod: 'cash', currency: 'EGP' }),
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function POSPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const { theme } = useTheme();
  const isRTL = locale === 'ar';

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);

  // Checkout
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<CheckoutResult | null>(null);

  // ── Auth ──
  useEffect(() => {
    const cachedUser = getCachedUser();
    if (!cachedUser) { router.replace('/login'); return; }
    setUser(cachedUser);
    setIsLoading(false);
  }, [router]);

  // ── Product search (debounced 300ms) ──
  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!q.trim()) { setSearchResults([]); return; }
    searchTimeout.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const token = getAuthToken() ?? '';
        const results = await searchProducts(q, token);
        setSearchResults(results);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, []);

  // ── Cart operations ──
  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.currentQuantity) return prev;
        return prev.map((i) =>
          i.productId === product.id
            ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.unitPrice }
            : i
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          nameAr: product.nameAr,
          quantity: 1,
          unitPrice: product.price,
          subtotal: product.price,
          availableQty: product.currentQuantity,
        },
      ];
    });
    setSearchQuery('');
    setSearchResults([]);
    searchRef.current?.focus();
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.productId !== productId) return i;
          const newQty = Math.max(0, Math.min(i.availableQty, i.quantity + delta));
          return { ...i, quantity: newQty, subtotal: newQty * i.unitPrice };
        })
        .filter((i) => i.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  };

  const clearCart = () => setCart([]);

  // ── Totals ──
  const subtotal = cart.reduce((sum, i) => sum + i.subtotal, 0);
  const tax = 0; // cash MVP — tax handled server-side
  const total = subtotal;

  // ── Checkout ──
  const handleCheckout = async () => {
    if (cart.length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    setCheckoutError(null);
    try {
      const token = getAuthToken() ?? '';
      const result = await postCheckout(
        cart.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        token
      );
      setReceipt(result);
      setCart([]);
    } catch (err: unknown) {
      const e = err as Record<string, unknown>;
      if (e.error === 'INSUFFICIENT_STOCK') {
        setCheckoutError(
          isRTL
            ? `كمية غير كافية: ${e.productName} (متاح: ${e.available})`
            : `Insufficient stock: ${e.productName} (available: ${e.available})`
        );
      } else if (e.error === 'EXPIRED_BATCH') {
        setCheckoutError(isRTL ? 'دفعة منتهية الصلاحية في السلة' : 'Expired batch in cart — please remove and re-add the item');
      } else {
        setCheckoutError(isRTL ? 'فشل إتمام البيع، حاول مجدداً' : 'Checkout failed — please try again');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Print receipt ──
  const handlePrint = () => {
    if (!receipt) return;
    const url = `${API_BASE}${receipt.receiptUrl}`;
    const win = window.open(url, '_blank', 'width=400,height=600');
    win?.addEventListener('load', () => win.print());
  };

  // ─────────────────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const t = {
    title: isRTL ? 'نقطة البيع' : 'POS / Checkout',
    searchPlaceholder: isRTL ? 'ابحث باسم المنتج أو الباركود...' : 'Search by product name or barcode...',
    cart: isRTL ? 'السلة' : 'Cart',
    empty: isRTL ? 'السلة فارغة' : 'Cart is empty',
    subtotal: isRTL ? 'المجموع الفرعي' : 'Subtotal',
    total: isRTL ? 'الإجمالي' : 'Total',
    checkout: isRTL ? 'إتمام البيع' : 'Checkout',
    processing: isRTL ? 'جارٍ المعالجة...' : 'Processing...',
    clear: isRTL ? 'مسح السلة' : 'Clear Cart',
    available: isRTL ? 'متاح' : 'Available',
    print: isRTL ? 'طباعة الإيصال' : 'Print Receipt',
    newSale: isRTL ? 'بيع جديد' : 'New Sale',
    saleComplete: isRTL ? 'تم البيع بنجاح!' : 'Sale Complete!',
    receiptNo: isRTL ? 'رقم الإيصال' : 'Receipt No.',
    amountPaid: isRTL ? 'المبلغ المدفوع' : 'Amount Paid',
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
      </div>

      {/* Receipt success modal */}
      {receipt && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{t.saleComplete}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {t.receiptNo}: <span className="font-mono font-semibold text-gray-900 dark:text-white">{receipt.sale.receiptNumber}</span>
            </p>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 mb-6 text-left rtl:text-right">
              <div className="flex justify-between text-sm">
                <span>{isRTL ? 'المجموع الفرعي' : 'Subtotal'}</span>
                <span>{receipt.sale.subtotalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>{isRTL ? 'ضريبة القيمة المضافة' : 'VAT'}</span>
                <span>{receipt.sale.taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold border-t pt-2 mt-2">
                <span>{isRTL ? 'الإجمالي' : 'Total'}</span>
                <span>{receipt.sale.totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-gray-500">{isRTL ? 'عدد الأصناف' : 'Items'}</span>
                <span className="text-gray-700 dark:text-gray-300">{receipt.items.length}</span>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={handlePrint}
                className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
              >
                {t.print}
              </button>
              <button
                onClick={() => setReceipt(null)}
                className="w-full py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {t.newSale}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: Product search */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-3 rtl:left-auto rtl:right-3 flex items-center pointer-events-none">
              {isSearching ? (
                <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
            </div>
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (searchResults.length > 0) {
                    addToCart(searchResults[0]);
                    setSearchQuery('');
                    setSearchResults([]);
                  }
                }
              }}
              placeholder={t.searchPlaceholder}
              autoFocus
              className="w-full pl-10 rtl:pl-4 rtl:pr-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
            />
          </div>

          {/* Search results */}
          {searchResults.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
              {searchResults.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  disabled={product.currentQuantity === 0}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-green-50 dark:hover:bg-green-900/20 border-b border-gray-100 dark:border-gray-700 last:border-0 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="text-left rtl:text-right">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {isRTL && product.nameAr ? product.nameAr : product.name}
                    </p>
                    {product.barcode && (
                      <p className="text-xs text-gray-400 font-mono">{product.barcode}</p>
                    )}
                    {product.categoryName && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">{product.categoryName}</p>
                    )}
                  </div>
                  <div className="text-right rtl:text-left ml-4 rtl:mr-4 rtl:ml-0 flex-shrink-0">
                    <p className="text-sm font-bold text-green-600">{product.price.toFixed(2)} EGP</p>
                    <p className={`text-xs ${product.currentQuantity < 10 ? 'text-orange-500' : 'text-gray-400'}`}>
                      {t.available}: {product.currentQuantity} {product.unit ?? ''}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Empty search hint */}
          {!searchQuery && cart.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {isRTL ? 'ابحث عن منتج لإضافته إلى السلة' : 'Search for a product to add it to the cart'}
              </p>
            </div>
          )}
        </div>

        {/* Right: Cart */}
        <div className="flex flex-col bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden max-h-[calc(100vh-12rem)]">
          {/* Cart header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {t.cart}
              {cart.length > 0 && (
                <span className="bg-green-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {cart.length}
                </span>
              )}
            </h2>
            {cart.length > 0 && (
              <button onClick={clearCart} className="text-xs text-red-500 hover:text-red-700 transition-colors">
                {t.clear}
              </button>
            )}
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <svg className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="text-sm text-gray-400">{t.empty}</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                {cart.map((item) => (
                  <li key={item.productId} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-white leading-tight">
                        {isRTL && item.nameAr ? item.nameAr : item.name}
                      </p>
                      <button
                        onClick={() => removeFromCart(item.productId)}
                        className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQty(item.productId, -1)}
                          className="w-7 h-7 rounded-lg border border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" />
                          </svg>
                        </button>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white w-6 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQty(item.productId, 1)}
                          disabled={item.quantity >= item.availableQty}
                          className="w-7 h-7 rounded-lg border border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-40"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      </div>
                      <span className="text-sm font-bold text-green-600">
                        {item.subtotal.toFixed(2)} EGP
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Cart footer */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-3">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>{t.subtotal}</span>
              <span>{subtotal.toFixed(2)} EGP</span>
            </div>
            <div className="flex justify-between font-bold text-gray-900 dark:text-white">
              <span>{t.total}</span>
              <span className="text-green-600 text-lg">{total.toFixed(2)} EGP</span>
            </div>

            {checkoutError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
                <p className="text-xs text-red-700 dark:text-red-400">{checkoutError}</p>
              </div>
            )}

            <button
              onClick={handleCheckout}
              disabled={cart.length === 0 || isSubmitting}
              className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white disabled:text-gray-400 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t.processing}
                </>
              ) : (
                t.checkout
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
