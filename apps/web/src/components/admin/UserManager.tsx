'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import { getAuthToken } from '@/lib/auth';

interface User {
  id: number | string;
  username: string;
  full_name: string;
  email: string;
  role: 'admin' | 'manager' | 'cashier';
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

interface UserFormData {
  username: string;
  full_name: string;
  email: string;
  password: string;
  role: 'admin' | 'manager' | 'cashier';
}

interface Translations {
  usersManagement: string;
  addUser: string;
  editUser: string;
  name: string;
  email: string;
  role: string;
  status: string;
  lastLogin: string;
  actions: string;
  edit: string;
  deactivate: string;
  activate: string;
  searchPlaceholder: string;
  showing: string;
  of: string;
  users: string;
  previous: string;
  next: string;
  username: string;
  usernamePlaceholder: string;
  fullName: string;
  fullNamePlaceholder: string;
  emailLabel: string;
  emailPlaceholder: string;
  password: string;
  passwordPlaceholder: string;
  confirmPassword: string;
  confirmPasswordPlaceholder: string;
  selectRole: string;
  cancel: string;
  create: string;
  update: string;
  active: string;
  inactive: string;
  confirmDeactivate: string;
  confirmActivate: string;
  loading: string;
  error: string;
  successCreate: string;
  successUpdate: string;
  successDelete: string;
  passwordsMismatch: string;
  requiredField: string;
  leaveBlankToKeep: string;
  invalidEmail: string;
  shortPassword: string;
  noUsers: string;
  authRequired: string;
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
    lastLogin: 'Last Login',
    actions: 'Actions',
    edit: 'Edit',
    deactivate: 'Deactivate',
    activate: 'Activate',
    searchPlaceholder: 'Search by name, username, or email...',
    showing: 'Showing',
    of: 'of',
    users: 'users',
    previous: 'Previous',
    next: 'Next',
    username: 'Username',
    usernamePlaceholder: 'Enter username',
    fullName: 'Full Name',
    fullNamePlaceholder: 'Enter full name',
    emailLabel: 'Email',
    emailPlaceholder: 'Enter email address',
    password: 'Password',
    passwordPlaceholder: 'Enter password',
    confirmPassword: 'Confirm Password',
    confirmPasswordPlaceholder: 'Confirm password',
    selectRole: 'Select Role',
    cancel: 'Cancel',
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
    successDelete: 'User deactivated successfully',
    passwordsMismatch: 'Passwords do not match',
    requiredField: 'This field is required',
    leaveBlankToKeep: 'Leave blank to keep current password',
    invalidEmail: 'Invalid email format',
    shortPassword: 'Password must be at least 8 characters',
    noUsers: 'No users found',
    authRequired: 'Authentication required',
  },
  ar: {
    usersManagement: 'إدارة المستخدمين',
    addUser: 'إضافة مستخدم',
    editUser: 'تعديل المستخدم',
    name: 'الاسم',
    email: 'البريد الإلكتروني',
    role: 'الدور',
    status: 'الحالة',
    lastLogin: 'آخر دخول',
    actions: 'الإجراءات',
    edit: 'تعديل',
    deactivate: 'إلغاء التفعيل',
    activate: 'تفعيل',
    searchPlaceholder: 'ابحث بالاسم أو اسم المستخدم أو البريد الإلكتروني...',
    showing: 'عرض',
    of: 'من',
    users: 'مستخدمين',
    previous: 'السابق',
    next: 'التالي',
    username: 'اسم المستخدم',
    usernamePlaceholder: 'أدخل اسم المستخدم',
    fullName: 'الاسم الكامل',
    fullNamePlaceholder: 'أدخل الاسم الكامل',
    emailLabel: 'البريد الإلكتروني',
    emailPlaceholder: 'أدخل عنوان البريد الإلكتروني',
    password: 'كلمة المرور',
    passwordPlaceholder: 'أدخل كلمة المرور',
    confirmPassword: 'تأكيد كلمة المرور',
    confirmPasswordPlaceholder: 'أكد كلمة المرور',
    selectRole: 'اختر الدور',
    cancel: 'إلغاء',
    create: 'إنشاء',
    update: 'تحديث',
    active: 'نشط',
    inactive: 'غير نشط',
    confirmDeactivate: 'هل أنت متأكد من إلغاء تفعيل هذا المستخدم؟',
    confirmActivate: 'هل أنت متأكد من تفعيل هذا المستخدم؟',
    loading: 'جاري التحميل...',
    error: 'حدث خطأ',
    successCreate: 'تم إنشاء المستخدم بنجاح',
    successUpdate: 'تم تحديث المستخدم بنجاح',
    successDelete: 'تم تعطيل المستخدم بنجاح',
    passwordsMismatch: 'كلمتا المرور غير متطابقتين',
    requiredField: 'هذا الحقل مطلوب',
    leaveBlankToKeep: 'اتركه فارغًا للاحتفاظ بكلمة المرور الحالية',
    invalidEmail: 'تنسيق البريد الإلكتروني غير صحيح',
    shortPassword: 'يجب أن تكون كلمة المرور 8 أحرف على الأقل',
    noUsers: 'لا يوجد مستخدمون',
    authRequired: 'يلزم تسجيل الدخول',
  },
};

