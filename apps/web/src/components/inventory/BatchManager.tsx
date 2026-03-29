"use client";

import React, { useState, useEffect, useCallback } from "react";
import Modal from "../ui/Modal";

interface Product {
  id: number;
  name_en: string;
  name_ar: string;
  barcode: string;
}

interface ProductBatch {
  id: number;
  product_id: number;
  product?: Product;
  batch_number: string;
  cost_price: number;
  current_quantity: number;
  initial_quantity: number;
  expiry_date: string;
  is_expired: boolean;
  is_disposed: boolean;
  days_until_expiry: number;
  created_at: string;
  updated_at: string;
}

interface Translations {
  title: string;
  searchPlaceholder: string;
  allProducts: string;
  allStatuses: string;
  addButton: string;
  editButton: string;
  disposeButton: string;
  noBatches: string;
  addModalTitle: string;
  editModalTitle: string;
  disposeModalTitle: string;
  productLabel: string;
  batchNumberLabel: string;
  costPriceLabel: string;
  quantityLabel: string;
  expiryDateLabel: string;
  notesLabel: string;
  saveButton: string;
  savingButton: string;
  cancelButton: string;
  disposeConfirm: string;
  disposeLoading: string;
  errorRequired: string;
  errorInvalidNumber: string;
  fetchError: string;
  saveError: string;
  disposeError: string;
  expiredBadge: string;
  expiringSoonBadge: string;
  inStockBadge: string;
  disposedBadge: string;
  fefoOrder: string;
  batchDetails: string;
  productDetails: string;
  stockInfo: string;
  costInfo: string;
  expiryInfo: string;
  daysUntilExpiry: string;
  expiredDays: string;
}

const translations: Record<"ar" | "en", Translations> = {
  en: {
    title: "Batch Management",
    searchPlaceholder: "Search by batch number, product name, barcode...",
    allProducts: "All Products",
    allStatuses: "All Statuses",
    addButton: "Add Batch",
    editButton: "Edit",
    disposeButton: "Dispose",
    noBatches: "No batches found",
    addModalTitle: "Add New Batch",
    editModalTitle: "Edit Batch",
    disposeModalTitle: "Dispose Batch",
    productLabel: "Product *",
    batchNumberLabel: "Batch Number *",
    costPriceLabel: "Cost Price",
    quantityLabel: "Quantity *",
    expiryDateLabel: "Expiry Date *",
    notesLabel: "Notes",
    saveButton: "Save",
    savingButton: "Saving...",
    cancelButton: "Cancel",
    disposeConfirm: "Are you sure you want to dispose this batch? This action cannot be undone.",
    disposeLoading: "Disposing...",
    errorRequired: "This field is required",
    errorInvalidNumber: "Please enter a valid number",
    fetchError: "Failed to load batches",
    saveError: "Failed to save batch",
    disposeError: "Failed to dispose batch",
    expiredBadge: "Expired",
    expiringSoonBadge: "Expiring Soon",
    inStockBadge: "In Stock",
    disposedBadge: "Disposed",
    fefoOrder: "FEFO Order",
    batchDetails: "Batch Details",
    productDetails: "Product Details",
    stockInfo: "Stock Information",
    costInfo: "Cost Information",
    expiryInfo: "Expiry Information",
    daysUntilExpiry: "Days until expiry",
    expiredDays: "Days expired",
  },
  ar: {
    title: "إدارة الدفعات",
    searchPlaceholder: "دوّر برقم الدفعة أو اسم الصنف أو الباركود...",
    allProducts: "كل الأصناف",
    allStatuses: "كل الحالات",
    addButton: "ضيف دفعة",
    editButton: "تعديل",
    disposeButton: "إعدام",
    noBatches: "مفيش دفعات",
    addModalTitle: "ضيف دفعة جديدة",
    editModalTitle: "تعديل الدفعة",
    disposeModalTitle: "إعدام الدفعة",
    productLabel: "الصنف *",
    batchNumberLabel: "رقم الدفعة *",
    costPriceLabel: "سعر الشراء",
    quantityLabel: "الكمية *",
    expiryDateLabel: "تاريخ الانتهاء *",
    notesLabel: "ملاحظات",
    saveButton: "احفظ",
    savingButton: "بنحفظ...",
    cancelButton: "إلغاء",
    disposeConfirm: "متأكد إنك عايز تعدم الدفعة دي؟ الإجراء ده ملوش رجوع.",
    disposeLoading: "بنعمل إعدام...",
    errorRequired: "الخانة دي مطلوبة",
    errorInvalidNumber: "من فضلك اكتب رقم صحيح",
    fetchError: "ماقدرناش نحمل الدفعات",
    saveError: "ماقدرناش نحفظ الدفعة",
    disposeError: "ماقدرناش نعدم الدفعة",
    expiredBadge: "منتهية",
    expiringSoonBadge: "قربت تنتهي",
    inStockBadge: "متاحة",
    disposedBadge: "اتعدمت",
    fefoOrder: "ترتيب FEFO",
    batchDetails: "تفاصيل الدفعة",
    productDetails: "تفاصيل الصنف",
    stockInfo: "بيانات المخزون",
    costInfo: "بيانات التكلفة",
    expiryInfo: "بيانات الصلاحية",
    daysUntilExpiry: "أيام على الانتهاء",
    expiredDays: "أيام من بعد الانتهاء",
  },
};

