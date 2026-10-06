import { NextResponse } from 'next/server';
import { requestAuditFromHeaders } from '@/lib/ops/request-audit';

export type RateBucket = { count: number; resetAt: number };

export type RateLimitOk = { ok: true; remaining: number };
export type RateLimitBlocked = { ok: false; retryAfterMs: number };
export type RateLimitResult = RateLimitOk | RateLimitBlocked;

const memoryBuckets = new Map<string, RateBucket>();

function pruneRateBuckets(store: Map<string, RateBucket>, now: number) {
  if (store.size < 5000) return;
  for (const [k, v] of store) {
    if (v.resetAt < now) store.delete(k);
  }
}

/** Algoritmo puro: tests y fallback local cuando no hay cache compartida. */
export function consumeRateLimitMemory(
  store: Map<string, RateBucket>,
  key: string,
  windowMs: number,
  max: number,
  now = Date.now()
): RateLimitResult {
  pruneRateBuckets(store, now);
  let bucket = store.get(key);
  if (!bucket || bucket.resetAt < now) {
    bucket = { count: 0, resetAt: now + windowMs };
    store.set(key, bucket);
  }
  bucket.count += 1;
  if (bucket.count <= max) return { ok: true, remaining: max - bucket.count };
  return { ok: false, retryAfterMs: Math.max(0, bucket.resetAt - now) };
}

async function consumeRateLimitShared(
  key: string,
  windowMs: number,
  max: number,
  now: number
): Promise<RateLimitResult | null> {
  if (!process.env.VERCEL) return null;
  try {
    const { getCache } = await import('@vercel/functions');
    const cache = getCache({ namespace: 'rl' });
    const existing = (await cache.get(key)) as RateBucket | null;
    const bucket: RateBucket =
      existing && existing.resetAt >= now
        ? { count: existing.count + 1, resetAt: existing.resetAt }
        : { count: 1, resetAt: now + windowMs };
    const ttl = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    await cache.set(key, bucket, { ttl, name: 'rate-limit' });
    if (bucket.count <= max) return { ok: true, remaining: max - bucket.count };
    return { ok: false, retryAfterMs: Math.max(0, bucket.resetAt - now) };
  } catch {
    return null;
  }
}

export async function consumeRateLimit(
  key: string,
  windowMs: number,
  max: number
): Promise<RateLimitResult> {
  const now = Date.now();
  const shared = await consumeRateLimitShared(key, windowMs, max, now);
  if (shared) return shared;
  return consumeRateLimitMemory(memoryBuckets, key, windowMs, max, now);
}

export function clientIpFromRequest(request: Request): string {
  return requestAuditFromHeaders(request.headers).ip || 'unknown';
}

export async function consumeIpRateLimit(
  request: Request,
  prefix: string,
  windowMs: number,
  max: number
): Promise<RateLimitResult> {
  return consumeRateLimit(`${prefix}:${clientIpFromRequest(request)}`, windowMs, max);
}

export function rateLimitJsonResponse(
  retryAfterMs: number,
  body: Record<string, unknown> = { error: 'rate_limited' }
) {
  return NextResponse.json(body, {
    status: 429,
    headers: { 'Retry-After': String(Math.max(1, Math.ceil(retryAfterMs / 1000))) },
  });
}

/** Formularios públicos (contacto, cotiza, partner, ticket). */
export const PUBLIC_RL_FORM = {
  windowMs: 60 * 60 * 1000,
  max: Number(process.env.PUBLIC_RL_FORM_PER_IP_HOUR || 8),
};

export const PUBLIC_RL_FORM_EMAIL = {
  windowMs: 24 * 60 * 60 * 1000,
  max: Number(process.env.PUBLIC_RL_FORM_PER_EMAIL_DAY || 5),
};

/** Feed de cacería: ráfagas cortas sí, barrido no. */
export const PUBLIC_RL_FEED = {
  windowMs: 5 * 60 * 1000,
  max: Number(process.env.PUBLIC_RL_FEED_PER_IP_5MIN || 40),
};

/** Recuperación de contraseña (staff y portal). */
export const PUBLIC_RL_AUTH = {
  windowMs: 60 * 60 * 1000,
  max: Number(process.env.PUBLIC_RL_AUTH_PER_IP_HOUR || 5),
  emailWindowMs: 60 * 60 * 1000,
  emailMax: Number(process.env.PUBLIC_RL_AUTH_PER_EMAIL_HOUR || 3),
};

/** Cambio de contraseña con sesión iniciada (perfil ops). */
export const STAFF_RL_PASSWORD_CHANGE = {
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.STAFF_RL_PASSWORD_CHANGE_PER_15MIN || 8),
};

/** Reinicio de contraseña de portal disparado por staff. */
export const STAFF_RL_PORTAL_PASSWORD_RESET = {
  windowMs: 60 * 60 * 1000,
  max: Number(process.env.STAFF_RL_PORTAL_PASSWORD_RESET_PER_HOUR || 20),
};
