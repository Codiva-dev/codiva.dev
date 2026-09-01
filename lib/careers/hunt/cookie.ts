export const HUNT_COOKIE_NAME = 'codiva_hunt';
export const HUNT_COOKIE_MAX_AGE_SEC = 30 * 24 * 3600;
export const HUNT_SESSION_EVENT = 'codiva-hunt-session';
export const HUNT_PROGRESS_EVENT = 'codiva-hunt-progress';

export function serializeHuntCookie(token: string, hostname: string, secure: boolean): string {
  const parts = [
    `${HUNT_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    `Max-Age=${HUNT_COOKIE_MAX_AGE_SEC}`,
    'SameSite=Lax',
  ];
  const host = hostname.split(':')[0].toLowerCase();
  if (host === 'codiva.dev' || host.endsWith('.codiva.dev')) {
    parts.push('Domain=.codiva.dev', 'Secure');
  } else if (secure) {
    parts.push('Secure');
  }
  return parts.join('; ');
}

export function parseHuntCookieHeader(cookieHeader: string | null | undefined): string {
  if (!cookieHeader) return '';
  for (const part of cookieHeader.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === HUNT_COOKIE_NAME) {
      try {
        return decodeURIComponent(rest.join('=')).trim();
      } catch {
        return rest.join('=').trim();
      }
    }
  }
  return '';
}

export function huntCookieHostname(request: Request): string {
  return (request.headers.get('x-forwarded-host') || request.headers.get('host') || '').split(',')[0].trim();
}

export function huntCookieSecure(request: Request): boolean {
  const proto = (request.headers.get('x-forwarded-proto') || '').split(',')[0].trim().toLowerCase();
  if (proto) return proto === 'https';
  return true;
}
