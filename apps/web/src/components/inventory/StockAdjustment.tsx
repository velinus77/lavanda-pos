'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Modal from '../ui/Modal';
import { authenticatedFetch } from '@/lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface Product {
  id: string;
  name_en: string;
  name_ar: string;
  barcode: string;
  cost_price: number;
}

interface ProductBatch {
  id: string;
  product_id: string;
  batch_number: string;
  cost_price: number;
  current_quantity: number;
  expiry_date: string;
  days_until_expiry: number;
  is_expired: boolean;
}

interface NewBatchFormState {
  batch_number: string;
  expiry_date: string;
  cost_price: string;
}

interface AdjustmentPreview {
  product_name: string;
  batch_number: string;
  adjustment_type: 'add' | 'remove' | 'return' | 'dispose';
  quantity_change: number;
  previous_quantity: number;
  new_quantity: number;
  reason: string;
  value_impact: number;
}

interface Translations {
  title: string;
  description: string;
  productLabel: string;
  batchLabel: string;
  selectProduct: string;
  selectBatch: string;
  adjustmentTypeLabel: string;
  quantityLabel: string;
  reasonLabel: string;
  reasonPlaceholder: string;
  previewButton: string;
  submitButton: string;
  cancelButton: string;
  submitLoading: string;
  previewTitle: string;
  confirmButton: string;
  closePreviewButton: string;
  noBatches: string;
  fefoSuggestion: string;
  expiredWarning: string;
  lowStockWarning: string;
  adjustmentTypes: {
    add: string;
    remove: string;
    return: string;
    dispose: string;
  };
  adjustmentTypeDescriptions: {
    add: string;
    remove: string;
    return: string;
    dispose: string;
  };
  previewFields: {
    product: string;
    batch: string;
    type: string;
    previousQty: string;
    change: string;
    newQty: string;
    reason: string;
    valueImpact: string;
  };
  errors: {
    productRequired: string;
    batchRequired: string;
    quantityRequired: string;
    quantityInvalid: string;
    reasonRequired: string;
    submitFailed: string;
    fetchFailed: string;
  };
  success: {
    adjustmentCreated: string;
  };
}

const translations: Record<'ar' | 'en', Translations> = {
  en: {
    title: 'Stock Adjustment',
    description: 'Adjust inventory levels for products with batch tracking',
    productLabel: 'Product *',
    batchLabel: 'Batch *',
    selectProduct: 'Select a product',
    selectBatch: 'Select a batch',
    adjustmentTypeLabel: 'Adjustment Type *',
    quantityLabel: 'Quantity *',
    reasonLabel: 'Reason',
    reasonPlaceholder: 'Auto-filled from the selected action, product, and batch',
    previewButton: 'Preview Adjustment',
    submitButton: 'Submit Adjustment',
    cancelButton: 'Cancel',
    submitLoading: 'Processing...',
    previewTitle: 'Confirm Adjustment',
    confirmButton: 'Confirm & Submit',
    closePreviewButton: 'Back to Edit',
    noBatches: 'No batches available for this product',
    fefoSuggestion: 'FEFO: choose the batch with the earliest expiry date',
    expiredWarning: 'This batch is expired',
    lowStockWarning: 'Low stock warning',
    adjustmentTypes: {
      add: 'Add Stock',
      remove: 'Remove Stock',
      return: 'Return to Stock',
      dispose: 'Dispose/Damage',
    },
    adjustmentTypeDescriptions: {
      add: 'Add new stock from purchase or production',
      remove: 'Remove stock due to loss or correction',
      return: 'Return items from customer or damaged goods',
      dispose: 'Dispose due to damage, expiry, or quality issues',
    },
    previewFields: {
      product: 'Product',
      batch: 'Batch Number',
      type: 'Adjustment Type',
      previousQty: 'Previous Quantity',
      change: 'Change',
      newQty: 'New Quantity',
      reason: 'Reason',
      valueImpact: 'Value Impact',
    },
    errors: {
      productRequired: 'Please select a product',
      batchRequired: 'Please select a batch',
      quantityRequired: 'Please enter a quantity',
      quantityInvalid: 'Quantity must be a positive number',
      reasonRequired: 'Please provide a reason',
      submitFailed: 'Failed to create adjustment',
      fetchFailed: 'Failed to load products',
    },
    success: {
      adjustmentCreated: 'Stock adjustment created successfully',
    },
  },
  ar: {
    title: '-?? --?',
    description: '-?? --? --? --?? ?? -? --?',
    productLabel: '-- *',
    batchLabel: '-- *',
    selectProduct: '-? --',
    selectBatch: '-? -?',
    adjustmentTypeLabel: '- --? *',
    quantityLabel: '-- *',
    reasonLabel: '-??',
    reasonPlaceholder: '-? --?? ?? --? --? --? --?',
    previewButton: '-- --?',
    submitButton: '-?? --?',
    cancelButton: '-??',
    submitLoading: '-? --??...',
    previewTitle: '-?? --?',
    confirmButton: '-?? --',
    closePreviewButton: '-- --?',
    noBatches: '?? -? -?? -?? -? --',
    fefoSuggestion: 'FEFO: -? --? -- -- --?',
    expiredWarning: '- -- --',
    lowStockWarning: '-??: -?? -??',
    adjustmentTypes: {
      add: '-?? -??',
      remove: '-?? -??',
      return: '-?? --?',
      dispose: '- ?? -??',
    },
    adjustmentTypeDescriptions: {
      add: '-?? -?? -? ?? -? ?? --',
      remove: '-?? -?? -? -?? ?? -??',
      return: '-?? -?? - --?',
      dispose: '-- ?? --? -? -?? ?? --??',
    },
    previewFields: {
      product: '--',
      batch: '- --',
      type: '- --?',
      previousQty: '-- --?',
      change: '--?',
      newQty: '-- --?',
      reason: '-??',
      valueImpact: '-?? --',
    },
    errors: {
      productRequired: '-- -- -?',
      batchRequired: '-- -- -?',
      quantityRequired: '-- -?? --',
      quantityInvalid: '- ?? -? -- -?? --',
      reasonRequired: '-- -?? -',
      submitFailed: '- -?? --?',
      fetchFailed: '- -?? --??',
    },
    success: {
      adjustmentCreated: '?? -?? -?? --? -??',
    },
  },
};

