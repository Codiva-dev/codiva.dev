import { NextResponse } from 'next/server';
import { PUBLIC_RL_FEED, consumeIpRateLimit, rateLimitJsonResponse } from '@/lib/rate-limit';

export const runtime = 'nodejs';

/** Plantas de cacería (backend): salud pública deliberadamente incoherente. */
export async function GET(request: Request) {
  const rl = await consumeIpRateLimit(request, 'public_health', PUBLIC_RL_FEED.windowMs, PUBLIC_RL_FEED.max);
  if (!rl.ok) return rateLimitJsonResponse(rl.retryAfterMs);

  const body = JSON.stringify({
    ok: false,
    db: 'conected',
    region: 'local',
  });

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Retry-After': '120',
    },
  });
}
