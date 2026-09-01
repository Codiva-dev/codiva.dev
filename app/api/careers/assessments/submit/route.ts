import { NextResponse } from 'next/server';
import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/admin';
import { requestAuditFromHeaders } from '@/lib/ops/request-audit';
import {
  CAREER_RL_ASSESSMENT,
  careerRateLimitConsume,
  safeCareerStr,
} from '@/lib/ops/careers';
import { getAssessmentCatalog } from '@/lib/careers/assessments/catalog';
import { remainingMs, sanitizeAnswerKeys, scoreAnswers } from '@/lib/careers/assessments/engine';
import {
  expireIfNeeded,
  loadAttemptByToken,
  parseAnswers,
  recordAssessmentEvent,
} from '@/lib/careers/assessments/server';
import { postingRequiresHunt } from '@/lib/careers/hunt/progress';
import { applyHuntCookie } from '@/lib/careers/hunt/events';
import { notifyCandidateHuntPartTwo } from '@/lib/careers/hunt/notify-candidate';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: 'server_misconfigured' }, { status: 503 });
  }

  const audit = requestAuditFromHeaders(request.headers);
  const ip = audit.ip || 'unknown';
  const rl = await careerRateLimitConsume(
    `career_assessment_submit:${ip}`,
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
  if (!found) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  const row = await expireIfNeeded(found);

  if (row.status === 'completed') {
    const res = NextResponse.json({
      ok: true,
      already: true,
      passed: Boolean(row.passed),
      score_pct: row.score_pct,
    });
    return row.passed ? applyHuntCookie(res, token, request) : res;
  }

  if (row.status !== 'started') {
    return NextResponse.json({ ok: false, error: 'attempt_not_active', status: row.status }, { status: 400 });
  }

  const catalog = getAssessmentCatalog(row.catalog_key);
  if (!catalog) {
    return NextResponse.json({ ok: false, error: 'catalog_missing' }, { status: 500 });
  }

  const timedOut = remainingMs(row.expires_at) <= 0;
  const incoming = body.answers && typeof body.answers === 'object' ? (body.answers as Record<string, unknown>) : {};
  const merged = parseAnswers(row.answers);
  for (const id of row.question_ids) {
    if (incoming[id] === undefined) continue;
    const keys = sanitizeAnswerKeys(catalog, id, incoming[id]);
    if (keys) merged[id] = keys;
  }

  const scored = scoreAnswers(catalog, row.question_ids, merged);
  const now = new Date();
  const durationMs = Math.max(0, now.getTime() - new Date(row.started_at).getTime());

  const admin = createAdminClient();
  const { data: updated, error } = await admin
    .from('ops_job_assessment_attempts')
    .update({
      status: 'completed',
      answers: merged,
      score_correct: scored.correct,
      score_total: scored.total,
      score_pct: scored.pct,
      passed: scored.passed,
      duration_ms: durationMs,
      completed_at: now.toISOString(),
      last_activity_at: now.toISOString(),
    })
    .eq('id', row.id)
    .eq('status', 'started')
    .select('passed, score_pct')
    .maybeSingle();

  if (error) {
    console.error('POST /api/careers/assessments/submit', error);
    return NextResponse.json({ ok: false, error: 'submit_failed' }, { status: 500 });
  }

  await recordAssessmentEvent({
    attemptId: row.id,
    eventType: timedOut ? 'timed_out' : 'submitted',
    payload: { passed: scored.passed, score_pct: scored.pct, duration_ms: durationMs },
    ip: audit.ip,
  });

  const passed = Boolean(updated?.passed ?? scored.passed);
  if (passed && (await postingRequiresHunt(row.job_posting_id, row.catalog_key))) {
    await notifyCandidateHuntPartTwo({
      email: row.email,
      name: row.full_name,
      catalogKey: row.catalog_key,
      jobPostingId: row.job_posting_id,
    });
  }

  const res = NextResponse.json({
    ok: true,
    passed,
    score_pct: updated?.score_pct ?? scored.pct,
    timed_out: timedOut,
  });
  return passed ? applyHuntCookie(res, token, request) : res;
}
