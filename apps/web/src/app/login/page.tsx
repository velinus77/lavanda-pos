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
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#f2ede4_0%,#f8f5ef_42%,#efe8dd_100%)] dark:bg-[linear-gradient(180deg,#0b121d_0%,#101726_50%,#0d1420_100%)]">
      <div className="absolute inset-x-0 top-0 h-72 bg-[linear-gradient(180deg,rgba(156,122,69,0.14),transparent)] dark:bg-[linear-gradient(180deg,rgba(184,148,90,0.12),transparent)]" aria-hidden="true" />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid w-full items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-[32px] border border-[var(--border)] bg-[rgba(255,253,248,0.92)] p-8 shadow-[0_30px_70px_rgba(15,23,42,0.08)] xl:p-10 dark:bg-[rgba(17,26,39,0.94)] dark:shadow-[0_30px_70px_rgba(0,0,0,0.28)]">
            <div className="inline-flex items-center gap-3 rounded-full border border-[#c8ab76]/35 bg-[#f4ecdf] px-4 py-2 text-sm font-medium text-[#7e6033] dark:bg-[#1b2432] dark:text-[#d2ae71]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#b8945a]" />
              Built for disciplined pharmacy operations
            </div>

            <div className="mt-8 max-w-xl">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-[#c8ab76]/35 bg-[#162133] text-2xl font-extrabold tracking-[0.16em] text-[#d2ae71]">
                  L
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--muted)]">
                    Lavanda POS
                  </p>
                  <h1 className="text-3xl font-semibold tracking-[-0.05em] text-[var(--foreground)] sm:text-4xl">
                    A calmer, sharper control center for pharmacy teams.
                  </h1>
                </div>
              </div>

              <p className="mt-6 text-base leading-7 text-[var(--muted)]">
                Run checkout, track stock, manage batches, and review performance in an interface designed to feel
                trustworthy, composed, and operationally serious.
              </p>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                  Front desk
                </p>
                <p className="mt-3 text-lg font-semibold text-[var(--foreground)]">Fast checkout</p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  Search products, convert currency, and print receipts without friction.
                </p>
              </div>
              <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                  Inventory
                </p>
                <p className="mt-3 text-lg font-semibold text-[var(--foreground)]">Batch-aware stock</p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  Track expiry dates, adjustments, and low-stock risk from one flow.
                </p>
              </div>
              <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                  Controls
                </p>
                <p className="mt-3 text-lg font-semibold text-[var(--foreground)]">Role-aware access</p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
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
