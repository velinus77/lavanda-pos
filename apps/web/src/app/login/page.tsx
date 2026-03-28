import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import LoginForm from '@/components/LoginForm';

export const metadata: Metadata = {
  title: 'Login - Lavanda POS',
  description: 'Sign in to your Lavanda POS pharmacy management account',
};

/**
 * Check if user is already authenticated via refresh token cookie
 * If authenticated, redirect to dashboard
 */
async function checkAuthentication(): Promise<boolean> {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get('refreshToken');

  if (!refreshToken?.value) {
    return false;
  }

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/refresh`,
      {
        method: 'POST',
        cache: 'no-store',
        headers: {
          Cookie: `refreshToken=${refreshToken.value}`,
        },
      }
    );

    if (response.ok) {
      return true;
    }
  } catch {
    // Network error - allow login page to show
  }

  return false;
}

/**
 * Login Page Component
 * - Server Component: checks auth cookie server-side and redirects if already logged in
 * - Renders LoginForm (client component) which handles its own navigation on success
 */
export default async function LoginPage() {
  // Check authentication server-side
  const isAuthenticated = await checkAuthentication();

  if (isAuthenticated) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Decorative background blobs */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 dark:opacity-10 animate-blob" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 dark:opacity-10 animate-blob animation-delay-2000" />
        <div className="absolute top-40 left-40 w-80 h-80 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 dark:opacity-10 animate-blob animation-delay-4000" />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4">
        {/* Logo and branding */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 mb-4 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 shadow-lg shadow-purple-500/30">
            <svg
              className="w-12 h-12 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Lavanda POS
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Pharmacy Management System
          </p>
        </div>

        {/* Login form container — LoginForm is a Client Component and handles its own redirect */}
        <div className="w-full max-w-md">
          <LoginForm />
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            &copy; 2026 Lavanda POS. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
