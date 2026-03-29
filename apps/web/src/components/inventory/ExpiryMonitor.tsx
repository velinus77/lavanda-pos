"use client";

import React, { useState, useEffect, useCallback } from "react";
import Modal from "../ui/Modal";
import { authenticatedFetch } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface Product {
  id: string;
  name_en: string;
  name_ar: string;
  barcode: string;
}

interface ExpiringBatch {
  id: string;
  product_id: string;
  product?: Product;
  batch_number: string;
  cost_price: number;
  current_quantity: number;
  expiry_date: string;
  days_until_expiry: number;
  is_expired: boolean;
  is_disposed: boolean;
  total_value: number;
}

interface Translations {
  title: string;
  description: string;
  expiringSoonTitle: string;
  expiredTitle: string;
  noExpiringSoon: string;
  noExpired: string;
  columns: {
    product: string;
    batchNumber: string;
    expiryDate: string;
    daysRemaining: string;
    daysExpired: string;
    quantity: string;
    value: string;
    actions: string;
  };
  disposeButton: string;
  disposeConfirm: string;
  disposeLoading: string;
  successDispose: string;
  errorFetch: string;
  errorDispose: string;
  statusBadges: {
    critical: string;
    warning: string;
    expired: string;
    disposed: string;
  };
  refreshButton: string;
  cancelButton: string;
  lastUpdated: string;
  filterPlaceholder: string;
  sortBy: string;
  sortOptions: {
    expiryAsc: string;
    expiryDesc: string;
    valueDesc: string;
    quantityDesc: string;
  };
}

const translations: Record<"ar" | "en", Translations> = {
  en: {
    title: "Expiry Monitor",
    description: "Track batches approaching expiry and manage expired stock",
    expiringSoonTitle: "Expiring Soon",
    expiredTitle: "Expired",
    noExpiringSoon: "No batches expiring in the next 30 days",
    noExpired: "No expired batches",
    columns: {
      product: "Product",
      batchNumber: "Batch Number",
      expiryDate: "Expiry Date",
      daysRemaining: "Days Remaining",
      daysExpired: "Days Expired",
      quantity: "Quantity",
      value: "Value",
      actions: "Actions",
    },
    disposeButton: "Dispose",
    disposeConfirm:
      "Are you sure you want to dispose this expired batch? This action cannot be undone.",
    disposeLoading: "Disposing...",
    successDispose: "Batch disposed successfully",
    errorFetch: "Failed to load expiry data",
    errorDispose: "Failed to dispose batch",
    statusBadges: {
      critical: "Critical (<7 days)",
      warning: "Warning (7-30 days)",
      expired: "Expired",
      disposed: "Disposed",
    },
    refreshButton: "Refresh",
    cancelButton: "Cancel",
    lastUpdated: "Last updated",
    filterPlaceholder: "Filter by product name or batch number...",
    sortBy: "Sort by",
    sortOptions: {
      expiryAsc: "Expiry Date (Soonest First)",
      expiryDesc: "Expiry Date (Latest First)",
      valueDesc: "Value (Highest First)",
      quantityDesc: "Quantity (Highest First)",
    },
  },
  ar: {
    title: "متابعة الصلاحية",
    description: "تابع الدفعات اللي قربت تنتهي وخلّي المنتهي خارج البيع بسرعة.",
    expiringSoonTitle: "قربت تنتهي",
    expiredTitle: "منتهية",
    noExpiringSoon: "مفيش دفعات هتنتهي خلال الـ 30 يوم الجايين",
    noExpired: "مفيش دفعات منتهية",
    columns: {
      product: "المنتج",
      batchNumber: "رقم الدفعة",
      expiryDate: "تاريخ الانتهاء",
      daysRemaining: "أيام متبقية",
      daysExpired: "أيام منذ الانتهاء",
      quantity: "الكمية",
      value: "القيمة",
      actions: "الإجراءات",
    },
    disposeButton: "إعدام",
    disposeConfirm: "متأكد إنك عايز تعدم الدفعة المنتهية دي؟ الإجراء ده ملوش رجوع.",
    disposeLoading: "بنعمل إعدام...",
    successDispose: "تم إعدام الدفعة بنجاح",
    errorFetch: "ماقدرناش نحمل بيانات الصلاحية",
    errorDispose: "ماقدرناش نعدم الدفعة",
    statusBadges: {
      critical: "حرج (أقل من 7 أيام)",
      warning: "تنبيه (من 7 لـ 30 يوم)",
      expired: "منتهية",
      disposed: "اتعدمت",
    },
    refreshButton: "حدّث",
    cancelButton: "إلغاء",
    lastUpdated: "آخر تحديث",
    filterPlaceholder: "دوّر باسم الصنف أو رقم الدفعة...",
    sortBy: "ترتيب حسب",
    sortOptions: {
      expiryAsc: "تاريخ الانتهاء (الأقرب الأول)",
      expiryDesc: "تاريخ الانتهاء (الأبعد الأول)",
      valueDesc: "القيمة (الأعلى أولاً)",
      quantityDesc: "الكمية (الأعلى أولاً)",
    },
  },
};

