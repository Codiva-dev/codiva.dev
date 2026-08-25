import {
  interviewsBaseUrl,
  isInterviewsHost,
  isPortalHost,
  opsBaseUrl,
  portalBaseUrl,
} from '@/lib/ops/host';
import { safeInternalPath } from '@/lib/ops/safe-path';

export function opsAuthCallbackUrl(next = '/dashboard'): string {
  const safeNext = safeInternalPath(next, '/dashboard');
  return `${opsBaseUrl()}/auth/callback?next=${encodeURIComponent(safeNext)}`;
}

export function portalAuthCallbackUrl(slug: string, next = `/p/${slug}`): string {
  const fallback = `/p/${slug}`;
  const safeNext = safeInternalPath(next, fallback);
  return `${portalBaseUrl()}/auth/callback?next=${encodeURIComponent(safeNext)}`;
}

/** Callback Auth en host portal sin slug (hub / reset global). */
export function portalHubAuthCallbackUrl(next = '/proyectos'): string {
  const safeNext = safeInternalPath(next, '/proyectos');
  return `${portalBaseUrl()}/auth/callback?next=${encodeURIComponent(safeNext)}`;
}

export function interviewsAuthCallbackUrl(next = '/'): string {
  const safeNext = safeInternalPath(next, '/');
  return `${interviewsBaseUrl()}/auth/callback?next=${encodeURIComponent(safeNext)}`;
}

/**
 * Enlace de recuperación para PKCE/SSR: el token va en query, no en el
 * action_link implícito de GoTrue (hash que el Route Handler no ve).
 */
export function withRecoveryOtpParams(callbackUrl: string, hashedToken: string): string {
  const url = new URL(callbackUrl);
  url.searchParams.set('token_hash', hashedToken);
  url.searchParams.set('type', 'recovery');
  return url.toString();
}

export function authCallbackFailureUrl(host: string | null, next: string): string {
  if (next.startsWith('/p/')) {
    const slug = next.split('/')[2] || '';
    if (slug) return `${portalBaseUrl()}/p/${slug}/login?error=auth`;
  }
  if (isPortalHost(host)) return `${portalBaseUrl()}/login?error=auth`;
  if (isInterviewsHost(host)) return `${interviewsBaseUrl()}/login?error=auth`;
  return `${opsBaseUrl()}/login?error=auth`;
}

export function authCallbackSuccessUrl(host: string | null, next: string): string {
  if (isInterviewsHost(host)) return `${interviewsBaseUrl()}${next}`;
  if (isPortalHost(host)) return `${portalBaseUrl()}${next}`;
  return `${opsBaseUrl()}${next}`;
}

export function authCallbackFallbackPath(host: string | null): string {
  if (isInterviewsHost(host)) return '/';
  if (isPortalHost(host)) return '/proyectos';
  return '/dashboard';
}
