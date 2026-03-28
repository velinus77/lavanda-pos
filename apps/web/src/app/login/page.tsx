import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import LoginForm from '@/components/LoginForm';

export const metadata: Metadata = {
  title: 'Login - Lavanda POS',
  description: 'Sign in to your Lavanda POS pharmacy management account',
};

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
    // Ignore transient network failures and show login.
  }

  return false;
}

export default async function LoginPage() {
  const isAuthenticated = await checkAuthentication();

  if (isAuthenticated) {
    redirect('/dashboard');
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(135deg,_#effcf6_0%,_#f8fafc_44%,_#ecfeff_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_24%),linear-gradient(180deg,_#020617_0%,_#0f172a_55%,_#111827_100%)]">
      <div className="absolute inset-0 opacity-70 dark:opacity-100" aria-hidden="true">
        <div className="absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.22),_transparent_58%)]" />
        <div className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-emerald-200/40 blur-3xl dark:bg-emerald-500/10" />
        <div className="absolute right-0 top-8 h-96 w-96 rounded-full bg-cyan-200/40 blur-3xl dark:bg-cyan-500/10" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-amber-100/40 blur-3xl dark:bg-amber-400/10" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid w-full items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-[32px] border border-white/70 bg-white/75 p-8 shadow-2xl shadow-emerald-100/60 backdrop-blur xl:p-10 dark:border-white/10 dark:bg-slate-900/60 dark:shadow-black/20">
            <div className="inline-flex items-center gap-3 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              Ready for checkout, stock, and reporting
            </div>

            <div className="mt-8 max-w-xl">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-2xl font-black text-white shadow-lg shadow-emerald-500/25">
                  L
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                    Lavanda POS
                  </p>
                  <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                    Pharmacy operations, one clean workspace.
                  </h1>
                </div>
              </div>

              <p className="mt-6 text-base leading-7 text-slate-600 dark:text-slate-300">
                Run checkout, track stock, manage batches, and keep the front desk moving without turning the screen
                into a spreadsheet graveyard.
              </p>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-slate-200/70 bg-slate-50/90 p-5 dark:border-slate-800 dark:bg-slate-950/40">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                  Front desk
                </p>
                <p className="mt-3 text-lg font-semibold text-slate-900 dark:text-white">Fast checkout</p>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Search products, convert currency, and print receipts without friction.
                </p>
              </div>
              <div className="rounded-3xl border border-slate-200/70 bg-slate-50/90 p-5 dark:border-slate-800 dark:bg-slate-950/40">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                  Inventory
                </p>
                <p className="mt-3 text-lg font-semibold text-slate-900 dark:text-white">Batch-aware stock</p>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Track expiry dates, adjustments, and low-stock risk from one flow.
                </p>
              </div>
              <div className="rounded-3xl border border-slate-200/70 bg-slate-50/90 p-5 dark:border-slate-800 dark:bg-slate-950/40">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                  Controls
                </p>
                <p className="mt-3 text-lg font-semibold text-slate-900 dark:text-white">Role-aware access</p>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Admin, manager, and cashier views stay scoped to the work they need.
                </p>
              </div>
            </div>
          </section>

          <div className="mx-auto w-full max-w-md lg:max-w-none">
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  );
}
