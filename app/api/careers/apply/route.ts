import { NextResponse } from 'next/server';
import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/admin';
import { requestAuditFromHeaders } from '@/lib/ops/request-audit';
import { logActivity } from '@/lib/ops/activity';
import { notifyStaff } from '@/lib/ops/email';
import { templateCareerApplicationStaff } from '@/lib/ops/email-templates';
import {
  CAREER_DEDUPE_HOURS,
  CAREER_DISCIPLINE_LABELS,
  CAREER_RL_APPLY,
  CAREER_RL_APPLY_EMAIL,
  assertCareerCvObjectExists,
  careerRateLimitConsume,
  hashCareerIp,
  isCareerDiscipline,
  isCvPathForJob,
  postingAsksDiscipline,
  safeCareerStr,
} from '@/lib/ops/careers';
import { catalogForApplication } from '@/lib/careers/assessments/engine';
import { loadAttemptByToken } from '@/lib/careers/assessments/server';
import { huntProgressForAttempt } from '@/lib/careers/hunt/progress';
import { opsBaseUrl } from '@/lib/ops/host';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: 'server_misconfigured' }, { status: 503 });
  }

  const audit = requestAuditFromHeaders(request.headers);
  const ip = audit.ip || 'unknown';
  const rl = await careerRateLimitConsume(`career_apply:${ip}`, CAREER_RL_APPLY.windowMs, CAREER_RL_APPLY.max);
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

  const cvPath = safeCareerStr(body.cv_storage_path ?? body.cvStoragePath, 512);
  if (!cvPath || !isCvPathForJob(jobPostingId, cvPath)) {
    return NextResponse.json({ ok: false, error: 'invalid_cv_storage_path' }, { status: 400 });
  }

  const consentData = Boolean(body.consent_data ?? body.consentData);
  const consentTerms = Boolean(body.consent_terms ?? body.consentTerms);
  if (!consentData || !consentTerms) {
    return NextResponse.json({ ok: false, error: 'consent_required' }, { status: 400 });
  }

  const fullName = safeCareerStr(body.full_name ?? body.fullName, 200);
  const email = safeCareerStr(body.email, 320).toLowerCase();
  const phone = safeCareerStr(body.phone, 40);
  const coverLetter = safeCareerStr(body.cover_letter ?? body.coverLetter, 8000);
  const originalFilename = safeCareerStr(body.original_filename ?? body.originalFilename, 200);
  const disciplineRaw = safeCareerStr(body.discipline, 40).toLowerCase();

  if (!fullName || !email || !email.includes('@')) {
    return NextResponse.json({ ok: false, error: 'missing_or_invalid_contact' }, { status: 400 });
  }

  const emailRl = await careerRateLimitConsume(
    `career_apply_email:${email}`,
    CAREER_RL_APPLY_EMAIL.windowMs,
    CAREER_RL_APPLY_EMAIL.max
  );
  if (!emailRl.ok) {
    return NextResponse.json(
      { ok: false, error: 'rate_limited_email' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(emailRl.retryAfterMs / 1000)) } }
    );
  }

  const admin = createAdminClient();
  const { data: job, error: jobErr } = await admin
    .from('ops_job_postings')
    .select('id, title, slug, status, assessment_key, asks_discipline, requires_hunt')
    .eq('id', jobPostingId)
    .maybeSingle();

  if (jobErr) {
    return NextResponse.json({ ok: false, error: 'job_lookup_failed' }, { status: 500 });
  }
  if (!job?.id || job.status !== 'published') {
    return NextResponse.json({ ok: false, error: 'job_not_available' }, { status: 400 });
  }

  const asksDiscipline = postingAsksDiscipline(job);
  const discipline = isCareerDiscipline(disciplineRaw) ? disciplineRaw : null;
  if (asksDiscipline && !discipline) {
    return NextResponse.json({ ok: false, error: 'missing_or_invalid_discipline' }, { status: 400 });
  }

  const catalog = catalogForApplication(job.assessment_key, job.slug, discipline, job.asks_discipline);
  let assessmentAttemptId: string | null = null;
  let assessmentScorePct: number | null = null;
  if (catalog) {
    const assessmentToken = safeCareerStr(body.assessment_token ?? body.assessmentToken, 80);
    if (assessmentToken.length < 16) {
      return NextResponse.json({ ok: false, error: 'assessment_required' }, { status: 400 });
    }
    const attempt = await loadAttemptByToken(assessmentToken);
    if (
      !attempt ||
      attempt.job_posting_id !== jobPostingId ||
      attempt.status !== 'completed' ||
      !attempt.passed ||
      attempt.email.toLowerCase() !== email ||
      attempt.catalog_key !== catalog.key
    ) {
      return NextResponse.json({ ok: false, error: 'assessment_not_passed' }, { status: 400 });
    }
    const { data: used } = await admin
      .from('ops_job_applications')
      .select('id')
      .eq('assessment_attempt_id', attempt.id)
      .maybeSingle();
    if (used?.id) {
      return NextResponse.json({ ok: false, error: 'duplicate_application' }, { status: 409 });
    }
    assessmentAttemptId = attempt.id;
    assessmentScorePct = attempt.score_pct;
    const hunt = await huntProgressForAttempt({
      email: attempt.email,
      catalogKey: attempt.catalog_key,
      jobPostingId: job.id,
      required: job.requires_hunt,
    });
    if (hunt.required && !hunt.ready) {
      return NextResponse.json({ ok: false, error: 'hunt_required' }, { status: 400 });
    }
  }

  const cutoff = new Date(Date.now() - CAREER_DEDUPE_HOURS * 3600 * 1000).toISOString();
  const { data: dup, error: dupErr } = await admin
    .from('ops_job_applications')
    .select('id')
    .eq('job_posting_id', jobPostingId)
    .ilike('email', email)
    .gte('created_at', cutoff)
    .maybeSingle();

  if (dupErr) {
    return NextResponse.json({ ok: false, error: 'dedupe_lookup_failed' }, { status: 500 });
  }
  if (dup?.id) {
    return NextResponse.json({ ok: false, error: 'duplicate_application' }, { status: 409 });
  }

  const exists = await assertCareerCvObjectExists(cvPath);
  if (!exists) {
    return NextResponse.json({ ok: false, error: 'cv_upload_not_found' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { data: inserted, error: insertErr } = await admin
    .from('ops_job_applications')
    .insert({
      job_posting_id: jobPostingId,
      full_name: fullName,
      email,
      phone: phone || null,
      discipline: asksDiscipline ? discipline : null,
      cover_letter: coverLetter || null,
      cv_storage_path: cvPath,
      original_filename: originalFilename || null,
      consent_data_at: now,
      consent_terms_at: now,
      ip_hash: hashCareerIp(ip),
      status: 'new',
      assessment_attempt_id: assessmentAttemptId,
    })
    .select('id')
    .maybeSingle();

  if (insertErr) {
    console.error('POST /api/careers/apply insert:', insertErr);
    return NextResponse.json({ ok: false, error: 'application_insert_failed' }, { status: 500 });
  }

  await logActivity({
    entityType: 'job_application',
    entityId: inserted?.id || jobPostingId,
    action: 'created',
    metadata: { jobPostingId, slug: job.slug, discipline: discipline || null },
  });

  const disciplineLabel = discipline ? CAREER_DISCIPLINE_LABELS[discipline] : '';
  await notifyStaff({
    subject: disciplineLabel
      ? `[Bolsa] ${fullName} · ${disciplineLabel}`
      : `[Bolsa] ${fullName} · ${job.title}`,
    html: templateCareerApplicationStaff({
      name: fullName,
      email,
      phone,
      jobTitle: job.title,
      discipline: disciplineLabel || undefined,
      coverLetter,
      opsHref: `${opsBaseUrl()}/inbox`,
      scorePct: assessmentScorePct,
    }),
    replyTo: email,
  }).catch(() => {});

  return NextResponse.json({ ok: true, application_id: inserted?.id || null });
}
