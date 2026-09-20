/**
 * HS256 compact JWT for NIRC instance entitlements.
 * Must stay byte-compatible with packages/domain instance-license.ts in the nirc repo.
 */

export const LICENSE_ISSUER = 'codiva.ops';
export const LICENSE_AUDIENCE = 'nirc.instance';
export const LICENSE_STATUSES = ['active', 'grace', 'locked'] as const;
export type LicenseStatus = (typeof LICENSE_STATUSES)[number];
export const LICENSE_MODULES = ['cincel', 'idse', 'stp'] as const;
export type LicenseModule = (typeof LICENSE_MODULES)[number];
export const USAGE_METERS = ['contract_signed', 'imss_alta', 'payout', 'c_doc'] as const;
export type UsageMeter = (typeof USAGE_METERS)[number];

export type InstanceLicenseClaims = {
  iss: typeof LICENSE_ISSUER;
  aud: typeof LICENSE_AUDIENCE;
  sub: string;
  status: LicenseStatus;
  modules: LicenseModule[];
  periodStart: string;
  periodEnd: string;
  graceUntil: string | null;
  iat: number;
  exp: number;
};

const JWT_HEADER = b64UrlUtf8(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));

function b64UrlUtf8(value: string): string {
  return bytesToB64Url(new TextEncoder().encode(value));
}

function bytesToB64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const byte of bytes) bin += String.fromCharCode(byte);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function b64UrlToBytes(value: string): Uint8Array {
  const pad = value.length % 4 === 0 ? '' : '='.repeat(4 - (value.length % 4));
  const b64 = value.replace(/-/g, '+').replace(/_/g, '/') + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function timingSafeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i++) diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  return diff === 0;
}

async function hmacSha256(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return new Uint8Array(sig);
}

export function isLicenseStatus(value: unknown): value is LicenseStatus {
  return typeof value === 'string' && (LICENSE_STATUSES as readonly string[]).includes(value);
}

export function isLicenseModule(value: unknown): value is LicenseModule {
  return typeof value === 'string' && (LICENSE_MODULES as readonly string[]).includes(value);
}

export function isUsageMeter(value: unknown): value is UsageMeter {
  return typeof value === 'string' && (USAGE_METERS as readonly string[]).includes(value);
}

export function parseLicenseModules(raw: unknown): LicenseModule[] {
  if (!Array.isArray(raw)) return [...LICENSE_MODULES];
  const picked = raw.filter(isLicenseModule);
  return picked.length > 0 ? [...new Set(picked)] : [...LICENSE_MODULES];
}

export async function signInstanceLicense(
  claims: {
    sub: string;
    status: LicenseStatus;
    modules: LicenseModule[];
    periodStart: string;
    periodEnd: string;
    graceUntil: string | null;
    iat?: number;
    exp?: number;
  },
  secret: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: InstanceLicenseClaims = {
    iss: LICENSE_ISSUER,
    aud: LICENSE_AUDIENCE,
    sub: claims.sub,
    status: claims.status,
    modules: parseLicenseModules(claims.modules),
    periodStart: claims.periodStart,
    periodEnd: claims.periodEnd,
    graceUntil: claims.graceUntil,
    iat: claims.iat ?? now,
    exp: claims.exp ?? licenseJwtExpUnix(claims.periodEnd, claims.graceUntil, claims.iat ?? now),
  };
  const body = `${JWT_HEADER}.${b64UrlUtf8(JSON.stringify(payload))}`;
  const sig = await hmacSha256(secret, body);
  return `${body}.${bytesToB64Url(sig)}`;
}