const ROLES: Array<User['role']> = ['admin', 'manager', 'cashier'];
const API_BASE = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api/users`;

function normalizeUser(rawUser: Record<string, unknown>): User {
  return {
    id: String(rawUser.id ?? ''),
    username: String(rawUser.username ?? ''),
    full_name: String(rawUser.full_name ?? rawUser.fullName ?? rawUser.username ?? ''),
    email: String(rawUser.email ?? ''),
    role: rawUser.role === 'admin' || rawUser.role === 'manager' || rawUser.role === 'cashier' ? rawUser.role : 'cashier',
    is_active: Boolean(rawUser.is_active ?? rawUser.isActive ?? true),
    created_at: String(rawUser.created_at ?? rawUser.createdAt ?? ''),
    last_login: typeof rawUser.last_login === 'string' ? rawUser.last_login : typeof rawUser.lastLogin === 'string' ? rawUser.lastLogin : undefined,
  };
}

const emptyForm: UserFormData = { username: '', full_name: '', email: '', password: '', role: 'cashier' };

function inputClass(theme: 'light' | 'dark', hasError = false) {
  return `w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
    theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
  } ${hasError ? 'border-red-500' : ''}`;
}

function FormField({ label, error, theme, children }: { label: string; error?: string; theme: 'light' | 'dark'; children: React.ReactNode }) {
  return (
    <div>
      <label className={theme === 'dark' ? 'mb-1 block text-sm font-medium text-gray-300' : 'mb-1 block text-sm font-medium text-gray-700'}>{label}</label>
      {children}
      {error ? <p className="mt-1 text-sm text-red-500">{error}</p> : null}
    </div>
  );
}

function ModalActions({
  theme,
  cancelLabel,
  actionLabel,
  onCancel,
  onConfirm,
}: {
  theme: 'light' | 'dark';
  cancelLabel: string;
  actionLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="mt-6 flex justify-end gap-3">
      <button
        onClick={onCancel}
        className={
          theme === 'dark'
            ? 'rounded-lg bg-gray-700 px-4 py-2 font-medium text-gray-300 transition-colors hover:bg-gray-600'
            : 'rounded-lg bg-gray-200 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-300'
        }
      >
        {cancelLabel}
      </button>
      <button onClick={onConfirm} className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700">
        {actionLabel}
      </button>
    </div>
  );
}

interface UserManagerProps {
  locale?: 'ar' | 'en';
  theme?: 'light' | 'dark';
  accessToken?: string;
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
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>(emptyForm);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const usersPerPage = 10;

  const fetchHeaders = useCallback((): Record<string, string> => {
    const token = accessToken ?? getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [accessToken]);

  const getUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: usersPerPage.toString(),
        ...(search.trim() ? { search: search.trim() } : {}),
      });

      const response = await fetch(`${API_BASE}?${params.toString()}`, {
        headers: fetchHeaders(),
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError(t.authRequired);
          return;
        }

        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      const normalizedUsers = Array.isArray(data.users)
        ? data.users.map((user: Record<string, unknown>) => normalizeUser(user))
        : [];

      const total = typeof data.total === 'number'
        ? data.total
        : typeof data.pagination?.total === 'number'
          ? data.pagination.total
          : normalizedUsers.length;

      const pages = typeof data.total_pages === 'number'
        ? data.total_pages
        : typeof data.pagination?.totalPages === 'number'
          ? data.pagination.totalPages
          : Math.max(1, Math.ceil(total / usersPerPage));

      setUsers(normalizedUsers);
      setTotalUsers(total);
      setTotalPages(pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, fetchHeaders, search, t.authRequired, t.error]);

  useEffect(() => {
    void getUsers();
  }, [getUsers]);

  const validateForm = (isEdit = false) => {
    const errors: Record<string, string> = {};
    if (!isEdit && !formData.username.trim()) errors.username = t.requiredField;
    if (!formData.full_name.trim()) errors.full_name = t.requiredField;
    if (!formData.email.trim()) {
      errors.email = t.requiredField;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = t.invalidEmail;
    }

    if (!isEdit || formData.password) {
      if (!formData.password) errors.password = t.requiredField;
      else if (formData.password.length < 8) errors.password = t.shortPassword;
      if (formData.password !== confirmPassword) errors.confirmPassword = t.passwordsMismatch;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetForm = () => {
    setFormData(emptyForm);
    setConfirmPassword('');
    setFormErrors({});
  };

  const handleAddUser = async () => {
    if (!validateForm(false)) return;
    setSubmitting(true);

    try {
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...fetchHeaders() },
        body: JSON.stringify({
          username: formData.username.trim(),
          fullName: formData.full_name.trim(),
          email: formData.email.trim(),
          password: formData.password,
          role: formData.role,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || t.error);

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
        fullName: formData.full_name.trim(),
        email: formData.email.trim(),
        role: formData.role,
      };

      if (formData.password) body.password = formData.password;

      const response = await fetch(`${API_BASE}/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...fetchHeaders() },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || t.error);

      await getUsers();
      setIsEditModalOpen(false);
      setSelectedUser(null);
      resetForm();
      alert(t.successUpdate);
    } catch (err) {
      alert(err instanceof Error ? err.message : t.error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusToggle = async () => {
    if (!selectedUser) return;

    try {
      const response = await fetch(`${API_BASE}/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...fetchHeaders() },
        body: JSON.stringify({ isActive: !selectedUser.is_active }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || t.error);

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
      username: user.username,
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
    const username = (user.username ?? '').toLowerCase();
    return fullName.includes(normalizedSearch) || email.includes(normalizedSearch) || username.includes(normalizedSearch);
  });

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const roleLabels: Record<'ar' | 'en', Record<User['role'], string>> = {
    en: { admin: 'Admin', manager: 'Manager', cashier: 'Cashier' },
    ar: { admin: 'مدير', manager: 'مساعد مدير', cashier: 'كاشير' },
  };

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold tracking-[-0.02em] text-[var(--foreground)]">{t.usersManagement}</h2>
        <button
          onClick={() => {
            resetForm();
            setIsAddModalOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--action)] px-4 py-3 font-semibold text-white shadow-[0_14px_28px_rgba(31,157,115,0.22)] transition-all hover:bg-[var(--action-strong)]"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t.addUser}
        </button>
      </div>

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
          <svg className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--muted)] ${isRTL ? 'left-3' : 'right-3'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[color:color-mix(in_srgb,var(--card)_96%,transparent)] shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[var(--action)] border-t-transparent" />
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
                      <td colSpan={6} className="px-6 py-8 text-center text-[var(--muted)]">{t.noUsers}</td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={String(user.id)} className="transition-colors hover:bg-[color:color-mix(in_srgb,var(--surface)_82%,transparent)]">
                        <td className="px-6 py-4 whitespace-nowrap"><div className="font-medium text-[var(--foreground)]">{user.full_name}</div></td>
                        <td className="px-6 py-4 whitespace-nowrap text-[var(--muted)]">{user.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${user.role === 'admin' ? 'bg-[var(--warning-soft)] text-[var(--warning)]' : user.role === 'manager' ? 'bg-[var(--info-soft)] text-[var(--info)]' : 'bg-[var(--action-soft)] text-[var(--action)]'}`}>{roleLabels[locale][user.role]}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${user.is_active ? 'bg-[var(--action-soft)] text-[var(--action)]' : 'bg-[var(--danger-soft)] text-[var(--danger)]'}`}>{user.is_active ? t.active : t.inactive}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-[var(--muted)]">{formatDate(user.last_login)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-2">
                            <button onClick={() => openEditModal(user)} className="font-medium text-[var(--action)] hover:text-[var(--action-strong)]">{t.edit}</button>
                            <button onClick={() => openDeactivateModal(user)} className={`font-medium ${user.is_active ? 'text-[var(--danger)] hover:opacity-80' : 'text-[var(--action)] hover:opacity-80'}`}>{user.is_active ? t.deactivate : t.activate}</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 ? (
              <div className="flex items-center justify-between border-t border-[var(--border)] px-6 py-4">
                <p className="text-sm text-[var(--muted)]">{t.showing} {Math.min((currentPage - 1) * usersPerPage + 1, totalUsers)} - {Math.min(currentPage * usersPerPage, totalUsers)} {t.of} {totalUsers} {t.users}</p>
                <div className="flex gap-2">
                  <button onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1} className={`rounded-[var(--radius-md)] px-3 py-1.5 text-sm font-medium transition-colors ${currentPage === 1 ? 'cursor-not-allowed bg-[var(--surface)] text-[var(--muted)]' : 'bg-[var(--action)] text-white hover:bg-[var(--action-strong)]'}`}>{t.previous}</button>
                  <button onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage === totalPages} className={`rounded-[var(--radius-md)] px-3 py-1.5 text-sm font-medium transition-colors ${currentPage === totalPages ? 'cursor-not-allowed bg-[var(--surface)] text-[var(--muted)]' : 'bg-[var(--action)] text-white hover:bg-[var(--action-strong)]'}`}>{t.next}</button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>

      <Modal isOpen={isAddModalOpen} onClose={() => { setIsAddModalOpen(false); resetForm(); }} title={t.addUser} locale={locale} theme={theme} size="lg">
        <div className="space-y-4">
          <FormField label={t.username} error={formErrors.username} theme={theme}><input type="text" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} placeholder={t.usernamePlaceholder} className={inputClass(theme, !!formErrors.username)} /></FormField>
          <FormField label={t.fullName} error={formErrors.full_name} theme={theme}><input type="text" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} placeholder={t.fullNamePlaceholder} className={inputClass(theme, !!formErrors.full_name)} /></FormField>
          <FormField label={t.emailLabel} error={formErrors.email} theme={theme}><input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder={t.emailPlaceholder} className={inputClass(theme, !!formErrors.email)} /></FormField>
          <FormField label={t.password} error={formErrors.password} theme={theme}><input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder={t.passwordPlaceholder} className={inputClass(theme, !!formErrors.password)} /></FormField>
          <FormField label={t.confirmPassword} error={formErrors.confirmPassword} theme={theme}><input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder={t.confirmPasswordPlaceholder} className={inputClass(theme, !!formErrors.confirmPassword)} /></FormField>
          <FormField label={t.selectRole} theme={theme}>
            <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value as User['role'] })} className={inputClass(theme)}>
              {ROLES.map((role) => <option key={role} value={role}>{roleLabels[locale][role]}</option>)}
            </select>
          </FormField>
        </div>
        <ModalActions theme={theme} cancelLabel={t.cancel} actionLabel={submitting ? t.loading : t.create} onCancel={() => { setIsAddModalOpen(false); resetForm(); }} onConfirm={handleAddUser} />
      </Modal>

      <Modal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setSelectedUser(null); resetForm(); }} title={t.editUser} locale={locale} theme={theme} size="lg">
        <div className="space-y-4">
          <FormField label={t.fullName} error={formErrors.full_name} theme={theme}><input type="text" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} placeholder={t.fullNamePlaceholder} className={inputClass(theme, !!formErrors.full_name)} /></FormField>
          <FormField label={t.emailLabel} error={formErrors.email} theme={theme}><input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder={t.emailPlaceholder} className={inputClass(theme, !!formErrors.email)} /></FormField>
          <FormField label={`${t.password} (${t.leaveBlankToKeep})`} error={formErrors.password} theme={theme}><input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder={t.passwordPlaceholder} className={inputClass(theme, !!formErrors.password)} /></FormField>
          <FormField label={t.confirmPassword} error={formErrors.confirmPassword} theme={theme}><input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder={t.confirmPasswordPlaceholder} className={inputClass(theme, !!formErrors.confirmPassword)} /></FormField>
          <FormField label={t.selectRole} theme={theme}>
            <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value as User['role'] })} className={inputClass(theme)}>
              {ROLES.map((role) => <option key={role} value={role}>{roleLabels[locale][role]}</option>)}
            </select>
          </FormField>
        </div>
        <ModalActions theme={theme} cancelLabel={t.cancel} actionLabel={submitting ? t.loading : t.update} onCancel={() => { setIsEditModalOpen(false); setSelectedUser(null); resetForm(); }} onConfirm={handleEditUser} />
      </Modal>

      <Modal isOpen={isDeactivateModalOpen} onClose={() => { setIsDeactivateModalOpen(false); setSelectedUser(null); }} title={selectedUser?.is_active ? t.deactivate : t.activate} locale={locale} theme={theme} size="md">
        <p className={theme === 'dark' ? 'mb-6 text-gray-300' : 'mb-6 text-gray-700'}>{selectedUser?.is_active ? t.confirmDeactivate : t.confirmActivate}</p>
        <div className="flex justify-end gap-3">
          <button onClick={() => { setIsDeactivateModalOpen(false); setSelectedUser(null); }} className={theme === 'dark' ? 'rounded-lg bg-gray-700 px-4 py-2 font-medium text-gray-300 transition-colors hover:bg-gray-600' : 'rounded-lg bg-gray-200 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-300'}>{t.cancel}</button>
          <button onClick={handleStatusToggle} className={`rounded-lg px-4 py-2 font-medium text-white transition-colors ${selectedUser?.is_active ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}>{selectedUser?.is_active ? t.deactivate : t.activate}</button>
        </div>
      </Modal>
    </div>
  );
};

export default UserManager;

