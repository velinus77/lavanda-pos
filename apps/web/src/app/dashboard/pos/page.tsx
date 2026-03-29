"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { authenticatedFetch, getTokenForRequest } from "@/lib/auth";
import { useLocale } from "@/contexts/LocaleProvider";
import { useDashboardAccess } from "@/lib/use-dashboard-access";

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
    totalAmountForeign?: number;
    currency: string;
    exchangeRate: number;
    usedManualExchangeRate?: boolean;
    taxAmount: number;
    subtotalAmount: number;
    subtotalAmountForeign?: number;
    createdAt: string;
  };
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
  receiptUrl: string;
}

interface ExchangeRateQuote {
  currency: string;
  egpPerUnit: number | null;
  stale: boolean;
  requiresManualInput: boolean;
}

interface ExchangeRateSnapshotResponse {
  rateDetails: Partial<Record<SupportedCurrency, ExchangeRateQuote>>;
  source: "api" | "manual";
  updatedAt: string | null;
  offlineMode: boolean;
  stale: boolean;
}

interface ProductsResponseRow {
  id?: string | number;
  name?: string;
  name_en?: string;
  name_ar?: string;
  nameAr?: string;
  barcode?: string;
  selling_price?: string | number;
  sale_price?: string | number;
  price?: string | number;
  total_stock?: string | number;
  total_quantity?: string | number;
  currentQuantity?: string | number;
  unit?: string;
  category_name?: string;
  categoryName?: string;
}

interface ScanFeedback {
  tone: "success" | "error" | "info";
  message: string;
}

