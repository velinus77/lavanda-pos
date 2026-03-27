'use client';

import React, { useEffect, useCallback } from 'react';

interface Translations {
  close: string;
}

const translations: Record<'ar' | 'en', Translations> = {
  en: {
    close: 'Close',
  },
  ar: {
    close: 'إغلاق',
  },
};

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  locale?: 'ar' | 'en';
  theme?: 'light' | 'dark';
  closeOnEscape?: boolean;
  closeOnBackdrop?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  locale = 'en',
  theme = 'light',
  closeOnEscape = true,
  closeOnBackdrop = true,
}) => {
  const t = translations[locale];
  const isRTL = locale === 'ar';

  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (closeOnEscape && e.key === 'Escape') {
      onClose();
    }
  }, [closeOnEscape, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className={`fixed inset-0 transition-opacity ${
          theme === 'dark' 
            ? 'bg-black/60' 
            : 'bg-gray-900/50'
        }`}
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />
      
      {/* Modal Content */}
      <div
        className={`relative w-full ${sizeClasses[size]} rounded-2xl shadow-2xl transform transition-all ${
          theme === 'dark'
            ? 'bg-gray-800 shadow-gray-900/50'
            : 'bg-white shadow-gray-300/50'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${
          theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <h2
            id="modal-title"
            className={`text-xl font-bold ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              theme === 'dark'
                ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-300'
                : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
            }`}
            aria-label={t.close}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Body */}
        <div className="p-6">
          {children}
        </div>
        
        {/* Footer */}
        {footer && (
          <div className={`flex items-center justify-end gap-3 p-6 border-t ${
            theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
          }`}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;

