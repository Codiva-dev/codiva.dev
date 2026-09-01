import { NextResponse } from 'next/server';
import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/admin';
import { requestAuditFromHeaders } from '@/lib/ops/request-audit';
import {
  CAREER_RL_ASSESSMENT,
  careerRateLimitConsume,
  hashCareerIp,
  isCareerDiscipline,
  postingAsksDiscipline,
  safeCareerStr,
} from '@/lib/ops/careers';
import {
  ASSESSMENT_MAX_ATTEMPTS_PER_WEEK,
  ASSESSMENT_PASS_WINDOW_DAYS,
  ASSESSMENT_RETRY_COOLDOWN_HOURS,
  buildOptionOrders,
  createAssessmentToken,
  pickQuestionIds,
  publicQuestionsForAttempt,
  remainingMs,
} from '@/lib/careers/assessments/engine';
import {
  loadPublishedPostingForAssessment,
  parseOptionOrders,
  recordAssessmentEvent,
  safeTimezone,
  type AssessmentAttemptRow,
} from '@/lib/careers/assessments/server';
import { EMPTY_HUNT_PROGRESS, huntProgressForAttempt, toPublicHuntSession, type HuntProgress } from '@/lib/careers/hunt/progress';
import { applyHuntCookie } from '@/lib/careers/hunt/events';

export const runtime = 'nodejs';

