"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Modal from "../ui/Modal";
import { authenticatedFetch } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface Category {
  id: string;
  name_en: string;
  name_ar: string;
}

interface Supplier {
  id: string;
  name_en: string;
  name_ar: string;
}

interface ProductBatch {
  id: string;
  batch_number: string;
  cost_price: number;
  current_quantity: number;
  initial_quantity: number;
  expiry_date: string;
  is_expired: boolean;
  days_until_expiry: number;
  created_at: string;
  updated_at: string;
}

interface Product {
  id: string;
  name_en: string;
  name_ar: string;
  barcode: string;
  sku?: string;
  cost_price: number;
  sale_price: number;
  tax_rate: number;
  compare_at_price?: number;
  category_id?: string;
  category?: Category;
  supplier_id?: string;
  supplier?: Supplier;
  is_controlled: boolean;
  min_stock_quantity?: number;
  description_en?: string;
  description_ar?: string;
  is_active: boolean;
  total_quantity: number;
  batches?: ProductBatch[];
  created_at: string;
  updated_at: string;
}

interface ProductListResponse {
  products?: unknown[];
}

interface ProductBatchesResponse {
  batches?: unknown[];
}

interface Translations {
  title: string;
  searchPlaceholder: string;
  searchByBarcode: string;
  searchByName: string;
  allCategories: string;
  addButton: string;
  editButton: string;
  deleteButton: string;
  viewBatches: string;
  hideBatches: string;
  noProducts: string;
  addModalTitle: string;
  editModalTitle: string;
  deleteModalTitle: string;
  nameEnLabel: string;
  nameArLabel: string;
  barcodeLabel: string;
  skuLabel: string;
  costPriceLabel: string;
  salePriceLabel: string;
  compareAtPriceLabel: string;
  taxRateLabel?: string;
  customerPriceLabel?: string;
  taxHint?: string;
  categoryLabel: string;
  supplierLabel: string;
  isControlledLabel: string;
  minStockLabel: string;
  descriptionEnLabel: string;
  descriptionArLabel: string;
  isActiveLabel: string;
  saveButton: string;
  savingButton: string;
  cancelButton: string;
  deleteConfirm: string;
  deleteLoading: string;
  errorRequired: string;
  errorInvalidNumber: string;
  errorBarcodeExists: string;
  fetchError: string;
  saveError: string;
  deleteError: string;
  batchesSection: string;
  addBatchButton: string;
  batchNumber: string;
  batchCost: string;
  batchQuantity: string;
  batchExpiry: string;
  batchActions: string;
  noBatches: string;
  expiredBadge: string;
  expiringSoonBadge: string;
  stockOkBadge: string;
  fefoOrder: string;
  pagination: string;
  itemsPerPage: string;
  barcodeScanHint: string;
}

