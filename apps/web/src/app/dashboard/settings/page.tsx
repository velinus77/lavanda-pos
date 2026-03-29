"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SettingsManager } from "@/components/admin/SettingsManager";
import { getCachedUser } from "@/lib/auth";
import { useTheme } from "@/contexts/ThemeProvider";
import { useLocale } from "@/contexts/LocaleProvider";

export default function SettingsPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const { locale } = useLocale();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const user = getCachedUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    if (user.role !== "admin") {
      router.replace("/dashboard");
      return;
    }

    setIsAuthorized(true);
    setIsLoading(false);
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[var(--action)] border-t-transparent" />
          <p className="text-sm text-[var(--muted)]">
            {locale === "ar" ? "جاري التحميل..." : "Loading..."}
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  const t =
    locale === "ar"
      ? {
          home: "الرئيسية",
          overline: "تشغيل النظام",
          title: "الإعدادات",
          subtitle:
            "اضبط تفضيلات الصيدلية واللغة والضرائب وقواعد المخزون من مساحة تشغيل أوضح وأكثر هدوءًا.",
        }
      : {
          home: "Home",
          overline: "System operations",
          title: "Settings",
          subtitle:
            "Manage pharmacy preferences, localization, tax defaults, and inventory rules from one calmer control surface.",
        };

  return (
    <div className="lav-page">
      <div className="lav-page-hero">
        <nav className="mb-4 text-sm text-[var(--muted)]" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 rtl:flex-row-reverse">
            <li>
              <a href="/dashboard" className="transition-colors hover:text-[var(--foreground)]">
                {t.home}
              </a>
            </li>
            <li className="text-[var(--accent)]">/</li>
            <li className="font-medium text-[var(--foreground)]">{t.title}</li>
          </ol>
        </nav>
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
          {t.overline}
        </p>
        <h1 className="mt-2 text-[30px] font-semibold tracking-[-0.04em] text-[var(--foreground)]">
          {t.title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">{t.subtitle}</p>
      </div>

      <SettingsManager locale={locale} theme={theme} />
    </div>
  );
}
