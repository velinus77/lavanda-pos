'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Modal from '../ui/Modal';

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

const translations: Record<'ar' | 'en', Translations> = {
  en: {
    title: 'Batch Management',
    searchPlaceholder: 'Search by batch number, product name, barcode...',
    allProducts: 'All Products',
    allStatuses: 'All Statuses',
    addButton: 'Add Batch',
    editButton: 'Edit',
    disposeButton: 'Dispose',
    noBatches: 'No batches found',
    addModalTitle: 'Add New Batch',
    editModalTitle: 'Edit Batch',
    disposeModalTitle: 'Dispose Batch',
    productLabel: 'Product *',
    batchNumberLabel: 'Batch Number *',
    costPriceLabel: 'Cost Price',
    quantityLabel: 'Quantity *',
    expiryDateLabel: 'Expiry Date *',
    notesLabel: 'Notes',
    saveButton: 'Save',
    savingButton: 'Saving...',
    cancelButton: 'Cancel',
    disposeConfirm: 'Are you sure you want to dispose this batch? This action cannot be undone.',
    disposeLoading: 'Disposing...',
    errorRequired: 'This field is required',
    errorInvalidNumber: 'Please enter a valid number',
    fetchError: 'Failed to load batches',
    saveError: 'Failed to save batch',
    disposeError: 'Failed to dispose batch',
    expiredBadge: 'Expired',
    expiringSoonBadge: 'Expiring Soon',
    inStockBadge: 'In Stock',
    disposedBadge: 'Disposed',
    fefoOrder: 'FEFO Order',
    batchDetails: 'Batch Details',
    productDetails: 'Product Details',
    stockInfo: 'Stock Information',
    costInfo: 'Cost Information',
    expiryInfo: 'Expiry Information',
    daysUntilExpiry: 'Days until expiry',
    expiredDays: 'Days expired',
  },
  ar: {
    title: 'إدارة الدفعات',
    searchPlaceholder: 'البحث برقم الدفعة، اسم المنتج، الباركود...',
    allProducts: 'جميع المنتجات',
    allStatuses: 'جميع الحالات',
    addButton: 'إضافة دفعة',
    editButton: 'تعديل',
    disposeButton: 'التخلص',
    noBatches: 'لا توجد دفعات',
    addModalTitle: 'إضافة دفعة جديدة',
    editModalTitle: 'تعديل الدفعة',
    disposeModalTitle: 'التخلص من الدفعة',
    productLabel: 'المنتج *',
    batchNumberLabel: 'رقم الدفعة *',
    costPriceLabel: 'سعر التكلفة',
    quantityLabel: 'الكمية *',
    expiryDateLabel: 'تاريخ الانتهاء *',
    notesLabel: 'ملاحظات',
    saveButton: 'حفظ',
    savingButton: 'جاري الحفظ...',
    cancelButton: 'إلغاء',
    disposeConfirm: 'هل أنت متأكد من التخلص من هذه الدفعة؟ لا يمكن التراجع عن هذا الإجراء.',
    disposeLoading: 'جاري التخلص...',
    errorRequired: 'هذا الحقل مطلوب',
    errorInvalidNumber: 'الرجاء إدخال رقم صحيح',
    fetchError: 'فشل تحميل الدفعات',
    saveError: 'فشل حفظ الدفعة',
    disposeError: 'فشل التخلص من الدفعة',
    expiredBadge: 'منتهي',
    expiringSoonBadge: 'قرب الانتهاء',
    inStockBadge: 'متوفر',
    disposedBadge: 'تم التخلص',
    fefoOrder: 'ترتيب FEFO',
    batchDetails: 'تفاصيل الدفعة',
    productDetails: 'تفاصيل المنتج',
    stockInfo: 'معلومات المخزون',
    costInfo: 'معلومات التكلفة',
    expiryInfo: 'معلومات الانتهاء',
    daysUntilExpiry: 'أيام حتى الانتهاء',
    expiredDays: 'أيام منذ الانتهاء',
  },
};

export interface BatchManagerProps {
  locale?: 'ar' | 'en';
  theme?: 'light' | 'dark';
  batchesApiUrl?: string;
  productsApiUrl?: string;
  itemsPerPage?: number;
}

