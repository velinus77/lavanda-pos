"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { authenticatedFetch, getTokenForRequest } from "@/lib/auth";
import { useLocale } from "@/contexts/LocaleProvider";
import { useDashboardAccess } from "@/lib/use-dashboard-access";
import Modal from "@/components/ui/Modal";
import { calculateSurcharge } from "./surcharge.utils";

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
  paymentMethod: PaymentMethod;
  rateMode: "auto" | "manual";
  manualRateInput: string;
  cashReceivedInput: string;
}

type PaymentMethod = "cash" | "card";

interface ReceiptSummaryItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface ReceiptSummary {
  receiptNumber: string;
  receiptUrl: string;
  paymentMethod: PaymentMethod;
  currency: SupportedCurrency;
  subtotal: number;
  surcharge: number;
  total: number;
  changeGiven: number | null;
  timestamp: string;
  items: ReceiptSummaryItem[];
}

const RAW_API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const API_BASE = RAW_API_BASE.endsWith("/api") ? RAW_API_BASE : `${RAW_API_BASE}/api`;
const SUPPORTED_CURRENCIES = ["EGP", "USD", "EUR", "GBP", "RUB"] as const;
type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];
const CARD_SURCHARGE_CONFIG = {
  enabled: true,
  percent: 2.75,
  flat: 3.0,
  roundTo: 0.25,
} as const;

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
    return locale === "ar" ? `${formatted} ج.م` : `${formatted} EGP`;
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
  paymentMethod: PaymentMethod,
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
      paymentMethod,
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
        title: "نقطة البيع",
        subtitle: "امسح الباركود بسرعة، ولو احتجت دوّر بالاسم، وكمّل البيعة من غير تعطيل.",
        searchPlaceholder: "امسح الباركود أو دوّر على الصنف...",
        searchMode: "جاهز للمسح",
        fallbackMode: "بحث يدوي",
        lastScanned: "آخر صنف",
        cart: "السلة",
        activeLane: "العميل الحالي",
        parkSale: "ركّن البيعة",
        clearCart: "فضّي السلة",
        heldSales: "البيعات المركونة",
        heldHint: "ركّن البيعة الحالية وخد اللي بعدها، وبعدها ارجع كمّل من نفس المكان.",
        resume: "كمّل",
        items: "أصناف",
        item: "صنف",
        emptyCart: "السلة فاضية",
        quantity: "الكمية",
        checkoutCurrency: "عملة الدفع",
        exchangeRate: "سعر الصرف",
        manualRate: "سعر يدوي، مش من المصدر المباشر",
        paymentMethod: "طريقة الدفع",
        cash: "كاش",
        card: "كارت",
        cashReceived: "المبلغ المستلم",
        changeDue: "الباقي",
        cardSurcharge: "رسوم الكارت",
        subtotal: "الإجمالي قبل الدفع",
        totalSelected: "الإجمالي بالعملة المختارة",
        total: "الإجمالي",
        checkout: "كمّل البيع",
        processCardPayment: "نفّذ دفع الكارت",
        exact: "المظبوط",
        newSale: "بيعة جديدة",
        printReceipt: "اطبع الإيصال",
        cancel: "إلغاء",
        confirmAndCompleteSale: "أكد وأكمل البيعة",
        cardConfirmTitle: "تأكيد دفع الكارت",
        chargeCardPrompt: "تحصيل",
        receiptSummaryTitle: "ملخص الإيصال",
        paymentMethodLabel: "طريقة الدفع",
        changeGiven: "الباقي المصروف",
        timestamp: "الوقت",
        cashQuickHint: "أزرار سريعة للكاشير وقت الزحمة.",
        cardProcessingHint: "رسوم الدفع بالكارت مضافة على الإجمالي النهائي.",
        cashValidationError: "لازم المبلغ المستلم يكون مساوي أو أكبر من الإجمالي.",
        saleComplete: "البيعة اكتملت",
        saleCompletedSuccessfully: "البيعة تمت بنجاح.",
        offlineRates: "شغالين بآخر سعر محفوظ لأن الخدمة الخارجية مش متاحة دلوقتي.",
        staleRates: "أسعار الصرف بقالها أكتر من ساعة. راجعها قبل ما تكمّل.",
        missingRate: "لازم تدخل سعر صرف قبل إنهاء البيعة.",
        manualRateValue: "قيمة السعر اليدوي",
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
        paymentMethod: "Payment method",
        cash: "Cash",
        card: "Card",
        cashReceived: "Cash received",
        changeDue: "Change due",
        cardSurcharge: "Card surcharge",
        subtotal: "Subtotal",
        totalSelected: "Total in selected currency",
        total: "Total",
        checkout: "Checkout",
        processCardPayment: "Process Card Payment",
        exact: "Exact",
        newSale: "New sale",
        printReceipt: "Print receipt",
        cancel: "Cancel",
        confirmAndCompleteSale: "Confirm & Complete Sale",
        cardConfirmTitle: "Confirm card payment",
        chargeCardPrompt: "Charge",
        receiptSummaryTitle: "Receipt summary",
        paymentMethodLabel: "Payment method",
        changeGiven: "Change given",
        timestamp: "Timestamp",
        cashQuickHint: "Quick cash buttons for the register lane.",
        cardProcessingHint: "Card fees are added to the checkout total.",
        cashValidationError: "Cash received must cover the total due.",
        saleComplete: "Sale complete",
        saleCompletedSuccessfully: "Sale completed successfully.",
        offlineRates: "Using last known rates because the live feed is unavailable.",
        staleRates: "Rates are older than one hour. Review before completing the sale.",
        missingRate: "A manual exchange rate is required before checkout.",
        manualRateValue: "Manual rate value",
      };

  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [receipt, setReceipt] = useState<ReceiptSummary | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [scanFeedback, setScanFeedback] = useState<ScanFeedback | null>(null);
  const [lastAddedInfo, setLastAddedInfo] = useState<LastAddedInfo | null>(null);
  const [checkoutCurrency, setCheckoutCurrency] = useState<SupportedCurrency>("EGP");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [isCardConfirmOpen, setIsCardConfirmOpen] = useState(false);
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
  const baseCheckoutTotal = totalInSelectedCurrency ?? subtotalEgp;
  const cardSurcharge = useMemo(() => (
    paymentMethod === "card" && totalInSelectedCurrency !== null
      ? calculateSurcharge(Math.round(totalInSelectedCurrency * 100), CARD_SURCHARGE_CONFIG) / 100
      : 0
  ), [paymentMethod, totalInSelectedCurrency]);
  const totalDue = baseCheckoutTotal + cardSurcharge;
  const cashReceived = parseMoneyInput(cashReceivedInput);
  const changeDue = paymentMethod === "cash" && cashReceived !== null
    ? Math.max(cashReceived - totalDue, 0)
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
    setPaymentMethod("cash");
    setIsCardConfirmOpen(false);
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
        message: locale === "ar" ? `الصنف ${product.nameAr || product.name} خلصان دلوقتي.` : `${product.name} is out of stock right now.`,
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
      message: locale === "ar" ? `اتضاف ${product.nameAr || product.name} للسلة.` : `${product.name} added to cart.`,
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
          message: locale === "ar" ? "مفيش أصناف مطابقة دلوقتي. جرّب اسم تاني أو باركود." : "No matching products yet. Try another name or barcode.",
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
    if (paymentMethod === "cash" && totalInSelectedCurrency !== null && cashReceivedInput.trim().length === 0) {
      updateCashToExact(totalDue);
    }
  }, [paymentMethod, totalDue, totalInSelectedCurrency, cashReceivedInput, updateCashToExact]);

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
          message: locale === "ar" ? "الباركود ده مش موجود." : "That barcode was not found.",
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
      label: locale === "ar" ? `عميل ${saleCounter}` : `Customer ${saleCounter}`,
      cart,
      checkoutCurrency,
      paymentMethod,
      rateMode,
      manualRateInput,
      cashReceivedInput,
    };
    setHeldSales((current) => [held, ...current]);
    setSaleCounter((count) => count + 1);
    setCart([]);
    setReceipt(null);
    setCheckoutError(null);
    setPaymentMethod("cash");
    setCashReceivedInput("");
    setQuery("");
    setSearchResults([]);
    focusSearch();
  }, [cart, cashReceivedInput, checkoutCurrency, focusSearch, locale, manualRateInput, paymentMethod, rateMode, saleCounter]);

  const resumeHeldSale = useCallback((held: HeldSale) => {
    if (cart.length > 0) {
      const displaced: HeldSale = {
        id: crypto.randomUUID(),
        label: locale === "ar" ? `عميل ${saleCounter}` : `Customer ${saleCounter}`,
        cart,
        checkoutCurrency,
        paymentMethod,
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
    setPaymentMethod(held.paymentMethod);
    setRateMode(held.rateMode);
    setManualRateInput(held.manualRateInput);
    setCashReceivedInput(held.cashReceivedInput);
    setReceipt(null);
    setCheckoutError(null);
    setQuery("");
    setSearchResults([]);
    focusSearch();
  }, [cart, cashReceivedInput, checkoutCurrency, focusSearch, locale, manualRateInput, paymentMethod, rateMode, saleCounter]);

  const handleQuickTender = useCallback((step: string) => {
    if (step === copy.exact) {
      updateCashToExact(totalDue);
      return;
    }
    const increment = Number.parseFloat(step.replace("+", ""));
    const current = parseMoneyInput(cashReceivedInput) ?? 0;
    setCashReceivedInput(formatInputAmount(current + increment));
  }, [cashReceivedInput, copy.exact, totalDue, updateCashToExact]);

  const completeSale = useCallback(async (method: PaymentMethod) => {
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
        method,
        checkoutCurrency,
        checkoutCurrency === "EGP" ? undefined : effectiveRate ?? undefined,
        checkoutCurrency === "EGP" ? undefined : totalInSelectedCurrency,
        subtotalEgp,
        rateMode === "manual"
      );
      setReceipt({
        receiptNumber: result.sale.receiptNumber,
        receiptUrl: result.receiptUrl,
        paymentMethod: method,
        currency: checkoutCurrency,
        subtotal: baseCheckoutTotal,
        surcharge: method === "card" ? cardSurcharge : 0,
        total: method === "card" ? totalDue : baseCheckoutTotal,
        changeGiven: method === "cash" ? changeDue ?? 0 : null,
        timestamp: result.sale.createdAt,
        items: cart.map((item) => ({
          productId: item.productId,
          productName: locale === "ar" ? item.nameAr || item.name : item.name,
          quantity: item.quantity,
          unitPrice: checkoutCurrency === "EGP" ? item.unitPrice : item.unitPrice / (effectiveRate ?? 1),
          subtotal: checkoutCurrency === "EGP" ? item.subtotal : item.subtotal / (effectiveRate ?? 1),
        })),
      });
      setCart([]);
      setLastAddedInfo(null);
      setScanFeedback({
        tone: "success",
        message: copy.saleCompletedSuccessfully,
      });
      setCashReceivedInput("");
      setPaymentMethod("cash");
      setIsCardConfirmOpen(false);
      setQuery("");
      setSearchResults([]);
      focusSearch();
    } catch (error) {
      const message = typeof error === "object" && error && "message" in error ? String((error as { message?: string }).message) : "Checkout failed";
      setCheckoutError(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [baseCheckoutTotal, cardSurcharge, cart, changeDue, checkoutCurrency, copy.missingRate, copy.saleCompletedSuccessfully, effectiveRate, focusSearch, locale, rateMode, showManualRateRequired, subtotalEgp, totalDue, totalInSelectedCurrency]);

  const handleCheckout = useCallback(async () => {
    if (showManualRateRequired || totalInSelectedCurrency === null) {
      setCheckoutError(copy.missingRate);
      return;
    }

    if (paymentMethod === "card") {
      setIsCardConfirmOpen(true);
      setCheckoutError(null);
      return;
    }

    if (cashReceived === null || cashReceived < totalDue) {
      setCheckoutError(copy.cashValidationError);
      return;
    }

    await completeSale("cash");
  }, [cashReceived, completeSale, copy.cashValidationError, copy.missingRate, paymentMethod, showManualRateRequired, totalDue, totalInSelectedCurrency]);

  const handleConfirmCardPayment = useCallback(async () => {
    await completeSale("card");
  }, [completeSale]);

  const handlePrintReceipt = useCallback(async () => {
    if (!receipt) return;
    const escapeHtml = (value: string) =>
      value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");

    const itemRows = receipt.items
      .map((item, index) => `
        <tr>
          <td class="item-name">
            <span class="item-index">${String(index + 1).padStart(2, "0")}</span>
            <div>
              <div class="item-title">${escapeHtml(item.productName)}</div>
              <div class="item-meta">${item.quantity} x ${formatMoney(item.unitPrice, receipt.currency, locale)}</div>
            </div>
          </td>
          <td class="item-total">${formatMoney(item.subtotal, receipt.currency, locale)}</td>
        </tr>
      `)
      .join("");

    const surchargeRow = receipt.paymentMethod === "card"
      ? `<div class="total-row"><span>${locale === "ar" ? "رسوم الكارت" : "Card surcharge"}</span><span>${formatMoney(receipt.surcharge, receipt.currency, locale)}</span></div>`
      : "";

    const changeRow = receipt.changeGiven !== null
      ? `<div class="meta-block"><span class="meta-label">${locale === "ar" ? "الباقي" : "Change"}</span><span class="meta-value">${formatMoney(receipt.changeGiven, receipt.currency, locale)}</span></div>`
      : "";

    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${receipt.receiptNumber}</title>
    <style>
      :root {
        color-scheme: light;
        --ink: #000000;
        --muted: #444444;
        --line: #000000;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 0;
        background: #ffffff;
        color: var(--ink);
        font-family: "Segoe UI", Arial, sans-serif;
      }
      .receipt {
        width: 302px;
        margin: 0 auto;
        background: #ffffff;
        padding: 10px 10px 14px;
      }
      .header {
        padding: 0 0 10px;
        border-bottom: 1px dashed var(--line);
        text-align: center;
      }
      .eyebrow {
        margin: 0 0 6px;
        color: var(--muted);
        font-size: 9px;
        letter-spacing: 0.22em;
        text-transform: uppercase;
        font-weight: 700;
      }
      .brand h1 {
        margin: 0;
        font-size: 26px;
        line-height: 1.05;
        letter-spacing: -0.03em;
        font-weight: 800;
      }
      .subbrand {
        margin-top: 4px;
        color: var(--muted);
        font-size: 11px;
      }
      .meta,
      .totals,
      .footer {
        padding: 10px 0;
      }
      .meta {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px 12px;
        border-bottom: 1px dashed var(--line);
      }
      .meta-label {
        display: block;
        color: var(--muted);
        font-size: 9px;
        text-transform: uppercase;
        letter-spacing: 0.14em;
        margin-bottom: 3px;
      }
      .meta-value {
        font-size: 12px;
        font-weight: 600;
      }
      .items {
        width: 100%;
        border-collapse: collapse;
      }
      .items-wrap {
        padding: 6px 0 4px;
      }
      .items tr + tr td {
        border-top: 1px dotted var(--line);
      }
      .item-name,
      .item-total {
        padding: 10px 0;
        vertical-align: top;
      }
      .item-name {
        display: flex;
        gap: 8px;
        align-items: flex-start;
      }
      .item-index {
        min-width: 20px;
        height: 20px;
        border: 1px solid var(--line);
        display: inline-grid;
        place-items: center;
        background: #ffffff;
        color: var(--ink);
        font-size: 10px;
        font-weight: 700;
      }
      .item-title {
        font-size: 13px;
        font-weight: 700;
        line-height: 1.3;
      }
      .item-meta {
        margin-top: 3px;
        color: var(--muted);
        font-size: 11px;
      }
      .item-total {
        width: 1%;
        white-space: nowrap;
        text-align: right;
        font-size: 12px;
        font-weight: 700;
      }
      .totals {
        border-top: 1px dashed var(--line);
        border-bottom: 1px dashed var(--line);
      }
      .total-row {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        font-size: 12px;
        padding: 4px 0;
      }
      .total-row.grand {
        margin-top: 4px;
        padding-top: 8px;
        border-top: 1px solid var(--line);
        font-size: 14px;
        font-weight: 800;
      }
      .footer {
        text-align: center;
        font-size: 11px;
      }
      .footer strong {
        display: block;
        margin-bottom: 4px;
      }
    </style>
  </head>
  <body onload="window.print(); setTimeout(() => window.close(), 150);">
    <div class="receipt">
      <div class="header">
        <div class="eyebrow">Pharmacy Operations</div>
        <div class="brand"><h1>Lavanda</h1></div>
        <div class="subbrand">Pharmacy POS Receipt</div>
      </div>

      <div class="meta">
        <div class="meta-block">
          <span class="meta-label">${locale === "ar" ? "رقم الإيصال" : "Receipt No."}</span>
          <span class="meta-value">${receipt.receiptNumber}</span>
        </div>
        <div class="meta-block">
          <span class="meta-label">${locale === "ar" ? "وقت الإصدار" : "Issued At"}</span>
          <span class="meta-value">${new Date(receipt.timestamp).toLocaleString(locale === "ar" ? "ar-EG" : "en-GB")}</span>
        </div>
        <div class="meta-block">
          <span class="meta-label">${locale === "ar" ? "الدفع" : "Payment"}</span>
          <span class="meta-value">${receipt.paymentMethod === "card" ? copy.card : copy.cash}</span>
        </div>
        <div class="meta-block">
          <span class="meta-label">${locale === "ar" ? "العملة" : "Currency"}</span>
          <span class="meta-value">${receipt.currency}</span>
        </div>
        ${changeRow}
      </div>

      <div class="items-wrap">
        <table class="items">
          ${itemRows}
        </table>
      </div>

      <div class="totals">
        <div class="total-row"><span>${copy.subtotal}</span><span>${formatMoney(receipt.subtotal, receipt.currency, locale)}</span></div>
        ${surchargeRow}
        <div class="total-row grand"><span>${copy.total}</span><span>${formatMoney(receipt.total, receipt.currency, locale)}</span></div>
      </div>

      <div class="footer">
        <strong>${locale === "ar" ? "شكرا لاختياركم لافاندا" : "Thank you for choosing Lavanda"}</strong>
        <span>${locale === "ar" ? "احتفظ بهذا الإيصال للمراجعة أو الاستبدال." : "Keep this receipt for returns, exchanges, and batch traceability."}</span>
      </div>
    </div>
  </body>
</html>`;

    const blob = new Blob([html], { type: "text/html" });
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, "_blank", "noopener,noreferrer");
  }, [copy.card, copy.cash, copy.subtotal, copy.total, locale, receipt]);

  if (!isReady) return null;

  return (
    <div className="space-y-6 pb-10" dir={isRTL ? "rtl" : "ltr"}>
      <section className="lav-page-hero flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--accent)]">{locale === "ar" ? "منطقة الكاشير" : "Checkout Lane"}</p>
          <div>
            <h1 className="text-3xl font-semibold text-[var(--foreground)]">{copy.title}</h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">{copy.subtitle}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 text-xs">
          <span className="rounded-full border px-3 py-2 text-[var(--action-strong)]" style={{ borderColor: 'color-mix(in srgb, var(--action) 32%, transparent)', background: 'color-mix(in srgb, var(--action) 12%, transparent)' }}>{copy.searchMode}</span>
          <span className="rounded-full border px-3 py-2 text-[var(--foreground)]" style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--surface) 86%, transparent)' }}>{copy.fallbackMode}</span>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_460px]">
        <section className="space-y-4">
          <div className="lav-command-strip p-4">
            <div className="relative">
              <svg className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--muted)]" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
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
                className="lav-input h-14 w-full pl-14 pr-4 text-base"
              />
            </div>
          </div>

          {(scanFeedback || lastAddedInfo || showSearchResults || isSearching) && (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="lav-data-shell p-4 min-h-[240px]">
                {isSearching ? (
                  <div className="flex h-full items-center justify-center text-sm text-[var(--muted)]">{locale === "ar" ? "بندور على الأصناف..." : "Searching products..."}</div>
                ) : showSearchResults ? (
                  <div className="space-y-3">
                    {searchResults.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => addProductToCart(product)}
                        className="w-full rounded-2xl border px-4 py-4 text-left transition"
                        style={{
                          borderColor: 'color-mix(in srgb, var(--border) 86%, transparent)',
                          background: 'color-mix(in srgb, var(--surface) 82%, transparent)',
                        }}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="text-base font-semibold text-[var(--foreground)]">{locale === "ar" ? product.nameAr || product.name : product.name}</p>
                            <p className="mt-1 text-xs text-[var(--muted)]">{product.barcode || "-"}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-[var(--action)]">{formatMoney(product.price, "EGP", locale)}</p>
                            <p className="mt-1 text-xs text-[var(--muted)]">{product.currentQuantity} {locale === "ar" ? "متاح" : "in stock"}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-2xl border border-dashed text-sm text-[var(--muted)]" style={{ borderColor: 'color-mix(in srgb, var(--border) 88%, transparent)' }}>
                    {locale === "ar" ? "امسح صنف أو اكتب اسم الدوا وهيظهر هنا." : "Scan an item or type a name and results will appear here."}
                  </div>
                )}
              </div>

              <div className="lav-data-shell p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--accent)]">{copy.lastScanned}</p>
                {lastAddedInfo ? (
                  <div className="mt-4 space-y-4 rounded-2xl border p-4" style={{ borderColor: 'color-mix(in srgb, var(--action) 32%, transparent)', background: 'color-mix(in srgb, var(--action) 10%, transparent)' }}>
                    <p className="text-lg font-semibold text-[var(--foreground)]">{lastAddedInfo.name}</p>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div className="rounded-xl border p-3" style={{ borderColor: 'color-mix(in srgb, var(--border) 76%, transparent)', background: 'color-mix(in srgb, var(--card) 92%, transparent)' }}>
                        <p className="text-[var(--muted)]">{copy.quantity}</p>
                        <p className="mt-1 text-xl font-semibold text-[var(--foreground)]">{lastAddedInfo.quantity}</p>
                      </div>
                      <div className="rounded-xl border p-3" style={{ borderColor: 'color-mix(in srgb, var(--border) 76%, transparent)', background: 'color-mix(in srgb, var(--card) 92%, transparent)' }}>
                        <p className="text-[var(--muted)]">{locale === "ar" ? "سعر الوحدة" : "Unit"}</p>
                        <p className="mt-1 text-base font-semibold text-[var(--foreground)]">{formatMoney(lastAddedInfo.unitPrice, "EGP", locale)}</p>
                      </div>
                      <div className="rounded-xl border p-3" style={{ borderColor: 'color-mix(in srgb, var(--border) 76%, transparent)', background: 'color-mix(in srgb, var(--card) 92%, transparent)' }}>
                        <p className="text-[var(--muted)]">{locale === "ar" ? "إجمالي السطر" : "Line total"}</p>
                        <p className="mt-1 text-base font-semibold text-[var(--action)]">{formatMoney(lastAddedInfo.subtotal, "EGP", locale)}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed p-5 text-sm text-[var(--muted)]" style={{ borderColor: 'color-mix(in srgb, var(--border) 88%, transparent)' }}>
                    {locale === "ar" ? "لسه مفيش صنف اتضاف في الجولة دي." : "No item has been added in this lane yet."}
                  </div>
                )}
                {scanFeedback && (
                  <div
                    className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
                      scanFeedback.tone === "success"
                        ? "text-[var(--action-strong)]"
                        : scanFeedback.tone === "error"
                          ? "text-[var(--danger)]"
                          : "text-[var(--foreground)]"
                    }`}
                    style={
                      scanFeedback.tone === "success"
                        ? { borderColor: 'color-mix(in srgb, var(--action) 32%, transparent)', background: 'color-mix(in srgb, var(--action) 10%, transparent)' }
                        : scanFeedback.tone === "error"
                          ? { borderColor: 'color-mix(in srgb, var(--danger) 32%, transparent)', background: 'color-mix(in srgb, var(--danger) 10%, transparent)' }
                          : { borderColor: 'color-mix(in srgb, var(--border) 86%, transparent)', background: 'color-mix(in srgb, var(--surface) 84%, transparent)' }
                    }
                  >
                    {scanFeedback.message}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        <aside className="lav-data-shell overflow-hidden xl:sticky xl:top-6 xl:flex xl:max-h-[calc(100vh-2.5rem)] xl:flex-col xl:self-start">
          <div className="flex items-start justify-between gap-3 border-b px-5 py-4" style={{ borderColor: 'color-mix(in srgb, var(--border) 88%, transparent)' }}>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-semibold text-[var(--foreground)]">{copy.cart}</h2>
                <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-semibold text-slate-950">{cart.length}</span>
              </div>
              <p className="mt-1 text-sm text-[var(--muted)]">{copy.activeLane}</p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <button type="button" onClick={parkCurrentSale} className="rounded-full border px-4 py-2 text-[var(--foreground)] transition" style={{ borderColor: 'var(--border)' }}>{copy.parkSale}</button>
              <button type="button" onClick={resetSaleState} className="text-[var(--danger)] transition">{copy.clearCart}</button>
            </div>
          </div>

          <div className={`max-h-[300px] overflow-y-auto ${paymentMethod === "cash" ? "xl:max-h-[200px] 2xl:max-h-[260px]" : "xl:max-h-[260px] 2xl:max-h-[320px]"}`}>
            {cart.length === 0 ? (
              <div className="px-5 py-14 text-center text-[var(--muted)]">{copy.emptyCart}</div>
            ) : (
              cart.map((item) => (
                <div key={item.productId} className="border-b px-5 py-4 last:border-b-0" style={{ borderColor: 'color-mix(in srgb, var(--border) 88%, transparent)' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xl font-semibold text-[var(--foreground)]">{locale === "ar" ? item.nameAr || item.name : item.name}</p>
                      <div className="mt-3 flex items-center gap-3">
                        <button type="button" onClick={() => updateItemQuantity(item.productId, -1)} className="h-8 w-8 rounded-xl border text-lg text-[var(--foreground)]" style={{ borderColor: 'var(--border)' }}>-</button>
                        <span className="min-w-[1.5rem] text-center font-semibold text-[var(--foreground)]">{item.quantity}</span>
                        <button type="button" onClick={() => updateItemQuantity(item.productId, 1)} className="h-8 w-8 rounded-xl border text-lg text-[var(--foreground)]" style={{ borderColor: 'var(--border)' }}>+</button>
                      </div>
                    </div>
                    <div className="text-right">
                      <button type="button" onClick={() => removeItem(item.productId)} className="mb-4 text-xl leading-none text-[var(--muted)]">×</button>
                      <p className="text-xl font-semibold text-[var(--action)]">{formatMoney(item.subtotal, "EGP", locale)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="space-y-4 border-t px-5 py-4 xl:bg-[color:color-mix(in_srgb,var(--card)_98%,transparent)]" style={{ borderColor: 'color-mix(in srgb, var(--border) 88%, transparent)' }}>
            {heldSales.length > 0 && (
              <div className="space-y-3 rounded-2xl border p-4" style={{ borderColor: 'color-mix(in srgb, var(--border) 88%, transparent)', background: 'color-mix(in srgb, var(--surface) 90%, transparent)' }}>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--accent)]">{copy.heldSales}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">{copy.heldHint}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {heldSales.map((held) => {
                    const itemCount = held.cart.reduce((sum, item) => sum + item.quantity, 0);
                    const total = held.cart.reduce((sum, item) => sum + item.subtotal, 0);
                    return (
                      <button key={held.id} type="button" onClick={() => resumeHeldSale(held)} className="rounded-2xl border px-4 py-3 text-left transition" style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--card) 96%, transparent)' }}>
                        <p className="font-semibold text-[var(--foreground)]">{held.label}</p>
                        <p className="mt-1 text-sm text-[var(--muted)]">{itemCount} {itemCount === 1 ? copy.item : copy.items} · {formatMoney(total, "EGP", locale)}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-4 rounded-2xl border p-4" style={{ borderColor: 'color-mix(in srgb, var(--border) 88%, transparent)', background: 'color-mix(in srgb, var(--surface) 88%, transparent)' }}>
              <label className="space-y-2 text-sm text-[var(--foreground)]">
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
                  className="lav-input h-12 w-full px-4 text-base"
                >
                  {SUPPORTED_CURRENCIES.map((currency) => (
                    <option key={currency} value={currency}>{currency}</option>
                  ))}
                </select>
              </label>

              {checkoutCurrency !== "EGP" && (
                <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--card) 96%, transparent)' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--foreground)]">{copy.exchangeRate}</p>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        {effectiveRate ? `1 ${checkoutCurrency} = ${effectiveRate.toFixed(4)} EGP` : "-"}
                      </p>
                      {ratesUpdatedAt && <p className="mt-2 text-xs text-[var(--muted)]">Last updated: {new Date(ratesUpdatedAt).toLocaleString(locale === "ar" ? "ar-EG" : "en-US")}</p>}
                    </div>
                    <span className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--action-strong)]" style={{ background: 'color-mix(in srgb, var(--action) 12%, transparent)' }}>
                      {rateMode === "manual" ? "manual" : "saved rate"}
                    </span>
                  </div>

                  <label className="mt-4 flex items-center gap-2 text-sm text-[var(--foreground)]">
                    <input type="checkbox" checked={rateMode === "manual"} onChange={(event) => setRateMode(event.target.checked ? "manual" : "auto")} className="h-4 w-4 rounded border-[var(--border)] bg-[var(--card)] text-[var(--action)] focus:ring-[var(--action)]" />
                    {copy.manualRate}
                  </label>

                  {rateMode === "manual" && (
                    <input
                      type="text"
                      value={manualRateInput}
                      onChange={(event) => setManualRateInput(event.target.value)}
                      placeholder={copy.manualRateValue}
                      className="lav-input mt-3 h-11 w-full px-4"
                    />
                  )}
                </div>
              )}

              {(isOfflineMode || areRatesStale || rateError || showManualRateRequired) && (
                <div className="space-y-2 rounded-2xl border p-4 text-sm text-[var(--warning)]" style={{ borderColor: 'color-mix(in srgb, var(--warning) 28%, transparent)', background: 'color-mix(in srgb, var(--warning) 10%, transparent)' }}>
                  {isOfflineMode && <p>{copy.offlineRates}</p>}
                  {areRatesStale && <p>{copy.staleRates}</p>}
                  {showManualRateRequired && <p>{copy.missingRate}</p>}
                  {rateError && <p>{rateError}</p>}
                  {isRatesLoading && <p>{locale === "ar" ? "بنحدّث أسعار الصرف..." : "Refreshing exchange rates..."}</p>}
                </div>
              )}

              <div className="rounded-2xl border p-4" style={{ borderColor: 'color-mix(in srgb, var(--border) 88%, transparent)', background: 'color-mix(in srgb, var(--card) 96%, transparent)' }}>
                <p className="text-sm font-semibold text-[var(--foreground)]">{copy.paymentMethod}</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cash")}
                    className="rounded-2xl border px-4 py-3 font-semibold transition"
                    style={paymentMethod === "cash"
                      ? { borderColor: 'color-mix(in srgb, var(--action) 32%, transparent)', background: 'color-mix(in srgb, var(--action) 12%, transparent)', color: 'var(--foreground)' }
                      : { borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--surface) 86%, transparent)', color: 'var(--muted)' }}
                  >
                    {copy.cash}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("card")}
                    className="rounded-2xl border px-4 py-3 font-semibold transition"
                    style={paymentMethod === "card"
                      ? { borderColor: 'color-mix(in srgb, var(--action) 32%, transparent)', background: 'color-mix(in srgb, var(--action) 12%, transparent)', color: 'var(--foreground)' }
                      : { borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--surface) 86%, transparent)', color: 'var(--muted)' }}
                  >
                    {copy.card}
                  </button>
                </div>
              </div>

              {paymentMethod === "cash" ? (
                <div className="rounded-2xl border p-4" style={{ borderColor: 'color-mix(in srgb, var(--border) 88%, transparent)', background: 'color-mix(in srgb, var(--card) 96%, transparent)' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--foreground)]">{copy.cashReceived}</p>
                      <p className="text-sm text-[var(--muted)]">{copy.cashQuickHint}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">{copy.changeDue}</p>
                      <p className="mt-1 text-2xl font-semibold text-[var(--action)]">{changeDue !== null ? formatMoney(changeDue, checkoutCurrency, locale) : "--"}</p>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={cashReceivedInput}
                    onChange={(event) => setCashReceivedInput(event.target.value)}
                    className="lav-input mt-3 h-11 w-full px-4 text-base"
                  />
                  <div className="mt-3 grid grid-cols-2 gap-2 xl:grid-cols-4">
                    {quickTenderButtons.map((step) => (
                      <button key={step} type="button" onClick={() => handleQuickTender(step)} className="rounded-2xl border px-4 py-2.5 font-semibold text-[var(--foreground)] transition" style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--surface) 86%, transparent)' }}>
                        {step}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border p-4" style={{ borderColor: 'color-mix(in srgb, var(--border) 88%, transparent)', background: 'color-mix(in srgb, var(--card) 96%, transparent)' }}>
                  <p className="text-sm font-semibold text-[var(--foreground)]">{copy.card}</p>
                  <p className="mt-2 text-sm text-[var(--muted)]">{copy.cardProcessingHint}</p>
                </div>
              )}

              <div className="space-y-4 xl:sticky xl:bottom-0 xl:-mx-5 xl:-mb-4 xl:border-t xl:px-5 xl:pb-4 xl:pt-4 xl:shadow-[0_-16px_32px_rgba(15,23,42,0.06)]" style={{ borderColor: 'color-mix(in srgb, var(--border) 88%, transparent)', background: 'color-mix(in srgb, var(--card) 99%, transparent)' }}>
                <div className="space-y-3 text-sm text-[var(--foreground)]">
                  <div className="flex items-center justify-between"><span>{copy.subtotal}</span><span>{formatMoney(subtotalEgp, "EGP", locale)}</span></div>
                  {checkoutCurrency !== "EGP" && totalInSelectedCurrency !== null && (
                    <div className="flex items-center justify-between"><span>{copy.totalSelected}</span><span>{formatMoney(totalInSelectedCurrency, checkoutCurrency, locale)}</span></div>
                  )}
                  {paymentMethod === "card" && (
                    <div className="flex items-center justify-between"><span>{copy.cardSurcharge}</span><span>{formatMoney(cardSurcharge, checkoutCurrency, locale)}</span></div>
                  )}
                  <div className="flex items-center justify-between border-t pt-3 text-2xl font-semibold text-[var(--foreground)]" style={{ borderColor: 'color-mix(in srgb, var(--border) 88%, transparent)' }}>
                    <span>{copy.total}</span>
                    <span className="text-[var(--action)]">{formatMoney(totalDue, checkoutCurrency, locale)}</span>
                  </div>
                </div>

                {checkoutError && <div className="rounded-2xl border px-4 py-3 text-sm text-[var(--danger)]" style={{ borderColor: 'color-mix(in srgb, var(--danger) 28%, transparent)', background: 'color-mix(in srgb, var(--danger) 10%, transparent)' }}>{checkoutError}</div>}

                <button id="pos-checkout-button" type="button" onClick={() => void handleCheckout()} disabled={cart.length === 0 || isSubmitting || showManualRateRequired} className="h-14 w-full rounded-2xl bg-[var(--action)] text-lg font-semibold text-white transition hover:bg-[var(--action-strong)] disabled:cursor-not-allowed disabled:bg-[var(--surface-strong)] disabled:text-[var(--muted)]">
                  {isSubmitting ? (locale === "ar" ? "جاري إنهاء البيعة..." : "Checking out...") : paymentMethod === "card" ? copy.processCardPayment : copy.checkout}
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <Modal
        isOpen={isCardConfirmOpen}
        onClose={() => setIsCardConfirmOpen(false)}
        title={copy.cardConfirmTitle}
        locale={locale}
        theme="dark"
        footer={(
          <>
            <button type="button" disabled={isSubmitting} onClick={() => setIsCardConfirmOpen(false)} className="rounded-2xl border px-4 py-2 font-semibold text-[var(--foreground)] transition disabled:cursor-not-allowed disabled:opacity-60" style={{ borderColor: 'var(--border)' }}>{copy.cancel}</button>
            <button type="button" disabled={isSubmitting} onClick={() => void handleConfirmCardPayment()} className="rounded-2xl bg-[var(--action)] px-4 py-2 font-semibold text-white transition hover:bg-[var(--action-strong)] disabled:cursor-not-allowed disabled:opacity-60">{copy.confirmAndCompleteSale}</button>
          </>
        )}
      >
        <p className="text-sm text-[var(--muted)]">{copy.chargeCardPrompt} {formatMoney(totalDue, checkoutCurrency, locale)} to card?</p>
      </Modal>

      <Modal
        isOpen={Boolean(receipt)}
        onClose={() => setReceipt(null)}
        title={copy.receiptSummaryTitle}
        size="lg"
        locale={locale}
        theme="dark"
        footer={receipt ? (
          <>
            <button type="button" onClick={() => void handlePrintReceipt()} className="rounded-2xl bg-[var(--action)] px-4 py-2 font-semibold text-white transition hover:bg-[var(--action-strong)]">{copy.printReceipt}</button>
            <button type="button" onClick={resetSaleState} className="rounded-2xl border px-4 py-2 font-semibold text-[var(--foreground)] transition" style={{ borderColor: 'var(--border)' }}>{copy.newSale}</button>
          </>
        ) : undefined}
      >
        {receipt && (
          <div className="space-y-4 text-sm text-[var(--foreground)]">
            <div className="rounded-2xl border p-4" style={{ borderColor: 'color-mix(in srgb, var(--border) 88%, transparent)', background: 'color-mix(in srgb, var(--surface) 90%, transparent)' }}>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--accent)]">{copy.saleComplete}</p>
              <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">Receipt No. {receipt.receiptNumber}</p>
            </div>
            <div className="max-h-[260px] space-y-3 overflow-y-auto rounded-2xl border p-4" style={{ borderColor: 'color-mix(in srgb, var(--border) 88%, transparent)', background: 'color-mix(in srgb, var(--card) 96%, transparent)' }}>
              {receipt.items.map((item) => (
                <div key={item.productId} className="flex items-start justify-between gap-3 border-b pb-3 last:border-b-0 last:pb-0" style={{ borderColor: 'color-mix(in srgb, var(--border) 88%, transparent)' }}>
                  <div>
                    <p className="font-semibold text-[var(--foreground)]">{item.productName}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">{item.quantity} x {formatMoney(item.unitPrice, receipt.currency, locale)}</p>
                  </div>
                  <p className="font-semibold text-[var(--action)]">{formatMoney(item.subtotal, receipt.currency, locale)}</p>
                </div>
              ))}
            </div>
            <div className="space-y-3 rounded-2xl border p-4" style={{ borderColor: 'color-mix(in srgb, var(--border) 88%, transparent)', background: 'color-mix(in srgb, var(--surface) 90%, transparent)' }}>
              <div className="flex items-center justify-between"><span>{copy.subtotal}</span><span>{formatMoney(receipt.subtotal, receipt.currency, locale)}</span></div>
              {receipt.paymentMethod === "card" && (
                <div className="flex items-center justify-between"><span>{copy.cardSurcharge}</span><span>{formatMoney(receipt.surcharge, receipt.currency, locale)}</span></div>
              )}
              <div className="flex items-center justify-between border-t pt-3 text-base font-semibold" style={{ borderColor: 'color-mix(in srgb, var(--border) 88%, transparent)' }}>
                <span>{copy.total}</span>
                <span className="text-[var(--action)]">{formatMoney(receipt.total, receipt.currency, locale)}</span>
              </div>
              <div className="flex items-center justify-between"><span>{copy.paymentMethodLabel}</span><span>{receipt.paymentMethod === "card" ? copy.card : copy.cash}</span></div>
              {receipt.changeGiven !== null && (
                <div className="flex items-center justify-between"><span>{copy.changeGiven}</span><span>{formatMoney(receipt.changeGiven, receipt.currency, locale)}</span></div>
              )}
              <div className="flex items-center justify-between"><span>{copy.timestamp}</span><span>{new Date(receipt.timestamp).toLocaleString(locale === "ar" ? "ar-EG" : "en-US")}</span></div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

