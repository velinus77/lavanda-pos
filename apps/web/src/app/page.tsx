import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

async function hasRefreshSession(): Promise<boolean> {
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

    return response.ok;
  } catch {
    return false;
  }
}

export default async function HomePage() {
  const authenticated = await hasRefreshSession();
  redirect(authenticated ? '/dashboard' : '/login');
}