interface LastAddedInfo {
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface HeldSale {
  id: string;
  label: string;
  cart: CartItem[];
  checkoutCurrency: SupportedCurrency;
  rateMode: "auto" | "manual";
  manualRateInput: string;
  cashReceivedInput: string;
}

const RAW_API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const API_BASE = RAW_API_BASE.endsWith("/api") ? RAW_API_BASE : `${RAW_API_BASE}/api`;
const API_ORIGIN = RAW_API_BASE.endsWith("/api") ? RAW_API_BASE.slice(0, -4) : RAW_API_BASE;
const SUPPORTED_CURRENCIES = ["EGP", "USD", "EUR", "GBP", "RUB"] as const;
type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

function parseMoneyInput(value: string): number | null {
  const normalized = value.replace(/\s+/g, "").replace(/,/g, ".").trim();
  if (!normalized) return null;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatInputAmount(value: number): string {
  return value.toFixed(2).replace(".", ",");
}

function formatMoney(value: number, currency: string, locale: "en" | "ar") {
  const formatted = new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

  if (currency === "EGP") {
    return locale === "ar" ? `${formatted} ?.?` : `${formatted} EGP`;
  }

  return `${formatted} ${currency}`;
}

function mapProductRow(product: ProductsResponseRow): Product {
  return {
    id: String(product.id ?? ""),
    name: product.name ?? product.name_en ?? "",
    nameAr: product.name_ar ?? product.nameAr ?? "",
    barcode: product.barcode ?? "",
    price: Number(product.selling_price ?? product.sale_price ?? product.price ?? 0),
    currentQuantity: Number(product.total_stock ?? product.total_quantity ?? product.currentQuantity ?? 0),
    unit: product.unit ?? "",
    categoryName: product.category_name ?? product.categoryName ?? "",
  };
}

async function searchProducts(query: string, token: string): Promise<Product[]> {
  const params = new URLSearchParams({ search: query, limit: "8" });
  const response = await authenticatedFetch(`${API_BASE}/products?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return [];
  const data = await response.json();
  const rows = Array.isArray(data.products) ? data.products : [];
  return rows.map(mapProductRow);
}

async function fetchProductByBarcode(barcode: string, token: string): Promise<Product | null> {
  const params = new URLSearchParams({ barcode, limit: "1" });
  const response = await authenticatedFetch(`${API_BASE}/products?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return null;
  const data = await response.json();
  const rows = Array.isArray(data.products) ? data.products : [];
  const first = rows[0] as ProductsResponseRow | undefined;
  return first ? mapProductRow(first) : null;
}

async function fetchCurrentRates(token: string): Promise<ExchangeRateSnapshotResponse> {
  const response = await authenticatedFetch(`${API_BASE}/exchange-rate`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Failed to load exchange rates");
  return (await response.json()) as ExchangeRateSnapshotResponse;
}

async function postCheckout(
  items: Array<{ productId: string; quantity: number }>,
  token: string,
  currency: SupportedCurrency,
  exchangeRateOverride?: number,
  foreignAmount?: number,
  egpAmount?: number,
  manualRateApplied = false
): Promise<CheckoutResult> {
  const response = await authenticatedFetch(`${API_BASE}/pos/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      items,
      paymentMethod: "cash",
      currency,
      exchangeRate: exchangeRateOverride,
      exchangeRateOverride,
      manualRateApplied,
      foreignAmount,
      egpAmount,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw data;
  return data;
}

export default function POSPage() {
  const { locale } = useLocale();
  const isRTL = locale === "ar";
  const { isReady } = useDashboardAccess();
  const copy = locale === "ar"
    ? {
        title: "???????",
        subtitle: "???? ???????? ?????? ???? ??? ??????? ????? ????? ?? ??? ?? ????.",
        searchPlaceholder: "???? ???????? ?? ???? ??? ?????...",
        searchMode: "???? ?????",
        fallbackMode: "??? ????",
        lastScanned: "??? ??? ?????",
        cart: "?????",
        activeLane: "?????? ??????",
        parkSale: "???? ??????",
        clearCart: "???? ?????",
        heldSales: "??????? ????????",
        heldHint: "???? ???? ????? ???? ?????? ???? ????.",
        resume: "????",
        items: "?????",
        item: "???",
        emptyCart: "????? ?????",
        quantity: "??????",
        checkoutCurrency: "???? ?????",
        exchangeRate: "??? ?????",
        manualRate: "??? ????? ?? ?? ?????? ???????",
        cashReceived: "?????? ???????",
        changeDue: "??????",
        subtotal: "???????? ??? ?????",
        totalSelected: "???????? ??????? ????????",
        total: "????????",
        checkout: "???? ?????",
        exact: "???????",
        newSale: "???? ?????",
        printReceipt: "???? ???????",
        offlineRates: "?????? ???? ??? ????? ??? ?????? ???????? ?? ????? ??????.",
        staleRates: "????? ????? ???? ?? ????. ?????? ??? ?? ????.",
        missingRate: "????? ???? ??? ????? ???? ??? ???????.",
        manualRateValue: "???? ????? ??????",
      }
    : {
        title: "POS Checkout",
        subtitle: "Scan fast, fall back to search when needed, and finish each sale with register-level speed.",
        searchPlaceholder: "Scan barcode or search products...",
        searchMode: "Scanner ready",
        fallbackMode: "Search mode",
        lastScanned: "Last scanned",
        cart: "Cart",
        activeLane: "Active register lane",
        parkSale: "Park sale",
        clearCart: "Clear cart",
        heldSales: "Parked sales",
        heldHint: "Park a sale, serve the next customer, then resume exactly where you left off.",
        resume: "Resume",
        items: "items",
        item: "item",
        emptyCart: "Cart is empty",
        quantity: "Quantity",
        checkoutCurrency: "Checkout currency",
        exchangeRate: "Exchange rate",
        manualRate: "Manual rate, not from live feed",
        cashReceived: "Cash received",
        changeDue: "Change due",
        subtotal: "Subtotal",
        totalSelected: "Total in selected currency",
        total: "Total",
        checkout: "Checkout",
        exact: "Exact",
        newSale: "New sale",
        printReceipt: "Print receipt",
        offlineRates: "Using last known rates because the live feed is unavailable.",
        staleRates: "Rates are older than one hour. Review before completing the sale.",
        missingRate: "A manual exchange rate is required before checkout.",
        manualRateValue: "Manual rate value",
      };

  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [receipt, setReceipt] = useState<CheckoutResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [scanFeedback, setScanFeedback] = useState<ScanFeedback | null>(null);
  const [lastAddedInfo, setLastAddedInfo] = useState<LastAddedInfo | null>(null);
  const [checkoutCurrency, setCheckoutCurrency] = useState<SupportedCurrency>("EGP");
  const [rateQuotes, setRateQuotes] = useState<Record<string, ExchangeRateQuote>>({});
  const [ratesUpdatedAt, setRatesUpdatedAt] = useState<string | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [areRatesStale, setAreRatesStale] = useState(false);
  const [isRatesLoading, setIsRatesLoading] = useState(false);
  const [rateError, setRateError] = useState<string | null>(null);
  const [rateMode, setRateMode] = useState<"auto" | "manual">("auto");
  const [manualRateInput, setManualRateInput] = useState("");
  const [cashReceivedInput, setCashReceivedInput] = useState("");
  const [heldSales, setHeldSales] = useState<HeldSale[]>([]);
  const [saleCounter, setSaleCounter] = useState(1);

  const searchRef = useRef<HTMLInputElement>(null);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const scanTimeout = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const focusSearch = useCallback(() => {
    window.requestAnimationFrame(() => {
      searchRef.current?.focus();
      searchRef.current?.select();
    });
  }, []);

  const playSuccessTone = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = audioContextRef.current ?? new AudioCtx();
      audioContextRef.current = ctx;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(920, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1220, ctx.currentTime + 0.09);
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.12);
    } catch {}
  }, []);

  const subtotalEgp = useMemo(() => cart.reduce((sum, item) => sum + item.subtotal, 0), [cart]);
  const selectedQuote = checkoutCurrency === "EGP" ? null : rateQuotes[checkoutCurrency];
  const manualRateValue = parseMoneyInput(manualRateInput);
  const effectiveRate = checkoutCurrency === "EGP"
    ? 1
    : rateMode === "manual"
      ? manualRateValue
      : selectedQuote?.egpPerUnit ?? null;
  const totalInSelectedCurrency = checkoutCurrency === "EGP"
    ? subtotalEgp
    : effectiveRate && effectiveRate > 0
      ? subtotalEgp / effectiveRate
      : null;
  const cashReceived = parseMoneyInput(cashReceivedInput);
  const changeDue = cashReceived !== null && totalInSelectedCurrency !== null
    ? Math.max(cashReceived - totalInSelectedCurrency, 0)
    : null;

  const quickTenderButtons = useMemo(() => {
    if (checkoutCurrency === "EGP" || checkoutCurrency === "RUB") {
      return [copy.exact, "+50", "+100", "+200"];
    }
    return [copy.exact, "+1", "+5", "+10"];
  }, [checkoutCurrency, copy.exact]);

  const showManualRateRequired = checkoutCurrency !== "EGP" && (!effectiveRate || effectiveRate <= 0);
  const showSearchResults = query.trim().length > 0 && searchResults.length > 0;

  const updateCashToExact = useCallback((amount: number | null) => {
    setCashReceivedInput(amount !== null ? formatInputAmount(amount) : "");
  }, []);

  const resetSaleState = useCallback(() => {
    setCart([]);
    setReceipt(null);
    setCheckoutError(null);
    setLastAddedInfo(null);
    setScanFeedback(null);
    setCheckoutCurrency("EGP");
    setRateMode("auto");
    setManualRateInput("");
    setCashReceivedInput("");
    setQuery("");
    setSearchResults([]);
    focusSearch();
  }, [focusSearch]);

  const addProductToCart = useCallback((product: Product) => {
    if (product.currentQuantity <= 0) {
      setScanFeedback({
        tone: "error",
        message: locale === "ar" ? `????? ${product.nameAr || product.name} ????? ??????.` : `${product.name} is out of stock right now.`,
      });
      return false;
    }

    let nextQuantity = 1;
    setCart((current) => {
      const existing = current.find((item) => item.productId === product.id);
      if (existing) {
        nextQuantity = Math.min(existing.quantity + 1, existing.availableQty);
        return current.map((item) => item.productId === product.id
          ? { ...item, quantity: nextQuantity, subtotal: nextQuantity * item.unitPrice }
          : item);
      }
      return [
        {
          productId: product.id,
          name: product.name,
          nameAr: product.nameAr,
          quantity: 1,
          unitPrice: product.price,
          subtotal: product.price,
          availableQty: product.currentQuantity,
        },
        ...current,
      ];
    });

    setLastAddedInfo({
      name: locale === "ar" ? product.nameAr || product.name : product.name,
      quantity: nextQuantity,
      unitPrice: product.price,
      subtotal: nextQuantity * product.price,
    });
    setScanFeedback({
      tone: "success",
      message: locale === "ar" ? `????? ${product.nameAr || product.name} ?????.` : `${product.name} added to cart.`,
    });
    playSuccessTone();
    setQuery("");
    setSearchResults([]);
    focusSearch();
    return true;
  }, [focusSearch, locale, playSuccessTone]);

  const runTextSearch = useCallback(async (term: string) => {
    const token = getTokenForRequest();
    if (!token) return;
    setIsSearching(true);
    try {
      const results = await searchProducts(term, token);
      setSearchResults(results);
      if (results.length === 0) {
        setScanFeedback({
          tone: "info",
          message: locale === "ar" ? "???? ????? ??????? ???? ??? ???? ?? ??????." : "No matching products yet. Try another name or barcode.",
        });
      }
    } finally {
      setIsSearching(false);
    }
  }, [locale]);

  const tryBarcodeSubmit = useCallback(async (barcode: string) => {
    const token = getTokenForRequest();
    if (!token) return false;
    const product = await fetchProductByBarcode(barcode, token);
    if (!product) return false;
    addProductToCart(product);
    return true;
  }, [addProductToCart]);

  useEffect(() => {
    focusSearch();
  }, [focusSearch]);

  useEffect(() => {
    const loadRates = async () => {
      const token = getTokenForRequest();
      if (!token) return;
      setIsRatesLoading(true);
      setRateError(null);
      try {
        const snapshot = await fetchCurrentRates(token);
        setRateQuotes(snapshot.rateDetails ?? {});
        setRatesUpdatedAt(snapshot.updatedAt);
        setIsOfflineMode(snapshot.offlineMode);
        setAreRatesStale(snapshot.stale);
      } catch (error) {
        setRateError(error instanceof Error ? error.message : "Failed to load exchange rates");
      } finally {
        setIsRatesLoading(false);
      }
    };
    void loadRates();
  }, []);

  useEffect(() => {
    if (query.trim().length === 0) {
      setSearchResults([]);
      return;
    }

    const trimmed = query.trim();
    const looksLikeBarcode = /^\d{6,18}$/.test(trimmed);

    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (scanTimeout.current) clearTimeout(scanTimeout.current);

    if (looksLikeBarcode) {
      scanTimeout.current = setTimeout(() => {
        void tryBarcodeSubmit(trimmed);
      }, 140);
      return;
    }

    searchTimeout.current = setTimeout(() => {
      void runTextSearch(trimmed);
    }, 180);

    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
      if (scanTimeout.current) clearTimeout(scanTimeout.current);
    };
  }, [query, runTextSearch, tryBarcodeSubmit]);

  useEffect(() => {
    if (totalInSelectedCurrency !== null && cashReceivedInput.trim().length === 0) {
      updateCashToExact(totalInSelectedCurrency);
    }
  }, [totalInSelectedCurrency, cashReceivedInput, updateCashToExact]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "F9") {
        event.preventDefault();
        const button = document.getElementById("pos-checkout-button");
        button?.click();
      }
      if (event.key === "Escape") {
        setQuery("");
        setSearchResults([]);
        focusSearch();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [focusSearch]);

  const handleSearchKeyDown = useCallback(async (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    if (/^\d{6,18}$/.test(trimmed)) {
      const found = await tryBarcodeSubmit(trimmed);
      if (!found) {
        setScanFeedback({
          tone: "error",
          message: locale === "ar" ? "???????? ?? ?? ?????." : "That barcode was not found.",
        });
      }
      return;
    }

    if (searchResults[0]) {
      addProductToCart(searchResults[0]);
    }
  }, [addProductToCart, locale, query, searchResults, tryBarcodeSubmit]);

  const updateItemQuantity = useCallback((productId: string, delta: number) => {
    setCart((current) => current.flatMap((item) => {
      if (item.productId !== productId) return [item];
      const nextQuantity = item.quantity + delta;
      if (nextQuantity <= 0) return [];
      const clamped = Math.min(nextQuantity, item.availableQty);
      return [{ ...item, quantity: clamped, subtotal: clamped * item.unitPrice }];
    }));
    focusSearch();
  }, [focusSearch]);

  const removeItem = useCallback((productId: string) => {
    setCart((current) => current.filter((item) => item.productId !== productId));
    focusSearch();
  }, [focusSearch]);

  const parkCurrentSale = useCallback(() => {
    if (cart.length === 0) return;
    const held: HeldSale = {
      id: crypto.randomUUID(),
      label: locale === "ar" ? `???? ${saleCounter}` : `Customer ${saleCounter}`,
      cart,
      checkoutCurrency,
      rateMode,
      manualRateInput,
      cashReceivedInput,
    };
    setHeldSales((current) => [held, ...current]);
    setSaleCounter((count) => count + 1);
    setCart([]);
    setReceipt(null);
    setCheckoutError(null);
    setCashReceivedInput("");
    setQuery("");
    setSearchResults([]);
    focusSearch();
  }, [cart, cashReceivedInput, checkoutCurrency, focusSearch, locale, manualRateInput, rateMode, saleCounter]);

  const resumeHeldSale = useCallback((held: HeldSale) => {
    if (cart.length > 0) {
      const displaced: HeldSale = {
        id: crypto.randomUUID(),
        label: locale === "ar" ? `???? ${saleCounter}` : `Customer ${saleCounter}`,
        cart,
        checkoutCurrency,
        rateMode,
        manualRateInput,
        cashReceivedInput,
      };
      setHeldSales((current) => [displaced, ...current.filter((item) => item.id !== held.id)]);
      setSaleCounter((count) => count + 1);
    } else {
      setHeldSales((current) => current.filter((item) => item.id !== held.id));
    }

    setCart(held.cart);
    setCheckoutCurrency(held.checkoutCurrency);
    setRateMode(held.rateMode);
    setManualRateInput(held.manualRateInput);
    setCashReceivedInput(held.cashReceivedInput);
    setReceipt(null);
    setCheckoutError(null);
    setQuery("");
    setSearchResults([]);
    focusSearch();
  }, [cart, cashReceivedInput, checkoutCurrency, focusSearch, locale, manualRateInput, rateMode, saleCounter]);

  const handleQuickTender = useCallback((step: string) => {
    if (step === copy.exact) {
      updateCashToExact(totalInSelectedCurrency);
      return;
    }
    const increment = Number.parseFloat(step.replace("+", ""));
    const current = parseMoneyInput(cashReceivedInput) ?? 0;
    setCashReceivedInput(formatInputAmount(current + increment));
  }, [cashReceivedInput, copy.exact, totalInSelectedCurrency, updateCashToExact]);

  const handleCheckout = useCallback(async () => {
    const token = getTokenForRequest();
    if (!token || cart.length === 0) return;
    if (showManualRateRequired || totalInSelectedCurrency === null) {
      setCheckoutError(copy.missingRate);
      return;
    }

    setIsSubmitting(true);
    setCheckoutError(null);
    try {
      const result = await postCheckout(
        cart.map((item) => ({ productId: item.productId, quantity: item.quantity })),
        token,
        checkoutCurrency,
        checkoutCurrency === "EGP" ? undefined : effectiveRate ?? undefined,
        checkoutCurrency === "EGP" ? undefined : totalInSelectedCurrency,
        subtotalEgp,
        rateMode === "manual"
      );
      setReceipt(result);
      setCart([]);
      setLastAddedInfo(null);
      setScanFeedback({
        tone: "success",
        message: locale === "ar" ? "??? ?????? ?????." : "Sale completed successfully.",
      });
      setCashReceivedInput("");
      setQuery("");
      setSearchResults([]);
      focusSearch();
    } catch (error) {
      const message = typeof error === "object" && error && "message" in error ? String((error as { message?: string }).message) : "Checkout failed";
      setCheckoutError(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [cart, checkoutCurrency, copy.missingRate, effectiveRate, focusSearch, locale, rateMode, showManualRateRequired, subtotalEgp, totalInSelectedCurrency]);

  const handlePrintReceipt = useCallback(async () => {
    if (!receipt) return;
    const token = getTokenForRequest();
    if (!token) return;

    const response = await authenticatedFetch(`${API_ORIGIN}${receipt.receiptUrl}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      setCheckoutError(locale === "ar" ? "???? ????? ???????." : "Unable to load receipt.");
      return;
    }

    const html = await response.text();
    const blob = new Blob([html], { type: "text/html" });
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, "_blank", "noopener,noreferrer");
  }, [locale, receipt]);

  if (!isReady) return null;

  return (
    <div className="space-y-6 pb-10" dir={isRTL ? "rtl" : "ltr"}>
      <section className="lav-page-hero flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#d4a64f]">{locale === "ar" ? "????? ???????" : "Checkout Lane"}</p>
          <div>
            <h1 className="text-3xl font-semibold text-slate-50">{copy.title}</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">{copy.subtitle}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-slate-300">
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">{copy.searchMode}</span>
          <span className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-2">{copy.fallbackMode}</span>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_460px]">
        <section className="space-y-4">
          <div className="lav-command-strip p-4">
            <div className="relative">
              <svg className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" />
              </svg>
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setScanFeedback(null);
                }}
                onKeyDown={handleSearchKeyDown}
                placeholder={copy.searchPlaceholder}
                className="h-14 w-full rounded-2xl border border-slate-700 bg-slate-950/60 pl-14 pr-4 text-base text-slate-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          {(scanFeedback || lastAddedInfo || showSearchResults || isSearching) && (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="lav-data-shell p-4 min-h-[240px]">
                {isSearching ? (
                  <div className="flex h-full items-center justify-center text-sm text-slate-400">{locale === "ar" ? "?????? ??? ???????..." : "Searching products..."}</div>
                ) : showSearchResults ? (
                  <div className="space-y-3">
                    {searchResults.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => addProductToCart(product)}
                        className="w-full rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-4 text-left transition hover:border-emerald-500/40 hover:bg-slate-900"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="text-base font-semibold text-slate-100">{locale === "ar" ? product.nameAr || product.name : product.name}</p>
                            <p className="mt-1 text-xs text-slate-400">{product.barcode || "-"}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-emerald-400">{formatMoney(product.price, "EGP", locale)}</p>
                            <p className="mt-1 text-xs text-slate-400">{product.currentQuantity} {locale === "ar" ? "????" : "in stock"}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-800 text-sm text-slate-500">
                    {locale === "ar" ? "???? ??? ?? ???? ??? ????? ?????? ???." : "Scan an item or type a name and results will appear here."}
                  </div>
                )}
              </div>

