'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { login, AuthError } from '../lib/auth';

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
  emailRequired: string;
  passwordRequired: string;
  passwordTooShort: string;
  unlockHint: string;
  arabicLabel: string;
}

const translations: Record<'ar' | 'en', Translations> = {
  en: {
    title: 'Lavanda POS',
    subtitle: 'Sign in to your account',
    emailLabel: 'Email or Username',
    emailPlaceholder: 'Enter your email or username',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Enter your password',
    loginButton: 'Sign In',
    loggingIn: 'Signing in...',
    rememberMe: 'Remember me',
    forgotPassword: 'Forgot password?',
    invalidCredentials: 'Invalid email/username or password',
    accountLocked: 'Account temporarily locked',
    accountLockedUntil: 'Account locked until',
    networkError: 'Network error. Please check your connection.',
    generalError: 'Login failed. Please try again.',
    languageSwitch: 'Language',
    darkMode: 'Dark Mode',
    lightMode: 'Light Mode',
    emailRequired: 'Email or username is required',
    passwordRequired: 'Password is required',
    passwordTooShort: 'Password must be at least 6 characters',
    unlockHint: 'Your account will be automatically unlocked after this time',
    arabicLabel: 'English',
  },
  ar: {
    title: '\u0644\u0627\u0641\u0646\u062f\u0627 \u0628\u0648\u064a\u0646\u062a \u0623\u0648\u0641 \u0633\u064a\u0644',
    subtitle: '\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u0625\u0644\u0649 \u062d\u0633\u0627\u0628\u0643',
    emailLabel: '\u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a \u0623\u0648 \u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645',
    emailPlaceholder:
      '\u0623\u062f\u062e\u0644 \u0628\u0631\u064a\u062f\u0643 \u0623\u0648 \u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645',
    passwordLabel: '\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631',
    passwordPlaceholder: '\u0623\u062f\u062e\u0644 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631',
    loginButton: '\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644',
    loggingIn: '\u062c\u0627\u0631\u064a \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644...',
    rememberMe: '\u062a\u0630\u0643\u0631\u0646\u064a',
    forgotPassword: '\u0646\u0633\u064a\u062a \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631\u061f',
    invalidCredentials:
      '\u0627\u0644\u0628\u0631\u064a\u062f \u0623\u0648 \u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645 \u0623\u0648 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u063a\u064a\u0631 \u0635\u062d\u064a\u062d\u0629',
    accountLocked: '\u0627\u0644\u062d\u0633\u0627\u0628 \u0645\u0642\u0641\u0644 \u0645\u0624\u0642\u062a\u0627\u064b',
    accountLockedUntil: '\u0627\u0644\u062d\u0633\u0627\u0628 \u0645\u0642\u0641\u0644 \u062d\u062a\u0649',
    networkError: '\u062e\u0637\u0623 \u0641\u064a \u0627\u0644\u0634\u0628\u0643\u0629. \u064a\u0631\u062c\u0649 \u0627\u0644\u062a\u062d\u0642\u0642 \u0645\u0646 \u0627\u062a\u0635\u0627\u0644\u0643.',
    generalError:
      '\u0641\u0634\u0644 \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644. \u064a\u0631\u062c\u0649 \u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649.',
    languageSwitch: '\u0627\u0644\u0644\u063a\u0629',
    darkMode: '\u0627\u0644\u0648\u0636\u0639 \u0627\u0644\u062f\u0627\u0643\u0646',
    lightMode: '\u0627\u0644\u0648\u0636\u0639 \u0627\u0644\u0641\u0627\u062a\u062d',
    emailRequired:
      '\u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a \u0623\u0648 \u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645 \u0645\u0637\u0644\u0648\u0628',
    passwordRequired: '\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0645\u0637\u0644\u0648\u0628\u0629',
    passwordTooShort:
      '\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u064a\u062c\u0628 \u0623\u0646 \u062a\u0643\u0648\u0646 6 \u0623\u062d\u0631\u0641 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644',
    unlockHint:
      '\u0633\u064a\u062a\u0645 \u0641\u062a\u062d \u0627\u0644\u062d\u0633\u0627\u0628 \u062a\u0644\u0642\u0627\u0626\u064a\u0627\u064b \u0628\u0639\u062f \u0647\u0630\u0627 \u0627\u0644\u0648\u0642\u062a',
    arabicLabel: '\u0627\u0644\u0639\u0631\u0628\u064a\u0629',
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
      setError({ message: t.emailRequired, code: 'unknown' });
      return false;
    }

    if (!password) {
      setError({ message: t.passwordRequired, code: 'unknown' });
      return false;
    }

    if (password.length < 6) {
      setError({ message: t.passwordTooShort, code: 'unknown' });
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
        setError(result);
      } else if (onLoginSuccess) {
        onLoginSuccess(result.user);
      } else {
        router.refresh();
        router.push('/dashboard');
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
    setLocale((prev) => (prev === 'ar' ? 'en' : 'ar'));
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const getErrorMessage = (authError: AuthError): string => {
    switch (authError.code) {
      case 'invalid_credentials':
        return t.invalidCredentials;
      case 'account_locked':
        if (authError.lockUntil) {
          const lockTime = new Date(authError.lockUntil).toLocaleTimeString(
            locale === 'ar' ? 'ar-EG' : 'en-US'
          );
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
    <div className="flex items-center justify-center p-1 transition-colors duration-300">
      <div
        className={`w-full max-w-md rounded-[28px] border p-8 shadow-2xl transition-all duration-300 ${
          theme === 'dark'
            ? 'border-white/10 bg-slate-900/85 shadow-black/25'
            : 'border-white/70 bg-white/90 shadow-emerald-100/70'
        }`}
      >
        <div className="flex justify-between items-center mb-6">
          <button
            type="button"
            onClick={toggleLocale}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              theme === 'dark'
                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
            aria-label={t.languageSwitch}
          >
            <span>{locale === 'ar' ? t.arabicLabel : 'English'}</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
              />
            </svg>
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              theme === 'dark'
                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
            aria-label={theme === 'dark' ? t.lightMode : t.darkMode}
          >
            {theme === 'dark' ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
              </svg>
            )}
            <span>{theme === 'dark' ? t.lightMode : t.darkMode}</span>
          </button>
        </div>

        <div className="text-center mb-8">
          <h1 className={`text-3xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {t.title}
          </h1>
          <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>{t.subtitle}</p>
        </div>

        {error && (
          <div
            className={`mb-6 p-4 rounded-lg border transition-all ${
              theme === 'dark'
                ? 'bg-red-900/20 border-red-800 text-red-300'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <p className="font-medium">{getErrorMessage(error)}</p>
                {error.code === 'account_locked' && error.lockUntil && (
                  <p className="text-sm mt-1 opacity-80">{t.unlockHint}</p>
                )}
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
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
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              placeholder={t.emailPlaceholder}
              className={`w-full px-4 py-3 rounded-lg border transition-all outline-none ${
                theme === 'dark'
                  ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20'
                  : 'bg-white border-slate-300 text-gray-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
              } ${error && !email ? 'border-red-500' : ''} disabled:opacity-50 disabled:cursor-not-allowed`}
              autoComplete="username"
            />
          </div>

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
                  ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20'
                  : 'bg-white border-slate-300 text-gray-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
              } ${error && !password ? 'border-red-500' : ''} disabled:opacity-50 disabled:cursor-not-allowed`}
              autoComplete="current-password"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={isLoading}
                className={`w-4 h-4 rounded border transition-colors ${
                  theme === 'dark'
                    ? 'border-slate-600 bg-slate-800 text-emerald-400 focus:ring-emerald-500/20'
                    : 'border-slate-300 bg-white text-emerald-600 focus:ring-emerald-500/20'
                } disabled:opacity-50`}
              />
              <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {t.rememberMe}
              </span>
            </label>
            <button
              type="button"
              className={`text-sm font-medium transition-colors ${
                theme === 'dark'
                  ? 'text-emerald-400 hover:text-emerald-300'
                  : 'text-emerald-700 hover:text-emerald-800'
              }`}
            >
              {t.forgotPassword}
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all transform ${
              isLoading
                ? 'bg-emerald-300 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-emerald-500/20 hover:shadow-xl'
            }`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
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
