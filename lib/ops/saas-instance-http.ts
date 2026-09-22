import { throwPublic } from '@/lib/ops/throw-db';
import { safeOutboundOrigin } from '@/lib/ops/safe-outbound-url';

export type InstanceCincelStatus = {
  expiresAt: string | null;
  lastCheckedAt: string | null;
  lastOtpRequestedAt: string | null;
  lastRenewedAt: string | null;
  lastError: string | null;
  hasPendingOtp: boolean;
  hasPat: boolean;
  source: string;
};

export type CincelAuthPostAction = 'set_pat' | 'clear_pat';

export function instanceApiOrigin(pushUrl: string | null | undefined): string | null {
  return safeOutboundOrigin(pushUrl);
}

function outboundAuthorization(licenseToken?: string | null): string | null {
  if (process.env.CODIVA_SAAS_PUSH_USE_INGEST_BEARER === '1') {
    const secret = process.env.CODIVA_SAAS_INGEST_SECRET?.trim() ?? '';
    return secret ? `Bearer ${secret}` : null;
  }
  const token = licenseToken?.trim() ?? '';
  return token ? `Bearer ${token}` : null;
}

export async function callInstanceCincelAuth(
  pushUrl: string | null | undefined,
  init: { method: 'GET' } | { method: 'POST'; action: CincelAuthPostAction; pat?: string },
  licenseToken?: string | null
): Promise<Response> {
  const origin = instanceApiOrigin(pushUrl);
  if (!origin) return await throwPublic('ops.license.errPushUrl');
  const authorization = outboundAuthorization(licenseToken);
  if (!authorization) return await throwPublic('ops.license.errSecret');
  const url = `${origin}/api/internal/cincel-auth`;
  try {
    return await fetch(url, {
      method: init.method,
      headers: {
        authorization,
        ...(init.method === 'POST' ? { 'content-type': 'application/json' } : {}),
      },
      body:
        init.method === 'POST'
          ? JSON.stringify(
              init.action === 'set_pat'
                ? { action: init.action, pat: init.pat ?? '' }
                : { action: init.action }
            )
          : undefined,
      redirect: 'error',
      signal: AbortSignal.timeout(12_000),
      cache: 'no-store',
    });
  } catch (err) {
    console.error('[ops cincel-auth]', err);
    return await throwPublic('ops.license.errInstance');
  }
}

export async function readInstanceCincelStatus(
  pushUrl: string | null | undefined,
  licenseToken?: string | null
): Promise<InstanceCincelStatus | null> {
  const origin = instanceApiOrigin(pushUrl);
  const authorization = outboundAuthorization(licenseToken);
  if (!origin || !authorization) return null;
  try {
    const res = await fetch(`${origin}/api/internal/cincel-auth`, {
      headers: { authorization },
      redirect: 'error',
      signal: AbortSignal.timeout(8_000),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as InstanceCincelStatus;
  } catch {
    return null;
  }
}
