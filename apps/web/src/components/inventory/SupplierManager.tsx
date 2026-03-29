"use client";

import React, { useState, useEffect, useCallback } from "react";
import Modal from "../ui/Modal";
import { getAuthToken } from "@/lib/auth";

interface Supplier {
  id: number;
  name_en: string;
  name_ar: string;
  contact_name_en?: string;
  contact_name_ar?: string;
  email?: string;
  phone?: string;
  address_en?: string;
  address_ar?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Translations {
  title: string;
  searchPlaceholder: string;
  addButton: string;
  editButton: string;
  deleteButton: string;
  deactivateButton: string;
  activateButton: string;
  noSuppliers: string;
  addModalTitle: string;
  editModalTitle: string;
  deleteModalTitle: string;
  nameEnLabel: string;
  nameArLabel: string;
  contactNameEnLabel: string;
  contactNameArLabel: string;
  emailLabel: string;
  phoneLabel: string;
  addressEnLabel: string;
  addressArLabel: string;
  isActiveLabel: string;
  saveButton: string;
  savingButton: string;
  cancelButton: string;
  deleteConfirm: string;
  deleteLoading: string;
  errorRequired: string;
  errorInvalidEmail: string;
  fetchError: string;
  saveError: string;
  deleteError: string;
}

const translations: Record<"ar" | "en", Translations> = {
  en: {
    title: "Suppliers",
    searchPlaceholder: "Search suppliers...",
    addButton: "Add Supplier",
    editButton: "Edit",
    deleteButton: "Delete",
    deactivateButton: "Deactivate",
    activateButton: "Activate",
    noSuppliers: "No suppliers found",
    addModalTitle: "Add New Supplier",
    editModalTitle: "Edit Supplier",
    deleteModalTitle: "Delete Supplier",
    nameEnLabel: "Company Name (English)",
    nameArLabel: "Company Name (Arabic)",
    contactNameEnLabel: "Contact Name (English)",
    contactNameArLabel: "Contact Name (Arabic)",
    emailLabel: "Email",
    phoneLabel: "Phone",
    addressEnLabel: "Address (English)",
    addressArLabel: "Address (Arabic)",
    isActiveLabel: "Active",
    saveButton: "Save",
    savingButton: "Saving...",
    cancelButton: "Cancel",
    deleteConfirm: "Are you sure you want to delete this supplier? This action cannot be undone.",
    deleteLoading: "Deleting...",
    errorRequired: "This field is required",
    errorInvalidEmail: "Invalid email format",
    fetchError: "Failed to load suppliers",
    saveError: "Failed to save supplier",
    deleteError: "Failed to delete supplier",
  },
  ar: {
    title: "المورّدين",
    searchPlaceholder: "دوّر على مورّد...",
    addButton: "ضيف مورّد",
    editButton: "تعديل",
    deleteButton: "حذف",
    deactivateButton: "وقفه",
    activateButton: "فعّله",
    noSuppliers: "مفيش مورّدين",
    addModalTitle: "ضيف مورّد جديد",
    editModalTitle: "تعديل المورّد",
    deleteModalTitle: "حذف المورّد",
    nameEnLabel: "اسم الشركة (إنجليزي)",
    nameArLabel: "اسم الشركة (عربي)",
    contactNameEnLabel: "اسم جهة الاتصال (إنجليزي)",
    contactNameArLabel: "اسم جهة الاتصال (عربي)",
    emailLabel: "الإيميل",
    phoneLabel: "الهاتف",
    addressEnLabel: "العنوان (إنجليزي)",
    addressArLabel: "العنوان (عربي)",
    isActiveLabel: "نشط",
    saveButton: "احفظ",
    savingButton: "بنحفظ...",
    cancelButton: "إلغاء",
    deleteConfirm: "متأكد إنك عايز تمسح المورّد ده؟ مش هتقدر ترجّعه بعد كده.",
    deleteLoading: "بنحذف...",
    errorRequired: "الخانة دي مطلوبة",
    errorInvalidEmail: "الإيميل مش بصيغة صحيحة",
    fetchError: "ماقدرناش نحمل بيانات المورّدين",
    saveError: "ماقدرناش نحفظ بيانات المورّد",
    deleteError: "ماقدرناش نمسح المورّد",
  },
};

export interface SupplierManagerProps {
  locale?: "ar" | "en";
  theme?: "light" | "dark";
  apiUrl?: string;
}

export const SupplierManager: React.FC<SupplierManagerProps> = ({
  locale = "en",
  theme = "light",
  apiUrl = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/api/suppliers`,
}) => {
  const t = translations[locale];
  const isRTL = locale === "ar";

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name_en: "",
    name_ar: "",
    contact_name_en: "",
    contact_name_ar: "",
    email: "",
    phone: "",
    address_en: "",
    address_ar: "",
    is_active: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getAuthHeaders = useCallback(() => {
    const token = getAuthToken();
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, []);

  const fetchSuppliers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(apiUrl, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(t.fetchError);
      }

      const data = await response.json();
      setSuppliers(Array.isArray(data) ? data : (data.suppliers ?? []));
    } catch (err) {
      setError(err instanceof Error ? err.message : t.fetchError);
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl, getAuthHeaders, t.fetchError]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const filteredSuppliers = suppliers.filter((supplier) => {
    const query = searchQuery.toLowerCase();
    return (
      supplier.name_en.toLowerCase().includes(query) ||
      supplier.name_ar.includes(searchQuery) ||
      (supplier.contact_name_en && supplier.contact_name_en.toLowerCase().includes(query)) ||
      (supplier.contact_name_ar && supplier.contact_name_ar.includes(searchQuery)) ||
      (supplier.email && supplier.email.toLowerCase().includes(query)) ||
      (supplier.phone && supplier.phone.includes(searchQuery))
    );
  });

  const openAddModal = () => {
    setFormData({
      name_en: "",
      name_ar: "",
      contact_name_en: "",
      contact_name_ar: "",
      email: "",
      phone: "",
      address_en: "",
      address_ar: "",
      is_active: true,
    });
    setFormErrors({});
    setIsAddModalOpen(true);
  };

  const openEditModal = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setFormData({
      name_en: supplier.name_en,
      name_ar: supplier.name_ar,
      contact_name_en: supplier.contact_name_en || "",
      contact_name_ar: supplier.contact_name_ar || "",
      email: supplier.email || "",
      phone: supplier.phone || "",
      address_en: supplier.address_en || "",
      address_ar: supplier.address_ar || "",
      is_active: supplier.is_active,
    });
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsDeleteModalOpen(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name_en.trim()) errors.name_en = t.errorRequired;
    if (!formData.name_ar.trim()) errors.name_ar = t.errorRequired;
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = t.errorInvalidEmail;
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const url = selectedSupplier ? `${apiUrl}/${selectedSupplier.id}` : apiUrl;
      const method = selectedSupplier ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error(t.saveError);
      }

      await fetchSuppliers();
      setIsAddModalOpen(false);
      setIsEditModalOpen(false);
      setSelectedSupplier(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.saveError);
    } finally {
      setIsSubmitting(false);
    }
  }, [apiUrl, fetchSuppliers, formData, getAuthHeaders, selectedSupplier, t.saveError]);

  const handleDelete = useCallback(async () => {
    if (!selectedSupplier) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`${apiUrl}/${selectedSupplier.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(t.deleteError);
      }

      await fetchSuppliers();
      setIsDeleteModalOpen(false);
      setSelectedSupplier(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.deleteError);
    } finally {
      setIsSubmitting(false);
    }
  }, [apiUrl, fetchSuppliers, getAuthHeaders, selectedSupplier, t.deleteError]);

  const handleToggleActive = useCallback(
    async (supplier: Supplier) => {
      try {
        const response = await fetch(`${apiUrl}/${supplier.id}`, {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            is_active: !supplier.is_active,
          }),
        });

        if (!response.ok) {
          throw new Error(t.saveError);
        }

        await fetchSuppliers();
      } catch (err) {
        setError(err instanceof Error ? err.message : t.saveError);
      }
    },
    [apiUrl, fetchSuppliers, getAuthHeaders, t.saveError]
  );

  const inputClasses = `w-full rounded-[var(--radius-md)] border px-4 py-3 transition-all outline-none ${
    theme === "dark"
      ? "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--action)] focus:ring-2 focus:ring-[color:var(--action)]/15"
      : "border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--action)] focus:ring-2 focus:ring-[color:var(--action)]/15"
  }`;

  const labelClasses = "mb-2 block text-sm font-medium text-[var(--foreground)]";

  const buttonPrimaryClasses = `rounded-[var(--radius-md)] px-4 py-3 font-semibold text-white transition-all ${
    isSubmitting
      ? "cursor-not-allowed bg-[color:var(--action)]/45"
      : "bg-[var(--action)] shadow-[0_14px_28px_rgba(31,157,115,0.22)] hover:bg-[var(--action-strong)]"
  }`;

  const buttonSecondaryClasses = `rounded-[var(--radius-md)] border px-4 py-3 font-semibold transition-all ${
    theme === "dark"
      ? "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--surface-strong)]"
      : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
  }`;

  const buttonDangerClasses =
    "rounded-[var(--radius-md)] bg-[var(--danger)] px-4 py-3 font-semibold text-white transition-all hover:opacity-90";

  return (
    <div dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold tracking-[-0.02em] text-[var(--foreground)]">
          {t.title}
        </h2>
        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--action)] px-4 py-3 font-semibold text-white shadow-[0_14px_28px_rgba(31,157,115,0.22)] transition-all hover:bg-[var(--action-strong)]"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t.addButton}
        </button>
      </div>

      {/* Search */}
      <div className="mb-6 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[color:color-mix(in_srgb,var(--surface)_76%,transparent)] p-4">
        <div className="relative text-[var(--foreground)]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className={`${inputClasses} pl-10`}
          />
          <svg
            className={`absolute top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--muted)] ${
              isRTL ? "right-3" : "left-3"
            }`}
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
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 rounded-[var(--radius-lg)] border border-[color:color-mix(in_srgb,var(--danger)_38%,transparent)] bg-[var(--danger-soft)] p-4 text-[var(--danger)]">
          {error}
        </div>
      )}

      {/* Suppliers List */}
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
      ) : filteredSuppliers.length === 0 ? (
        <div className="rounded-[var(--radius-xl)] border border-dashed border-[var(--border)] bg-[color:color-mix(in_srgb,var(--surface)_68%,transparent)] py-12 text-center text-[var(--muted)]">
          {t.noSuppliers}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredSuppliers.map((supplier) => (
            <div
              key={supplier.id}
              className={`rounded-[var(--radius-xl)] border p-5 transition-all ${
                theme === "dark"
                  ? "border-[var(--border)] bg-[color:color-mix(in_srgb,var(--surface)_88%,transparent)] hover:border-[color:color-mix(in_srgb,var(--accent)_30%,var(--border)_70%)]"
                  : "border-[var(--border)] bg-[color:color-mix(in_srgb,var(--card)_96%,transparent)] hover:border-[color:color-mix(in_srgb,var(--accent)_34%,var(--border)_66%)] shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
              } ${!supplier.is_active ? "opacity-60" : ""}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="truncate text-lg font-semibold text-[var(--foreground)]">
                      {locale === "ar" ? supplier.name_ar : supplier.name_en}
                    </h3>
                    {!supplier.is_active && (
                      <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 text-xs text-[var(--muted)]">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="space-y-1 text-sm text-[var(--muted)]">
                    {(supplier.contact_name_en || supplier.contact_name_ar) && (
                      <p>{locale === "ar" ? supplier.contact_name_ar : supplier.contact_name_en}</p>
                    )}
                    {supplier.phone && <p>{supplier.phone}</p>}
                    {supplier.email && <p>{supplier.email}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActive(supplier)}
                    className={`rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium transition-all ${
                      supplier.is_active
                        ? theme === "dark"
                          ? "bg-[var(--warning-soft)] text-[var(--warning)] hover:opacity-90"
                          : "bg-[var(--warning-soft)] text-[var(--warning)] hover:opacity-90"
                        : theme === "dark"
                          ? "bg-[var(--action-soft)] text-[var(--action)] hover:opacity-90"
                          : "bg-[var(--action-soft)] text-[var(--action)] hover:opacity-90"
                    }`}
                  >
                    {supplier.is_active ? t.deactivateButton : t.activateButton}
                  </button>
                  <button
                    onClick={() => openEditModal(supplier)}
                    className="rounded-[var(--radius-md)] p-2 text-[var(--muted)] transition-all hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
                    aria-label={t.editButton}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => openDeleteModal(supplier)}
                    className="rounded-[var(--radius-md)] p-2 text-[var(--danger)] transition-all hover:bg-[var(--danger-soft)]"
                    aria-label={t.deleteButton}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={t.addModalTitle}
        locale={locale}
        theme={theme}
        size="lg"
        footer={
          <>
            <button
              onClick={() => setIsAddModalOpen(false)}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClasses}>{t.nameEnLabel}</label>
              <input
                type="text"
                value={formData.name_en}
                onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                className={`${inputClasses} ${formErrors.name_en ? "border-red-500" : ""}`}
              />
              {formErrors.name_en && (
                <p className="mt-1 text-sm text-[var(--danger)]">{formErrors.name_en}</p>
              )}
            </div>
            <div>
              <label className={labelClasses}>{t.nameArLabel}</label>
              <input
                type="text"
                value={formData.name_ar}
                onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                className={`${inputClasses} ${formErrors.name_ar ? "border-red-500" : ""}`}
                dir="rtl"
              />
              {formErrors.name_ar && (
                <p className="mt-1 text-sm text-[var(--danger)]">{formErrors.name_ar}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClasses}>{t.contactNameEnLabel}</label>
              <input
                type="text"
                value={formData.contact_name_en}
                onChange={(e) => setFormData({ ...formData, contact_name_en: e.target.value })}
                className={inputClasses}
              />
            </div>
            <div>
              <label className={labelClasses}>{t.contactNameArLabel}</label>
              <input
                type="text"
                value={formData.contact_name_ar}
                onChange={(e) => setFormData({ ...formData, contact_name_ar: e.target.value })}
                className={inputClasses}
                dir="rtl"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClasses}>{t.emailLabel}</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={`${inputClasses} ${formErrors.email ? "border-red-500" : ""}`}
              />
              {formErrors.email && (
                <p className="mt-1 text-sm text-[var(--danger)]">{formErrors.email}</p>
              )}
            </div>
            <div>
              <label className={labelClasses}>{t.phoneLabel}</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className={inputClasses}
              />
            </div>
          </div>
          <div>
            <label className={labelClasses}>{t.addressEnLabel}</label>
            <textarea
              value={formData.address_en}
              onChange={(e) => setFormData({ ...formData, address_en: e.target.value })}
              className={inputClasses}
              rows={2}
            />
          </div>
          <div>
            <label className={labelClasses}>{t.addressArLabel}</label>
            <textarea
              value={formData.address_ar}
              onChange={(e) => setFormData({ ...formData, address_ar: e.target.value })}
              className={inputClasses}
              rows={2}
              dir="rtl"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active_add_supplier"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 rounded border transition-colors"
            />
            <label htmlFor="is_active_add_supplier" className={labelClasses}>
              {t.isActiveLabel}
            </label>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={t.editModalTitle}
        locale={locale}
        theme={theme}
        size="lg"
        footer={
          <>
            <button
              onClick={() => setIsEditModalOpen(false)}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClasses}>{t.nameEnLabel}</label>
              <input
                type="text"
                value={formData.name_en}
                onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                className={`${inputClasses} ${formErrors.name_en ? "border-red-500" : ""}`}
              />
              {formErrors.name_en && (
                <p className="mt-1 text-sm text-[var(--danger)]">{formErrors.name_en}</p>
              )}
            </div>
            <div>
              <label className={labelClasses}>{t.nameArLabel}</label>
              <input
                type="text"
                value={formData.name_ar}
                onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                className={`${inputClasses} ${formErrors.name_ar ? "border-red-500" : ""}`}
                dir="rtl"
              />
              {formErrors.name_ar && (
                <p className="mt-1 text-sm text-[var(--danger)]">{formErrors.name_ar}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClasses}>{t.contactNameEnLabel}</label>
              <input
                type="text"
                value={formData.contact_name_en}
                onChange={(e) => setFormData({ ...formData, contact_name_en: e.target.value })}
                className={inputClasses}
              />
            </div>
            <div>
              <label className={labelClasses}>{t.contactNameArLabel}</label>
              <input
                type="text"
                value={formData.contact_name_ar}
                onChange={(e) => setFormData({ ...formData, contact_name_ar: e.target.value })}
                className={inputClasses}
                dir="rtl"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClasses}>{t.emailLabel}</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={`${inputClasses} ${formErrors.email ? "border-red-500" : ""}`}
              />
              {formErrors.email && (
                <p className="mt-1 text-sm text-[var(--danger)]">{formErrors.email}</p>
              )}
            </div>
            <div>
              <label className={labelClasses}>{t.phoneLabel}</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className={inputClasses}
              />
            </div>
          </div>
          <div>
            <label className={labelClasses}>{t.addressEnLabel}</label>
            <textarea
              value={formData.address_en}
              onChange={(e) => setFormData({ ...formData, address_en: e.target.value })}
              className={inputClasses}
              rows={2}
            />
          </div>
          <div>
            <label className={labelClasses}>{t.addressArLabel}</label>
            <textarea
              value={formData.address_ar}
              onChange={(e) => setFormData({ ...formData, address_ar: e.target.value })}
              className={inputClasses}
              rows={2}
              dir="rtl"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active_edit_supplier"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 rounded border transition-colors"
            />
            <label htmlFor="is_active_edit_supplier" className={labelClasses}>
              {t.isActiveLabel}
            </label>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title={t.deleteModalTitle}
        locale={locale}
        theme={theme}
        footer={
          <>
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className={buttonSecondaryClasses}
              disabled={isSubmitting}
            >
              {t.cancelButton}
            </button>
            <button onClick={handleDelete} className={buttonDangerClasses} disabled={isSubmitting}>
              {isSubmitting ? t.deleteLoading : t.deleteButton}
            </button>
          </>
        }
      >
        <p className="text-[var(--foreground)]">{t.deleteConfirm}</p>
        {selectedSupplier && (
          <p className={`mt-4 font-medium ${"text-[var(--foreground)]"}`}>
            {locale === "ar" ? selectedSupplier.name_ar : selectedSupplier.name_en}
          </p>
        )}
      </Modal>
    </div>
  );
};

export default SupplierManager;