export const BatchManager: React.FC<BatchManagerProps> = ({
  locale = 'en',
  theme = 'light',
  batchesApiUrl = '/api/stock/batches',
  productsApiUrl = '/api/products',
  itemsPerPage = 15,
}) => {
  const t = translations[locale];
  const isRTL = locale === 'ar';

  const [batches, setBatches] = useState<ProductBatch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [productFilter, setProductFilter] = useState<number | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'expired' | 'expiring' | 'in_stock' | 'disposed'>('all');
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
    batch_number: '',
    cost_price: 0,
    current_quantity: 0,
    expiry_date: '',
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
      console.error('Failed to fetch products:', err);
    }
  }, [productsApiUrl]);

  const fetchBatches = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(batchesApiUrl, {
        headers: {
          'Content-Type': 'application/json',
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
  const filteredBatches = batches.filter((batch) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      batch.batch_number.toLowerCase().includes(query) ||
      (batch.product && (
        batch.product.name_en.toLowerCase().includes(query) ||
        batch.product.name_ar.includes(searchQuery) ||
        batch.product.barcode.toLowerCase().includes(query)
      ));
    
    const matchesProduct = productFilter === 'all' || batch.product_id === productFilter;
    
    let matchesStatus = true;
    if (statusFilter !== 'all') {
      if (statusFilter === 'expired' && !batch.is_expired) matchesStatus = false;
      if (statusFilter === 'expiring' && (batch.is_expired || batch.days_until_expiry > 30)) matchesStatus = false;
      if (statusFilter === 'in_stock' && (batch.is_expired || batch.days_until_expiry <= 30)) matchesStatus = false;
      if (statusFilter === 'disposed' && !batch.is_disposed) matchesStatus = false;
    }
    
    return matchesSearch && matchesProduct && matchesStatus;
  }).sort((a, b) => {
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
      batch_number: '',
      cost_price: 0,
      current_quantity: 0,
      expiry_date: '',
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
      expiry_date: batch.expiry_date.split('T')[0],
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
      const method = selectedBatch ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
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
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
    if (batch.is_disposed) return { label: t.disposedBadge, color: 'gray' };
    if (batch.is_expired) return { label: t.expiredBadge, color: 'red' };
    if (batch.days_until_expiry <= 30) return { label: t.expiringSoonBadge, color: 'yellow' };
    return { label: t.inStockBadge, color: 'green' };
  };

  const getFEFOIndex = (batch: ProductBatch) => {
    const sortedIndex = filteredBatches.findIndex(b => b.id === batch.id);
    return sortedIndex + 1;
  };

  const inputClasses = `w-full px-4 py-2.5 rounded-lg border transition-all outline-none ${
    theme === 'dark'
      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
  }`;

  const labelClasses = `block text-sm font-medium mb-2 ${
    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
  }`;

  const buttonPrimaryClasses = `px-4 py-2.5 rounded-lg font-semibold text-white transition-all ${
    isSubmitting
      ? 'bg-purple-400 cursor-not-allowed'
      : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700'
  }`;

  const buttonSecondaryClasses = `px-4 py-2.5 rounded-lg font-semibold transition-all ${
    theme === 'dark'
      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
  }`;

  const buttonDangerClasses = `px-4 py-2.5 rounded-lg font-semibold text-white bg-red-600 hover:bg-red-700 transition-all`;

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className={`text-2xl font-bold ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          {t.title}
        </h1>
        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t.addButton}
        </button>
      </div>

      {/* Search and Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className={`relative ${
          theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
        }`}>
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
              isRTL ? 'right-3' : 'left-3'
            } ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
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
              setProductFilter(e.target.value === 'all' ? 'all' : Number(e.target.value));
              setCurrentPage(1);
            }}
            className={inputClasses}
          >
            <option value="all">{t.allProducts}</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {locale === 'ar' ? product.name_ar : product.name_en}
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
        <div className={`text-sm ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
        } flex items-center`}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
          {t.fefoOrder}: {t.expiryInfo}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className={`mb-6 p-4 rounded-lg border ${
          theme === 'dark'
            ? 'bg-red-900/20 border-red-800 text-red-300'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {error}
        </div>
      )}

      {/* Batches List */}
      {isLoading ? (
        <div className={`text-center py-12 ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
        }`}>
          <svg className="animate-spin h-8 w-8 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading...
        </div>
      ) : paginatedBatches.length === 0 ? (
        <div className={`text-center py-12 ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
        }`}>
          {t.noBatches}
        </div>
      ) : (
        <>
          <div className={`overflow-x-auto rounded-xl border ${
            theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <table className="w-full text-sm">
              <thead className={
                theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
              }>
                <tr>
                  <th className={`px-4 py-3 text-left font-medium ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>{t.fefoOrder}</th>
                  <th className={`px-4 py-3 text-left font-medium ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>{t.batchNumberLabel}</th>
                  <th className={`px-4 py-3 text-left font-medium ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>{t.productDetails}</th>
                  <th className={`px-4 py-3 text-left font-medium ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>{t.stockInfo}</th>
                  <th className={`px-4 py-3 text-left font-medium ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>{t.costInfo}</th>
                  <th className={`px-4 py-3 text-left font-medium ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>{t.expiryInfo}</th>
                  <th className={`px-4 py-3 text-left font-medium ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>Status</th>
                  <th className={`px-4 py-3 text-left font-medium ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>{t.editButton}</th>
                </tr>
              </thead>
              <tbody>
                {paginatedBatches.map((batch, idx) => {
                  const status = getExpiryStatus(batch);
                  const globalFEFOIndex = (currentPage - 1) * itemsPerPage + idx + 1;
                  return (
                    <tr
                      key={batch.id}
                      className={`border-t transition-all ${
                        theme === 'dark'
                          ? 'border-gray-700 hover:bg-gray-700/50'
                          : 'border-gray-200 hover:bg-gray-50'
                      } ${batch.is_disposed ? 'opacity-50' : ''}`}
                    >
                      <td className={`px-4 py-3 font-mono ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        #{globalFEFOIndex}
                      </td>
                      <td className={`px-4 py-3 font-medium ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        {batch.batch_number}
                      </td>
                      <td className={`px-4 py-3 ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        {batch.product && (
                          <div>
                            <div className="font-medium">
                              {locale === 'ar' ? batch.product.name_ar : batch.product.name_en}
                            </div>
                            <div className={`text-xs ${
                              theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                            }`}>
                              {batch.product.barcode}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className={`px-4 py-3 ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        <div className="font-medium">
                          {batch.current_quantity} / {batch.initial_quantity}
                        </div>
                        {batch.current_quantity < batch.initial_quantity && (
                          <div className={`text-xs ${
                            theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'
                          }`}>
                            -{batch.initial_quantity - batch.current_quantity} sold
                          </div>
                        )}
                      </td>
                      <td className={`px-4 py-3 font-medium ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        ${batch.cost_price.toFixed(2)}
                      </td>
                      <td className={`px-4 py-3 ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        <div>
                          {new Date(batch.expiry_date).toLocaleDateString()}
                        </div>
                        {!batch.is_expired && !batch.is_disposed && (
                          <div className={`text-xs ${
                            batch.days_until_expiry <= 7
                              ? 'text-red-500'
                              : batch.days_until_expiry <= 30
                              ? 'text-yellow-500'
                              : theme === 'dark' ? 'text-green-400' : 'text-green-600'
                          }`}>
                            {t.daysUntilExpiry}: {batch.days_until_expiry}
                          </div>
                        )}
                        {batch.is_expired && !batch.is_disposed && (
                          <div className="text-xs text-red-500">
                            {t.expiredDays}: {Math.abs(batch.days_until_expiry)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          status.color === 'red'
                            ? theme === 'dark' ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700'
                            : status.color === 'yellow'
                            ? theme === 'dark' ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-700'
                            : status.color === 'green'
                            ? theme === 'dark' ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'
                            : theme === 'dark' ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-600'
                        }`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {!batch.is_disposed && (
                            <>
                              <button
                                onClick={() => openEditModal(batch)}
                                className={`p-2 rounded-lg transition-all ${
                                  theme === 'dark'
                                    ? 'hover:bg-gray-600 text-gray-400 hover:text-gray-300'
                                    : 'hover:bg-gray-200 text-gray-600 hover:text-gray-700'
                                }`}
                                aria-label={t.editButton}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              {(batch.is_expired || batch.current_quantity === 0) && (
                                <button
                                  onClick={() => openDisposeModal(batch)}
                                  className={`p-2 rounded-lg transition-all ${
                                    theme === 'dark'
                                      ? 'hover:bg-red-900/30 text-red-400 hover:text-red-300'
                                      : 'hover:bg-red-100 text-red-600 hover:text-red-700'
                                  }`}
                                  aria-label={t.disposeButton}
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
            <div className="mt-6 flex items-center justify-between">
              <p className={`text-sm ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Showing {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredBatches.length)} of {filteredBatches.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    currentPage === 1
                      ? theme === 'dark' ? 'bg-gray-800 text-gray-600' : 'bg-gray-100 text-gray-400'
                      : buttonSecondaryClasses
                  }`}
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      currentPage === page
                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                        : buttonSecondaryClasses
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    currentPage === totalPages
                      ? theme === 'dark' ? 'bg-gray-800 text-gray-600' : 'bg-gray-100 text-gray-400'
                      : buttonSecondaryClasses
                  }`}
                >
                  Next
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
            <button
              onClick={handleSubmit}
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
            <label className={labelClasses}>{t.productLabel}</label>
            <select
              value={formData.product_id || ''}
              onChange={(e) => setFormData({ ...formData, product_id: e.target.value ? Number(e.target.value) : null })}
              className={`${inputClasses} ${formErrors.product_id ? 'border-red-500' : ''}`}
            >
              <option value="">Select Product</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {locale === 'ar' ? product.name_ar : product.name_en} ({product.barcode})
                </option>
              ))}
            </select>
            {formErrors.product_id && <p className="mt-1 text-sm text-red-500">{formErrors.product_id}</p>}
          </div>
          <div>
            <label className={labelClasses}>{t.batchNumberLabel}</label>
            <input
              type="text"
              value={formData.batch_number}
              onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
              className={`${inputClasses} ${formErrors.batch_number ? 'border-red-500' : ''}`}
              placeholder="e.g., BATCH-2024-001"
            />
            {formErrors.batch_number && <p className="mt-1 text-sm text-red-500">{formErrors.batch_number}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClasses}>{t.costPriceLabel}</label>
              <input
                type="number"
                step="0.01"
                value={formData.cost_price}
                onChange={(e) => setFormData({ ...formData, cost_price: parseFloat(e.target.value) || 0 })}
                className={`${inputClasses} ${formErrors.cost_price ? 'border-red-500' : ''}`}
              />
              {formErrors.cost_price && <p className="mt-1 text-sm text-red-500">{formErrors.cost_price}</p>}
            </div>
            <div>
              <label className={labelClasses}>{t.quantityLabel}</label>
              <input
                type="number"
                value={formData.current_quantity}
                onChange={(e) => setFormData({ ...formData, current_quantity: parseInt(e.target.value) || 0 })}
                className={`${inputClasses} ${formErrors.current_quantity ? 'border-red-500' : ''}`}
              />
              {formErrors.current_quantity && <p className="mt-1 text-sm text-red-500">{formErrors.current_quantity}</p>}
            </div>
          </div>
          <div>
            <label className={labelClasses}>{t.expiryDateLabel}</label>
            <input
              type="date"
              value={formData.expiry_date}
              onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
              className={`${inputClasses} ${formErrors.expiry_date ? 'border-red-500' : ''}`}
            />
            {formErrors.expiry_date && <p className="mt-1 text-sm text-red-500">{formErrors.expiry_date}</p>}
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
            <button
              onClick={handleDispose}
              className={buttonDangerClasses}
              disabled={isSubmitting}
            >
              {isSubmitting ? t.disposeLoading : t.disposeButton}
            </button>
          </>
        }
      >
        <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
          {t.disposeConfirm}
        </p>
        {selectedBatch && (
          <div className={`mt-4 p-4 rounded-lg border ${
            theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
          }`}>
            <p className={`font-medium ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              {selectedBatch.batch_number}
            </p>
            {selectedBatch.product && (
              <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                {locale === 'ar' ? selectedBatch.product.name_ar : selectedBatch.product.name_en}
              </p>
            )}
            <p className={`text-sm mt-2 ${
              theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
            }`}>
              Quantity: {selectedBatch.current_quantity}
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BatchManager;
