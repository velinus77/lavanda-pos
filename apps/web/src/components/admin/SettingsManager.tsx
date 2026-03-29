"use client";

import React, { useEffect, useState } from "react";
import { authenticatedFetch, getTokenForRequest } from "@/lib/auth";

const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const SETTINGS_API_BASE = `${API_ORIGIN}/api/settings`;
const USERS_API_BASE = `${API_ORIGIN}/api/users`;
const EXCHANGE_API_BASE = `${API_ORIGIN}/api/exchange-rates`;
const INVENTORY_ALERTS_API_BASE = `${API_ORIGIN}/api/inventory/alerts`;

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
  locale: "ar" | "en";
  theme: "light" | "dark";
}

interface UsersResponse {
  users?: Array<{ isActive?: boolean; is_active?: boolean }>;
  pagination?: {
    total?: number;
  };
}

interface ExchangeSnapshotResponse {
  source?: string;
  updatedAt?: string | null;
  offlineMode?: boolean;
  stale?: boolean;
  rateDetails?: Record<string, { stale?: boolean }>;
}

interface InventoryAlertsResponse {
  total?: number;
}

interface ErrorResponse {
  message?: string;
  error?: string | { message?: string };
}

interface SystemHealthSummary {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  inventoryAlerts: number;
  exchange: {
    source: string;
    updatedAt: string | null;
    stale: boolean;
    offlineMode: boolean;
    trackedCurrencies: number;
  };
}

const defaultSettings: AppSettings = {
  general: {
    pharmacy_name: "",
    timezone: "Africa/Cairo",
    currency: "EGP",
  },
  localized: {
    name_ar: "",
    name_en: "",
  },
  financial: {
    tax_rate: 14,
    default_currency: "EGP",
  },
  inventory: {
    low_stock_threshold: 10,
    expiry_alert_days: 30,
    fefo_enabled: true,
  },
};

function mapApiSettings(data: unknown): AppSettings {
  const payload =
    typeof data === "object" && data !== null && "settings" in data
      ? (data as { settings?: Record<string, Record<string, unknown>> }).settings
      : undefined;

  const general = payload?.general ?? {};
  const localized = payload?.localized ?? {};
  const financial = payload?.financial ?? {};
  const inventory = payload?.inventory ?? {};

  return {
    general: {
      pharmacy_name: String(
        general.pharmacy_name ?? general["app.name"] ?? defaultSettings.general.pharmacy_name
      ),
      timezone: String(
        general.timezone ?? general["app.timezone"] ?? defaultSettings.general.timezone
      ),
      currency: String(
        general.currency ?? general["currency.base"] ?? defaultSettings.general.currency
      ),
    },
    localized: {
      name_ar: String(
        localized.name_ar ?? localized.pharmacy_name_ar ?? defaultSettings.localized.name_ar
      ),
      name_en: String(
        localized.name_en ?? localized.pharmacy_name_en ?? defaultSettings.localized.name_en
      ),
    },
    financial: {
      tax_rate: Number(
        financial.tax_rate ??
          financial.default_rate ??
          financial["tax.default_rate"] ??
          defaultSettings.financial.tax_rate
      ),
      default_currency: String(
        financial.default_currency ??
          financial["currency.base"] ??
          defaultSettings.financial.default_currency
      ),
    },
    inventory: {
      low_stock_threshold: Number(
        inventory.low_stock_threshold ?? defaultSettings.inventory.low_stock_threshold
      ),
      expiry_alert_days: Number(
        inventory.expiry_alert_days ??
          inventory.warn_before_expiry_days ??
          defaultSettings.inventory.expiry_alert_days
      ),
      fefo_enabled: Boolean(inventory.fefo_enabled ?? defaultSettings.inventory.fefo_enabled),
    },
  };
}

function flattenSettings(settings: AppSettings): Record<string, unknown> {
  return {
    "general.pharmacy_name": settings.general.pharmacy_name,
    "general.timezone": settings.general.timezone,
    "general.currency": settings.general.currency,
    "localized.name_ar": settings.localized.name_ar,
    "localized.name_en": settings.localized.name_en,
    "financial.tax_rate": settings.financial.tax_rate,
    "financial.default_currency": settings.financial.default_currency,
    "inventory.low_stock_threshold": settings.inventory.low_stock_threshold,
    "inventory.expiry_alert_days": settings.inventory.expiry_alert_days,
    "inventory.fefo_enabled": settings.inventory.fefo_enabled,
  };
}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const data = (await response.json()) as ErrorResponse;

    if (typeof data.message === "string" && data.message.trim()) {
      return data.message;
    }

    if (typeof data.error === "string" && data.error.trim()) {
      return data.error;
    }

    if (
      data.error &&
      typeof data.error === "object" &&
      typeof data.error.message === "string" &&
      data.error.message.trim()
    ) {
      return data.error.message;
    }
  } catch {
    return fallback;
  }

  return fallback;
}