export interface ExpiryMonitorProps {
  locale?: "ar" | "en";
  theme?: "light" | "dark";
  expiringApiUrl?: string;
  expiredApiUrl?: string;
  disposeApiUrl?: string;
  onDispose?: () => void;
}

export const ExpiryMonitor: React.FC<ExpiryMonitorProps> = ({
  locale = "en",
  theme = "light",
  expiringApiUrl = `${API_BASE}/api/stock/expiring`,
  expiredApiUrl = `${API_BASE}/api/stock/expired`,
  disposeApiUrl = `${API_BASE}/api/stock/expired/dispose`,
  onDispose,
}) => {
  const t = translations[locale];
  const isRTL = locale === "ar";

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-EG", {
      style: "currency",
      currency: "EGP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-GB");

  const formatDateTime = (value: Date) => value.toLocaleString(locale === "ar" ? "ar-EG" : "en-GB");

  const [expiringBatches, setExpiringBatches] = useState<ExpiringBatch[]>([]);
  const [expiredBatches, setExpiredBatches] = useState<ExpiringBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const [filterQuery, setFilterQuery] = useState("");
  const [expiringSort, setExpiringSort] = useState<
    "expiryAsc" | "expiryDesc" | "valueDesc" | "quantityDesc"
  >("expiryAsc");
  const [expiredSort, setExpiredSort] = useState<
    "expiryAsc" | "expiryDesc" | "valueDesc" | "quantityDesc"
  >("expiryAsc");

  const [disposeModalOpen, setDisposeModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<ExpiringBatch | null>(null);
  const [isDisposing, setIsDisposing] = useState(false);

  const fetchExpiryData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [expiringRes, expiredRes] = await Promise.all([
        authenticatedFetch(expiringApiUrl, {
          headers: {
            "Content-Type": "application/json",
          },
        }),
        authenticatedFetch(expiredApiUrl, {
          headers: {
            "Content-Type": "application/json",
          },
        }),
      ]);

      if (!expiringRes.ok || !expiredRes.ok) {
        throw new Error(t.errorFetch);
      }

      const [expiringData, expiredData] = await Promise.all([
        expiringRes.json(),
        expiredRes.json(),
      ]);

      setExpiringBatches(expiringData.batches ?? []);
      setExpiredBatches(expiredData.batches ?? []);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errorFetch);
    } finally {
      setIsLoading(false);
    }
  }, [expiringApiUrl, expiredApiUrl, t.errorFetch]);

  useEffect(() => {
    fetchExpiryData();
  }, [fetchExpiryData]);

  const handleDispose = async () => {
    if (!selectedBatch) return;

    setIsDisposing(true);
    try {
      const response = await authenticatedFetch(disposeApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          batch_ids: [selectedBatch.id],
          reason: "Expired batch disposal",
        }),
      });

      if (!response.ok) {
        throw new Error(t.errorDispose);
      }

      setSuccessMessage(t.successDispose);
      setDisposeModalOpen(false);
      setSelectedBatch(null);

      // Refresh data
      await fetchExpiryData();

      // Call callback
      onDispose?.();

      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errorDispose);
    } finally {
      setIsDisposing(false);
    }
  };

  const openDisposeModal = (batch: ExpiringBatch) => {
    setSelectedBatch(batch);
    setDisposeModalOpen(true);
  };

  const filterBatches = (batches: ExpiringBatch[]) => {
    if (!filterQuery.trim()) return batches;

    const query = filterQuery.toLowerCase();
    return batches.filter((batch) => {
      const matchesProduct =
        batch.product &&
        (batch.product.name_en.toLowerCase().includes(query) ||
          batch.product.name_ar.includes(filterQuery) ||
          batch.product.barcode.toLowerCase().includes(query));
      const matchesBatch = batch.batch_number.toLowerCase().includes(query);
      return matchesProduct || matchesBatch;
    });
  };

  const sortBatches = (batches: ExpiringBatch[], sortType: string) => {
    return [...batches].sort((a, b) => {
      switch (sortType) {
        case "expiryAsc":
          return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
        case "expiryDesc":
          return new Date(b.expiry_date).getTime() - new Date(a.expiry_date).getTime();
        case "valueDesc":
          return b.total_value - a.total_value;
        case "quantityDesc":
          return b.current_quantity - a.current_quantity;
        default:
          return 0;
      }
    });
  };

  const getExpiringStatus = (days: number) => {
    if (days <= 0) return { label: t.statusBadges.expired, color: "red" };
    if (days <= 7) return { label: t.statusBadges.critical, color: "red" };
    if (days <= 30) return { label: t.statusBadges.warning, color: "yellow" };
    return { label: "OK", color: "green" };
  };

  const filteredExpiring = sortBatches(
    filterBatches(expiringBatches).filter((b) => !b.is_expired),
    expiringSort
  );
  const filteredExpired = sortBatches(
    filterBatches(expiredBatches).filter((b) => b.is_expired && !b.is_disposed),
    expiredSort
  );

  const inputClasses =
    "w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-[var(--foreground)] outline-none transition-all placeholder:text-[var(--muted)] focus:border-[var(--action)] focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--action)_14%,transparent)]";

  const labelClasses = "mb-2 block text-sm font-medium text-[var(--foreground)]";

  const buttonPrimaryClasses = `rounded-[var(--radius-md)] bg-[var(--danger)] px-4 py-2.5 font-semibold text-white transition-all ${
    isDisposing ? "cursor-not-allowed opacity-60" : "hover:opacity-90"
  }`;

  const buttonSecondaryClasses =
    "rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 font-semibold text-[var(--foreground)] transition-all hover:bg-[var(--surface-strong)]";

  const sectionHeaderClasses = `mb-4 grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_320px] md:items-center`;

  const BatchCard: React.FC<{
    batch: ExpiringBatch;
    isExpired: boolean;
  }> = ({ batch, isExpired }) => {
    const status = getExpiringStatus(batch.days_until_expiry);

    return (
      <div
        className={`rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:color-mix(in_srgb,var(--card)_96%,transparent)] p-4 transition-all hover:bg-[color:color-mix(in_srgb,var(--surface)_82%,transparent)] ${batch.is_disposed ? "opacity-50" : ""}`}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-[var(--foreground)]">
              {batch.product && (locale === "ar" ? batch.product.name_ar : batch.product.name_en)}
            </h3>
            {batch.product && (
              <p className="text-sm text-[var(--muted)]">{batch.product.barcode}</p>
            )}
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              status.color === "red"
                ? "bg-[var(--danger-soft)] text-[var(--danger)]"
                : status.color === "yellow"
                  ? "bg-[var(--warning-soft)] text-[var(--warning)]"
                  : "bg-[var(--action-soft)] text-[var(--action)]"
            }`}
          >
            {status.label}
          </span>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-x-6 gap-y-4">
          <div>
            <p className="text-xs text-[var(--muted)]">{t.columns.batchNumber}</p>
            <p className="font-medium text-[var(--foreground)]">{batch.batch_number}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--muted)]">{t.columns.expiryDate}</p>
            <p className="font-medium text-[var(--foreground)]">{formatDate(batch.expiry_date)}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--muted)]">
              {isExpired ? t.columns.daysExpired : t.columns.daysRemaining}
            </p>
            <p
              className={`font-bold ${
                batch.days_until_expiry <= 7
                  ? "text-[var(--danger)]"
                  : batch.days_until_expiry <= 30
                    ? "text-[var(--warning)]"
                    : "text-[var(--action)]"
              }`}
            >
              {isExpired ? Math.abs(batch.days_until_expiry) : batch.days_until_expiry}{" "}
              {isExpired ? "days" : "days"}
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--muted)]">{t.columns.quantity}</p>
            <p className="font-medium text-[var(--foreground)]">{batch.current_quantity}</p>
          </div>
        </div>

        <div className="flex items-end justify-between gap-4 border-t border-[var(--border)] pt-3">
          <div>
            <p className="text-xs text-[var(--muted)]">{t.columns.value}</p>
            <p className="font-bold text-[var(--foreground)]">
              {formatCurrency(batch.total_value)}
            </p>
          </div>

          {isExpired && !batch.is_disposed && (
            <button
              onClick={() => openDisposeModal(batch)}
              className="rounded-[var(--radius-md)] bg-[var(--danger-soft)] px-3 py-1.5 text-sm font-medium text-[var(--danger)] transition-all hover:opacity-90"
            >
              {t.disposeButton}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
          <div>
            <h1 className="mb-1 text-2xl font-bold text-[var(--foreground)]">{t.title}</h1>
            <p className="text-[var(--muted)]">{t.description}</p>
          </div>
          <button
            onClick={fetchExpiryData}
            disabled={isLoading}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition-all ${
              buttonSecondaryClasses
            }`}
          >
            <svg
              className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {t.refreshButton}
          </button>
        </div>

        <div className="text-sm text-[var(--muted)]">
          {t.lastUpdated}: {formatDateTime(lastUpdated)}
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 rounded-[var(--radius-lg)] border border-[color:color-mix(in_srgb,var(--action)_34%,transparent)] bg-[var(--action-soft)] p-4 text-[var(--action)]">
          {successMessage}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 rounded-[var(--radius-lg)] border border-[color:color-mix(in_srgb,var(--danger)_34%,transparent)] bg-[var(--danger-soft)] p-4 text-[var(--danger)]">
          {error}
        </div>
      )}

      {/* Filter */}
      <div className="mb-6">
        <input
          type="text"
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          placeholder={t.filterPlaceholder}
          className={inputClasses}
        />
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="py-12 text-center text-[var(--muted)]">
          <svg className="animate-spin h-8 w-8 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          {locale === "ar" ? "جارٍ التحميل..." : "Loading..."}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Expiring Soon Column */}
          <div>
            <div className={sectionHeaderClasses}>
              <h2 className="text-xl font-bold text-[var(--foreground)]">{t.expiringSoonTitle}</h2>
              <select
                value={expiringSort}
                onChange={(e) => setExpiringSort(e.target.value as any)}
                className={`${inputClasses} min-w-0 text-sm`}
              >
                <option value="expiryAsc">{t.sortOptions.expiryAsc}</option>
                <option value="expiryDesc">{t.sortOptions.expiryDesc}</option>
                <option value="valueDesc">{t.sortOptions.valueDesc}</option>
                <option value="quantityDesc">{t.sortOptions.quantityDesc}</option>
              </select>
            </div>

            {filteredExpiring.length === 0 ? (
              <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:color-mix(in_srgb,var(--surface)_80%,transparent)] p-8 text-center text-[var(--muted)]">
                {t.noExpiringSoon}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredExpiring.map((batch) => (
                  <BatchCard key={batch.id} batch={batch} isExpired={false} />
                ))}
              </div>
            )}
          </div>

          {/* Expired Column */}
          <div>
            <div className={sectionHeaderClasses}>
              <h2 className="text-xl font-bold text-[var(--foreground)]">{t.expiredTitle}</h2>
              <select
                value={expiredSort}
                onChange={(e) => setExpiredSort(e.target.value as any)}
                className={`${inputClasses} min-w-0 text-sm`}
              >
                <option value="expiryAsc">{t.sortOptions.expiryAsc}</option>
                <option value="expiryDesc">{t.sortOptions.expiryDesc}</option>
                <option value="valueDesc">{t.sortOptions.valueDesc}</option>
                <option value="quantityDesc">{t.sortOptions.quantityDesc}</option>
              </select>
            </div>

            {filteredExpired.length === 0 ? (
              <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:color-mix(in_srgb,var(--surface)_80%,transparent)] p-8 text-center text-[var(--muted)]">
                {t.noExpired}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredExpired.map((batch) => (
                  <BatchCard key={batch.id} batch={batch} isExpired={true} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dispose Confirmation Modal */}
      <Modal
        isOpen={disposeModalOpen}
        onClose={() => {
          setDisposeModalOpen(false);
          setSelectedBatch(null);
        }}
        title={t.disposeButton}
        locale={locale}
        theme={theme}
        footer={
          <>
            <button
              onClick={() => {
                setDisposeModalOpen(false);
                setSelectedBatch(null);
              }}
              className={buttonSecondaryClasses}
              disabled={isDisposing}
            >
              {t.cancelButton || "Cancel"}
            </button>
            <button onClick={handleDispose} className={buttonPrimaryClasses} disabled={isDisposing}>
              {isDisposing ? t.disposeLoading : t.disposeButton}
            </button>
          </>
        }
      >
        <p className="text-[var(--foreground)]">{t.disposeConfirm}</p>

        {selectedBatch && (
          <div className="mt-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:color-mix(in_srgb,var(--surface)_80%,transparent)] p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-[var(--muted)]">{t.columns.product}</p>
                <p className="font-medium text-[var(--foreground)]">
                  {selectedBatch.product &&
                    (locale === "ar"
                      ? selectedBatch.product.name_ar
                      : selectedBatch.product.name_en)}
                </p>
              </div>
              <div>
                <p className="text-sm text-[var(--muted)]">{t.columns.batchNumber}</p>
                <p className="font-medium text-[var(--foreground)]">{selectedBatch.batch_number}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--muted)]">{t.columns.quantity}</p>
                <p className="font-medium text-[var(--foreground)]">
                  {selectedBatch.current_quantity}
                </p>
              </div>
              <div>
                <p className="text-sm text-[var(--muted)]">{t.columns.value}</p>
                <p className="font-medium text-[var(--foreground)]">
                  {formatCurrency(selectedBatch.total_value)}
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ExpiryMonitor;
