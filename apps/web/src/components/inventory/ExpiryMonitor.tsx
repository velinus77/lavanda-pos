'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Modal from '../ui/Modal';

interface Product {
  id: number;
  name_en: string;
  name_ar: string;
  barcode: string;
}

interface ExpiringBatch {
  id: number;
  product_id: number;
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

const translations: Record<'ar' | 'en', Translations> = {
  en: {
    title: 'Expiry Monitor',
    description: 'Track batches approaching expiry and manage expired stock',
    expiringSoonTitle: 'Expiring Soon',
    expiredTitle: 'Expired',
    noExpiringSoon: 'No batches expiring in the next 30 days',
    noExpired: 'No expired batches',
    columns: {
      product: 'Product',
      batchNumber: 'Batch Number',
      expiryDate: 'Expiry Date',
      daysRemaining: 'Days Remaining',
      daysExpired: 'Days Expired',
      quantity: 'Quantity',
      value: 'Value',
      actions: 'Actions',
    },
    disposeButton: 'Dispose',
    disposeConfirm: 'Are you sure you want to dispose this expired batch? This action cannot be undone.',
    disposeLoading: 'Disposing...',
    successDispose: 'Batch disposed successfully',
    errorFetch: 'Failed to load expiry data',
    errorDispose: 'Failed to dispose batch',
    statusBadges: {
      critical: 'Critical (<7 days)',
      warning: 'Warning (7-30 days)',
      expired: 'Expired',
      disposed: 'Disposed',
    },
    refreshButton: 'Refresh',
    cancelButton: 'Cancel',
    lastUpdated: 'Last updated',
    filterPlaceholder: 'Filter by product name or batch number...',
    sortBy: 'Sort by',
    sortOptions: {
      expiryAsc: 'Expiry Date (Soonest First)',
      expiryDesc: 'Expiry Date (Latest First)',
      valueDesc: 'Value (Highest First)',
      quantityDesc: 'Quantity (Highest First)',
    },
  },
  ar: {
    title: 'مراقبة الانتهاء',
    description: 'تتبع الدفعات القريبة من الانتهاء وإ إدارة المخزون منتهي الصلاحية',
    expiringSoonTitle: 'قرب الانتهاء',
    expiredTitle: 'منتهي',
    noExpiringSoon: 'لا توجد دفعات تنتهي خلال 30 يوماً القادمة',
    noExpired: 'لا توجد دفعات منتهية',
    columns: {
      product: 'المنتج',
      batchNumber: 'رقم الدفعة',
      expiryDate: 'تاريخ الانتهاء',
      daysRemaining: 'أيام متبقية',
      daysExpired: 'أيام منذ الانتهاء',
      quantity: 'الكمية',
      value: 'القيمة',
      actions: 'الإجراءات',
    },
    disposeButton: 'التخلص',
    disposeConfirm: 'هل أنت متأكد من التخلص من هذه الدفعة منتهية الصلاحية؟ لا يمكن التراجع عن هذا الإجراء.',
    disposeLoading: 'جاري التخلص...',
    successDispose: 'تم التخلص من الدفعة بنجاح',
    errorFetch: 'فشل تحميل بيانات الانتهاء',
    errorDispose: 'فشل التخلص من الدفعة',
    statusBadges: {
      critical: 'حرج (<7 أيام)',
      warning: 'تحذير (7-30 يوم)',
      expired: 'منتهي',
      disposed: 'تم التخلص',
    },
    refreshButton: 'تحديث',
    cancelButton: 'إلغاء',
    lastUpdated: 'آخر تحديث',
    filterPlaceholder: 'تصفية باسم المنتج أو رقم الدفعة...',
    sortBy: 'ترتيب حسب',
    sortOptions: {
      expiryAsc: 'تاريخ الانتهاء (الأقرب أولاً)',
      expiryDesc: 'تاريخ الانتهاء (الأبعد أولاً)',
      valueDesc: 'القيمة (الأعلى أولاً)',
      quantityDesc: 'الكمية (الأعلى أولاً)',
    },
  },
};

export interface ExpiryMonitorProps {
  locale?: 'ar' | 'en';
  theme?: 'light' | 'dark';
  expiringApiUrl?: string;
  expiredApiUrl?: string;
  disposeApiUrl?: string;
  onDispose?: () => void;
}

export const ExpiryMonitor: React.FC<ExpiryMonitorProps> = ({
  locale = 'en',
  theme = 'light',
  expiringApiUrl = '/api/stock/expiring',
  expiredApiUrl = '/api/stock/expired',
  disposeApiUrl = '/api/stock/expired/dispose',
  onDispose,
}) => {
  const t = translations[locale];
  const isRTL = locale === 'ar';

  const [expiringBatches, setExpiringBatches] = useState<ExpiringBatch[]>([]);
  const [expiredBatches, setExpiredBatches] = useState<ExpiringBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const [filterQuery, setFilterQuery] = useState('');
  const [expiringSort, setExpiringSort] = useState<'expiryAsc' | 'expiryDesc' | 'valueDesc' | 'quantityDesc'>('expiryAsc');
  const [expiredSort, setExpiredSort] = useState<'expiryAsc' | 'expiryDesc' | 'valueDesc' | 'quantityDesc'>('expiryAsc');

  const [disposeModalOpen, setDisposeModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<ExpiringBatch | null>(null);
  const [isDisposing, setIsDisposing] = useState(false);

  const fetchExpiryData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [expiringRes, expiredRes] = await Promise.all([
        fetch(expiringApiUrl),
        fetch(expiredApiUrl),
      ]);

      if (!expiringRes.ok || !expiredRes.ok) {
        throw new Error(t.errorFetch);
      }

      const [expiringData, expiredData] = await Promise.all([
        expiringRes.json(),
        expiredRes.json(),
      ]);

      setExpiringBatches(expiringData);
      setExpiredBatches(expiredData);
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
      const response = await fetch(`${disposeApiUrl}/${selectedBatch.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
      const matchesProduct = batch.product && (
        batch.product.name_en.toLowerCase().includes(query) ||
        batch.product.name_ar.includes(filterQuery) ||
        batch.product.barcode.toLowerCase().includes(query)
      );
      const matchesBatch = batch.batch_number.toLowerCase().includes(query);
      return matchesProduct || matchesBatch;
    });
  };

  const sortBatches = (batches: ExpiringBatch[], sortType: string) => {
    return [...batches].sort((a, b) => {
      switch (sortType) {
        case 'expiryAsc':
          return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
        case 'expiryDesc':
          return new Date(b.expiry_date).getTime() - new Date(a.expiry_date).getTime();
        case 'valueDesc':
          return b.total_value - a.total_value;
        case 'quantityDesc':
          return b.current_quantity - a.current_quantity;
        default:
          return 0;
      }
    });
  };

  const getExpiringStatus = (days: number) => {
    if (days <= 0) return { label: t.statusBadges.expired, color: 'red' };
    if (days <= 7) return { label: t.statusBadges.critical, color: 'red' };
    if (days <= 30) return { label: t.statusBadges.warning, color: 'yellow' };
    return { label: 'OK', color: 'green' };
  };

  const filteredExpiring = sortBatches(filterBatches(expiringBatches).filter(b => !b.is_expired), expiringSort);
  const filteredExpired = sortBatches(filterBatches(expiredBatches).filter(b => b.is_expired && !b.is_disposed), expiredSort);

  const inputClasses = `w-full px-4 py-2.5 rounded-lg border transition-all outline-none ${
    theme === 'dark'
      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
  }`;

  const labelClasses = `block text-sm font-medium mb-2 ${
    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
  }`;

  const buttonPrimaryClasses = `px-4 py-2.5 rounded-lg font-semibold text-white transition-all ${
    isDisposing
      ? 'bg-red-400 cursor-not-allowed'
      : 'bg-red-600 hover:bg-red-700'
  }`;

  const buttonSecondaryClasses = `px-4 py-2.5 rounded-lg font-semibold transition-all ${
    theme === 'dark'
      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
  }`;

  const BatchCard: React.FC<{
    batch: ExpiringBatch;
    isExpired: boolean;
  }> = ({ batch, isExpired }) => {
    const status = getExpiringStatus(batch.days_until_expiry);
    
    return (
      <div className={`p-4 rounded-lg border transition-all ${
        theme === 'dark'
          ? 'border-gray-700 bg-gray-800/50 hover:bg-gray-800'
          : 'border-gray-200 bg-white hover:bg-gray-50'
      } ${batch.is_disposed ? 'opacity-50' : ''}`}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className={`font-semibold ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              {batch.product && (locale === 'ar' ? batch.product.name_ar : batch.product.name_en)}
            </h3>
            {batch.product && (
              <p className={`text-sm ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}>
                {batch.product.barcode}
              </p>
            )}
          </div>
          <span className={`px-2 py-1 text-xs rounded-full ${
            status.color === 'red'
              ? theme === 'dark' ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700'
              : status.color === 'yellow'
              ? theme === 'dark' ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-700'
              : theme === 'dark' ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'
          }`}>
            {status.label}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <p className={`text-xs ${
              theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
            }`}>
              {t.columns.batchNumber}
            </p>
            <p className={`font-medium ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              {batch.batch_number}
            </p>
          </div>
          <div>
            <p className={`text-xs ${
              theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
            }`}>
              {t.columns.expiryDate}
            </p>
            <p className={`font-medium ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              {new Date(batch.expiry_date).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className={`text-xs ${
              theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
            }`}>
              {isExpired ? t.columns.daysExpired : t.columns.daysRemaining}
            </p>
            <p className={`font-bold ${
              batch.days_until_expiry <= 7
                ? 'text-red-600'
                : batch.days_until_expiry <= 30
                ? 'text-yellow-600'
                : theme === 'dark' ? 'text-green-400' : 'text-green-600'
            }`}>
              {isExpired ? Math.abs(batch.days_until_expiry) : batch.days_until_expiry} {isExpired ? 'days' : 'days'}
            </p>
          </div>
          <div>
            <p className={`text-xs ${
              theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
            }`}>
              {t.columns.quantity}
            </p>
            <p className={`font-medium ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              {batch.current_quantity}
            </p>
          </div>
        </div>

        <div className={`flex items-center justify-between pt-3 border-t ${
          theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div>
            <p className={`text-xs ${
              theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
            }`}>
              {t.columns.value}
            </p>
            <p className={`font-bold ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              ${batch.total_value.toFixed(2)}
            </p>
          </div>
          
          {isExpired && !batch.is_disposed && (
            <button
              onClick={() => openDisposeModal(batch)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                theme === 'dark'
                  ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50 hover:text-red-300'
                  : 'bg-red-100 text-red-700 hover:bg-red-200 hover:text-red-800'
              }`}
            >
              {t.disposeButton}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
          <div>
            <h1 className={`text-2xl font-bold mb-1 ${
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
          <button
            onClick={fetchExpiryData}
            disabled={isLoading}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition-all ${
              buttonSecondaryClasses
            }`}
          >
            <svg className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {t.refreshButton}
          </button>
        </div>
        
        <div className={`text-sm ${
          theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
        }`}>
          {t.lastUpdated}: {lastUpdated.toLocaleString()}
        </div>
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
        <div className={`text-center py-12 ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
        }`}>
          <svg className="animate-spin h-8 w-8 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Expiring Soon Column */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-xl font-bold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                {t.expiringSoonTitle}
              </h2>
              <select
                value={expiringSort}
                onChange={(e) => setExpiringSort(e.target.value as any)}
                className={`${inputClasses} w-auto text-sm`}
              >
                <option value="expiryAsc">{t.sortOptions.expiryAsc}</option>
                <option value="expiryDesc">{t.sortOptions.expiryDesc}</option>
                <option value="valueDesc">{t.sortOptions.valueDesc}</option>
                <option value="quantityDesc">{t.sortOptions.quantityDesc}</option>
              </select>
            </div>
            
            {filteredExpiring.length === 0 ? (
              <div className={`p-8 rounded-lg border text-center ${
                theme === 'dark'
                  ? 'border-gray-700 bg-gray-800/50 text-gray-400'
                  : 'border-gray-200 bg-gray-50 text-gray-500'
              }`}>
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
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-xl font-bold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                {t.expiredTitle}
              </h2>
              <select
                value={expiredSort}
                onChange={(e) => setExpiredSort(e.target.value as any)}
                className={`${inputClasses} w-auto text-sm`}
              >
                <option value="expiryAsc">{t.sortOptions.expiryAsc}</option>
                <option value="expiryDesc">{t.sortOptions.expiryDesc}</option>
                <option value="valueDesc">{t.sortOptions.valueDesc}</option>
                <option value="quantityDesc">{t.sortOptions.quantityDesc}</option>
              </select>
            </div>
            
            {filteredExpired.length === 0 ? (
              <div className={`p-8 rounded-lg border text-center ${
                theme === 'dark'
                  ? 'border-gray-700 bg-gray-800/50 text-gray-400'
                  : 'border-gray-200 bg-gray-50 text-gray-500'
              }`}>
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
              {t.cancelButton || 'Cancel'}
            </button>
            <button
              onClick={handleDispose}
              className={buttonPrimaryClasses}
              disabled={isDisposing}
            >
              {isDisposing ? t.disposeLoading : t.disposeButton}
            </button>
          </>
        }
      >
        <p className={`${
          theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
        }`}>
          {t.disposeConfirm}
        </p>
        
        {selectedBatch && (
          <div className={`mt-4 p-4 rounded-lg ${
            theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
          }`}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className={`text-sm ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {t.columns.product}
                </p>
                <p className={`font-medium ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  {selectedBatch.product && (locale === 'ar' ? selectedBatch.product.name_ar : selectedBatch.product.name_en)}
                </p>
              </div>
              <div>
                <p className={`text-sm ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {t.columns.batchNumber}
                </p>
                <p className={`font-medium ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  {selectedBatch.batch_number}
                </p>
              </div>
              <div>
                <p className={`text-sm ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {t.columns.quantity}
                </p>
                <p className={`font-medium ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  {selectedBatch.current_quantity}
                </p>
              </div>
              <div>
                <p className={`text-sm ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {t.columns.value}
                </p>
                <p className={`font-medium ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  ${selectedBatch.total_value.toFixed(2)}
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

