import { resolveSurface } from '@/lib/ops/host';

/** Surfaces that keep a Supabase cookie in sync via middleware getUser(). */
export function needsAuthSessionRefresh(host: string | null, pathname: string): boolean {
  if (pathname.startsWith('/api') || pathname.startsWith('/_next')) return true;
  const surface = resolveSurface(host);
  if (surface === 'ops' || surface === 'portal' || surface === 'interviews') return true;
  return (
    pathname.startsWith('/ops') ||
    pathname.startsWith('/p/') ||
    pathname.startsWith('/portal') ||
    pathname.startsWith('/entrevistas') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password')
  );
}

export function isSupabaseAnonConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