const translations: Record<"ar" | "en", Translations> = {
  en: {
    title: "Products",
    searchPlaceholder: "Search by barcode, name (EN/AR)...",
    searchByBarcode: "Search by barcode",
    searchByName: "Search by name",
    allCategories: "All Categories",
    addButton: "Add Product",
    editButton: "Edit",
    deleteButton: "Delete",
    viewBatches: "View Batches",
    hideBatches: "Hide Batches",
    noProducts: "No products found",
    addModalTitle: "Add New Product",
    editModalTitle: "Edit Product",
    deleteModalTitle: "Delete Product",
    nameEnLabel: "Name (English)",
    nameArLabel: "Name (Arabic)",
    barcodeLabel: "Barcode *",
    skuLabel: "SKU",
    costPriceLabel: "Cost Price (EGP)",
    salePriceLabel: "Sale Price (EGP) *",
    compareAtPriceLabel: "Compare at Price (EGP)",
    taxRateLabel: "Tax Rate (%)",
    customerPriceLabel: "Customer Pays (incl. tax)",
    taxHint: "Sale price is before tax. Customer total includes this tax rate.",
    categoryLabel: "Category",
    supplierLabel: "Supplier",
    isControlledLabel: "Controlled Product (requires batch tracking)",
    minStockLabel: "Minimum Stock Quantity",
    descriptionEnLabel: "Description (English)",
    descriptionArLabel: "Description (Arabic)",
    isActiveLabel: "Active",
    saveButton: "Save",
    savingButton: "Saving...",
    cancelButton: "Cancel",
    deleteConfirm: "Are you sure you want to delete this product? This action cannot be undone.",
    deleteLoading: "Deleting...",
    errorRequired: "This field is required",
    errorInvalidNumber: "Please enter a valid number",
    errorBarcodeExists: "Barcode already exists",
    fetchError: "Failed to load products",
    saveError: "Failed to save product",
    deleteError: "Failed to delete product",
    batchesSection: "Product Batches",
    addBatchButton: "Add Batch",
    batchNumber: "Batch Number",
    batchCost: "Cost",
    batchQuantity: "Quantity",
    batchExpiry: "Expiry Date",
    batchActions: "Actions",
    noBatches: "No batches for this product",
    expiredBadge: "Expired",
    expiringSoonBadge: "Expiring Soon",
    stockOkBadge: "In Stock",
    fefoOrder: "FEFO Order",
    pagination: "Showing {{from}}-{{to}} of {{total}}",
    itemsPerPage: "Items per page",
    barcodeScanHint: "Barcode scanner ready - input auto-focused",
  },
  ar: {
    title: "الأصناف",
    searchPlaceholder: "دوّر بالباركود أو اسم الصنف (EN/AR)...",
    searchByBarcode: "دوّر بالباركود",
    searchByName: "دوّر بالاسم",
    allCategories: "كل التصنيفات",
    addButton: "ضيف صنف",
    editButton: "تعديل",
    deleteButton: "حذف",
    viewBatches: "عرض الدفعات",
    hideBatches: "إخفاء الدفعات",
    noProducts: "مفيش أصناف",
    addModalTitle: "ضيف صنف جديد",
    editModalTitle: "تعديل الصنف",
    deleteModalTitle: "حذف الصنف",
    nameEnLabel: "الاسم (إنجليزي)",
    nameArLabel: "الاسم (عربي)",
    barcodeLabel: "الباركود *",
    skuLabel: "كود الصنف",
    costPriceLabel: "سعر الشراء (ج.م)",
    salePriceLabel: "سعر البيع (ج.م) *",
    compareAtPriceLabel: "سعر المقارنة (ج.م)",
    taxRateLabel: "نسبة الضريبة (%)",
    customerPriceLabel: "العميل هيدفع (بالضريبة)",
    taxHint: "سعر البيع قبل الضريبة، والسعر النهائي بيتحسب بالنسبة دي.",
    categoryLabel: "التصنيف",
    supplierLabel: "المورّد",
    isControlledLabel: "صنف محتاج تتبّع دفعات",
    minStockLabel: "أقل كمية مطلوبة",
    descriptionEnLabel: "الوصف (إنجليزي)",
    descriptionArLabel: "الوصف (عربي)",
    isActiveLabel: "نشط",
    saveButton: "احفظ",
    savingButton: "بنحفظ...",
    cancelButton: "إلغاء",
    deleteConfirm: "متأكد إنك عايز تمسح الصنف ده؟ مش هتقدر ترجّعه بعد كده.",
    deleteLoading: "بنحذف...",
    errorRequired: "الخانة دي مطلوبة",
    errorInvalidNumber: "من فضلك اكتب رقم صحيح",
    errorBarcodeExists: "الباركود متسجل قبل كده",
    fetchError: "ماقدرناش نحمل الأصناف",
    saveError: "ماقدرناش نحفظ بيانات الصنف",
    deleteError: "ماقدرناش نمسح الصنف",
    batchesSection: "دفعات الصنف",
    addBatchButton: "ضيف دفعة",
    batchNumber: "رقم الدفعة",
    batchCost: "سعر الشراء",
    batchQuantity: "الكمية",
    batchExpiry: "تاريخ الانتهاء",
    batchActions: "إجراءات",
    noBatches: "مفيش دفعات للصنف ده",
    expiredBadge: "منتهية",
    expiringSoonBadge: "قربت تنتهي",
    stockOkBadge: "متاح",
    fefoOrder: "ترتيب FEFO",
    pagination: "عرض {{from}} - {{to}} من {{total}}",
    itemsPerPage: "عدد العناصر في الصفحة",
    barcodeScanHint: "ماسح الباركود جاهز، والتركيز على الخانة تلقائي",
  },
};

export interface ProductManagerProps {
  locale?: "ar" | "en";
  theme?: "light" | "dark";
  apiUrl?: string;
  categoriesApiUrl?: string;
  suppliersApiUrl?: string;
  itemsPerPage?: number;
}