export interface BatchManagerProps {
  locale?: "ar" | "en";
  theme?: "light" | "dark";
  batchesApiUrl?: string;
  productsApiUrl?: string;
  itemsPerPage?: number;
}

export const BatchManager: React.FC<BatchManagerProps> = ({
  locale = "en",
  theme = "light",
  batchesApiUrl = "/api/stock/batches",
  productsApiUrl = "/api/products",
  itemsPerPage = 15,
}) => {
  const t = translations[locale];
  const isRTL = locale === "ar";

  const [batches, setBatches] = useState<ProductBatch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [productFilter, setProductFilter] = useState<number | "all">("all");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "expired" | "expiring" | "in_stock" | "disposed"
  >("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDisposeModalOpen, setIsDisposeModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<ProductBatch | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    product_id: null as number | null,
    batch_number: "",
    cost_price: 0,
    current_quantity: 0,
    expiry_date: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchProducts = useCallback(async () => {
    try {
      const response = await fetch(productsApiUrl);
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (err) {
      console.error("Failed to fetch products:", err);
    }
  }, [productsApiUrl]);

  const fetchBatches = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(batchesApiUrl, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(t.fetchError);
      }

      const data = await response.json();
      setBatches(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.fetchError);
    } finally {
      setIsLoading(false);
    }
  }, [batchesApiUrl, t.fetchError]);

  useEffect(() => {
    fetchBatches();
    fetchProducts();
  }, [fetchBatches, fetchProducts]);

  // Filter and sort batches
  const filteredBatches = batches
    .filter((batch) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        batch.batch_number.toLowerCase().includes(query) ||
        (batch.product &&
          (batch.product.name_en.toLowerCase().includes(query) ||
            batch.product.name_ar.includes(searchQuery) ||
            batch.product.barcode.toLowerCase().includes(query)));

      const matchesProduct = productFilter === "all" || batch.product_id === productFilter;

      let matchesStatus = true;
      if (statusFilter !== "all") {
        if (statusFilter === "expired" && !batch.is_expired) matchesStatus = false;
        if (statusFilter === "expiring" && (batch.is_expired || batch.days_until_expiry > 30))
          matchesStatus = false;
        if (statusFilter === "in_stock" && (batch.is_expired || batch.days_until_expiry <= 30))
          matchesStatus = false;
        if (statusFilter === "disposed" && !batch.is_disposed) matchesStatus = false;
      }

      return matchesSearch && matchesProduct && matchesStatus;
    })
    .sort((a, b) => {
      // Sort by expiry date (FEFO order) - earliest expiry first
      return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
    });

  const totalPages = Math.ceil(filteredBatches.length / itemsPerPage);
  const paginatedBatches = filteredBatches.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const openAddModal = () => {
    setFormData({
      product_id: null,
      batch_number: "",
      cost_price: 0,
      current_quantity: 0,
      expiry_date: "",
    });
    setFormErrors({});
    setIsAddModalOpen(true);
  };

  const openEditModal = (batch: ProductBatch) => {
    setSelectedBatch(batch);
    setFormData({
      product_id: batch.product_id,
      batch_number: batch.batch_number,
      cost_price: batch.cost_price,
      current_quantity: batch.current_quantity,
      expiry_date: batch.expiry_date.split("T")[0],
    });
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  const openDisposeModal = (batch: ProductBatch) => {
    setSelectedBatch(batch);
    setIsDisposeModalOpen(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.product_id) errors.product_id = t.errorRequired;
    if (!formData.batch_number.trim()) errors.batch_number = t.errorRequired;
    if (formData.current_quantity <= 0) errors.current_quantity = t.errorRequired;
    if (!formData.expiry_date) errors.expiry_date = t.errorRequired;
    if (formData.cost_price < 0) errors.cost_price = t.errorInvalidNumber;
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const url = selectedBatch ? `${batchesApiUrl}/${selectedBatch.id}` : batchesApiUrl;
      const method = selectedBatch ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error(t.saveError);
      }

      await fetchBatches();
      setIsAddModalOpen(false);
      setIsEditModalOpen(false);
      setSelectedBatch(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.saveError);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDispose = async () => {
    if (!selectedBatch) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`${batchesApiUrl}/${selectedBatch.id}/dispose`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(t.disposeError);
      }

      await fetchBatches();
      setIsDisposeModalOpen(false);
      setSelectedBatch(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.disposeError);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getExpiryStatus = (batch: ProductBatch) => {
    if (batch.is_disposed) return { label: t.disposedBadge, color: "gray" };
    if (batch.is_expired) return { label: t.expiredBadge, color: "red" };
    if (batch.days_until_expiry <= 30) return { label: t.expiringSoonBadge, color: "yellow" };
    return { label: t.inStockBadge, color: "green" };
  };

  const getFEFOIndex = (batch: ProductBatch) => {
    const sortedIndex = filteredBatches.findIndex((b) => b.id === batch.id);
    return sortedIndex + 1;
  };

  const inputClasses =
    "w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-[var(--foreground)] outline-none transition-all placeholder:text-[var(--muted)] focus:border-[var(--action)] focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--action)_14%,transparent)]";

  const labelClasses = "mb-2 block text-sm font-medium text-[var(--foreground)]";

  const buttonPrimaryClasses = `rounded-[var(--radius-md)] px-4 py-2.5 font-semibold text-white transition-all ${
    isSubmitting
      ? "cursor-not-allowed bg-[color:color-mix(in_srgb,var(--action)_45%,transparent)]"
      : "bg-[var(--action)] shadow-[0_14px_28px_rgba(31,157,115,0.22)] hover:bg-[var(--action-strong)]"
  }`;

  const buttonSecondaryClasses =
    "rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 font-semibold text-[var(--foreground)] transition-all hover:bg-[var(--surface-strong)]";

  const buttonDangerClasses =
    "rounded-[var(--radius-md)] bg-[var(--danger)] px-4 py-2.5 font-semibold text-white transition-all hover:opacity-90";
  const previousLabel = locale === "ar" ? "السابق" : "Previous";
  const nextLabel = locale === "ar" ? "التالي" : "Next";
  const paginationLabel =
    locale === "ar"
      ? `عرض ${(currentPage - 1) * itemsPerPage + 1}-${Math.min(currentPage * itemsPerPage, filteredBatches.length)} من ${filteredBatches.length}`
      : `Showing ${(currentPage - 1) * itemsPerPage + 1}-${Math.min(currentPage * itemsPerPage, filteredBatches.length)} of ${filteredBatches.length}`;

  return (
    <div dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">{t.title}</h1>
        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--action)] px-4 py-2.5 font-semibold text-white shadow-[0_14px_28px_rgba(31,157,115,0.22)] transition-all hover:bg-[var(--action-strong)]"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t.addButton}
        </button>
      </div>

      {/* Search and Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="relative text-[var(--foreground)]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={t.searchPlaceholder}
            className={`${inputClasses} pl-10`}
          />
          <svg
            className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 ${
              isRTL ? "right-3" : "left-3"
            } text-[var(--muted)]`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <div>
          <select
            value={productFilter}
            onChange={(e) => {
              setProductFilter(e.target.value === "all" ? "all" : Number(e.target.value));
              setCurrentPage(1);
            }}
            className={inputClasses}
          >
            <option value="all">{t.allProducts}</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {locale === "ar" ? product.name_ar : product.name_en}
              </option>
            ))}
          </select>
        </div>
        <div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            className={inputClasses}
          >
            <option value="all">{t.allStatuses}</option>
            <option value="in_stock">{t.inStockBadge}</option>
            <option value="expiring">{t.expiringSoonBadge}</option>
            <option value="expired">{t.expiredBadge}</option>
            <option value="disposed">{t.disposedBadge}</option>
          </select>
        </div>
        <div className="flex items-center text-sm text-[var(--muted)]">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
            />
          </svg>
          {t.fefoOrder}: {t.expiryInfo}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div
          className={`mb-6 p-4 rounded-lg border ${
            theme === "dark"
              ? "border-[color:color-mix(in_srgb,var(--danger)_34%,transparent)] bg-[var(--danger-soft)] text-[var(--danger)]"
              : "border-[color:color-mix(in_srgb,var(--danger)_34%,transparent)] bg-[var(--danger-soft)] text-[var(--danger)]"
          }`}
        >
          {error}
        </div>
      )}

      {/* Batches List */}
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
          Loading...
        </div>
      ) : paginatedBatches.length === 0 ? (
        <div className="py-12 text-center text-[var(--muted)]">{t.noBatches}</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="w-full text-sm">
              <thead className="bg-[color:color-mix(in_srgb,var(--surface)_88%,transparent)]">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-[var(--muted)]">
                    {t.fefoOrder}
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--muted)]">
                    {t.batchNumberLabel}
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--muted)]">
                    {t.productDetails}
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--muted)]">
                    {t.stockInfo}
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--muted)]">
                    {t.costInfo}
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--muted)]">
                    {t.expiryInfo}
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--muted)]">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--muted)]">
                    {t.editButton}
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedBatches.map((batch, idx) => {
                  const status = getExpiryStatus(batch);
                  const globalFEFOIndex = (currentPage - 1) * itemsPerPage + idx + 1;
                  return (
                    <tr
                      key={batch.id}
                      className={`border-t border-[var(--border)] transition-all hover:bg-[color:color-mix(in_srgb,var(--surface)_80%,transparent)] ${batch.is_disposed ? "opacity-50" : ""}`}
                    >
                      <td className="px-4 py-3 font-mono text-[var(--muted)]">
                        #{globalFEFOIndex}
                      </td>
                      <td className="px-4 py-3 font-medium text-[var(--foreground)]">
                        {batch.batch_number}
                      </td>
                      <td className="px-4 py-3 text-[var(--foreground)]">
                        {batch.product && (
                          <div>
                            <div className="font-medium">
                              {locale === "ar" ? batch.product.name_ar : batch.product.name_en}
                            </div>
                            <div className="text-xs text-[var(--muted)]">
                              {batch.product.barcode}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[var(--foreground)]">
                        <div className="font-medium">
                          {batch.current_quantity} / {batch.initial_quantity}
                        </div>
                        {batch.current_quantity < batch.initial_quantity && (
                          <div className="text-xs text-[var(--warning)]">
                            -{batch.initial_quantity - batch.current_quantity} sold
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-[var(--foreground)]">
                        ${batch.cost_price.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-[var(--foreground)]">
                        <div>{new Date(batch.expiry_date).toLocaleDateString()}</div>
                        {!batch.is_expired && !batch.is_disposed && (
                          <div
                            className={`text-xs ${
                              batch.days_until_expiry <= 7
                                ? "text-[var(--danger)]"
                                : batch.days_until_expiry <= 30
                                  ? "text-[var(--warning)]"
                                  : "text-[var(--action)]"
                            }`}
                          >
                            {t.daysUntilExpiry}: {batch.days_until_expiry}
                          </div>
                        )}
                        {batch.is_expired && !batch.is_disposed && (
                          <div className="text-xs text-[var(--danger)]">
                            {t.expiredDays}: {Math.abs(batch.days_until_expiry)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-xs ${
                            status.color === "red"
                              ? "bg-[var(--danger-soft)] text-[var(--danger)]"
                              : status.color === "yellow"
                                ? "bg-[var(--warning-soft)] text-[var(--warning)]"
                                : status.color === "green"
                                  ? "bg-[var(--action-soft)] text-[var(--action)]"
                                  : "bg-[var(--surface)] text-[var(--muted)]"
                          }`}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {!batch.is_disposed && (
                            <>
                              <button
                                onClick={() => openEditModal(batch)}
                                className="rounded-lg p-2 text-[var(--muted)] transition-all hover:bg-[var(--surface-strong)] hover:text-[var(--foreground)]"
                                aria-label={t.editButton}
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
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                  />
                                </svg>
                              </button>
                              {(batch.is_expired || batch.current_quantity === 0) && (
                                <button
                                  onClick={() => openDisposeModal(batch)}
                                  className="rounded-lg p-2 text-[var(--danger)] transition-all hover:bg-[var(--danger-soft)] hover:opacity-90"
                                  aria-label={t.disposeButton}
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
                                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                    />
                                  </svg>
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex flex-col gap-4 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[color:color-mix(in_srgb,var(--surface)_78%,transparent)] p-4 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-[var(--muted)]">{paginationLabel}</p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className={`rounded-[var(--radius-md)] border px-4 py-2 text-sm font-semibold transition-all ${
                    currentPage === 1
                      ? "cursor-not-allowed border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] opacity-60"
                      : "border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
                  }`}
                >
                  {previousLabel}
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`min-w-11 rounded-[var(--radius-md)] border px-3 py-2 text-sm font-semibold transition-all ${
                      currentPage === page
                        ? "border-[color:color-mix(in_srgb,var(--action)_32%,transparent)] bg-[var(--action)] text-white shadow-[0_12px_24px_rgba(31,157,115,0.18)]"
                        : "border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className={`rounded-[var(--radius-md)] border px-4 py-2 text-sm font-semibold transition-all ${
                    currentPage === totalPages
                      ? "cursor-not-allowed border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] opacity-60"
                      : "border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
                  }`}
                >
                  {nextLabel}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add/Edit Batch Modal */}
      <Modal
        isOpen={isAddModalOpen || isEditModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setIsEditModalOpen(false);
          setSelectedBatch(null);
        }}
        title={selectedBatch ? t.editModalTitle : t.addModalTitle}
        locale={locale}
        theme={theme}
        size="lg"
        footer={
          <>
            <button
              onClick={() => {
                setIsAddModalOpen(false);
                setIsEditModalOpen(false);
                setSelectedBatch(null);
              }}
              className={buttonSecondaryClasses}
              disabled={isSubmitting}
            >
              {t.cancelButton}
            </button>
            <button onClick={handleSubmit} className={buttonPrimaryClasses} disabled={isSubmitting}>
              {isSubmitting ? t.savingButton : t.saveButton}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className={labelClasses}>{t.productLabel}</label>
            <select
              value={formData.product_id || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  product_id: e.target.value ? Number(e.target.value) : null,
                })
              }
              className={`${inputClasses} ${formErrors.product_id ? "border-red-500" : ""}`}
            >
              <option value="">Select Product</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {locale === "ar" ? product.name_ar : product.name_en} ({product.barcode})
                </option>
              ))}
            </select>
            {formErrors.product_id && (
              <p className="mt-1 text-sm text-[var(--danger)]">{formErrors.product_id}</p>
            )}
          </div>
          <div>
            <label className={labelClasses}>{t.batchNumberLabel}</label>
            <input
              type="text"
              value={formData.batch_number}
              onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
              className={`${inputClasses} ${formErrors.batch_number ? "border-red-500" : ""}`}
              placeholder="e.g., BATCH-2024-001"
            />
            {formErrors.batch_number && (
              <p className="mt-1 text-sm text-[var(--danger)]">{formErrors.batch_number}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClasses}>{t.costPriceLabel}</label>
              <input
                type="number"
                step="0.01"
                value={formData.cost_price}
                onChange={(e) =>
                  setFormData({ ...formData, cost_price: parseFloat(e.target.value) || 0 })
                }
                className={`${inputClasses} ${formErrors.cost_price ? "border-red-500" : ""}`}
              />
              {formErrors.cost_price && (
                <p className="mt-1 text-sm text-[var(--danger)]">{formErrors.cost_price}</p>
              )}
            </div>
            <div>
              <label className={labelClasses}>{t.quantityLabel}</label>
              <input
                type="number"
                value={formData.current_quantity}
                onChange={(e) =>
                  setFormData({ ...formData, current_quantity: parseInt(e.target.value) || 0 })
                }
                className={`${inputClasses} ${formErrors.current_quantity ? "border-red-500" : ""}`}
              />
              {formErrors.current_quantity && (
                <p className="mt-1 text-sm text-[var(--danger)]">{formErrors.current_quantity}</p>
              )}
            </div>
          </div>
          <div>
            <label className={labelClasses}>{t.expiryDateLabel}</label>
            <input
              type="date"
              value={formData.expiry_date}
              onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
              className={`${inputClasses} ${formErrors.expiry_date ? "border-red-500" : ""}`}
            />
            {formErrors.expiry_date && (
              <p className="mt-1 text-sm text-[var(--danger)]">{formErrors.expiry_date}</p>
            )}
          </div>
        </div>
      </Modal>

      {/* Dispose Modal */}
      <Modal
        isOpen={isDisposeModalOpen}
        onClose={() => {
          setIsDisposeModalOpen(false);
          setSelectedBatch(null);
        }}
        title={t.disposeModalTitle}
        locale={locale}
        theme={theme}
        footer={
          <>
            <button
              onClick={() => {
                setIsDisposeModalOpen(false);
                setSelectedBatch(null);
              }}
              className={buttonSecondaryClasses}
              disabled={isSubmitting}
            >
              {t.cancelButton}
            </button>
            <button onClick={handleDispose} className={buttonDangerClasses} disabled={isSubmitting}>
              {isSubmitting ? t.disposeLoading : t.disposeButton}
            </button>
          </>
        }
      >
        <p className="text-[var(--foreground)]">{t.disposeConfirm}</p>
        {selectedBatch && (
          <div
            className={`mt-4 p-4 rounded-lg border ${"border-[var(--border)] bg-[color:color-mix(in_srgb,var(--surface)_80%,transparent)]"}`}
          >
            <p className="font-medium text-[var(--foreground)]">{selectedBatch.batch_number}</p>
            {selectedBatch.product && (
              <p className="text-[var(--muted)]">
                {locale === "ar" ? selectedBatch.product.name_ar : selectedBatch.product.name_en}
              </p>
            )}
            <p className="mt-2 text-sm text-[var(--muted)]">
              Quantity: {selectedBatch.current_quantity}
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BatchManager;
