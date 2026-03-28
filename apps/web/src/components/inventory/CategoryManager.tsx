'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Modal from '../ui/Modal';
import { getAuthToken } from '@/lib/auth';

interface Category {
  id: number;
  name_en: string;
  name_ar: string;
  description_en?: string;
  description_ar?: string;
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
  noCategories: string;
  addModalTitle: string;
  editModalTitle: string;
  deleteModalTitle: string;
  nameEnLabel: string;
  nameArLabel: string;
  descriptionEnLabel: string;
  descriptionArLabel: string;
  isActiveLabel: string;
  saveButton: string;
  savingButton: string;
  cancelButton: string;
  deleteConfirm: string;
  deleteLoading: string;
  errorRequired: string;
  fetchError: string;
  saveError: string;
  deleteError: string;
}

const translations: Record<'ar' | 'en', Translations> = {
  en: {
    title: 'Categories',
    searchPlaceholder: 'Search categories...',
    addButton: 'Add Category',
    editButton: 'Edit',
    deleteButton: 'Delete',
    deactivateButton: 'Deactivate',
    activateButton: 'Activate',
    noCategories: 'No categories found',
    addModalTitle: 'Add New Category',
    editModalTitle: 'Edit Category',
    deleteModalTitle: 'Delete Category',
    nameEnLabel: 'Name (English)',
    nameArLabel: 'Name (Arabic)',
    descriptionEnLabel: 'Description (English)',
    descriptionArLabel: 'Description (Arabic)',
    isActiveLabel: 'Active',
    saveButton: 'Save',
    savingButton: 'Saving...',
    cancelButton: 'Cancel',
    deleteConfirm: 'Are you sure you want to delete this category? This action cannot be undone.',
    deleteLoading: 'Deleting...',
    errorRequired: 'This field is required',
    fetchError: 'Failed to load categories',
    saveError: 'Failed to save category',
    deleteError: 'Failed to delete category',
  },
  ar: {
    title: 'التصنيفات',
    searchPlaceholder: 'البحث عن التصنيفات...',
    addButton: 'إضافة تصنيف',
    editButton: 'تعديل',
    deleteButton: 'حذف',
    deactivateButton: 'إلغاء التفعيل',
    activateButton: 'تفعيل',
    noCategories: 'لا توجد تصنيفات',
    addModalTitle: 'إضافة تصنيف جديد',
    editModalTitle: 'تعديل التصنيف',
    deleteModalTitle: 'حذف التصنيف',
    nameEnLabel: 'الاسم (إنجليزي)',
    nameArLabel: 'الاسم (عربي)',
    descriptionEnLabel: 'الوصف (إنجليزي)',
    descriptionArLabel: 'الوصف (عربي)',
    isActiveLabel: 'نشط',
    saveButton: 'حفظ',
    savingButton: 'جاري الحفظ...',
    cancelButton: 'إلغاء',
    deleteConfirm: 'هل أنت متأكد من حذف هذا التصنيف؟ لا يمكن التراجع عن هذا الإجراء.',
    deleteLoading: 'جاري الحذف...',
    errorRequired: 'هذا الحقل مطلوب',
    fetchError: 'فشل تحميل التصنيفات',
    saveError: 'فشل حفظ التصنيف',
    deleteError: 'فشل حذف التصنيف',
  },
};