export const ProductManager: React.FC<ProductManagerProps> = ({
  locale = "en",
  theme = "light",
  apiUrl = `${API_BASE}/api/products`,
  categoriesApiUrl = `${API_BASE}/api/categories`,
  suppliersApiUrl = `${API_BASE}/api/suppliers`,
  itemsPerPage = 10,
}) => {
  const t = translations[locale];
  const isRTL = locale === "ar";
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | "all">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<ProductBatch | null>(null);
  const [isBatchEditMode, setIsBatchEditMode] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name_en: "",
    name_ar: "",
    barcode: "",
    sku: "",
    cost_price: 0,
    sale_price: 0,
    tax_rate: 0,
    compare_at_price: 0,
    category_id: null as string | null,
    supplier_id: null as string | null,
    is_controlled: false,
    min_stock_quantity: 0,
    description_en: "",
    description_ar: "",
    is_active: true,
  });

  const [batchFormData, setBatchFormData] = useState({
    batch_number: "",
    cost_price: 0,
    current_quantity: 0,
    expiry_date: "",
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mapBatch = useCallback((batch: any): ProductBatch => {
    const expiryDate =
      typeof batch.expiry_date === "number"
        ? new Date(batch.expiry_date * 1000).toISOString()
        : typeof batch.expiryDate === "string"
          ? batch.expiryDate
          : batch.expiryDate instanceof Date
            ? batch.expiryDate.toISOString()
            : (batch.expiry_date ?? new Date().toISOString());
    const now = Date.now();
    const expiryMs = new Date(expiryDate).getTime();
    const daysUntilExpiry = Math.ceil((expiryMs - now) / (1000 * 60 * 60 * 24));

    return {
      id: String(batch.id),
      batch_number: batch.batch_number ?? batch.batchNumber ?? "",
      cost_price: Number(batch.cost_price ?? batch.costPrice ?? 0),
      current_quantity: Number(batch.current_quantity ?? batch.currentQuantity ?? 0),
      initial_quantity: Number(
        batch.initial_quantity ??
          batch.initialQuantity ??
          batch.current_quantity ??
          batch.currentQuantity ??
          0
      ),
      expiry_date: expiryDate,
      is_expired: daysUntilExpiry < 0,
      days_until_expiry: daysUntilExpiry,
      created_at: batch.created_at ?? batch.createdAt ?? "",
      updated_at: batch.updated_at ?? batch.updatedAt ?? "",
    };
  }, []);

  const mapProduct = useCallback(
    (product: any): Product => ({
      id: String(product.id),
      name_en: product.name_en ?? product.name ?? "",
      name_ar: product.name_ar ?? "",
      barcode: product.barcode ?? "",
      sku: product.sku ?? "",
      cost_price: Number(product.cost_price ?? product.costPrice ?? 0),
      sale_price: Number(product.sale_price ?? product.selling_price ?? product.sellingPrice ?? 0),
      tax_rate: Number(product.tax_rate ?? product.taxRate ?? 0) * 100,
      compare_at_price: product.compare_at_price ? Number(product.compare_at_price) : undefined,
      category_id: product.category_id ? String(product.category_id) : undefined,
      category:
        product.category_name || product.category_name_ar
          ? {
              id: String(product.category_id ?? ""),
              name_en: product.category_name ?? "",
              name_ar: product.category_name_ar ?? "",
            }
          : undefined,
      supplier_id: product.supplier_id ? String(product.supplier_id) : undefined,
      supplier:
        product.supplier_name || product.supplier_name_ar
          ? {
              id: String(product.supplier_id ?? ""),
              name_en: product.supplier_name ?? "",
              name_ar: product.supplier_name_ar ?? "",
            }
          : undefined,
      is_controlled: Boolean(product.is_controlled ?? product.isControlled),
      min_stock_quantity: Number(
        product.min_stock_quantity ?? product.min_stock_level ?? product.minStockLevel ?? 0
      ),
      description_en: product.description_en ?? product.description ?? "",
      description_ar: product.description_ar ?? "",
      is_active: Boolean(product.is_active ?? product.isActive ?? true),
      total_quantity: Number(product.total_quantity ?? product.total_stock ?? 0),
      batches: Array.isArray(product.batches) ? product.batches.map(mapBatch) : undefined,
      created_at: product.created_at ?? product.createdAt ?? "",
      updated_at: product.updated_at ?? product.updatedAt ?? "",
    }),
    [mapBatch]
  );

  // Fetch categories and suppliers
  const fetchCategories = useCallback(async () => {
    try {
      const response = await authenticatedFetch(categoriesApiUrl, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (response.ok) {
        const data = await response.json();
        setCategories(Array.isArray(data) ? data : (data.categories ?? []));
      }
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    }
  }, [categoriesApiUrl]);

  const fetchSuppliers = useCallback(async () => {
    try {
      const response = await authenticatedFetch(suppliersApiUrl, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (response.ok) {
        const data = await response.json();
        setSuppliers(Array.isArray(data) ? data : (data.suppliers ?? []));
      }
    } catch (err) {
      console.error("Failed to fetch suppliers:", err);
    }
  }, [suppliersApiUrl]);

  const fetchProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await authenticatedFetch(apiUrl, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(t.fetchError);
      }

      const data = (await response.json()) as ProductListResponse | unknown[];
      const productRows = Array.isArray(data) ? data : (data.products ?? []);
      setProducts(productRows.map(mapProduct));
    } catch (err) {
      setError(err instanceof Error ? err.message : t.fetchError);
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl, mapProduct, t.fetchError]);

  const fetchProductBatches = useCallback(
    async (productId: string) => {
      const response = await authenticatedFetch(`${apiUrl}/${productId}/batches`, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(t.fetchError);
      }

      const data = (await response.json()) as ProductBatchesResponse;
      const batches = Array.isArray(data) ? data : (data.batches ?? []);

      setProducts((currentProducts) =>
        currentProducts.map((product) =>
          product.id === productId ? { ...product, batches: batches.map(mapBatch) } : product
        )
      );
    },
    [apiUrl, mapBatch, t.fetchError]
  );

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchSuppliers();
  }, [fetchProducts, fetchCategories, fetchSuppliers]);

  // Auto-focus barcode input when add modal opens
  useEffect(() => {
    if (isAddModalOpen && barcodeInputRef.current) {
      setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 100);
    }
  }, [isAddModalOpen]);

  // Filter and paginate products
  const filteredProducts = products.filter((product) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      product.barcode.toLowerCase().includes(query) ||
      product.name_en.toLowerCase().includes(query) ||
      product.name_ar.includes(searchQuery) ||
      (product.sku && product.sku.toLowerCase().includes(query));

    const matchesCategory = categoryFilter === "all" || product.category_id === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const openAddModal = () => {
    setFormData({
      name_en: "",
      name_ar: "",
      barcode: "",
      sku: "",
      cost_price: 0,
      sale_price: 0,
      tax_rate: 0,
      compare_at_price: 0,
      category_id: null,
      supplier_id: null,
      is_controlled: false,
      min_stock_quantity: 0,
      description_en: "",
      description_ar: "",
      is_active: true,
    });
    setFormErrors({});
    setIsAddModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setSelectedProduct(product);
    setFormData({
      name_en: product.name_en,
      name_ar: product.name_ar,
      barcode: product.barcode,
      sku: product.sku || "",
      cost_price: product.cost_price,
      sale_price: product.sale_price,
      tax_rate: product.tax_rate || 0,
      compare_at_price: product.compare_at_price || 0,
      category_id: product.category_id || null,
      supplier_id: product.supplier_id || null,
      is_controlled: product.is_controlled,
      min_stock_quantity: product.min_stock_quantity || 0,
      description_en: product.description_en || "",
      description_ar: product.description_ar || "",
      is_active: product.is_active,
    });
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (product: Product) => {
    setSelectedProduct(product);
    setIsDeleteModalOpen(true);
  };

  const openBatchModal = (product: Product, batch?: ProductBatch) => {
    setSelectedProduct(product);
    if (batch) {
      setSelectedBatch(batch);
      setIsBatchEditMode(true);
      setBatchFormData({
        batch_number: batch.batch_number,
        cost_price: batch.cost_price,
        current_quantity: batch.current_quantity,
        expiry_date: batch.expiry_date.split("T")[0],
      });
    } else {
      setSelectedBatch(null);
      setIsBatchEditMode(false);
      setBatchFormData({
        batch_number: "",
        cost_price: 0,
        current_quantity: 0,
        expiry_date: "",
      });
    }
    setIsBatchModalOpen(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name_en.trim()) errors.name_en = t.errorRequired;
    if (!formData.name_ar.trim()) errors.name_ar = t.errorRequired;
    if (!formData.barcode.trim()) errors.barcode = t.errorRequired;
    if (formData.sale_price <= 0) errors.sale_price = t.errorRequired;
    if (formData.cost_price < 0) errors.cost_price = t.errorInvalidNumber;
    if (formData.compare_at_price && formData.compare_at_price < 0) {
      errors.compare_at_price = t.errorInvalidNumber;
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const url = selectedProduct ? `${apiUrl}/${selectedProduct.id}` : apiUrl;
      const method = selectedProduct ? "PUT" : "POST";

      const response = await authenticatedFetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name_en.trim(),
          name_ar: formData.name_ar.trim(),
          barcode: formData.barcode.trim(),
          description: formData.description_en.trim() || formData.description_ar.trim() || null,
          category_id: formData.category_id,
          supplier_id: formData.supplier_id,
          cost_price: formData.cost_price,
          selling_price: formData.sale_price,
          tax_rate: formData.tax_rate / 100,
          min_stock_level: formData.min_stock_quantity,
          is_controlled: formData.is_controlled,
          is_active: formData.is_active,
        }),
      });

      if (!response.ok) {
        if (response.status === 409) {
          throw new Error(t.errorBarcodeExists);
        }
        throw new Error(t.saveError);
      }

      await fetchProducts();
      setIsAddModalOpen(false);
      setIsEditModalOpen(false);
      setSelectedProduct(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.saveError);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProduct) return;

    setIsSubmitting(true);
    try {
      const response = await authenticatedFetch(`${apiUrl}/${selectedProduct.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null) as { message?: string } | null;
        throw new Error(errorData?.message || t.deleteError);
      }

      await fetchProducts();
      setIsDeleteModalOpen(false);
      setSelectedProduct(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.deleteError);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBatchSubmit = async () => {
    if (!selectedProduct) return;

    setIsSubmitting(true);
    try {
      const url = isBatchEditMode
        ? `${apiUrl}/${selectedProduct.id}/batches/${selectedBatch!.id}`
        : `${apiUrl}/${selectedProduct.id}/batches`;
      const method = isBatchEditMode ? "PUT" : "POST";

      const response = await authenticatedFetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          isBatchEditMode
            ? {
                cost_price: batchFormData.cost_price,
                current_quantity: batchFormData.current_quantity,
                expiry_date: Math.floor(new Date(batchFormData.expiry_date).getTime() / 1000),
              }
            : {
                batch_number: batchFormData.batch_number.trim(),
                cost_price: batchFormData.cost_price,
                initial_quantity: batchFormData.current_quantity,
                expiry_date: Math.floor(new Date(batchFormData.expiry_date).getTime() / 1000),
                supplier_id: selectedProduct.supplier_id ?? null,
              }
        ),
      });

      if (!response.ok) {
        throw new Error(t.saveError);
      }

      await fetchProducts();
      setIsBatchModalOpen(false);
      setSelectedProduct(null);
      setSelectedBatch(null);
      if (expandedProduct) {
        await fetchProductBatches(expandedProduct);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t.saveError);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleProductExpand = async (productId: string) => {
    if (expandedProduct === productId) {
      setExpandedProduct(null);
      return;
    }

    setExpandedProduct(productId);
    const product = products.find((item) => item.id === productId);
    if (!product?.batches) {
      try {
        await fetchProductBatches(productId);
      } catch (err) {
        setError(err instanceof Error ? err.message : t.fetchError);
      }
    }
  };

  const getExpiryStatus = (batch: ProductBatch) => {
    if (batch.is_expired) return { label: t.expiredBadge, color: "red" };
    if (batch.days_until_expiry <= 30) return { label: t.expiringSoonBadge, color: "yellow" };
    return { label: t.stockOkBadge, color: "green" };
  };

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

  const buttonSmallPrimaryClasses =
    "rounded-[var(--radius-md)] bg-[var(--action)] px-3 py-2 text-sm font-semibold text-white transition-all hover:bg-[var(--action-strong)]";
  const previousLabel = locale === "ar" ? "السابق" : "Previous";
  const nextLabel = locale === "ar" ? "التالي" : "Next";
  const taxRateLabel = t.taxRateLabel ?? (locale === "ar" ? "نسبة الضريبة (%)" : "Tax Rate (%)");
  const customerPriceLabel =
    t.customerPriceLabel ??
    (locale === "ar" ? "السعر على العميل بعد الضريبة" : "Customer Pays (incl. tax)");
  const taxHint =
    t.taxHint ??
    (locale === "ar"
      ? "سعر البيع هنا قبل الضريبة، ويظهر إجمالي العميل بعد تطبيق نسبة الضريبة."
      : "Sale price is before tax. Customer total includes this tax rate.");
  const getCustomerPrice = (salePrice: number, taxRatePercent: number) =>
    salePrice * (1 + taxRatePercent / 100);

  return (
    <div dir={isRTL ? "rtl" : "ltr"}>
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

      {/* Search and Filters */}
      <div className="mb-6 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[color:color-mix(in_srgb,var(--surface)_76%,transparent)] p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="relative text-[var(--foreground)]">
            <input
              ref={barcodeInputRef}
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
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value === "all" ? "all" : e.target.value);
                setCurrentPage(1);
              }}
              className={inputClasses}
            >
              <option value="all">{t.allCategories}</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {locale === "ar" ? cat.name_ar : cat.name_en}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center text-sm text-[var(--muted)]">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            {t.barcodeScanHint}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 rounded-[var(--radius-lg)] border border-[color:color-mix(in_srgb,var(--danger)_38%,transparent)] bg-[var(--danger-soft)] p-4 text-[var(--danger)]">
          {error}
        </div>
      )}

      {/* Products List */}
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
      ) : paginatedProducts.length === 0 ? (
        <div className="rounded-[var(--radius-xl)] border border-dashed border-[var(--border)] bg-[color:color-mix(in_srgb,var(--surface)_68%,transparent)] py-12 text-center text-[var(--muted)]">
          {t.noProducts}
        </div>
      ) : (
        <>
          <div className="grid gap-4">
            {paginatedProducts.map((product, index) => (
              <div
                key={product.id}
                className={`rounded-[var(--radius-xl)] border transition-all ${
                  theme === "dark"
                    ? "border-[var(--border)] bg-[color:color-mix(in_srgb,var(--surface)_88%,transparent)] hover:border-[color:color-mix(in_srgb,var(--accent)_30%,var(--border)_70%)]"
                    : "border-[var(--border)] bg-[color:color-mix(in_srgb,var(--card)_96%,transparent)] hover:border-[color:color-mix(in_srgb,var(--accent)_34%,var(--border)_66%)] shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
                } ${!product.is_active ? "opacity-60" : ""}`}
              >
                {/* Product Card Header */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="truncate text-lg font-semibold text-[var(--foreground)]">
                          {locale === "ar" ? product.name_ar : product.name_en}
                        </h3>
                        {product.is_controlled && (
                          <span className="rounded-full bg-[var(--info-soft)] px-2 py-0.5 text-xs text-[var(--info)]">
                            {t.isControlledLabel}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        <span className="font-mono text-[var(--muted)]">
                          Barcode: {product.barcode}
                        </span>
                        {product.sku && (
                          <span className="text-[var(--muted)]">SKU: {product.sku}</span>
                        )}
                        <span className="text-[var(--foreground)]">
                          Stock: {product.total_quantity}
                        </span>
                        {product.category && (
                          <span className="text-[var(--muted)]">
                            {locale === "ar" ? product.category.name_ar : product.category.name_en}
                          </span>
                        )}
                        <span className="font-semibold text-[var(--action)]">
                          EGP {product.sale_price.toFixed(2)}
                        </span>
                        <span className="text-[var(--muted)]">
                          Tax {product.tax_rate.toFixed(0)}%
                        </span>
                        <span className="font-semibold text-[var(--accent)]">
                          {customerPriceLabel}: EGP{" "}
                          {getCustomerPrice(product.sale_price, product.tax_rate).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleProductExpand(product.id)}
                        className={buttonSecondaryClasses}
                      >
                        {expandedProduct === product.id ? t.hideBatches : t.viewBatches}
                      </button>
                      <button
                        onClick={() => openEditModal(product)}
                        className="rounded-[var(--radius-md)] p-2 text-[var(--muted)] transition-all hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
                        aria-label={t.editButton}
                      >
                        <svg
                          className="w-5 h-5"
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
                      <button
                        onClick={() => openDeleteModal(product)}
                        className="rounded-[var(--radius-md)] p-2 text-[var(--danger)] transition-all hover:bg-[var(--danger-soft)]"
                        aria-label={t.deleteButton}
                      >
                        <svg
                          className="w-5 h-5"
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
                    </div>
                  </div>
                </div>

                {/* Batches Sub-section */}
                {expandedProduct === product.id && (
                  <div className="border-t border-[var(--border)] px-4 pb-4">
                    <div className="flex items-center justify-between mt-4 mb-3">
                      <h4 className="font-semibold text-[var(--foreground)]">{t.batchesSection}</h4>
                      <button
                        onClick={() => openBatchModal(product)}
                        className={buttonSmallPrimaryClasses}
                      >
                        <svg
                          className="w-4 h-4 inline mr-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4v16m8-8H4"
                          />
                        </svg>
                        {t.addBatchButton}
                      </button>
                    </div>
                    {product.batches && product.batches.length > 0 ? (
                      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:color-mix(in_srgb,var(--surface)_70%,transparent)]">
                        <table className="w-full text-sm">
                          <thead className="bg-[color:color-mix(in_srgb,var(--surface)_88%,transparent)]">
                            <tr>
                              <th className="px-4 py-3 text-left font-medium text-[var(--foreground)]">
                                {t.batchNumber}
                              </th>
                              <th className="px-4 py-3 text-left font-medium text-[var(--foreground)]">
                                {t.batchCost}
                              </th>
                              <th className="px-4 py-3 text-left font-medium text-[var(--foreground)]">
                                {t.batchQuantity}
                              </th>
                              <th className="px-4 py-3 text-left font-medium text-[var(--foreground)]">
                                {t.batchExpiry}
                              </th>
                              <th className="px-4 py-3 text-left font-medium text-[var(--foreground)]">
                                Status
                              </th>
                              <th className="px-4 py-3 text-left font-medium text-[var(--foreground)]">
                                {t.fefoOrder}
                              </th>
                              <th className="px-4 py-3 text-left font-medium text-[var(--foreground)]">
                                {t.batchActions}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {product.batches.map((batch, idx) => {
                              const status = getExpiryStatus(batch);
                              return (
                                <tr key={batch.id} className="border-t border-[var(--border)]">
                                  <td className="px-4 py-3 text-[var(--foreground)]">
                                    {batch.batch_number}
                                  </td>
                                  <td className="px-4 py-3 text-[var(--foreground)]">
                                    EGP {batch.cost_price.toFixed(2)}
                                  </td>
                                  <td className="px-4 py-3 text-[var(--foreground)]">
                                    {batch.current_quantity} / {batch.initial_quantity}
                                  </td>
                                  <td className="px-4 py-3 text-[var(--foreground)]">
                                    {new Date(batch.expiry_date).toLocaleDateString()}
                                  </td>
                                  <td className="px-4 py-3">
                                    <span
                                      className={`rounded-full px-2 py-1 text-xs ${
                                        status.color === "red"
                                          ? "bg-[var(--danger-soft)] text-[var(--danger)]"
                                          : status.color === "yellow"
                                            ? "bg-[var(--warning-soft)] text-[var(--warning)]"
                                            : "bg-[var(--action-soft)] text-[var(--action)]"
                                      }`}
                                    >
                                      {status.label}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-[var(--muted)]">#{idx + 1}</td>
                                  <td className="px-4 py-3">
                                    <button
                                      onClick={() => openBatchModal(product, batch)}
                                      className="rounded p-1.5 text-[var(--muted)] transition-all hover:bg-[var(--surface-strong)] hover:text-[var(--foreground)]"
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
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="py-8 text-center text-[var(--muted)]">{t.noBatches}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex flex-col gap-4 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[color:color-mix(in_srgb,var(--surface)_78%,transparent)] p-4 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-[var(--muted)]">
                {t.pagination
                  .replace("{{from}}", String((currentPage - 1) * itemsPerPage + 1))
                  .replace(
                    "{{to}}",
                    String(Math.min(currentPage * itemsPerPage, filteredProducts.length))
                  )
                  .replace("{{total}}", String(filteredProducts.length))}
              </p>
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

      {/* Add/Edit Product Modal */}
      <Modal
        isOpen={isAddModalOpen || isEditModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setIsEditModalOpen(false);
          setSelectedProduct(null);
        }}
        title={selectedProduct ? t.editModalTitle : t.addModalTitle}
        locale={locale}
        theme={theme}
        size="xl"
        footer={
          <>
            <button
              onClick={() => {
                setIsAddModalOpen(false);
                setIsEditModalOpen(false);
                setSelectedProduct(null);
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <div>
            <label className={labelClasses}>{t.barcodeLabel}</label>
            <input
              ref={barcodeInputRef}
              type="text"
              value={formData.barcode}
              onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
              className={`${inputClasses} ${formErrors.barcode ? "border-red-500" : ""}`}
              placeholder="Scan or enter barcode"
            />
            {formErrors.barcode && (
              <p className="mt-1 text-sm text-[var(--danger)]">{formErrors.barcode}</p>
            )}
          </div>
          <div>
            <label className={labelClasses}>{t.skuLabel}</label>
            <input
              type="text"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              className={inputClasses}
            />
          </div>
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
            <label className={labelClasses}>{t.salePriceLabel}</label>
            <input
              type="number"
              step="0.01"
              value={formData.sale_price}
              onChange={(e) =>
                setFormData({ ...formData, sale_price: parseFloat(e.target.value) || 0 })
              }
              className={`${inputClasses} ${formErrors.sale_price ? "border-red-500" : ""}`}
            />
            {formErrors.sale_price && (
              <p className="mt-1 text-sm text-[var(--danger)]">{formErrors.sale_price}</p>
            )}
          </div>
          <div>
            <label className={labelClasses}>{t.compareAtPriceLabel}</label>
            <input
              type="number"
              step="0.01"
              value={formData.compare_at_price}
              onChange={(e) =>
                setFormData({ ...formData, compare_at_price: parseFloat(e.target.value) || 0 })
              }
              className={`${inputClasses} ${formErrors.compare_at_price ? "border-red-500" : ""}`}
            />
            {formErrors.compare_at_price && (
              <p className="mt-1 text-sm text-[var(--danger)]">{formErrors.compare_at_price}</p>
            )}
          </div>
          <div>
            <label className={labelClasses}>{taxRateLabel}</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.tax_rate}
              onChange={(e) =>
                setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 })
              }
              className={inputClasses}
            />
          </div>
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:color-mix(in_srgb,var(--surface)_70%,transparent)] p-4">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--muted)]">
              {customerPriceLabel}
            </p>
            <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
              EGP {getCustomerPrice(formData.sale_price, formData.tax_rate).toFixed(2)}
            </p>
            <p className="mt-2 text-xs text-[var(--muted)]">{taxHint}</p>
          </div>
          <div className="md:col-span-2 -mt-2 text-xs text-[var(--muted)]">
            {locale === "ar"
              ? "تُحفَظ أسعار المنتجات في النظام بالجنيه المصري الأساسي، ثم تُطبَّق تحويلات العملات وقت الدفع فقط."
              : "Product prices are stored in the base currency, EGP. Foreign currency conversion only happens during checkout."}
          </div>
          <div>
            <label className={labelClasses}>{t.isControlledLabel}</label>
            <div className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                id="is_controlled"
                checked={formData.is_controlled}
                onChange={(e) => setFormData({ ...formData, is_controlled: e.target.checked })}
                className="w-4 h-4 rounded border transition-colors"
              />
              <label htmlFor="is_controlled" className={labelClasses}>
                Enabled
              </label>
            </div>
          </div>
          <div>
            <label className={labelClasses}>{t.categoryLabel}</label>
            <select
              value={formData.category_id || ""}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value || null })}
              className={inputClasses}
            >
              <option value="">No Category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {locale === "ar" ? cat.name_ar : cat.name_en}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClasses}>{t.supplierLabel}</label>
            <select
              value={formData.supplier_id || ""}
              onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value || null })}
              className={inputClasses}
            >
              <option value="">No Supplier</option>
              {suppliers.map((sup) => (
                <option key={sup.id} value={sup.id}>
                  {locale === "ar" ? sup.name_ar : sup.name_en}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className={labelClasses}>{t.minStockLabel}</label>
            <input
              type="number"
              value={formData.min_stock_quantity}
              onChange={(e) =>
                setFormData({ ...formData, min_stock_quantity: parseInt(e.target.value) || 0 })
              }
              className={inputClasses}
            />
          </div>
          <div className="md:col-span-2">
            <label className={labelClasses}>{t.descriptionEnLabel}</label>
            <textarea
              value={formData.description_en}
              onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
              className={inputClasses}
              rows={3}
            />
          </div>
          <div className="md:col-span-2">
            <label className={labelClasses}>{t.descriptionArLabel}</label>
            <textarea
              value={formData.description_ar}
              onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
              className={inputClasses}
              rows={3}
              dir="rtl"
            />
          </div>
          <div className="md:col-span-2 flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 rounded border transition-colors"
            />
            <label htmlFor="is_active" className={labelClasses}>
              {t.isActiveLabel}
            </label>
          </div>
        </div>
      </Modal>

      {/* Add/Edit Batch Modal */}
      <Modal
        isOpen={isBatchModalOpen}
        onClose={() => {
          setIsBatchModalOpen(false);
          setSelectedProduct(null);
          setSelectedBatch(null);
        }}
        title={isBatchEditMode ? "Edit Batch" : "Add New Batch"}
        locale={locale}
        theme={theme}
        footer={
          <>
            <button
              onClick={() => {
                setIsBatchModalOpen(false);
                setSelectedProduct(null);
                setSelectedBatch(null);
              }}
              className={buttonSecondaryClasses}
              disabled={isSubmitting}
            >
              {t.cancelButton}
            </button>
            <button
              onClick={handleBatchSubmit}
              className={buttonPrimaryClasses}
              disabled={isSubmitting}
            >
              {isSubmitting ? t.savingButton : t.saveButton}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className={labelClasses}>{t.batchNumber}</label>
            <input
              type="text"
              value={batchFormData.batch_number}
              onChange={(e) => setBatchFormData({ ...batchFormData, batch_number: e.target.value })}
              className={inputClasses}
              placeholder="e.g., BATCH-2024-001"
            />
          </div>
          <div>
            <label className={labelClasses}>{t.batchCost}</label>
            <input
              type="number"
              step="0.01"
              value={batchFormData.cost_price}
              onChange={(e) =>
                setBatchFormData({ ...batchFormData, cost_price: parseFloat(e.target.value) || 0 })
              }
              className={inputClasses}
            />
          </div>
          <div>
            <label className={labelClasses}>{t.batchQuantity}</label>
            <input
              type="number"
              value={batchFormData.current_quantity}
              onChange={(e) =>
                setBatchFormData({
                  ...batchFormData,
                  current_quantity: parseInt(e.target.value) || 0,
                })
              }
              className={inputClasses}
            />
          </div>
          <div>
            <label className={labelClasses}>{t.batchExpiry}</label>
            <input
              type="date"
              value={batchFormData.expiry_date}
              onChange={(e) => setBatchFormData({ ...batchFormData, expiry_date: e.target.value })}
              className={inputClasses}
            />
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedProduct(null);
        }}
        title={t.deleteModalTitle}
        locale={locale}
        theme={theme}
        footer={
          <>
            <button
              onClick={() => {
                setIsDeleteModalOpen(false);
                setSelectedProduct(null);
              }}
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
        {selectedProduct && (
          <p className="mt-4 font-medium text-[var(--foreground)]">
            {locale === "ar" ? selectedProduct.name_ar : selectedProduct.name_en}
          </p>
        )}
      </Modal>
    </div>
  );
};

export default ProductManager;
