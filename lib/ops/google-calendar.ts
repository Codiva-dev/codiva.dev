import { createHmac, timingSafeEqual } from 'crypto';
import { opsBaseUrl } from '@/lib/ops/host';
import { clampCalendarDuration } from '@/lib/ops/calendar';

export const GOOGLE_CALENDAR_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/calendar.events',
] as const;

const OAUTH_STATE_TTL_MS = 15 * 60 * 1000;
const OAUTH_STATE_COOKIE = 'ops_gcal_oauth';

export function googleCalendarClientId(): string {
  return (process.env.GOOGLE_CALENDAR_CLIENT_ID || '').trim();
}

export function googleCalendarClientSecret(): string {
  return (process.env.GOOGLE_CALENDAR_CLIENT_SECRET || '').trim();
}

export function isGoogleCalendarConfigured(): boolean {
  return Boolean(googleCalendarClientId() && googleCalendarClientSecret());
}

export function googleCalendarRedirectUri(): string {
  const override = (process.env.GOOGLE_CALENDAR_REDIRECT_URI || '').trim();
  if (override) return override;
  return `${opsBaseUrl()}/api/ops/google-calendar/oauth/callback`;
}

function stateSecret(): string {
  return googleCalendarClientSecret() || 'ops-gcal-unconfigured';
}

export function signGoogleOAuthState(staffId: string, now = Date.now()): string {
  const exp = now + OAUTH_STATE_TTL_MS;
  const payload = `${staffId}.${exp}`;
  const sig = createHmac('sha256', stateSecret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyGoogleOAuthState(
  state: string,
  now = Date.now()
): { ok: true; staffId: string } | { ok: false; reason: string } {
  const parts = String(state || '').split('.');
  if (parts.length !== 3) return { ok: false, reason: 'malformed' };
  const [staffId, expRaw, sig] = parts;
  const exp = Number(expRaw);
  if (!staffId || !Number.isFinite(exp)) return { ok: false, reason: 'malformed' };
  if (now > exp) return { ok: false, reason: 'expired' };
  const expected = createHmac('sha256', stateSecret()).update(`${staffId}.${expRaw}`).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, reason: 'bad_sig' };
  return { ok: true, staffId };
}

export function googleOAuthStateCookieName(): string {
  return OAUTH_STATE_COOKIE;
}

export function buildGoogleAuthUrl(state: string): string {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', googleCalendarClientId());
  url.searchParams.set('redirect_uri', googleCalendarRedirectUri());
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', GOOGLE_CALENDAR_SCOPES.join(' '));
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('include_granted_scopes', 'true');
  url.searchParams.set('state', state);
  return url.toString();
}

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
};

export async function exchangeGoogleAuthCode(code: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    code,
    client_id: googleCalendarClientId(),
    client_secret: googleCalendarClientSecret(),
    redirect_uri: googleCalendarRedirectUri(),
    grant_type: 'authorization_code',
  });
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  return (await res.json()) as TokenResponse;
}

export async function refreshGoogleAccessToken(refreshToken: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: googleCalendarClientId(),
    client_secret: googleCalendarClientSecret(),
    grant_type: 'refresh_token',
  });
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  return (await res.json()) as TokenResponse;
}

export async function revokeGoogleToken(token: string): Promise<void> {
  const body = new URLSearchParams({ token });
  await fetch('https://oauth2.googleapis.com/revoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  }).catch(() => undefined);
}

export function parseGoogleIdToken(idToken: string): { sub: string; email: string } | null {
  const parts = idToken.split('.');
  if (parts.length < 2) return null;
  try {
    const json = Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    const payload = JSON.parse(json) as { sub?: string; email?: string };
    const sub = String(payload.sub || '').trim();
    const email = String(payload.email || '').trim().toLowerCase();
    if (!sub || !email) return null;
    return { sub, email };
  } catch {
    return null;
  }
}

export type GoogleCalendarEventInput = {
  title: string;
  description?: string;
  startsAt: string;
  durationMinutes: number;
  location?: string | null;
  meetingUrl?: string | null;
};

/** Body for Google Calendar API events.insert / events.patch. */
export function buildGoogleCalendarEventBody(input: GoogleCalendarEventInput) {
  const start = new Date(input.startsAt);
  const minutes = clampCalendarDuration(input.durationMinutes);
  const end = new Date(start.getTime() + minutes * 60 * 1000);
  const descriptionParts = [input.description?.trim(), input.meetingUrl?.trim()].filter(Boolean);
  return {
    summary: input.title.slice(0, 160),
    description: descriptionParts.length ? descriptionParts.join('\n\n') : undefined,
    location: input.location?.trim() || undefined,
    start: { dateTime: start.toISOString() },
    end: { dateTime: end.toISOString() },
    source: {
      title: 'Codiva Ops',
      url: `${opsBaseUrl()}/calendar`,
    },
  };
}

export async function googleCalendarApi<T>(opts: {
  accessToken: string;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  body?: unknown;
}): Promise<{ ok: true; data: T; status: number } | { ok: false; status: number; error: string }> {
  const res = await fetch(`https://www.googleapis.com/calendar/v3${opts.path}`, {
    method: opts.method,
    headers: {
      Authorization: `Bearer ${opts.accessToken}`,
      ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  if (res.status === 204) return { ok: true, data: undefined as T, status: 204 };
  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = { raw: text };
  }
  if (!res.ok) {
    const err = parsed as { error?: { message?: string } } | null;
    return {
      ok: false,
      status: res.status,
      error: err?.error?.message || text.slice(0, 200) || `HTTP ${res.status}`,
    };
  }
  return { ok: true, data: parsed as T, status: res.status };
}
