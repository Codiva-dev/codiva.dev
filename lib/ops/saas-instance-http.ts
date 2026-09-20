import { throwPublic } from '@/lib/ops/throw-db';

export type InstanceCincelStatus = {
  expiresAt: string | null;
  lastCheckedAt: string | null;
  lastOtpRequestedAt: string | null;
  lastRenewedAt: string | null;
  lastError: string | null;
  hasPendingOtp: boolean;
  source: string;
};

export function instanceApiOrigin(pushUrl: string | null | undefined): string | null {
  const raw = pushUrl?.trim() ?? '';
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

async function ingestSecret(): Promise<string> {
  const secret = process.env.CODIVA_SAAS_INGEST_SECRET?.trim() ?? '';
  if (!secret) return await throwPublic('ops.license.errIngestSecret');
  return secret;
}

export async function callInstanceCincelAuth(
  pushUrl: string | null | undefined,
  init: { method: 'GET' } | { method: 'POST'; action: 'otp_request' | 'otp_exchange' | 'jwt_watch'; code?: string }
): Promise<Response> {
  const origin = instanceApiOrigin(pushUrl);
  if (!origin) return await throwPublic('ops.license.errPushUrl');
  const secret = await ingestSecret();
  const url = `${origin}/api/internal/cincel-auth`;
  try {
    return await fetch(url, {
      method: init.method,
      headers: {
        authorization: `Bearer ${secret}`,
        ...(init.method === 'POST' ? { 'content-type': 'application/json' } : {}),
      },
      body:
        init.method === 'POST'
          ? JSON.stringify({ action: init.action, code: init.code })
          : undefined,
      signal: AbortSignal.timeout(12_000),
      cache: 'no-store',
    });
  } catch (err) {
    console.error('[ops cincel-auth]', err);
    return await throwPublic('ops.license.errInstance');
  }
}

export async function readInstanceCincelStatus(
  pushUrl: string | null | undefined
): Promise<InstanceCincelStatus | null> {
  const origin = instanceApiOrigin(pushUrl);
  const secret = process.env.CODIVA_SAAS_INGEST_SECRET?.trim() ?? '';
  if (!origin || !secret) return null;
  try {
    const res = await fetch(`${origin}/api/internal/cincel-auth`, {
      headers: { authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(8_000),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as InstanceCincelStatus;
  } catch {
    return null;
  }
}