              <div className="lav-data-shell p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#d4a64f]">{copy.lastScanned}</p>
                {lastAddedInfo ? (
                  <div className="mt-4 space-y-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                    <p className="text-lg font-semibold text-slate-50">{lastAddedInfo.name}</p>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div className="rounded-xl border border-white/5 bg-slate-950/30 p-3">
                        <p className="text-slate-400">{copy.quantity}</p>
                        <p className="mt-1 text-xl font-semibold text-slate-50">{lastAddedInfo.quantity}</p>
                      </div>
                      <div className="rounded-xl border border-white/5 bg-slate-950/30 p-3">
                        <p className="text-slate-400">{locale === "ar" ? "??? ??????" : "Unit"}</p>
                        <p className="mt-1 text-base font-semibold text-slate-50">{formatMoney(lastAddedInfo.unitPrice, "EGP", locale)}</p>
                      </div>
                      <div className="rounded-xl border border-white/5 bg-slate-950/30 p-3">
                        <p className="text-slate-400">{locale === "ar" ? "????????" : "Line total"}</p>
                        <p className="mt-1 text-base font-semibold text-emerald-400">{formatMoney(lastAddedInfo.subtotal, "EGP", locale)}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-slate-800 p-5 text-sm text-slate-500">
                    {locale === "ar" ? "??? ???? ??? ????? ?? ?????? ??." : "No item has been added in this lane yet."}
                  </div>
                )}
                {scanFeedback && (
                  <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${scanFeedback.tone === "success" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : scanFeedback.tone === "error" ? "border-rose-500/30 bg-rose-500/10 text-rose-200" : "border-slate-700 bg-slate-900/60 text-slate-300"}`}>
                    {scanFeedback.message}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        <aside className="lav-data-shell overflow-hidden">
          <div className="flex items-start justify-between gap-3 border-b border-slate-800 px-5 py-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-semibold text-slate-50">{copy.cart}</h2>
                <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-semibold text-slate-950">{cart.length}</span>
              </div>
              <p className="mt-1 text-sm text-slate-400">{copy.activeLane}</p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <button type="button" onClick={parkCurrentSale} className="rounded-full border border-slate-700 px-4 py-2 text-slate-100 transition hover:border-emerald-500/40 hover:text-emerald-200">{copy.parkSale}</button>
              <button type="button" onClick={resetSaleState} className="text-rose-300 transition hover:text-rose-200">{copy.clearCart}</button>
            </div>
          </div>

          <div className="max-h-[300px] overflow-y-auto">
            {cart.length === 0 ? (
              <div className="px-5 py-14 text-center text-slate-500">{copy.emptyCart}</div>
            ) : (
              cart.map((item) => (
                <div key={item.productId} className="border-b border-slate-800 px-5 py-4 last:border-b-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xl font-semibold text-slate-100">{locale === "ar" ? item.nameAr || item.name : item.name}</p>
                      <div className="mt-3 flex items-center gap-3">
                        <button type="button" onClick={() => updateItemQuantity(item.productId, -1)} className="h-8 w-8 rounded-xl border border-slate-700 text-lg text-slate-200">-</button>
                        <span className="min-w-[1.5rem] text-center font-semibold text-slate-50">{item.quantity}</span>
                        <button type="button" onClick={() => updateItemQuantity(item.productId, 1)} className="h-8 w-8 rounded-xl border border-slate-700 text-lg text-slate-200">+</button>
                      </div>
                    </div>
                    <div className="text-right">
                      <button type="button" onClick={() => removeItem(item.productId)} className="mb-4 text-xl leading-none text-slate-500 hover:text-slate-300">×</button>
                      <p className="text-xl font-semibold text-emerald-400">{formatMoney(item.subtotal, "EGP", locale)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="space-y-4 border-t border-slate-800 px-5 py-4">
            {heldSales.length > 0 && (
              <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#d4a64f]">{copy.heldSales}</p>
                  <p className="mt-1 text-sm text-slate-400">{copy.heldHint}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {heldSales.map((held) => {
                    const itemCount = held.cart.reduce((sum, item) => sum + item.quantity, 0);
                    const total = held.cart.reduce((sum, item) => sum + item.subtotal, 0);
                    return (
                      <button key={held.id} type="button" onClick={() => resumeHeldSale(held)} className="rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-left transition hover:border-emerald-500/40 hover:bg-slate-900">
                        <p className="font-semibold text-slate-100">{held.label}</p>
                        <p className="mt-1 text-sm text-slate-400">{itemCount} {itemCount === 1 ? copy.item : copy.items} · {formatMoney(total, "EGP", locale)}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
              <label className="space-y-2 text-sm text-slate-300">
                <span>{copy.checkoutCurrency}</span>
                <select
                  value={checkoutCurrency}
                  onChange={(event) => {
                    const next = event.target.value as SupportedCurrency;
                    setCheckoutCurrency(next);
                    setReceipt(null);
                    setRateMode("auto");
                    setManualRateInput("");
                    const nextRate = next === "EGP" ? 1 : rateQuotes[next]?.egpPerUnit;
                    const nextTotal = next === "EGP" ? subtotalEgp : nextRate && nextRate > 0 ? subtotalEgp / nextRate : null;
                    updateCashToExact(nextTotal);
                  }}
                  className="h-12 w-full rounded-2xl border border-slate-700 bg-slate-950/60 px-4 text-base text-slate-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                >
                  {SUPPORTED_CURRENCIES.map((currency) => (
                    <option key={currency} value={currency}>{currency}</option>
                  ))}
                </select>
              </label>

              {checkoutCurrency !== "EGP" && (
                <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-100">{copy.exchangeRate}</p>
                      <p className="mt-1 text-sm text-slate-400">
                        {effectiveRate ? `1 ${checkoutCurrency} = ${effectiveRate.toFixed(4)} EGP` : "-"}
                      </p>
                      {ratesUpdatedAt && <p className="mt-2 text-xs text-slate-500">Last updated: {new Date(ratesUpdatedAt).toLocaleString(locale === "ar" ? "ar-EG" : "en-US")}</p>}
                    </div>
                    <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
                      {rateMode === "manual" ? "manual" : "saved rate"}
                    </span>
                  </div>

                  <label className="mt-4 flex items-center gap-2 text-sm text-slate-200">
                    <input type="checkbox" checked={rateMode === "manual"} onChange={(event) => setRateMode(event.target.checked ? "manual" : "auto")} className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-500" />
                    {copy.manualRate}
                  </label>

                  {rateMode === "manual" && (
                    <input
                      type="text"
                      value={manualRateInput}
                      onChange={(event) => setManualRateInput(event.target.value)}
                      placeholder={copy.manualRateValue}
                      className="mt-3 h-11 w-full rounded-2xl border border-slate-700 bg-slate-950/60 px-4 text-slate-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  )}
                </div>
              )}

              {(isOfflineMode || areRatesStale || rateError || showManualRateRequired) && (
                <div className="space-y-2 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-100">
                  {isOfflineMode && <p>{copy.offlineRates}</p>}
                  {areRatesStale && <p>{copy.staleRates}</p>}
                  {showManualRateRequired && <p>{copy.missingRate}</p>}
                  {rateError && <p>{rateError}</p>}
                  {isRatesLoading && <p>{locale === "ar" ? "?????? ????? ?????..." : "Refreshing exchange rates..."}</p>}
                </div>
              )}

              <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-100">{copy.cashReceived}</p>
                    <p className="text-sm text-slate-400">{locale === "ar" ? "????? ????? ??????? ??? ??????." : "Quick cash buttons for the register lane."}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{copy.changeDue}</p>
                    <p className="mt-2 text-3xl font-semibold text-emerald-400">{changeDue !== null && totalInSelectedCurrency !== null ? formatMoney(changeDue, checkoutCurrency, locale) : "--"}</p>
                  </div>
                </div>
                <input
                  type="text"
                  value={cashReceivedInput}
                  onChange={(event) => setCashReceivedInput(event.target.value)}
                  className="mt-4 h-12 w-full rounded-2xl border border-slate-700 bg-slate-950/60 px-4 text-lg text-slate-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {quickTenderButtons.map((step) => (
                    <button key={step} type="button" onClick={() => handleQuickTender(step)} className="rounded-2xl border border-slate-700 px-4 py-3 font-semibold text-slate-100 transition hover:border-emerald-500/40 hover:text-emerald-200">
                      {step}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 border-t border-slate-800 pt-4 text-sm text-slate-300">
                <div className="flex items-center justify-between"><span>{copy.subtotal}</span><span>{formatMoney(subtotalEgp, "EGP", locale)}</span></div>
                {checkoutCurrency !== "EGP" && totalInSelectedCurrency !== null && (
                  <div className="flex items-center justify-between"><span>{copy.totalSelected}</span><span>{formatMoney(totalInSelectedCurrency, checkoutCurrency, locale)}</span></div>
                )}
                <div className="flex items-center justify-between border-t border-slate-800 pt-3 text-2xl font-semibold text-slate-50">
                  <span>{copy.total}</span>
                  <span className="text-emerald-400">{formatMoney(totalInSelectedCurrency ?? subtotalEgp, checkoutCurrency, locale)}</span>
                </div>
              </div>

              {checkoutError && <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{checkoutError}</div>}

              <button id="pos-checkout-button" type="button" onClick={() => void handleCheckout()} disabled={cart.length === 0 || isSubmitting || showManualRateRequired} className="h-14 w-full rounded-2xl bg-emerald-500 text-lg font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500">
                {isSubmitting ? (locale === "ar" ? "???? ???????..." : "Checking out...") : copy.checkout}
              </button>
            </div>
          </div>
        </aside>
      </div>

      {receipt && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 px-4">
          <div className="w-full max-w-md rounded-[28px] border border-slate-700 bg-slate-900 p-6 shadow-2xl shadow-black/40">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" /></svg>
            </div>
            <div className="mt-5 text-center">
              <h3 className="text-3xl font-semibold text-slate-50">{locale === "ar" ? "??? ??????" : "Sale complete"}</h3>
              <p className="mt-2 text-sm text-slate-400">Receipt No.: <span className="font-semibold text-slate-200">{receipt.sale.receiptNumber}</span></p>
            </div>
            <div className="mt-6 space-y-3 rounded-2xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
              <div className="flex justify-between"><span>{locale === "ar" ? "???????? ???????" : "Base total in EGP"}</span><span>{formatMoney(receipt.sale.totalAmount, "EGP", locale)}</span></div>
              {receipt.sale.currency !== "EGP" && receipt.sale.totalAmountForeign !== undefined && (
                <div className="flex justify-between"><span>{locale === "ar" ? "???????? ??????? ????????" : "Total in selected currency"}</span><span>{formatMoney(receipt.sale.totalAmountForeign, receipt.sale.currency, locale)}</span></div>
              )}
              <div className="flex justify-between"><span>VAT</span><span>{formatMoney(receipt.sale.taxAmount, "EGP", locale)}</span></div>
              <div className="flex justify-between"><span>{locale === "ar" ? "??? ???????" : "Items"}</span><span>{receipt.items.length}</span></div>
            </div>
            <div className="mt-6 grid gap-3">
              <button type="button" onClick={() => void handlePrintReceipt()} className="h-12 rounded-2xl bg-emerald-500 font-semibold text-slate-950 transition hover:bg-emerald-400">{copy.printReceipt}</button>
              <button type="button" onClick={resetSaleState} className="h-12 rounded-2xl border border-slate-700 font-semibold text-slate-100 transition hover:border-slate-500">{copy.newSale}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

