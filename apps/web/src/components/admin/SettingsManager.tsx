'use client';

import React, { useEffect, useState } from 'react';
import { getTokenForRequest } from '@/lib/auth';

// Types for app settings
interface GeneralSettings {
  pharmacy_name: string;
  timezone: string;
  currency: string;
}

interface LocalizedSettings {
  name_ar: string;
  name_en: string;
}

interface FinancialSettings {
  tax_rate: number;
  default_currency: string;
}

interface InventorySettings {
  low_stock_threshold: number;
  expiry_alert_days: number;
  fefo_enabled: boolean;
}

interface AppSettings {
  general: GeneralSettings;
  localized: LocalizedSettings;
  financial: FinancialSettings;
  inventory: InventorySettings;
}

interface SettingsManagerProps {
  locale: 'ar' | 'en';
  theme: 'light' | 'dark';
}

// Default values
const defaultSettings: AppSettings = {
  general: {
    pharmacy_name: '',
    timezone: 'Africa/Cairo',
    currency: 'EGP',
  },
  localized: {
    name_ar: '',
    name_en: '',
  },
  financial: {
    tax_rate: 14,
    default_currency: 'EGP',
  },
  inventory: {
    low_stock_threshold: 10,
    expiry_alert_days: 30,
    fefo_enabled: true,
  },
};

