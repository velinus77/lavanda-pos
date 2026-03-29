"use client";

import React, { useEffect, useCallback } from "react";

interface Translations {
  close: string;
}

const translations: Record<"ar" | "en", Translations> = {
  en: {
    close: "Close",
  },
  ar: {
    close: "إغلاق",
  },
};

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  locale?: "ar" | "en";
  theme?: "light" | "dark";
  closeOnEscape?: boolean;
  closeOnBackdrop?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = "md",
  locale = "en",
  theme = "light",
  closeOnEscape = true,
  closeOnBackdrop = true,
}) => {
  const t = translations[locale];
  const isRTL = locale === "ar";

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === "Escape") {
        onClose();
      }
    },
    [closeOnEscape, onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-[rgba(9,17,29,0.58)] backdrop-blur-[2px] transition-opacity"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />

      <div
        className={`relative w-full ${sizeClasses[size]} rounded-[var(--radius-xl)] border border-[color:color-mix(in_srgb,var(--border)_72%,transparent)] bg-[color:color-mix(in_srgb,var(--card)_94%,transparent)] shadow-[0_30px_80px_rgba(9,17,29,0.28)] transform transition-all`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        dir={isRTL ? "rtl" : "ltr"}
      >
        <div className="flex items-center justify-between border-b border-[color:color-mix(in_srgb,var(--border)_72%,transparent)] p-6">
          <h2
            id="modal-title"
            className="text-xl font-semibold tracking-[-0.03em] text-[var(--foreground)]"
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            className="rounded-[var(--radius-md)] border border-transparent p-2 text-[var(--muted)] transition-colors hover:border-[var(--border)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
            aria-label={t.close}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-6">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-3 border-t border-[color:color-mix(in_srgb,var(--border)_72%,transparent)] p-6">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