export function SettingsManager({ locale, theme }: SettingsManagerProps) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshingExchange, setIsRefreshingExchange] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealthSummary | null>(null);

  const t = {
    title: locale === "ar" ? "إعدادات النظام" : "System settings",
    general: locale === "ar" ? "عام" : "General",
    localized: locale === "ar" ? "الأسماء المترجمة" : "Localized names",
    financial: locale === "ar" ? "مالي" : "Financial",
    inventory: locale === "ar" ? "المخزون" : "Inventory",
    pharmacy_name: locale === "ar" ? "اسم الصيدلية" : "Pharmacy name",
    timezone: locale === "ar" ? "المنطقة الزمنية" : "Timezone",
    currency: locale === "ar" ? "العملة" : "Currency",
    name_ar: locale === "ar" ? "الاسم بالعربية" : "Arabic name",
    name_en: locale === "ar" ? "الاسم بالإنجليزية" : "English name",
    tax_rate: locale === "ar" ? "نسبة الضريبة (%)" : "Tax rate (%)",
    default_currency: locale === "ar" ? "العملة الأساسية" : "Default currency",
    low_stock_threshold: locale === "ar" ? "حد المخزون المنخفض" : "Low stock threshold",
    expiry_alert_days: locale === "ar" ? "أيام تنبيه الصلاحية" : "Expiry alert days",
    fefo_enabled: locale === "ar" ? "تفعيل نظام FEFO" : "FEFO enabled",
    save: locale === "ar" ? "حفظ التغييرات" : "Save changes",
    saved: locale === "ar" ? "التغييرات اتحفظت بنجاح" : "Saved successfully",
    error: locale === "ar" ? "حصل خطأ" : "Error",
    loading: locale === "ar" ? "جارٍ التحميل..." : "Loading...",
    operatingFocus: locale === "ar" ? "أولويات التشغيل" : "Your operating focus",
    operatingSummary:
      locale === "ar"
        ? "هنا هتلاقي المستخدمين، وحالة أسعار الصرف، والتنبيهات التشغيلية في نظرة سريعة."
        : "Users, exchange-rate freshness, and operational alerts now show up here.",
    usersHealth: locale === "ar" ? "حالة المستخدمين" : "Users health",
    exchangeHealth: locale === "ar" ? "حالة أسعار الصرف" : "Exchange-rate freshness",
    operationalAlerts: locale === "ar" ? "تنبيهات تشغيلية" : "Operational alerts",
    activeUsers: locale === "ar" ? "نشط" : "active",
    inactiveUsers: locale === "ar" ? "غير نشط" : "inactive",
    lowStockAlerts: locale === "ar" ? "تنبيهات مخزون منخفض" : "Low-stock alerts",
    trackedCurrencies: locale === "ar" ? "عملات متابعه" : "tracked currencies",
    offlineMode: locale === "ar" ? "وضع غير متصل" : "Offline mode",
    staleRates: locale === "ar" ? "بحاجة تحديث" : "Refresh needed",
    freshRates: locale === "ar" ? "محدثة" : "Fresh",
    lastUpdated: locale === "ar" ? "اخر تحديث" : "Last updated",
    notAvailable: locale === "ar" ? "غير متاح" : "Not available",
    openUsers: locale === "ar" ? "افتح المستخدمين" : "Open users",
    openStock: locale === "ar" ? "افتح المخزون" : "Open stock",
    refreshRates: locale === "ar" ? "حدث الاسعار" : "Refresh rates",
    refreshingRates: locale === "ar" ? "جاري التحديث..." : "Refreshing...",
    healthLoadError:
      locale === "ar" ? "تعذر تحميل ملخص صحة النظام" : "Failed to load system health summary",
    fefo_description:
      locale === "ar"
        ? "المنتهي اولا يخرج اولا لادارة المخزون حسب تاريخ الصلاحية"
        : "First expired, first out. Manage inventory by expiry date.",
  };

  const containerClass =
    theme === "dark"
      ? "border-[color:color-mix(in_srgb,var(--border)_72%,transparent)] bg-[color:color-mix(in_srgb,var(--card)_94%,transparent)]"
      : "border-[var(--border)] bg-[var(--surface)]";
  const titleClass = "text-[var(--foreground)]";
  const mutedClass = "text-[var(--muted)]";
  const fieldClass =
    "w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-[var(--foreground)] outline-none transition-all placeholder:text-[var(--muted)] focus:border-[var(--action)] focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--action)_14%,transparent)]";

  const timezones = [
    "Africa/Cairo",
    "Asia/Riyadh",
    "Asia/Dubai",
    "Europe/London",
    "Europe/Paris",
    "America/New_York",
    "America/Los_Angeles",
  ];

  const currencies = [
    { code: "EGP", symbol: "EGP" },
    { code: "USD", symbol: "$" },
    { code: "EUR", symbol: "EUR" },
    { code: "SAR", symbol: "SAR" },
    { code: "AED", symbol: "AED" },
  ];

  const formatTimestamp = (value: string | null) => {
    if (!value) return t.notAvailable;

    return new Date(value).toLocaleString(locale === "ar" ? "ar-EG" : "en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const loadSystemHealth = async () => {
    try {
      const [usersResponse, exchangeResponse, alertsResponse] = await Promise.all([
        authenticatedFetch(`${USERS_API_BASE}?page=1&limit=100`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }),
        authenticatedFetch(`${EXCHANGE_API_BASE}/current`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }),
        authenticatedFetch(INVENTORY_ALERTS_API_BASE, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }),
      ]);

      if (!usersResponse.ok || !exchangeResponse.ok || !alertsResponse.ok) {
        throw new Error(t.healthLoadError);
      }

      const usersData = (await usersResponse.json()) as UsersResponse;
      const exchangeData = (await exchangeResponse.json()) as ExchangeSnapshotResponse;
      const alertsData = (await alertsResponse.json()) as InventoryAlertsResponse;

      const listedUsers = Array.isArray(usersData.users) ? usersData.users : [];
      const activeUsers = listedUsers.filter(
        (user) => user.isActive ?? user.is_active ?? false
      ).length;
      const totalUsers = usersData.pagination?.total ?? listedUsers.length;

      setSystemHealth({
        totalUsers,
        activeUsers,
        inactiveUsers: Math.max(totalUsers - activeUsers, 0),
        inventoryAlerts: alertsData.total ?? 0,
        exchange: {
          source: exchangeData.source ?? t.notAvailable,
          updatedAt: exchangeData.updatedAt ?? null,
          stale: Boolean(exchangeData.stale),
          offlineMode: Boolean(exchangeData.offlineMode),
          trackedCurrencies: exchangeData.rateDetails
            ? Object.keys(exchangeData.rateDetails).length
            : 0,
        },
      });
      setHealthError(null);
    } catch (err) {
      console.error("Failed to load system health:", err);
      setHealthError(err instanceof Error ? err.message : t.healthLoadError);
    }
  };

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const token = getTokenForRequest();
        const response = await fetch(SETTINGS_API_BASE, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("Failed to load settings");
        }

        const data = await response.json();
        setSettings(mapApiSettings(data));
      } catch (err) {
        console.error("Failed to load settings:", err);
        setError(err instanceof Error ? err.message : "Failed to load settings");
      }
    };

    Promise.all([loadSettings(), loadSystemHealth()]).finally(() => {
      setIsLoading(false);
    });
  }, []);

  const saveSettings = async () => {
    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const token = getTokenForRequest();
      const response = await fetch(SETTINGS_API_BASE, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          settings: flattenSettings(settings),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save settings");
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const refreshExchangeRates = async () => {
    setIsRefreshingExchange(true);
    setHealthError(null);

    try {
      const response = await authenticatedFetch(`${EXCHANGE_API_BASE}/refresh`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, t.healthLoadError));
      }

      await loadSystemHealth();
    } catch (err) {
      console.error("Failed to refresh exchange rates:", err);
      setHealthError(err instanceof Error ? err.message : t.healthLoadError);
    } finally {
      setIsRefreshingExchange(false);
    }
  };

  const updateSetting = <K extends keyof AppSettings>(
    section: K,
    key: keyof AppSettings[K],
    value: AppSettings[K][keyof AppSettings[K]]
  ) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
  };

  const toggleSection = (section: string) => {
    setActiveSection(activeSection === section ? null : section);
  };

  const SectionCard = ({
    id,
    title,
    children,
  }: {
    id: string;
    title: string;
    children: React.ReactNode;
  }) => (
    <div className={`rounded-[24px] border shadow-sm ${containerClass}`}>
      <button
        type="button"
        onClick={() => toggleSection(id)}
        className="flex w-full items-center justify-between px-6 py-4 text-left"
      >
        <h3 className={`text-lg font-semibold ${titleClass}`}>{title}</h3>
        <svg
          className={`h-5 w-5 transition-transform ${activeSection === id ? "rotate-180" : ""} ${mutedClass}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {activeSection === id && <div className="space-y-4 px-6 pb-6">{children}</div>}
    </div>
  );

  const InputField = ({
    label,
    value,
    onChange,
    type = "text",
    placeholder = "",
  }: {
    label: string;
    value: string | number;
    onChange: (value: string | number) => void;
    type?: string;
    placeholder?: string;
  }) => (
    <div>
      <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">{label}</label>
      {type === "number" ? (
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={fieldClass}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={fieldClass}
        />
      )}
    </div>
  );

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
      <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={fieldClass}>
        {options.map((opt) => (
          <option
            key={typeof opt === "string" ? opt : opt.code}
            value={typeof opt === "string" ? opt : opt.code}
          >
            {typeof opt === "string" ? opt : `${opt.code} (${opt.symbol})`}
          </option>
        ))}
      </select>
    </div>
  );

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
        className="mt-1 h-4 w-4 rounded border-[var(--border)] bg-[var(--card)] text-[var(--action)] focus:ring-[var(--action)]"
      />
      <div className="ml-3">
        <label className="text-sm font-medium text-[var(--foreground)]">{label}</label>
        {description && <p className="mt-1 text-xs text-[var(--muted)]">{description}</p>}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[var(--action)] border-t-transparent" />
          <p className="text-sm text-[var(--muted)]">{t.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className={`rounded-[24px] border p-5 shadow-sm ${containerClass}`}>
        <p className={`text-xs font-semibold uppercase tracking-[0.24em] ${mutedClass}`}>
          {t.operatingFocus}
        </p>
        <h2 className={`mt-2 text-xl font-semibold tracking-[-0.03em] ${titleClass}`}>
          {t.operatingSummary}
        </h2>

        {healthError && (
          <div className="mt-4 rounded-[var(--radius-lg)] border border-[color:color-mix(in_srgb,var(--danger)_34%,transparent)] bg-[var(--danger-soft)] p-3">
            <p className="text-sm text-[var(--danger)]">{healthError}</p>
          </div>
        )}

        {systemHealth && (
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className={`rounded-[20px] border p-4 ${containerClass}`}>
              <p className={`text-sm ${mutedClass}`}>{t.usersHealth}</p>
              <p className={`mt-2 text-2xl font-semibold ${titleClass}`}>
                {systemHealth.totalUsers}
              </p>
              <p className={`mt-2 text-sm ${mutedClass}`}>
                {systemHealth.activeUsers} {t.activeUsers} • {systemHealth.inactiveUsers}{" "}
                {t.inactiveUsers}
              </p>
              <a
                href="/dashboard/users"
                className="mt-4 inline-flex text-sm font-medium text-[var(--accent)] transition-opacity hover:opacity-80"
              >
                {t.openUsers}
              </a>
            </div>

            <div className={`rounded-[20px] border p-4 ${containerClass}`}>
              <p className={`text-sm ${mutedClass}`}>{t.exchangeHealth}</p>
              <p className={`mt-2 text-lg font-semibold ${titleClass}`}>
                {systemHealth.exchange.offlineMode
                  ? t.offlineMode
                  : systemHealth.exchange.stale
                    ? t.staleRates
                    : t.freshRates}
              </p>
              <p className={`mt-2 text-sm ${mutedClass}`}>
                {systemHealth.exchange.source} • {systemHealth.exchange.trackedCurrencies}{" "}
                {t.trackedCurrencies}
              </p>
              <p className={`mt-1 text-xs ${mutedClass}`}>
                {t.lastUpdated}: {formatTimestamp(systemHealth.exchange.updatedAt)}
              </p>
              <button
                type="button"
                onClick={refreshExchangeRates}
                disabled={isRefreshingExchange}
                className="mt-4 inline-flex rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--card)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isRefreshingExchange ? t.refreshingRates : t.refreshRates}
              </button>
            </div>

            <div className={`rounded-[20px] border p-4 ${containerClass}`}>
              <p className={`text-sm ${mutedClass}`}>{t.operationalAlerts}</p>
              <p className={`mt-2 text-2xl font-semibold ${titleClass}`}>
                {systemHealth.inventoryAlerts}
              </p>
              <p className={`mt-2 text-sm ${mutedClass}`}>{t.lowStockAlerts}</p>
              <a
                href="/dashboard/stock"
                className="mt-4 inline-flex text-sm font-medium text-[var(--accent)] transition-opacity hover:opacity-80"
              >
                {t.openStock}
              </a>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <h1 className={`text-2xl font-bold ${titleClass}`}>{t.title}</h1>
      </div>

      {saveSuccess && (
        <div className="rounded-[var(--radius-lg)] border border-[color:color-mix(in_srgb,var(--action)_34%,transparent)] bg-[var(--action-soft)] p-4">
          <p className="text-sm text-[var(--action)]">{t.saved}</p>
        </div>
      )}

      {error && (
        <div className="rounded-[var(--radius-lg)] border border-[color:color-mix(in_srgb,var(--danger)_34%,transparent)] bg-[var(--danger-soft)] p-4">
          <p className="text-sm text-[var(--danger)]">
            {t.error}: {error}
          </p>
        </div>
      )}

      <div className="space-y-4">
        <SectionCard id="general" title={t.general}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <InputField
                label={t.pharmacy_name}
                value={settings.general.pharmacy_name}
                onChange={(value) => updateSetting("general", "pharmacy_name", value as string)}
                placeholder={locale === "ar" ? "ادخل اسم الصيدلية" : "Enter pharmacy name"}
              />
            </div>
            <SelectField
              label={t.timezone}
              value={settings.general.timezone}
              onChange={(value) => updateSetting("general", "timezone", value)}
              options={timezones}
            />
            <SelectField
              label={t.currency}
              value={settings.general.currency}
              onChange={(value) => updateSetting("general", "currency", value)}
              options={currencies}
            />
          </div>
        </SectionCard>

        <SectionCard id="localized" title={t.localized}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <InputField
              label={t.name_ar}
              value={settings.localized.name_ar}
              onChange={(value) => updateSetting("localized", "name_ar", value as string)}
              placeholder={locale === "ar" ? "اسم الصيدلية بالعربية" : "Pharmacy name in Arabic"}
            />
            <InputField
              label={t.name_en}
              value={settings.localized.name_en}
              onChange={(value) => updateSetting("localized", "name_en", value as string)}
              placeholder="Pharmacy name in English"
            />
          </div>
        </SectionCard>

        <SectionCard id="financial" title={t.financial}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <InputField
              label={t.tax_rate}
              value={settings.financial.tax_rate}
              onChange={(value) => updateSetting("financial", "tax_rate", value as number)}
              type="number"
            />
            <SelectField
              label={t.default_currency}
              value={settings.financial.default_currency}
              onChange={(value) => updateSetting("financial", "default_currency", value)}
              options={currencies}
            />
          </div>
        </SectionCard>

        <SectionCard id="inventory" title={t.inventory}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <InputField
              label={t.low_stock_threshold}
              value={settings.inventory.low_stock_threshold}
              onChange={(value) =>
                updateSetting("inventory", "low_stock_threshold", value as number)
              }
              type="number"
            />
            <InputField
              label={t.expiry_alert_days}
              value={settings.inventory.expiry_alert_days}
              onChange={(value) => updateSetting("inventory", "expiry_alert_days", value as number)}
              type="number"
            />
            <div className="md:col-span-2">
              <CheckboxField
                label={t.fefo_enabled}
                checked={settings.inventory.fefo_enabled}
                onChange={(value) => updateSetting("inventory", "fefo_enabled", value)}
                description={t.fefo_description}
              />
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="flex justify-end border-t border-[color:color-mix(in_srgb,var(--border)_72%,transparent)] pt-4">
        <button
          type="button"
          onClick={saveSettings}
          disabled={isSaving}
          className="lav-button-primary px-6 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? (locale === "ar" ? "جاري الحفظ..." : "Saving...") : t.save}
        </button>
      </div>
    </div>
  );
}
