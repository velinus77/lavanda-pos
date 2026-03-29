'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Modal from '../ui/Modal';
import { getAuthToken } from '@/lib/auth';

interface User {
  id: number;
  full_name: string;
  email: string;
  role: 'admin' | 'manager' | 'cashier';
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

interface UserFormData {
  full_name: string;
  email: string;
  password?: string;
  role: 'admin' | 'manager' | 'cashier';
}

interface Translations {
  // Page titles
  usersManagement: string;
  addUser: string;
  editUser: string;
  // Table headers
  name: string;
  email: string;
  role: string;
  status: string;
  created: string;
  lastLogin: string;
  actions: string;
  // Actions
  edit: string;
  deactivate: string;
  activate: string;
  deleteUser: string;
  // Search & pagination
  searchPlaceholder: string;
  showing: string;
  of: string;
  users: string;
  previous: string;
  next: string;
  // Form labels
  fullName: string;
  fullNamePlaceholder: string;
  emailLabel: string;
  emailPlaceholder: string;
  password: string;
  passwordPlaceholder: string;
  confirmPassword: string;
  confirmPasswordPlaceholder: string;
  selectRole: string;
  admin: string;
  manager: string;
  cashier: string;
  // Buttons
  cancel: string;
  save: string;
  create: string;
  update: string;
  // Status
  active: string;
  inactive: string;
  // Messages
  confirmDeactivate: string;
  confirmActivate: string;
  loading: string;
  error: string;
  successCreate: string;
  successUpdate: string;
  successDelete: string;
  passwordsMismatch: string;
  requiredField: string;
}

const translations: Record<'ar' | 'en', Translations> = {
  en: {
    usersManagement: 'Users Management',
    addUser: 'Add User',
    editUser: 'Edit User',
    name: 'Name',
    email: 'Email',
    role: 'Role',
    status: 'Status',
    created: 'Created',
    lastLogin: 'Last Login',
    actions: 'Actions',
    edit: 'Edit',
    deactivate: 'Deactivate',
    activate: 'Activate',
    deleteUser: 'Delete',
    searchPlaceholder: 'Search by name or email...',
    showing: 'Showing',
    of: 'of',
    users: 'users',
    previous: 'Previous',
    next: 'Next',
    fullName: 'Full Name',
    fullNamePlaceholder: 'Enter full name',
    emailLabel: 'Email',
    emailPlaceholder: 'Enter email address',
    password: 'Password',
    passwordPlaceholder: 'Enter password',
    confirmPassword: 'Confirm Password',
    confirmPasswordPlaceholder: 'Confirm password',
    selectRole: 'Select Role',
    admin: 'Admin',
    manager: 'Manager',
    cashier: 'Cashier',
    cancel: 'Cancel',
    save: 'Save',
    create: 'Create',
    update: 'Update',
    active: 'Active',
    inactive: 'Inactive',
    confirmDeactivate: 'Are you sure you want to deactivate this user?',
    confirmActivate: 'Are you sure you want to activate this user?',
    loading: 'Loading...',
    error: 'An error occurred',
    successCreate: 'User created successfully',
    successUpdate: 'User updated successfully',
    successDelete: 'User deleted successfully',
    passwordsMismatch: 'Passwords do not match',
    requiredField: 'This field is required',
  },
  ar: {
    usersManagement: 'إدارة المستخدمين',
    addUser: 'إضافة مستخدم',
    editUser: 'تعديل المستخدم',
    name: 'الاسم',
    email: 'البريد الإلكتروني',
    role: 'الدور',
    status: 'الحالة',
    created: 'تاريخ الإنشاء',
    lastLogin: 'آخر دخول',
    actions: 'الإجراءات',
    edit: 'تعديل',
    deactivate: 'إلغاء التنشيط',
    activate: 'تنشيط',
    deleteUser: 'حذف',
    searchPlaceholder: 'البحث بالاسم أو البريد...',
    showing: 'عرض',
    of: 'من',
    users: 'مستخدمين',
    previous: 'السابق',
    next: 'التالي',
    fullName: 'الاسم الكامل',
    fullNamePlaceholder: 'أدخل الاسم الكامل',
    emailLabel: 'البريد الإلكتروني',
    emailPlaceholder: 'أدخل عنوان البريد',
    password: 'كلمة المرور',
    passwordPlaceholder: 'أدخل كلمة المرور',
    confirmPassword: 'تأكيد كلمة المرور',
    confirmPasswordPlaceholder: 'أكد كلمة المرور',
    selectRole: 'اختر الدور',
    admin: 'مدير',
    manager: 'مساعد مدير',
    cashier: 'كاشير',
    cancel: 'إلغاء',
    save: 'حفظ',
    create: 'إنشاء',
    update: 'تحديث',
    active: 'نشط',
    inactive: 'غير نشط',
    confirmDeactivate: 'هل أنت متأكد من إلغاء تنشيط هذا المستخدم؟',
    confirmActivate: 'هل أنت متأكد من تنشيط هذا المستخدم؟',
    loading: 'جاري التحميل...',
    error: 'حدث خطأ',
    successCreate: 'تم إنشاء المستخدم بنجاح',
    successUpdate: 'تم تحديث المستخدم بنجاح',
    successDelete: 'تم حذف المستخدم بنجاح',
    passwordsMismatch: 'كلمات المرور غير متطابقة',
    requiredField: 'هذا الحقل مطلوب',
  },
};

const ROLES: Array<'admin' | 'manager' | 'cashier'> = ['admin', 'manager', 'cashier'];
const API_BASE = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api/users`;

interface UserManagerProps {
  locale?: 'ar' | 'en';
  theme?: 'light' | 'dark';
  accessToken?: string;
}

function normalizeUser(rawUser: Record<string, unknown>): User {
  return {
    id: Number(rawUser.id ?? 0),
    full_name: String(rawUser.full_name ?? rawUser.fullName ?? rawUser.username ?? ''),
    email: String(rawUser.email ?? ''),
    role: (rawUser.role === 'admin' || rawUser.role === 'manager' || rawUser.role === 'cashier'
      ? rawUser.role
      : 'cashier'),
    is_active: Boolean(rawUser.is_active ?? rawUser.isActive ?? true),
    created_at: String(rawUser.created_at ?? rawUser.createdAt ?? ''),
    last_login: typeof rawUser.last_login === 'string'
      ? rawUser.last_login
      : typeof rawUser.lastLogin === 'string'
        ? rawUser.lastLogin
        : undefined,
  };
}

export const UserManager: React.FC<UserManagerProps> = ({
  locale = 'en',
  theme = 'light',
  accessToken,
}) => {
  const t = translations[locale];
  const isRTL = locale === 'ar';

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const usersPerPage = 10;

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [formData, setFormData] = useState<UserFormData>({
    full_name: '',
    email: '',
    password: '',
    role: 'cashier',
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const getUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: usersPerPage.toString(),
        ...(search && { search }),
      });

      const token = accessToken ?? getAuthToken();
      const response = await fetch(`${API_BASE}?${params}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!response.ok) {
        if (response.status === 401) {
          setError('Authentication required');
          return;
        }
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      const normalizedUsers = Array.isArray(data.users)
        ? data.users.map((user: Record<string, unknown>) => normalizeUser(user))
        : [];

      setUsers(normalizedUsers);

      const total =
        typeof data.total === 'number'
          ? data.total
          : typeof data.pagination?.total === 'number'
            ? data.pagination.total
            : normalizedUsers.length;

      const totalPagesValue =
        typeof data.total_pages === 'number'
          ? data.total_pages
          : typeof data.pagination?.totalPages === 'number'
            ? data.pagination.totalPages
            : Math.max(1, Math.ceil(total / usersPerPage));

      setTotalUsers(total);
      setTotalPages(totalPagesValue);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, t.error]);

  useEffect(() => {
    getUsers();
  }, [getUsers]);

  const validateForm = (isEdit = false): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.full_name.trim()) {
      errors.full_name = t.requiredField;
    }

    if (!formData.email.trim()) {
      errors.email = t.requiredField;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }

    if (!isEdit || formData.password) {
      if (!formData.password) {
        errors.password = t.requiredField;
      } else if (formData.password.length < 6) {
        errors.password = 'Password must be at least 6 characters';
      }
      if (formData.password && formData.password !== confirmPassword) {
        errors.confirmPassword = t.passwordsMismatch;
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetForm = () => {
    setFormData({ full_name: '', email: '', password: '', role: 'cashier' });
    setConfirmPassword('');
    setFormErrors({});
  };

  const handleAddUser = async () => {
    if (!validateForm(false)) return;

    setSubmitting(true);
    try {
      const token = accessToken ?? getAuthToken();
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          full_name: formData.full_name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || t.error);
      }

      await getUsers();
      setIsAddModalOpen(false);
      resetForm();
      alert(t.successCreate);
    } catch (err) {
      alert(err instanceof Error ? err.message : t.error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser || !validateForm(true)) return;

    setSubmitting(true);
    try {
      const body: Record<string, string> = {
        full_name: formData.full_name,
        email: formData.email,
        role: formData.role,
      };
      if (formData.password) {
        body.password = formData.password;
      }

      const token = accessToken ?? getAuthToken();
      const response = await fetch(`${API_BASE}/${selectedUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || t.error);
      }

      await getUsers();
      setIsEditModalOpen(false);
      resetForm();
      setSelectedUser(null);
      alert(t.successUpdate);
    } catch (err) {
      alert(err instanceof Error ? err.message : t.error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivateUser = async () => {
    if (!selectedUser) return;

    try {
      const token = accessToken ?? getAuthToken();
      const response = await fetch(`${API_BASE}/${selectedUser.id}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || t.error);
      }

      await getUsers();
      setIsDeactivateModalOpen(false);
      setSelectedUser(null);
      alert(selectedUser.is_active ? t.successDelete : t.successUpdate);
    } catch (err) {
      alert(err instanceof Error ? err.message : t.error);
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setFormData({
      full_name: user.full_name,
      email: user.email,
      password: '',
      role: user.role,
    });
    setConfirmPassword('');
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  const openDeactivateModal = (user: User) => {
    setSelectedUser(user);
    setIsDeactivateModalOpen(true);
  };

  const normalizedSearch = search.trim().toLowerCase();

  const filteredUsers = users.filter((user) => {
    const fullName = (user.full_name ?? '').toLowerCase();
    const email = (user.email ?? '').toLowerCase();

    return fullName.includes(normalizedSearch) || email.includes(normalizedSearch);
  });

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const roleLabels: Record<string, Record<string, string>> = {
    en: { admin: 'Admin', manager: 'Manager', cashier: 'Cashier' },
    ar: { admin: 'مدير', manager: 'مساعد مدير', cashier: 'كاشير' },
  };

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold tracking-[-0.02em] text-[var(--foreground)]">
          {t.usersManagement}
        </h2>
        <button
          onClick={() => {
            resetForm();
            setIsAddModalOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--action)] px-4 py-3 font-semibold text-white shadow-[0_14px_28px_rgba(31,157,115,0.22)] transition-all hover:bg-[var(--action-strong)]"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t.addUser}
        </button>
      </div>

      {/* Search */}
      <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[color:color-mix(in_srgb,var(--surface)_76%,transparent)] p-4">
        <div className="relative">
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full rounded-[var(--radius-md)] border px-4 py-3 pr-10 outline-none transition-all focus:border-[var(--action)] focus:ring-2 focus:ring-[color:var(--action)]/15 ${
              theme === 'dark'
                ? 'border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] placeholder:text-[var(--muted)]'
                : 'border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] placeholder:text-[var(--muted)]'
            } ${isRTL ? 'pr-4 pl-10' : 'pl-4 pr-10'}`}
          />
          <svg
            className={`absolute top-1/2 transform -translate-y-1/2 h-5 w-5 text-[var(--muted)] ${
              isRTL ? 'left-3' : 'right-3'
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

      {/* Table */}
      <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[color:color-mix(in_srgb,var(--card)_96%,transparent)] shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[var(--action)] border-t-transparent"></div>
            <p className="mt-2 text-[var(--muted)]">{t.loading}</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-[var(--danger)]">{error}</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[color:color-mix(in_srgb,var(--surface)_90%,transparent)]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted)]">{t.name}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted)]">{t.email}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted)]">{t.role}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted)]">{t.status}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted)]">{t.lastLogin}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted)]">{t.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center">
                        <span className="text-[var(--muted)]">
                          {t.loading}
                        </span>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr
                        key={user.id}
                        className="transition-colors hover:bg-[color:color-mix(in_srgb,var(--surface)_82%,transparent)]"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-[var(--foreground)]">{user.full_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-[var(--muted)]">{user.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            user.role === 'admin'
                              ? 'bg-[var(--warning-soft)] text-[var(--warning)]'
                              : user.role === 'manager'
                              ? 'bg-[var(--info-soft)] text-[var(--info)]'
                              : 'bg-[var(--action-soft)] text-[var(--action)]'
                          }`}>
                            {roleLabels[locale][user.role] || user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            user.is_active
                              ? 'bg-[var(--action-soft)] text-[var(--action)]'
                              : 'bg-[var(--danger-soft)] text-[var(--danger)]'
                          }`}>
                            {user.is_active ? t.active : t.inactive}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-[var(--muted)]">{formatDate(user.last_login)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEditModal(user)}
                              className="font-medium text-[var(--action)] hover:text-[var(--action-strong)]"
                            >
                              {t.edit}
                            </button>
                            <button
                              onClick={() => openDeactivateModal(user)}
                              className={`font-medium ${
                                user.is_active
                                  ? 'text-[var(--danger)] hover:opacity-80'
                                  : 'text-[var(--action)] hover:opacity-80'
                              }`}
                            >
                              {user.is_active ? t.deactivate : t.activate}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-[var(--border)] px-6 py-4">
                <p className="text-sm text-[var(--muted)]">
                  {t.showing} {Math.min((currentPage - 1) * usersPerPage + 1, totalUsers)} - {Math.min(currentPage * usersPerPage, totalUsers)} {t.of} {totalUsers} {t.users}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className={`rounded-[var(--radius-md)] px-3 py-1.5 text-sm font-medium transition-colors ${
                      currentPage === 1
                        ? 'cursor-not-allowed bg-[var(--surface)] text-[var(--muted)]'
                        : 'bg-[var(--action)] text-white hover:bg-[var(--action-strong)]'
                    }`}
                  >
                    {t.previous}
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className={`rounded-[var(--radius-md)] px-3 py-1.5 text-sm font-medium transition-colors ${
                      currentPage === totalPages
                        ? 'cursor-not-allowed bg-[var(--surface)] text-[var(--muted)]'
                        : 'bg-[var(--action)] text-white hover:bg-[var(--action-strong)]'
                    }`}
                  >
                    {t.next}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add User Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          resetForm();
        }}
        title={t.addUser}
        locale={locale}
        theme={theme}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              {t.fullName}
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder={t.fullNamePlaceholder}
              className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              } ${formErrors.full_name ? 'border-red-500' : ''}`}
            />
            {formErrors.full_name && (
              <p className="mt-1 text-sm text-red-500">{formErrors.full_name}</p>
            )}
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              {t.emailLabel}
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder={t.emailPlaceholder}
              className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              } ${formErrors.email ? 'border-red-500' : ''}`}
            />
            {formErrors.email && (
              <p className="mt-1 text-sm text-red-500">{formErrors.email}</p>
            )}
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              {t.password}
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder={t.passwordPlaceholder}
              className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              } ${formErrors.password ? 'border-red-500' : ''}`}
            />
            {formErrors.password && (
              <p className="mt-1 text-sm text-red-500">{formErrors.password}</p>
            )}
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              {t.confirmPassword}
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t.confirmPasswordPlaceholder}
              className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              } ${formErrors.confirmPassword ? 'border-red-500' : ''}`}
            />
            {formErrors.confirmPassword && (
              <p className="mt-1 text-sm text-red-500">{formErrors.confirmPassword}</p>
            )}
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              {t.selectRole}
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as typeof formData.role })}
              className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {roleLabels[locale][role] || role}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={() => {
              setIsAddModalOpen(false);
              resetForm();
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              theme === 'dark'
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {t.cancel}
          </button>
          <button
            onClick={handleAddUser}
            disabled={submitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {submitting ? t.loading : t.create}
          </button>
        </div>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedUser(null);
          resetForm();
        }}
        title={t.editUser}
        locale={locale}
        theme={theme}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              {t.fullName}
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder={t.fullNamePlaceholder}
              className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              } ${formErrors.full_name ? 'border-red-500' : ''}`}
            />
            {formErrors.full_name && (
              <p className="mt-1 text-sm text-red-500">{formErrors.full_name}</p>
            )}
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              {t.emailLabel}
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder={t.emailPlaceholder}
              className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              } ${formErrors.email ? 'border-red-500' : ''}`}
            />
            {formErrors.email && (
              <p className="mt-1 text-sm text-red-500">{formErrors.email}</p>
            )}
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              {t.password} <span className="text-xs text-gray-500">({theme === 'dark' ? 'اتركه فارغاً للحفاظ عليه' : 'Leave blank to keep'})</span>
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder={t.passwordPlaceholder}
              className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              } ${formErrors.password ? 'border-red-500' : ''}`}
            />
            {formErrors.password && (
              <p className="mt-1 text-sm text-red-500">{formErrors.password}</p>
            )}
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              {t.confirmPassword}
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t.confirmPasswordPlaceholder}
              className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              } ${formErrors.confirmPassword ? 'border-red-500' : ''}`}
            />
            {formErrors.confirmPassword && (
              <p className="mt-1 text-sm text-red-500">{formErrors.confirmPassword}</p>
            )}
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              {t.selectRole}
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as typeof formData.role })}
              className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {roleLabels[locale][role] || role}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={() => {
              setIsEditModalOpen(false);
              setSelectedUser(null);
              resetForm();
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              theme === 'dark'
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {t.cancel}
          </button>
          <button
            onClick={handleEditUser}
            disabled={submitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {submitting ? t.loading : t.update}
          </button>
        </div>
      </Modal>

      {/* Deactivate/Activate Confirmation Modal */}
      <Modal
        isOpen={isDeactivateModalOpen}
        onClose={() => {
          setIsDeactivateModalOpen(false);
          setSelectedUser(null);
        }}
        title={selectedUser?.is_active ? t.deactivate : t.activate}
        locale={locale}
        theme={theme}
        size="md"
      >
        <p className={`mb-6 ${
          theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
        }`}>
          {selectedUser?.is_active ? t.confirmDeactivate : t.confirmActivate}
        </p>

        <div className="flex justify-end gap-3">
          <button
            onClick={() => {
              setIsDeactivateModalOpen(false);
              setSelectedUser(null);
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              theme === 'dark'
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {t.cancel}
          </button>
          <button
            onClick={handleDeactivateUser}
            className={`px-4 py-2 rounded-lg font-medium text-white transition-colors ${
              selectedUser?.is_active
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {selectedUser?.is_active ? t.deactivate : t.activate}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default UserManager;
