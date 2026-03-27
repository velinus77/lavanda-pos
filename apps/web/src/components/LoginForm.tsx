'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { login, AuthError } from '../lib/auth';

interface LocaleContextType {
  locale: 'ar' | 'en';
  setLocale: (locale: 'ar' | 'en') => void;
}

interface ThemeContextType {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

// Context placeholders - in real app these would come from actual contexts
const LocaleContext = React.createContext<LocaleContextType | null>(null);
const ThemeContext = React.createContext<ThemeContextType | null>(null);

interface Translations {
  title: string;
  subtitle: string;
  emailLabel: string;
  emailPlaceholder: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  loginButton: string;
  loggingIn: string;
  rememberMe: string;
  forgotPassword: string;
  invalidCredentials: string;
  accountLocked: string;
  accountLockedUntil: string;
  networkError: string;
  generalError: string;
  languageSwitch: string;
  darkMode: string;
  lightMode: string;
}

const translations: Record<'ar' | 'en', Translations> = {
  en: {
    title: 'Lavanda POS',
    subtitle: 'Sign in to your account',
    emailLabel: 'Email',
    emailPlaceholder: 'Enter your email',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Enter your password',
    loginButton: 'Sign In',
    loggingIn: 'Signing in...',
    rememberMe: 'Remember me',
    forgotPassword: 'Forgot password?',
    invalidCredentials: 'Invalid email or password',
    accountLocked: 'Account temporarily locked',
    accountLockedUntil: 'Account locked until',
    networkError: 'Network error. Please check your connection.',
    generalError: 'Login failed. Please try again.',
    languageSwitch: 'Language',
    darkMode: 'Dark Mode',
    lightMode: 'Light Mode',
  },
  ar: {
    title: 'لافندا بوينت أوف سيل',
    subtitle: 'تسجيل الدخول إلى حسابك',
    emailLabel: 'البريد الإلكتروني',
    emailPlaceholder: 'أدخل بريدك الإلكتروني',
    passwordLabel: 'كلمة المرور',
    passwordPlaceholder: 'أدخل كلمة المرور',
    loginButton: 'تسجيل الدخول',
    loggingIn: 'جاري تسجيل الدخول...',
    rememberMe: 'تذكرني',
    forgotPassword: 'نسيت كلمة المرور؟',
    invalidCredentials: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
    accountLocked: 'الحساب مقفل مؤقتاً',
    accountLockedUntil: 'الحساب مقفل حتى',
    networkError: 'خطأ في الشبكة. يرجى التحقق من اتصالك.',
    generalError: 'فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.',
    languageSwitch: 'اللغة',
    darkMode: 'الوضع الداكن',
    lightMode: 'الوضع الفاتح',
  },
};

export interface LoginFormProps {
  onLoginSuccess?: (userData: unknown) => void;
  initialLocale?: 'ar' | 'en';
  initialTheme?: 'light' | 'dark';
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onLoginSuccess,
  initialLocale = 'en',
  initialTheme = 'light',
}) => {
  const router = useRouter();
  const [locale, setLocale] = useState<'ar' | 'en'>(initialLocale);
  const [theme, setTheme] = useState<'light' | 'dark'>(initialTheme);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);
  const [rememberMe, setRememberMe] = useState(false);

  const t = translations[locale];
  const isRTL = locale === 'ar';

  // Apply theme class to document
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    root.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
    root.setAttribute('lang', locale);
  }, [theme, locale, isRTL]);

  const validateForm = (): boolean => {
    if (!email.trim()) {
      setError({
        message: locale === 'ar' ? 'البريد الإلكتروني مطلوب' : 'Email is required',
        code: 'unknown',
      });
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError({
        message: locale === 'ar' ? 'صيغة البريد الإلكتروني غير صحيحة' : 'Invalid email format',
        code: 'unknown',
      });
      return false;
    }
    
    if (!password) {
      setError({
        message: locale === 'ar' ? 'كلمة المرور مطلوبة' : 'Password is required',
        code: 'unknown',
      });
      return false;
    }
    
    if (password.length < 6) {
      setError({
        message: locale === 'ar' ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters',
        code: 'unknown',
      });
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      const result = await login({ email, password });
      
      if ('code' in result) {
        // AuthError returned
        setError(result);
      } else {
        // AuthResponse returned - login successful
        if (onLoginSuccess) {
          onLoginSuccess(result.user);
        } else {
          router.push('/dashboard');
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      setError({
        message: t.networkError,
        code: 'network_error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleLocale = () => {
    setLocale(prev => prev === 'ar' ? 'en' : 'ar');
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const getErrorMessage = (err: AuthError): string => {
    switch (err.code) {
      case 'invalid_credentials':
        return t.invalidCredentials;
      case 'account_locked':
        if (err.lockUntil) {
          const lockTime = new Date(err.lockUntil).toLocaleTimeString(locale === 'ar' ? 'ar-EG' : 'en-US');
          return `${t.accountLockedUntil} ${lockTime}`;
        }
        return t.accountLocked;
      case 'network_error':
        return t.networkError;
      default:
        return t.generalError;
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 ${
      theme === 'dark' 
        ? 'bg-gray-900' 
        : 'bg-gradient-to-br from-purple-50 to-blue-50'
    }`}>
      <div className={`w-full max-w-md p-8 rounded-2xl shadow-xl transition-all duration-300 ${
        theme === 'dark'
          ? 'bg-gray-800 shadow-gray-900/50'
          : 'bg-white shadow-purple-200/50'
      }`}>
        {/* Header controls */}
        <div className="flex justify-between items-center mb-6">
          {/* Language Toggle */}
          <button
            type="button"
            onClick={toggleLocale}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              theme === 'dark'
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            aria-label={t.languageSwitch}
          >
            <span>{locale === 'ar' ? 'العربية' : 'English'}</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </button>
          
          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              theme === 'dark'
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            aria-label={theme === 'dark' ? t.lightMode : t.darkMode}
          >
            {theme === 'dark' ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
            <span>{theme === 'dark' ? t.lightMode : t.darkMode}</span>
          </button>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className={`text-3xl font-bold mb-2 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            {t.title}
          </h1>
          <p className={
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }>
            {t.subtitle}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className={`mb-6 p-4 rounded-lg border transition-all ${
            theme === 'dark'
              ? 'bg-red-900/20 border-red-800 text-red-300'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-medium">{getErrorMessage(error)}</p>
                {error.code === 'account_locked' && error.lockUntil && (
                  <p className="text-sm mt-1 opacity-80">
                    {locale === 'ar' ? 'سيتم فتح الحساب تلقائياً بعد هذا الوقت' : 'Your account will be automatically unlocked after this time'}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Field */}
          <div>
            <label 
              htmlFor="email" 
              className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}
            >
              {t.emailLabel}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              placeholder={t.emailPlaceholder}
              className={`w-full px-4 py-3 rounded-lg border transition-all outline-none ${
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
              } ${
                error && !email ? 'border-red-500' : ''
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              autoComplete="email"
            />
          </div>

          {/* Password Field */}
          <div>
            <label 
              htmlFor="password" 
              className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}
            >
              {t.passwordLabel}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              placeholder={t.passwordPlaceholder}
              className={`w-full px-4 py-3 rounded-lg border transition-all outline-none ${
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
              } ${
                error && !password ? 'border-red-500' : ''
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              autoComplete="current-password"
            />
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={isLoading}
                className={`w-4 h-4 rounded border transition-colors ${
                  theme === 'dark'
                    ? 'border-gray-600 bg-gray-700 text-purple-500 focus:ring-purple-500/20'
                    : 'border-gray-300 bg-white text-purple-600 focus:ring-purple-500/20'
                } disabled:opacity-50`}
              />
              <span className={`text-sm ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {t.rememberMe}
              </span>
            </label>
            <button
              type="button"
              className={`text-sm font-medium transition-colors ${
                theme === 'dark'
                  ? 'text-purple-400 hover:text-purple-300'
                  : 'text-purple-600 hover:text-purple-700'
              }`}
            >
              {t.forgotPassword}
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all transform ${
              isLoading
                ? 'bg-purple-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl'
            }`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {t.loggingIn}
              </span>
            ) : (
              t.loginButton
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginForm;
