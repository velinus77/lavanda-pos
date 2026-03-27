import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/contexts/ThemeProvider';
import { LocaleProvider } from '@/contexts/LocaleProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Lavanda POS - Pharmacy Management System',
  description: 'Modern pharmacy point of sale and inventory management system',
};

/**
 * Root Layout Component
 * 
 * Provides:
 * - ThemeProvider: Persists dark/light mode preference via localStorage
 *   - Hook: useTheme() reads from localStorage key 'lavanda_theme'
 *   - Defaults to 'light', persists across sessions
 *   - Applies 'dark' class to documentElement for Tailwind dark mode
 * 
 * - LocaleProvider: Persists language preference (AR/EN) via localStorage
 *   - Hook: useLocale() reads from localStorage key 'lavanda_locale'
 *   - Defaults to 'en', persists across sessions
 *   - Sets document lang attribute and triggers RTL layout
 * 
 * - RTL Support: Arabic (ar) locale automatically enables right-to-left layout
 *   - LoginForm handles dir="rtl" on documentElement when locale is 'ar'
 *   - Tailwind's RTL modifiers work automatically
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <LocaleProvider>
            {children}
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