export interface StockAdjustmentProps {
  locale?: 'ar' | 'en';
  theme?: 'light' | 'dark';
  productsApiUrl?: string;
  stockAdjustApiUrl?: string;
  onSuccess?: () => void;
}

export const StockAdjustment: React.FC<StockAdjustmentProps> = ({
  locale = 'en',
  theme = 'light',
  productsApiUrl = `${API_BASE}/api/products`,
  stockAdjustApiUrl = `${API_BASE}/api/stock/adjust`,
  onSuccess,
}) => {
  const t = translations[locale];
  const isRTL = locale === 'ar';

  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<ProductBatch[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'remove' | 'return' | 'dispose'>('add');
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState('');
  const [createNewBatch, setCreateNewBatch] = useState(false);
  const [newBatchForm, setNewBatchForm] = useState<NewBatchFormState>({
    batch_number: '',
    expiry_date: '',
    cost_price: '',
  });
  const autoReasonRef = useRef('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [showPreview, setShowPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [preview, setPreview] = useState<AdjustmentPreview | null>(null);

  const mapProduct = useCallback(
    (product: any): Product => ({
      id: String(product.id),
      name_en: product.name_en ?? product.name ?? '',
      name_ar: product.name_ar ?? '',
      barcode: product.barcode ?? '',
      cost_price: Number(product.cost_price ?? product.costPrice ?? 0),
    }),
    []
  );

  const mapBatch = useCallback((batch: any): ProductBatch => {
    const expiryDate =
      typeof batch.expiry_date === 'number'
        ? new Date(batch.expiry_date * 1000).toISOString()
        : batch.expiryDate instanceof Date
          ? batch.expiryDate.toISOString()
          : batch.expiryDate ?? batch.expiry_date ?? new Date().toISOString();
    const daysUntilExpiry = Math.ceil(
      (new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    return {
      id: String(batch.id),
      product_id: String(batch.product_id ?? batch.productId ?? ''),
      batch_number: batch.batch_number ?? batch.batchNumber ?? '',
      cost_price: Number(batch.cost_price ?? batch.costPrice ?? 0),
      current_quantity: Number(batch.current_quantity ?? batch.currentQuantity ?? 0),
      expiry_date: expiryDate,
      days_until_expiry: daysUntilExpiry,
      is_expired: daysUntilExpiry < 0,
    };
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      setIsLoadingProducts(true);
      setError(null);
      const response = await authenticatedFetch(productsApiUrl, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error(t.errors.fetchFailed);
      }
      const data = await response.json();
      const productRows = Array.isArray(data) ? data : data.products ?? [];
      setProducts(productRows.map(mapProduct));
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.fetchFailed);
    } finally {
      setIsLoadingProducts(false);
    }
  }, [mapProduct, productsApiUrl, t.errors.fetchFailed]);

  const fetchBatches = useCallback(async (productId: string) => {
    try {
      const response = await authenticatedFetch(`${productsApiUrl}/${productId}/batches`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        const batchRows = Array.isArray(data) ? data : data.batches ?? [];
        const sorted = batchRows.map(mapBatch).sort((a: ProductBatch, b: ProductBatch) => 
          new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime()
        );
        setBatches(sorted);
        // Auto-select the first batch (FEFO)
        if (sorted.length > 0) {
          setSelectedBatchId(sorted[0].id);
        }
      } else {
        setBatches([]);
      }
    } catch (err) {
      console.error('Failed to fetch batches:', err);
      setBatches([]);
    }
  }, [mapBatch, productsApiUrl]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    if (selectedProductId) {
      fetchBatches(selectedProductId);
    } else {
      setBatches([]);
      setSelectedBatchId(null);
    }
  }, [selectedProductId, fetchBatches]);

  useEffect(() => {
    if (adjustmentType !== 'add') {
      setCreateNewBatch(false);
      return;
    }

    const selectedProduct = products.find((product) => product.id === selectedProductId);

    if (selectedProductId && batches.length === 0) {
      setCreateNewBatch(true);
      setSelectedBatchId(null);
      setNewBatchForm((current) => ({
        ...current,
        cost_price: current.cost_price || (selectedProduct?.cost_price ? String(selectedProduct.cost_price) : ''),
      }));
      return;
    }

    if (batches.length > 0) {
      setCreateNewBatch(false);
    }
  }, [adjustmentType, batches.length, products, selectedProductId]);

  const buildAutoReason = useCallback(() => {
    const product = products.find((item) => item.id === selectedProductId);
    const batch = batches.find((item) => item.id === selectedBatchId);
    const productName = product ? (locale === 'ar' ? product.name_ar : product.name_en) : null;
    const batchNumber = createNewBatch ? newBatchForm.batch_number.trim() : batch?.batch_number;

    if (locale === 'ar') {
      if (productName && batchNumber) {
        return `${t.adjustmentTypes[adjustmentType]} ?????? ${productName} - ???? ${batchNumber}`;
      }
      if (productName) {
        return `${t.adjustmentTypes[adjustmentType]} ?????? ${productName}`;
      }
      return t.adjustmentTypes[adjustmentType];
    }

    if (productName && batchNumber) {
      return `${t.adjustmentTypes[adjustmentType]} for ${productName} - batch ${batchNumber}`;
    }
    if (productName) {
      return `${t.adjustmentTypes[adjustmentType]} for ${productName}`;
    }
    return t.adjustmentTypes[adjustmentType];
  }, [
    adjustmentType,
    batches,
    createNewBatch,
    locale,
    newBatchForm.batch_number,
    products,
    selectedBatchId,
    selectedProductId,
    t.adjustmentTypes,
  ]);

  useEffect(() => {
    const nextAutoReason = buildAutoReason();

    if (!reason.trim() || reason === autoReasonRef.current) {
      setReason(nextAutoReason);
    }

    autoReasonRef.current = nextAutoReason;
  }, [buildAutoReason, reason]);

  const validateForm = () => {
    const errors: Record<string, string> = {};
    const normalizedReason = reason.trim() || buildAutoReason();
    if (!selectedProductId) errors.product = t.errors.productRequired;
    if (createNewBatch) {
      if (!newBatchForm.batch_number.trim()) errors.batch_number = 'Please enter a batch number';
      if (!newBatchForm.expiry_date) errors.expiry_date = 'Please select an expiry date';
      if (!newBatchForm.cost_price || Number(newBatchForm.cost_price) <= 0) {
        errors.cost_price = 'Cost price must be greater than 0';
      }
    } else if (!selectedBatchId) {
      errors.batch = t.errors.batchRequired;
    }
    if (!quantity || quantity <= 0) errors.quantity = t.errors.quantityInvalid;
    if (!normalizedReason.trim()) errors.reason = t.errors.reasonRequired;
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const generatePreview = () => {
    const product = products.find(p => p.id === selectedProductId);
    const batch = batches.find(b => b.id === selectedBatchId);
    const normalizedReason = reason.trim() || buildAutoReason();
    let quantityChange = quantity;
    
    // For remove/dispose, quantity is subtracted
    if (adjustmentType === 'remove' || adjustmentType === 'dispose') {
      quantityChange = -quantity;
    }

    if (createNewBatch) {
      if (!product) return null;

      const batchNumber = newBatchForm.batch_number.trim() || 'New batch';
      const costPrice = Number(newBatchForm.cost_price || product.cost_price || 0);

      return {
        product_name: locale === 'ar' ? product.name_ar : product.name_en,
        batch_number: batchNumber,
        adjustment_type: adjustmentType,
        quantity_change: quantity,
        previous_quantity: 0,
        new_quantity: quantity,
        reason: normalizedReason,
        value_impact: quantity * costPrice,
      };
    }

    if (!product || !batch) return null;

    const previousQuantity = batch.current_quantity;
    const newQuantity = previousQuantity + quantityChange;
    const valueImpact = quantityChange * batch.cost_price;

    return {
      product_name: locale === 'ar' ? product.name_ar : product.name_en,
      batch_number: batch.batch_number,
      adjustment_type: adjustmentType,
      quantity_change: quantityChange,
      previous_quantity: previousQuantity,
      new_quantity: newQuantity,
      reason: normalizedReason,
      value_impact: valueImpact,
    };
  };

  const handlePreview = () => {
    if (!validateForm()) return;
    
    const previewData = generatePreview();
    if (previewData) {
      setPreview(previewData);
      setShowPreview(true);
    }
  };

  const handleSubmit = async () => {
    if (!selectedProductId) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const normalizedReason = reason.trim() || buildAutoReason();
      const response = createNewBatch
        ? await authenticatedFetch(`${productsApiUrl}/${selectedProductId}/batches`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              batch_number: newBatchForm.batch_number.trim(),
              cost_price: Number(newBatchForm.cost_price),
              initial_quantity: quantity,
              expiry_date: Math.floor(new Date(newBatchForm.expiry_date).getTime() / 1000),
            }),
          })
        : await authenticatedFetch(stockAdjustApiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              product_id: selectedProductId,
              batch_id: selectedBatchId,
              quantity: adjustmentType === 'remove' || adjustmentType === 'dispose' ? -quantity : quantity,
              reason: normalizedReason,
            }),
          });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || t.errors.submitFailed);
      }

      setSuccessMessage(t.success.adjustmentCreated);
      
      // Reset form
      setSelectedProductId(null);
      setSelectedBatchId(null);
      setAdjustmentType('add');
      setQuantity(1);
      setReason('');
      setCreateNewBatch(false);
      setNewBatchForm({
        batch_number: '',
        expiry_date: '',
        cost_price: '',
      });
      setShowPreview(false);
      setPreview(null);
      
      // Refresh batches
      fetchProducts();
      
      // Call onSuccess callback if provided
      onSuccess?.();
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.submitFailed);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSelectedBatch = () => batches.find(b => b.id === selectedBatchId);

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

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="mb-6">
        <h1 className={`text-2xl font-bold mb-2 ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          {t.title}
        </h1>
        <p className={`${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
        }`}>
          {t.description}
        </p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className={`mb-6 p-4 rounded-lg border ${
          theme === 'dark'
            ? 'bg-green-900/20 border-green-800 text-green-300'
            : 'bg-green-50 border-green-200 text-green-700'
        }`}>
          {successMessage}
        </div>
      )}

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

      {/* Form */}
      <div className={`p-6 rounded-xl border ${
        theme === 'dark' ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-white'
      }`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Product Selection */}
          <div>
            <label className={labelClasses}>{t.productLabel}</label>
            <select
              value={selectedProductId || ''}
              onChange={(e) => {
                setSelectedProductId(e.target.value || null);
                setSelectedBatchId(null);
                setCreateNewBatch(false);
                setFormErrors({ ...formErrors, product: '' });
              }}
              className={`${inputClasses} ${formErrors.product ? 'border-red-500' : ''}`}
              disabled={isLoadingProducts}
            >
              <option value="">{t.selectProduct}</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {locale === 'ar' ? product.name_ar : product.name_en} ({product.barcode})
                </option>
              ))}
            </select>
            {formErrors.product && <p className="mt-1 text-sm text-red-500">{formErrors.product}</p>}
          </div>

          {/* Batch Selection */}
          <div>
            <label className={labelClasses}>{t.batchLabel}</label>
            <select
              value={selectedBatchId || ''}
              onChange={(e) => {
                setSelectedBatchId(e.target.value || null);
                setCreateNewBatch(e.target.value === '__new__');
                setFormErrors({ ...formErrors, batch: '' });
              }}
              className={`${inputClasses} ${formErrors.batch ? 'border-red-500' : ''}`}
              disabled={!selectedProductId || (batches.length === 0 && adjustmentType !== 'add')}
            >
              <option value="">{t.selectBatch}</option>
              {adjustmentType === 'add' && selectedProductId && (
                <option value="__new__">Create a new batch</option>
              )}
              {batches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.batch_number} - {batch.current_quantity} units
                  {batch.is_expired ? ' (EXPIRED)' : batch.days_until_expiry <= 30 ? ` (${batch.days_until_expiry} days)` : ''}
                </option>
              ))}
            </select>
            {batches.length === 0 && selectedProductId && !createNewBatch && (
              <p className={`mt-1 text-sm ${
                theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
              }`}>
                {t.noBatches}
              </p>
            )}
            {formErrors.batch && <p className="mt-1 text-sm text-red-500">{formErrors.batch}</p>}
            
            {/* FEFO Suggestion */}
            {batches.length > 0 && selectedBatchId && (
              <div className={`mt-2 text-xs ${
                theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
              }`}>
                <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t.fefoSuggestion}
              </div>
            )}
          </div>

          {createNewBatch && (
            <>
              <div>
                <label className={labelClasses}>Batch Number *</label>
                <input
                  type="text"
                  value={newBatchForm.batch_number}
                  onChange={(e) => {
                    setNewBatchForm({ ...newBatchForm, batch_number: e.target.value });
                    setFormErrors({ ...formErrors, batch_number: '' });
                  }}
                  className={`${inputClasses} ${formErrors.batch_number ? 'border-red-500' : ''}`}
                  placeholder="Enter batch number"
                />
                {formErrors.batch_number && <p className="mt-1 text-sm text-red-500">{formErrors.batch_number}</p>}
              </div>

              <div>
                <label className={labelClasses}>Expiry Date *</label>
                <input
                  type="date"
                  value={newBatchForm.expiry_date}
                  onChange={(e) => {
                    setNewBatchForm({ ...newBatchForm, expiry_date: e.target.value });
                    setFormErrors({ ...formErrors, expiry_date: '' });
                  }}
                  className={`${inputClasses} ${formErrors.expiry_date ? 'border-red-500' : ''}`}
                />
                {formErrors.expiry_date && <p className="mt-1 text-sm text-red-500">{formErrors.expiry_date}</p>}
              </div>

              <div>
                <label className={labelClasses}>Cost Price *</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={newBatchForm.cost_price}
                  onChange={(e) => {
                    setNewBatchForm({ ...newBatchForm, cost_price: e.target.value });
                    setFormErrors({ ...formErrors, cost_price: '' });
                  }}
                  className={`${inputClasses} ${formErrors.cost_price ? 'border-red-500' : ''}`}
                  placeholder="Enter cost price"
                />
                {formErrors.cost_price && <p className="mt-1 text-sm text-red-500">{formErrors.cost_price}</p>}
              </div>
            </>
          )}

          {/* Adjustment Type */}
          <div className="md:col-span-2">
            <label className={labelClasses}>{t.adjustmentTypeLabel}</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(['add', 'remove', 'return', 'dispose'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setAdjustmentType(type);
                    if (type !== 'add') {
                      setCreateNewBatch(false);
                    } else if (selectedProductId && batches.length === 0) {
                      setCreateNewBatch(true);
                    }
                  }}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    adjustmentType === type
                      ? 'border-purple-600 bg-purple-600/10'
                      : theme === 'dark'
                      ? 'border-gray-600 hover:border-gray-500'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`font-semibold ${
                    adjustmentType === type
                      ? 'text-purple-600'
                      : theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    {t.adjustmentTypes[type]}
                  </div>
                  <div className={`text-xs mt-1 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {t.adjustmentTypeDescriptions[type]}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className={labelClasses}>{t.quantityLabel}</label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => {
                setQuantity(parseInt(e.target.value) || 0);
                setFormErrors({ ...formErrors, quantity: '' });
              }}
              className={`${inputClasses} ${formErrors.quantity ? 'border-red-500' : ''}`}
              placeholder="Enter quantity"
            />
            {formErrors.quantity && <p className="mt-1 text-sm text-red-500">{formErrors.quantity}</p>}
            
            {/* Batch Info */}
            {getSelectedBatch() && (
              <div className={`mt-2 text-sm ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Current stock: <span className="font-medium">{getSelectedBatch()?.current_quantity}</span>
                {getSelectedBatch()?.is_expired && (
                  <span className="ml-2 text-red-500">- {t.expiredWarning}</span>
                )}
              </div>
            )}
          </div>

          {/* Reason */}
          <div className="md:col-span-2">
            <label className={labelClasses}>{t.reasonLabel}</label>
            <textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setFormErrors({ ...formErrors, reason: '' });
              }}
              className={`${inputClasses} min-h-[100px] resize-y ${formErrors.reason ? 'border-red-500' : ''}`}
              placeholder={t.reasonPlaceholder}
            />
            {formErrors.reason && <p className="mt-1 text-sm text-red-500">{formErrors.reason}</p>}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t ${
          theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
        }">
          <button
            type="button"
            onClick={() => {
              setSelectedProductId(null);
              setSelectedBatchId(null);
              setAdjustmentType('add');
              setQuantity(1);
              setReason('');
              setCreateNewBatch(false);
              setNewBatchForm({
                batch_number: '',
                expiry_date: '',
                cost_price: '',
              });
              setFormErrors({});
            }}
            className={buttonSecondaryClasses}
          >
            {t.cancelButton}
          </button>
          <button
            type="button"
            onClick={handlePreview}
            className={buttonPrimaryClasses}
            disabled={isSubmitting}
          >
            {t.previewButton}
          </button>
        </div>
      </div>

      {/* Preview Modal */}
      <Modal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title={t.previewTitle}
        locale={locale}
        theme={theme}
        size="md"
        footer={
          <>
            <button
              onClick={() => setShowPreview(false)}
              className={buttonSecondaryClasses}
              disabled={isSubmitting}
            >
              {t.closePreviewButton}
            </button>
            <button
              onClick={handleSubmit}
              className={buttonPrimaryClasses}
              disabled={isSubmitting}
            >
              {isSubmitting ? t.submitLoading : t.confirmButton}
            </button>
          </>
        }
      >
        {preview && (
          <div className="space-y-4">
            <div className={`p-4 rounded-lg ${
              theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
            }`}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className={`text-sm ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {t.previewFields.product}
                  </p>
                  <p className={`font-medium ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    {preview.product_name}
                  </p>
                </div>
                <div>
                  <p className={`text-sm ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {t.previewFields.batch}
                  </p>
                  <p className={`font-medium ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    {preview.batch_number}
                  </p>
                </div>
                <div>
                  <p className={`text-sm ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {t.previewFields.type}
                  </p>
                  <p className={`font-medium capitalize ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    {t.adjustmentTypes[preview.adjustment_type]}
                  </p>
                </div>
                <div>
                  <p className={`text-sm ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {t.previewFields.reason}
                  </p>
                  <p className={`font-medium ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    {preview.reason}
                  </p>
                </div>
              </div>
            </div>

            <div className={`p-4 rounded-lg border-2 ${
              preview.adjustment_type === 'remove' || preview.adjustment_type === 'dispose'
                ? theme === 'dark' ? 'border-red-800 bg-red-900/10' : 'border-red-200 bg-red-50'
                : theme === 'dark' ? 'border-green-800 bg-green-900/10' : 'border-green-200 bg-green-50'
            }`}>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className={`text-sm ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {t.previewFields.previousQty}
                  </p>
                  <p className={`text-2xl font-bold ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    {preview.previous_quantity}
                  </p>
                </div>
                <div>
                  <p className={`text-sm ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {t.previewFields.change}
                  </p>
                  <p className={`text-2xl font-bold ${
                    preview.quantity_change > 0
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}>
                    {preview.quantity_change > 0 ? '+' : ''}{preview.quantity_change}
                  </p>
                </div>
                <div>
                  <p className={`text-sm ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {t.previewFields.newQty}
                  </p>
                  <p className={`text-2xl font-bold ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    {preview.new_quantity}
                  </p>
                </div>
              </div>
              
              {preview.value_impact !== 0 && (
                <div className={`mt-4 pt-4 border-t text-center ${
                  theme === 'dark' ? 'border-gray-600' : 'border-gray-200'
                }`}>
                  <p className={`text-sm ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {t.previewFields.valueImpact}
                  </p>
                  <p className={`text-xl font-bold ${
                    preview.value_impact > 0
                      ? 'text-green-600'
                      : preview.value_impact < 0
                      ? 'text-red-600'
                      : theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    ${Math.abs(preview.value_impact).toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default StockAdjustment;


