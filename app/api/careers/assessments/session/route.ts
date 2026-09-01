import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase/admin';
import { requestAuditFromHeaders } from '@/lib/ops/request-audit';
import {
  CAREER_RL_ASSESSMENT,
  careerRateLimitConsume,
  safeCareerStr,
} from '@/lib/ops/careers';
import { getAssessmentCatalog } from '@/lib/careers/assessments/catalog';
import {
  publicQuestionsForAttempt,
  remainingMs,
} from '@/lib/careers/assessments/engine';
import {
  expireIfNeeded,
  loadAttemptByToken,
  parseOptionOrders,
} from '@/lib/careers/assessments/server';
import { EMPTY_HUNT_PROGRESS, huntProgressForAttempt, toPublicHuntSession } from '@/lib/careers/hunt/progress';
import { applyHuntCookie } from '@/lib/careers/hunt/events';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: 'server_misconfigured' }, { status: 503 });
  }

  const audit = requestAuditFromHeaders(request.headers);
  const ip = audit.ip || 'unknown';
  const rl = await careerRateLimitConsume(
    `career_assessment_session:${ip}`,
    CAREER_RL_ASSESSMENT.windowMs,
    CAREER_RL_ASSESSMENT.max
  );
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json_body' }, { status: 400 });
  }

  const token = safeCareerStr(body.token, 80);
  if (token.length < 16) {
    return NextResponse.json({ ok: false, error: 'missing_token' }, { status: 400 });
  }

  const found = await loadAttemptByToken(token);
  if (!found) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }
  const row = await expireIfNeeded(found);
  const catalog = getAssessmentCatalog(row.catalog_key);
  const questions =
    row.status === 'started' && catalog
      ? publicQuestionsForAttempt(catalog, row.question_ids, parseOptionOrders(row.option_orders))
      : [];
  const hunt =
    row.status === 'completed' && row.passed
      ? await huntProgressForAttempt({
          email: row.email,
          catalogKey: row.catalog_key,
          jobPostingId: row.job_posting_id,
        })
      : EMPTY_HUNT_PROGRESS;

  return applyHuntCookie(
    NextResponse.json({
      ok: true,
      session: {
        token: row.public_token,
        job_posting_id: row.job_posting_id,
        catalog_key: row.catalog_key,
        status: row.status,
        full_name: row.full_name,
        email: row.email,
        attempt_number: row.attempt_number,
        remaining_ms: row.status === 'started' ? remainingMs(row.expires_at) : 0,
        time_limit_sec: row.time_limit_sec,
        passed: row.passed,
        score_pct: row.status === 'completed' ? row.score_pct : null,
        title: catalog?.title ?? 'Prueba',
        questions,
        answers: row.answers ?? {},
        ...toPublicHuntSession(hunt),
      },
    }),
    row.public_token,
    request
  );
}