export function SettingsManager({ locale, theme }: SettingsManagerProps) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // Translations
  const t = {
    title: locale === 'ar' ? 'إعدادات النظام' : 'System Settings',
    general: locale === 'ar' ? 'عام' : 'General',
    localized: locale === 'ar' ? 'الأسماء المترجمة' : 'Localized Names',
    financial: locale === 'ar' ? 'مالي' : 'Financial',
    inventory: locale === 'ar' ? 'المخزون' : 'Inventory',
    pharmacy_name: locale === 'ar' ? 'اسم الصيدلية' : 'Pharmacy Name',
    timezone: locale === 'ar' ? 'المنطقة الزمنية' : 'Timezone',
    currency: locale === 'ar' ? 'العملة' : 'Currency',
    name_ar: locale === 'ar' ? 'الاسم بالعربية' : 'Arabic Name',
    name_en: locale === 'ar' ? 'الاسم بالإنجليزية' : 'English Name',
    tax_rate: locale === 'ar' ? 'نسبة الضريبة (%)' : 'Tax Rate (%)',
    default_currency: locale === 'ar' ? 'العملة الافتراضية' : 'Default Currency',
    low_stock_threshold: locale === 'ar' ? 'حد المخزون المنخفض' : 'Low Stock Threshold',
    expiry_alert_days: locale === 'ar' ? 'أيام تنبيه الصلاحية' : 'Expiry Alert Days',
    fefo_enabled: locale === 'ar' ? 'تفعيل نظام FEFO' : 'FEFO Enabled',
    save: locale === 'ar' ? 'حفظ التغييرات' : 'Save Changes',
    saved: locale === 'ar' ? 'تم الحفظ بنجاح!' : 'Saved successfully!',
    error: locale === 'ar' ? 'حدث خطأ' : 'Error',
    loading: locale === 'ar' ? 'جاري التحميل...' : 'Loading...',
    fefo_description: locale === 'ar' ? 'أول ما ينتهي أولاً - إدارة المخزون حسب تاريخ الصلاحية' : 'First Expired First Out - Manage inventory by expiry date',
  };

  // Timezone options
  const timezones = [
    'Africa/Cairo',
    'Asia/Riyadh',
    'Asia/Dubai',
    'Europe/London',
    'Europe/Paris',
    'America/New_York',
    'America/Los_Angeles',
  ];

  // Currency options
  const currencies = [
    { code: 'EGP', symbol: 'ج.م' },
    { code: 'USD', symbol: '$' },
    { code: 'EUR', symbol: '€' },
    { code: 'SAR', symbol: 'ر.س' },
    { code: 'AED', symbol: 'د.إ' },
  ];

  // Load settings from API
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const token = getTokenForRequest();
        const response = await fetch('/api/settings', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          // Parse settings from key-value format
          const loaded: Partial<AppSettings> = {};
          
          if (data.general) loaded.general = { ...defaultSettings.general, ...data.general };
          if (data.localized) loaded.localized = { ...defaultSettings.localized, ...data.localized };
          if (data.financial) loaded.financial = { ...defaultSettings.financial, ...data.financial };
          if (data.inventory) loaded.inventory = { ...defaultSettings.inventory, ...data.inventory };
          
          setSettings({ ...defaultSettings, ...loaded });
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Save settings to API
  const saveSettings = async () => {
    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const token = getTokenForRequest();
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  // Update nested setting
  const updateSetting = <K extends keyof AppSettings>(
    section: K,
    key: keyof AppSettings[K],
    value: AppSettings[K][keyof AppSettings[K]]
  ) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
  };

  // Toggle section expanded/collapsed
  const toggleSection = (section: string) => {
    setActiveSection(activeSection === section ? null : section);
  };

  // Section card component
  const SectionCard = ({ 
    id, 
    title, 
    children 
  }: { 
    id: string; 
    title: string; 
    children: React.ReactNode 
  }) => (
    <div className={`rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm`}>
      <button
        onClick={() => toggleSection(id)}
        className="w-full px-6 py-4 flex items-center justify-between text-left"
      >
        <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          {title}
        </h3>
        <svg
          className={`w-5 h-5 transition-transform ${activeSection === id ? 'rotate-180' : ''} ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {activeSection === id && (
        <div className="px-6 pb-6 space-y-4">
          {children}
        </div>
      )}
    </div>
  );

  // Input field component
  const InputField = ({
    label,
    value,
    onChange,
    type = 'text',
    placeholder = '',
  }: {
    label: string;
    value: string | number;
    onChange: (value: string | number) => void;
    type?: string;
    placeholder?: string;
  }) => (
    <div>
      <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
        {label}
      </label>
      {type === 'number' ? (
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={`w-full px-3 py-2 border rounded-md ${
            theme === 'dark' 
              ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
              : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
          } focus:outline-none focus:ring-1 focus:ring-blue-500`}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full px-3 py-2 border rounded-md ${
            theme === 'dark' 
              ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
              : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
          } focus:outline-none focus:ring-1 focus:ring-blue-500`}
        />
      )}
    </div>
  );

  // Select field component
  const SelectField = ({
    label,
    value,
    onChange,
    options,
  }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: { code: string; symbol?: string }[] | string[];
  }) => (
    <div>
      <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-3 py-2 border rounded-md ${
          theme === 'dark' 
            ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
            : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
        } focus:outline-none focus:ring-1 focus:ring-blue-500`}
      >
        {options.map((opt) => (
          <option key={typeof opt === 'string' ? opt : opt.code} value={typeof opt === 'string' ? opt : opt.code}>
            {typeof opt === 'string' ? opt : `${opt.code} (${opt.symbol})`}
          </option>
        ))}
      </select>
    </div>
  );

  // Checkbox field component
  const CheckboxField = ({
    label,
    checked,
    onChange,
    description,
  }: {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    description?: string;
  }) => (
    <div className="flex items-start">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
      />
      <div className="ml-3">
        <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
          {label}
        </label>
        {description && (
          <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            {description}
          </p>
        )}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            {t.loading}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          {t.title}
        </h1>
      </div>

      {/* Success/Error Messages */}
      {saveSuccess && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 text-sm">{t.saved}</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{t.error}: {error}</p>
        </div>
      )}

      {/* Settings Sections */}
      <div className="space-y-4">
        {/* General Settings */}
        <SectionCard id="general" title={t.general}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <InputField
                label={t.pharmacy_name}
                value={settings.general.pharmacy_name}
                onChange={(v) => updateSetting('general', 'pharmacy_name', v as string)}
                placeholder={locale === 'ar' ? 'أدخل اسم الصيدلية' : 'Enter pharmacy name'}
              />
            </div>
            <SelectField
              label={t.timezone}
              value={settings.general.timezone}
              onChange={(v) => updateSetting('general', 'timezone', v)}
              options={timezones}
            />
            <SelectField
              label={t.currency}
              value={settings.general.currency}
              onChange={(v) => updateSetting('general', 'currency', v)}
              options={currencies}
            />
          </div>
        </SectionCard>

        {/* Localized Names */}
        <SectionCard id="localized" title={t.localized}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField
              label={t.name_ar}
              value={settings.localized.name_ar}
              onChange={(v) => updateSetting('localized', 'name_ar', v as string)}
              placeholder="اسم الصيدلية بالعربية"
            />
            <InputField
              label={t.name_en}
              value={settings.localized.name_en}
              onChange={(v) => updateSetting('localized', 'name_en', v as string)}
              placeholder="Pharmacy name in English"
            />
          </div>
        </SectionCard>

        {/* Financial Settings */}
        <SectionCard id="financial" title={t.financial}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField
              label={t.tax_rate}
              value={settings.financial.tax_rate}
              onChange={(v) => updateSetting('financial', 'tax_rate', v as number)}
              type="number"
            />
            <SelectField
              label={t.default_currency}
              value={settings.financial.default_currency}
              onChange={(v) => updateSetting('financial', 'default_currency', v)}
              options={currencies}
            />
          </div>
        </SectionCard>

        {/* Inventory Settings */}
        <SectionCard id="inventory" title={t.inventory}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField
              label={t.low_stock_threshold}
              value={settings.inventory.low_stock_threshold}
              onChange={(v) => updateSetting('inventory', 'low_stock_threshold', v as number)}
              type="number"
            />
            <InputField
              label={t.expiry_alert_days}
              value={settings.inventory.expiry_alert_days}
              onChange={(v) => updateSetting('inventory', 'expiry_alert_days', v as number)}
              type="number"
            />
            <div className="md:col-span-2">
              <CheckboxField
                label={t.fefo_enabled}
                checked={settings.inventory.fefo_enabled}
                onChange={(v) => updateSetting('inventory', 'fefo_enabled', v)}
                description={t.fefo_description}
              />
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}">
        <button
          onClick={saveSettings}
          disabled={isSaving}
          className={`px-6 py-2 bg-blue-600 text-white rounded-md font-medium
            ${isSaving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'}
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            ${theme === 'dark' ? 'focus:ring-offset-gray-800' : ''}
          `}
        >
          {isSaving ? (locale === 'ar' ? 'جاري الحفظ...' : 'Saving...') : t.save}
        </button>
      </div>
    </div>
  );
}