export async function verifyInstanceLicense(
  token: string | null | undefined,
  secret: string | null | undefined
): Promise<InstanceLicenseClaims | null> {
  const raw = token?.trim() ?? '';
  const key = secret?.trim() ?? '';
  if (!raw || !key) return null;
  const parts = raw.split('.');
  if (parts.length !== 3 || parts[0] !== JWT_HEADER) return null;
  const [header, payload, signature] = parts;
  const expected = await hmacSha256(key, `${header}.${payload}`);
  const given = b64UrlToBytes(signature ?? '');
  if (!timingSafeEqual(expected, given)) return null;
  try {
    const json = JSON.parse(new TextDecoder().decode(b64UrlToBytes(payload ?? ''))) as InstanceLicenseClaims;
    if (json.iss !== LICENSE_ISSUER || json.aud !== LICENSE_AUDIENCE) return null;
    if (!isLicenseStatus(json.status)) return null;
    return json;
  } catch {
    return null;
  }
}

export type SaasChargeHint = {
  kind: string;
  status: string;
  due_date: string | null;
  notice_days: number | null;
};

export function deriveSaasStatusFromCharges(
  charges: SaasChargeHint[],
  now = new Date()
): LicenseStatus {
  const unpaid = charges.filter(
    (row) =>
      (row.kind === 'saas_monthly' || row.kind === 'saas_usage') &&
      (row.status === 'pending' || row.status === 'overdue') &&
      Boolean(row.due_date)
  );
  if (unpaid.length === 0) return 'active';
  const today = now.toISOString().slice(0, 10);
  let worst: LicenseStatus = 'active';
  for (const row of unpaid) {
    const due = row.due_date;
    if (!due) continue;
    const notice = Number.isFinite(Number(row.notice_days)) ? Number(row.notice_days) : 30;
    const lockDate = addDays(due, notice);
    if (today >= lockDate) worst = 'locked';
    else if (today >= due && worst !== 'locked') worst = 'grace';
  }
  return worst;
}

/** Civil date YYYY-MM-DD → ISO. End-of-day so the last day of the period stays valid. */
export function licensePeriodIso(ymd: string | null | undefined, bound: 'start' | 'end'): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(ymd || '').trim());
  if (!match) {
    const fallback = bound === 'end' ? Date.now() + 365 * 24 * 60 * 60 * 1000 : Date.now();
    return new Date(fallback).toISOString();
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (bound === 'start') return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0)).toISOString();
  return new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999)).toISOString();
}

export function annualLicensePeriodUtc(now = new Date()): { start: string; end: string } {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear() + 1, now.getUTCMonth() + 1, 0));
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

/** JWT exp follows the commercial period so a 1-year license is not cut at 45 days. */
export function licenseJwtExpUnix(
  periodEnd: string,
  graceUntil: string | null,
  nowSec = Math.floor(Date.now() / 1000)
): number {
  const timestamps = [periodEnd, graceUntil]
    .filter((value): value is string => Boolean(value))
    .map((value) => Date.parse(value))
    .filter((value) => Number.isFinite(value));
  const latest = timestamps.reduce((max, value) => Math.max(max, value), 0);
  const endSec = latest > 0 ? Math.floor(latest / 1000) : nowSec;
  return Math.max(endSec, nowSec + 14 * 24 * 60 * 60);
}

export function licenseAttentionAt(row: {
  status: string;
  graceUntil?: string | null;
  periodEnd?: string | null;
  updatedAt: string;
}): string {
  if (row.status === 'grace' || row.status === 'locked') return row.updatedAt;
  return row.graceUntil || row.periodEnd || row.updatedAt;
}

function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const utc = new Date(Date.UTC(y || 1970, (m || 1) - 1, (d || 1) + days));
  return utc.toISOString().slice(0, 10);
}

export function periodLabelFromIso(iso: string): string {
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed)) return new Date().toISOString().slice(0, 7);
  return new Date(parsed).toISOString().slice(0, 7);
}

export const VENDOR_JWT_LEAD_MS = 7 * 24 * 60 * 60 * 1000;

export function vendorSlotIsDue(expiresAt: string | null | undefined, now = Date.now()): boolean {
  if (!expiresAt) return false;
  const t = Date.parse(expiresAt);
  return Number.isFinite(t) && t - now <= VENDOR_JWT_LEAD_MS;
}
