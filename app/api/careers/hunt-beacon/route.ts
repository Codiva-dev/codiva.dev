import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase/admin';
import { requestAuditFromHeaders } from '@/lib/ops/request-audit';
import {
  CAREER_RL_HUNT_BEACON,
  careerRateLimitConsume,
  safeCareerStr,
} from '@/lib/ops/careers';
import { loadAttemptByToken } from '@/lib/careers/assessments/server';
import { postingRequiresHunt } from '@/lib/careers/hunt/progress';
import {
  applyHuntCookie,
  readHuntTokenFromRequest,
  recordHuntEvent,
  sanitizeHuntHost,
  sanitizeHuntPath,
} from '@/lib/careers/hunt/events';

export const runtime = 'nodejs';

function noContent() {
  return new NextResponse(null, { status: 204 });
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return noContent();
  }

  const audit = requestAuditFromHeaders(request.headers);
  const ip = audit.ip || 'unknown';
  const rl = await careerRateLimitConsume(
    `career_hunt_beacon:${ip}`,
    CAREER_RL_HUNT_BEACON.windowMs,
    CAREER_RL_HUNT_BEACON.max
  );
  if (!rl.ok) {
    return noContent();
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const token = readHuntTokenFromRequest(request, safeCareerStr(body.token, 80));
  if (token.length < 16) {
    return noContent();
  }

  const attempt = await loadAttemptByToken(token);
  if (
    !attempt ||
    attempt.status !== 'completed' ||
    !attempt.passed ||
    !(await postingRequiresHunt(attempt.job_posting_id, attempt.catalog_key))
  ) {
    return noContent();
  }

  const path = sanitizeHuntPath(safeCareerStr(body.path, 200));
  if (!path) {
    return noContent();
  }
  const host =
    sanitizeHuntHost(safeCareerStr(body.host, 80)) ||
    sanitizeHuntHost(request.headers.get('x-forwarded-host') || request.headers.get('host') || '');

  await recordHuntEvent({
    attemptId: attempt.id,
    eventType: 'page_view',
    path,
    host,
    referrer: safeCareerStr(body.referrer, 500),
    ip: audit.ip,
  });

  return applyHuntCookie(NextResponse.json({ ok: true }), token, request);
}