export interface CategoryManagerProps {
  locale?: 'ar' | 'en';
  theme?: 'light' | 'dark';
  apiUrl?: string;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({
  locale = 'en',
  theme = 'light',
  apiUrl = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api/categories`,
}) => {
  const t = translations[locale];
  const isRTL = locale === 'ar';

  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name_en: '',
    name_ar: '',
    description_en: '',
    description_ar: '',
    is_active: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getAuthHeaders = useCallback(() => {
    const token = getAuthToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, []);

  const fetchCategories = useCallback(async () => {
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
      setCategories(Array.isArray(data) ? data : data.categories ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.fetchError);
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl, getAuthHeaders, t.fetchError]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const filteredCategories = categories.filter((cat) => {
    const query = searchQuery.toLowerCase();
    return (
      cat.name_en.toLowerCase().includes(query) ||
      cat.name_ar.includes(searchQuery) ||
      (cat.description_en && cat.description_en.toLowerCase().includes(query)) ||
      (cat.description_ar && cat.description_ar.includes(searchQuery))
    );
  });

  const openAddModal = () => {
    setFormData({
      name_en: '',
      name_ar: '',
      description_en: '',
      description_ar: '',
      is_active: true,
    });
    setFormErrors({});
    setIsAddModalOpen(true);
  };

  const openEditModal = (category: Category) => {
    setSelectedCategory(category);
    setFormData({
      name_en: category.name_en,
      name_ar: category.name_ar,
      description_en: category.description_en || '',
      description_ar: category.description_ar || '',
      is_active: category.is_active,
    });
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (category: Category) => {
    setSelectedCategory(category);
    setIsDeleteModalOpen(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name_en.trim()) errors.name_en = t.errorRequired;
    if (!formData.name_ar.trim()) errors.name_ar = t.errorRequired;
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const url = selectedCategory
        ? `${apiUrl}/${selectedCategory.id}`
        : apiUrl;
      const method = selectedCategory ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error(t.saveError);
      }

      await fetchCategories();
      setIsAddModalOpen(false);
      setIsEditModalOpen(false);
      setSelectedCategory(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.saveError);
    } finally {
      setIsSubmitting(false);
    }
  }, [apiUrl, fetchCategories, formData, getAuthHeaders, selectedCategory, t.saveError]);

  const handleDelete = useCallback(async () => {
    if (!selectedCategory) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`${apiUrl}/${selectedCategory.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(t.deleteError);
      }

      await fetchCategories();
      setIsDeleteModalOpen(false);
      setSelectedCategory(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.deleteError);
    } finally {
      setIsSubmitting(false);
    }
  }, [apiUrl, fetchCategories, getAuthHeaders, selectedCategory, t.deleteError]);

  const handleToggleActive = useCallback(async (category: Category) => {
    try {
      const response = await fetch(`${apiUrl}/${category.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          is_active: !category.is_active,
        }),
      });

      if (!response.ok) {
        throw new Error(t.saveError);
      }

      await fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.saveError);
    }
  }, [apiUrl, fetchCategories, getAuthHeaders, t.saveError]);

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

      {/* Search */}
      <div className="mb-6">
        <div className={`relative ${
          theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
        }`}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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

      {/* Categories List */}
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
      ) : filteredCategories.length === 0 ? (
        <div className={`text-center py-12 ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
        }`}>
          {t.noCategories}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredCategories.map((category) => (
            <div
              key={category.id}
              className={`p-4 rounded-xl border transition-all ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 hover:border-gray-600'
                  : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm'
              } ${!category.is_active ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className={`text-lg font-semibold truncate ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      {locale === 'ar' ? category.name_ar : category.name_en}
                    </h3>
                    {!category.is_active && (
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        theme === 'dark'
                          ? 'bg-gray-700 text-gray-400'
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        {theme === 'dark' ? 'Inactive' : 'Inactive'}
                      </span>
                    )}
                  </div>
                  <p className={`text-sm ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {locale === 'ar' ? category.description_ar : category.description_en}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActive(category)}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                      category.is_active
                        ? theme === 'dark'
                          ? 'bg-yellow-900/30 text-yellow-400 hover:bg-yellow-900/50'
                          : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                        : theme === 'dark'
                        ? 'bg-green-900/30 text-green-400 hover:bg-green-900/50'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {category.is_active ? t.deactivateButton : t.activateButton}
                  </button>
                  <button
                    onClick={() => openEditModal(category)}
                    className={`p-2 rounded-lg transition-all ${
                      theme === 'dark'
                        ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-300'
                        : 'hover:bg-gray-100 text-gray-600 hover:text-gray-700'
                    }`}
                    aria-label={t.editButton}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => openDeleteModal(category)}
                    className={`p-2 rounded-lg transition-all ${
                      theme === 'dark'
                        ? 'hover:bg-red-900/30 text-red-400 hover:text-red-300'
                        : 'hover:bg-red-100 text-red-600 hover:text-red-700'
                    }`}
                    aria-label={t.deleteButton}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
            <label className={labelClasses}>{t.nameEnLabel}</label>
            <input
              type="text"
              value={formData.name_en}
              onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
              className={`${inputClasses} ${formErrors.name_en ? 'border-red-500' : ''}`}
              placeholder={locale === 'ar' ? 'Name in English' : 'اسم بالإنجليزية'}
            />
            {formErrors.name_en && (
              <p className="mt-1 text-sm text-red-500">{formErrors.name_en}</p>
            )}
          </div>
          <div>
            <label className={labelClasses}>{t.nameArLabel}</label>
            <input
              type="text"
              value={formData.name_ar}
              onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
              className={`${inputClasses} ${formErrors.name_ar ? 'border-red-500' : ''}`}
              placeholder={locale === 'ar' ? 'اسم بالعربية' : 'Name in Arabic'}
              dir="rtl"
            />
            {formErrors.name_ar && (
              <p className="mt-1 text-sm text-red-500">{formErrors.name_ar}</p>
            )}
          </div>
          <div>
            <label className={labelClasses}>{t.descriptionEnLabel}</label>
            <textarea
              value={formData.description_en}
              onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
              className={inputClasses}
              rows={3}
              placeholder={locale === 'ar' ? 'Description in English (optional)' : 'وصف بالإنجليزية (اختياري)'}
            />
          </div>
          <div>
            <label className={labelClasses}>{t.descriptionArLabel}</label>
            <textarea
              value={formData.description_ar}
              onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
              className={inputClasses}
              rows={3}
              placeholder={locale === 'ar' ? 'وصف بالعربية (اختياري)' : 'Description in Arabic (optional)'}
              dir="rtl"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active_add"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 rounded border transition-colors"
            />
            <label htmlFor="is_active_add" className={labelClasses}>
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
            <label className={labelClasses}>{t.nameEnLabel}</label>
            <input
              type="text"
              value={formData.name_en}
              onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
              className={`${inputClasses} ${formErrors.name_en ? 'border-red-500' : ''}`}
            />
            {formErrors.name_en && (
              <p className="mt-1 text-sm text-red-500">{formErrors.name_en}</p>
            )}
          </div>
          <div>
            <label className={labelClasses}>{t.nameArLabel}</label>
            <input
              type="text"
              value={formData.name_ar}
              onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
              className={`${inputClasses} ${formErrors.name_ar ? 'border-red-500' : ''}`}
              dir="rtl"
            />
            {formErrors.name_ar && (
              <p className="mt-1 text-sm text-red-500">{formErrors.name_ar}</p>
            )}
          </div>
          <div>
            <label className={labelClasses}>{t.descriptionEnLabel}</label>
            <textarea
              value={formData.description_en}
              onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
              className={inputClasses}
              rows={3}
            />
          </div>
          <div>
            <label className={labelClasses}>{t.descriptionArLabel}</label>
            <textarea
              value={formData.description_ar}
              onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
              className={inputClasses}
              rows={3}
              dir="rtl"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active_edit"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 rounded border transition-colors"
            />
            <label htmlFor="is_active_edit" className={labelClasses}>
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
            <button
              onClick={handleDelete}
              className={buttonDangerClasses}
              disabled={isSubmitting}
            >
              {isSubmitting ? t.deleteLoading : t.deleteButton}
            </button>
          </>
        }
      >
        <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
          {t.deleteConfirm}
        </p>
        {selectedCategory && (
          <p className={`mt-4 font-medium ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            {locale === 'ar' ? selectedCategory.name_ar : selectedCategory.name_en}
          </p>
        )}
      </Modal>
    </div>
  );
};

export default CategoryManager;