function publicSession(
  row: AssessmentAttemptRow,
  catalogTitle: string,
  questions: ReturnType<typeof publicQuestionsForAttempt>,
  hunt?: HuntProgress
) {
  return {
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
    title: catalogTitle,
    questions: row.status === 'started' ? questions : [],
    answers: row.answers ?? {},
    ...toPublicHuntSession(hunt ?? EMPTY_HUNT_PROGRESS),
  };
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: 'server_misconfigured' }, { status: 503 });
  }

  const audit = requestAuditFromHeaders(request.headers);
  const ip = audit.ip || 'unknown';
  const rl = await careerRateLimitConsume(
    `career_assessment:${ip}`,
    CAREER_RL_ASSESSMENT.windowMs,
    CAREER_RL_ASSESSMENT.max
  );
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: 'rate_limited' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json_body' }, { status: 400 });
  }

  const jobPostingId = safeCareerStr(body.job_posting_id ?? body.jobPostingId, 40);
  if (!jobPostingId || !/^[0-9a-f-]{36}$/i.test(jobPostingId)) {
    return NextResponse.json({ ok: false, error: 'missing_or_invalid_job_posting_id' }, { status: 400 });
  }

  const fullName = safeCareerStr(body.full_name ?? body.fullName, 200);
  const email = safeCareerStr(body.email, 320).toLowerCase();
  if (!fullName || !email || !email.includes('@')) {
    return NextResponse.json({ ok: false, error: 'missing_or_invalid_contact' }, { status: 400 });
  }

  const disciplineRaw = safeCareerStr(body.discipline, 40).toLowerCase();
  const discipline = isCareerDiscipline(disciplineRaw) ? disciplineRaw : null;

  const loaded = await loadPublishedPostingForAssessment(jobPostingId, discipline);
  if (!loaded) {
    return NextResponse.json({ ok: false, error: 'assessment_not_available' }, { status: 400 });
  }
  const { catalog, posting } = loaded;
  if (postingAsksDiscipline(posting) && !discipline) {
    return NextResponse.json({ ok: false, error: 'missing_or_invalid_discipline' }, { status: 400 });
  }

  const admin = createAdminClient();
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const { data: recent, error: recentErr } = await admin
    .from('ops_job_assessment_attempts')
    .select(
      'id, public_token, job_posting_id, catalog_key, full_name, email, status, attempt_number, started_at, completed_at, last_activity_at, expires_at, time_limit_sec, question_ids, option_orders, answers, score_correct, score_total, score_pct, passed, duration_ms, blur_count, timezone'
    )
    .eq('job_posting_id', jobPostingId)
    .ilike('email', email)
    .gte('created_at', weekAgo)
    .order('created_at', { ascending: false });

  if (recentErr) {
    return NextResponse.json({ ok: false, error: 'attempt_lookup_failed' }, { status: 500 });
  }

  const rows = ((recent ?? []) as AssessmentAttemptRow[]).filter((r) => r.catalog_key === catalog.key);
  const passSince = Date.now() - ASSESSMENT_PASS_WINDOW_DAYS * 24 * 3600 * 1000;
  const passed = rows.find(
    (r) => r.passed && r.status === 'completed' && new Date(r.completed_at || r.started_at).getTime() >= passSince
  );
  if (passed) {
    const hunt = await huntProgressForAttempt({
      email: passed.email,
      catalogKey: passed.catalog_key,
      jobPostingId: posting.id,
      required: posting.requires_hunt,
    });
    return applyHuntCookie(
      NextResponse.json({
        ok: true,
        already_passed: true,
        session: publicSession(passed, catalog.title, [], hunt),
      }),
      passed.public_token,
      request
    );
  }

  const open = rows.find((r) => r.status === 'started' && new Date(r.expires_at).getTime() > Date.now());
  if (open) {
    await recordAssessmentEvent({
      attemptId: open.id,
      eventType: 'resumed',
      ip: audit.ip,
    });
    return applyHuntCookie(
      NextResponse.json({
        ok: true,
        resumed: true,
        session: publicSession(
          open,
          catalog.title,
          publicQuestionsForAttempt(catalog, open.question_ids, parseOptionOrders(open.option_orders))
        ),
      }),
      open.public_token,
      request
    );
  }

  const lastFinished = rows.find((r) => r.status === 'completed' || r.status === 'expired');
  if (lastFinished) {
    const lastAt = new Date(lastFinished.completed_at || lastFinished.started_at).getTime();
    const cooldownMs = ASSESSMENT_RETRY_COOLDOWN_HOURS * 3600 * 1000;
    if (Date.now() - lastAt < cooldownMs) {
      return NextResponse.json(
        {
          ok: false,
          error: 'retry_cooldown',
          retry_after_ms: cooldownMs - (Date.now() - lastAt),
        },
        { status: 429 }
      );
    }
  }

  if (rows.length >= ASSESSMENT_MAX_ATTEMPTS_PER_WEEK) {
    return NextResponse.json({ ok: false, error: 'max_attempts' }, { status: 429 });
  }

  const questionIds = pickQuestionIds(catalog);
  const optionOrders = buildOptionOrders(catalog, questionIds);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + catalog.timeLimitSec * 1000);
  const token = createAssessmentToken();

  const { data: inserted, error: insertErr } = await admin
    .from('ops_job_assessment_attempts')
    .insert({
      public_token: token,
      job_posting_id: jobPostingId,
      catalog_key: catalog.key,
      full_name: fullName,
      email,
      status: 'started',
      attempt_number: rows.length + 1,
      started_at: now.toISOString(),
      last_activity_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      time_limit_sec: catalog.timeLimitSec,
      question_ids: questionIds,
      option_orders: optionOrders,
      answers: {},
      ip_hash: hashCareerIp(audit.ip),
      user_agent: (audit.userAgent || '').slice(0, 400) || null,
      timezone: safeTimezone(body.timezone),
    })
    .select(
      'id, public_token, job_posting_id, catalog_key, full_name, email, status, attempt_number, started_at, completed_at, last_activity_at, expires_at, time_limit_sec, question_ids, option_orders, answers, score_correct, score_total, score_pct, passed, duration_ms, blur_count, timezone'
    )
    .maybeSingle();

  if (insertErr || !inserted) {
    console.error('POST /api/careers/assessments/start', insertErr);
    return NextResponse.json({ ok: false, error: 'attempt_insert_failed' }, { status: 500 });
  }

  const row = inserted as AssessmentAttemptRow;
  await recordAssessmentEvent({
    attemptId: row.id,
    eventType: 'started',
    payload: { question_ids: questionIds, timezone: row.timezone },
    ip: audit.ip,
  });

  return applyHuntCookie(
    NextResponse.json({
      ok: true,
      session: publicSession(
        row,
        catalog.title,
        publicQuestionsForAttempt(catalog, questionIds, optionOrders)
      ),
    }),
    row.public_token,
    request
  );
}
