import { NextResponse } from 'next/server';
import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/admin';
import { requestAuditFromHeaders } from '@/lib/ops/request-audit';
import { logActivity } from '@/lib/ops/activity';
import { notifyStaff } from '@/lib/ops/email';
import { templateHuntReportStaff } from '@/lib/ops/email-templates';
import {
  careerRateLimitConsume,
  hashCareerIp,
  isCareerDiscipline,
  safeCareerStr,
} from '@/lib/ops/careers';
import { matchHuntReport } from '@/lib/careers/hunt/match';
import { huntProgressForAttempt } from '@/lib/careers/hunt/progress';
import { notifyCandidateApplyReady } from '@/lib/careers/hunt/notify-candidate';
import { recordHuntEvent } from '@/lib/careers/hunt/events';
import { huntEvidenceExists, HUNT_MAX_EVIDENCE_FILES, isHuntEvidencePath } from '@/lib/careers/hunt/evidence';
import { urlLooksLikeFeed } from '@/lib/careers/hunt/trail';
import { loadAttemptByToken } from '@/lib/careers/assessments/server';
import { opsBaseUrl, careerHostName } from '@/lib/ops/host';
import { CAREER_DISCIPLINE_LABELS } from '@/lib/ops/career-disciplines';

export const runtime = 'nodejs';

const RL = { windowMs: 60 * 60 * 1000, max: 20 };
const RL_EMAIL = { windowMs: 24 * 60 * 60 * 1000, max: 12 };

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: 'server_misconfigured' }, { status: 503 });
  }

  const audit = requestAuditFromHeaders(request.headers);
  const ip = audit.ip || 'unknown';
  const rl = await careerRateLimitConsume(`career_hunt:${ip}`, RL.windowMs, RL.max);
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json_body' }, { status: 400 });
  }

  const fullName = safeCareerStr(body.full_name ?? body.fullName, 200);
  const email = safeCareerStr(body.email, 320).toLowerCase();
  const pageUrl = safeCareerStr(body.page_url ?? body.pageUrl, 500);
  const title = safeCareerStr(body.title, 200);
  const description = safeCareerStr(body.description, 8000);
  const expected = safeCareerStr(body.expected, 4000);
  const disciplineRaw = safeCareerStr(body.discipline, 40).toLowerCase();
  const discipline = isCareerDiscipline(disciplineRaw) ? disciplineRaw : null;
  const assessmentToken = safeCareerStr(body.assessment_token ?? body.assessmentToken, 80);
  const evidenceRaw = Array.isArray(body.evidence_paths ?? body.evidencePaths)
    ? ((body.evidence_paths ?? body.evidencePaths) as unknown[])
    : [];
  const evidencePaths = [
    ...new Set(evidenceRaw.map((value) => safeCareerStr(value, 200)).filter(isHuntEvidencePath)),
  ].slice(0, HUNT_MAX_EVIDENCE_FILES);

  if (!fullName || !email.includes('@') || !pageUrl || title.length < 4 || description.length < 20) {
    return NextResponse.json({ ok: false, error: 'missing_or_invalid_fields' }, { status: 400 });
  }

  const emailRl = await careerRateLimitConsume(`career_hunt_email:${email}`, RL_EMAIL.windowMs, RL_EMAIL.max);
  if (!emailRl.ok) {
    return NextResponse.json({ ok: false, error: 'rate_limited_email' }, { status: 429 });
  }

  let attemptId: string | null = null;
  let jobPostingId: string | null = null;
  let catalogKey = '';
  if (assessmentToken.length >= 16) {
    const attempt = await loadAttemptByToken(assessmentToken);
    if (
      !attempt ||
      attempt.status !== 'completed' ||
      !attempt.passed ||
      attempt.email.toLowerCase() !== email
    ) {
      return NextResponse.json({ ok: false, error: 'assessment_not_passed' }, { status: 400 });
    }
    attemptId = attempt.id;
    jobPostingId = attempt.job_posting_id;
    catalogKey = attempt.catalog_key;
  }

  const evidenceOk: string[] = [];
  for (const path of evidencePaths) {
    if (attemptId && !path.includes(`/hunt/${attemptId}/`) && !path.startsWith(`hunt/${attemptId}/`)) {
      continue;
    }
    if (await huntEvidenceExists(path)) evidenceOk.push(path);
  }

  const match = matchHuntReport({ pageUrl, title, description, expected, discipline });
  const huntBefore = catalogKey
    ? await huntProgressForAttempt({ email, catalogKey })
    : null;
  const admin = createAdminClient();

  const cutoff = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  let dupQuery = admin.from('ops_hunt_reports').select('id').ilike('email', email).gte('created_at', cutoff);
  if (match?.seedId) {
    dupQuery = dupQuery.eq('matched_seed_id', match.seedId);
  } else {
    dupQuery = dupQuery.eq('title', title);
  }
  const { data: dup } = await dupQuery.maybeSingle();
  if (dup?.id) {
    return NextResponse.json({ ok: false, error: 'duplicate_report' }, { status: 409 });
  }

  const { data: inserted, error: insertErr } = await admin
    .from('ops_hunt_reports')
    .insert({
      full_name: fullName,
      email,
      page_url: pageUrl,
      title,
      description,
      expected: expected || null,
      matched_seed_id: match?.seedId || null,
      discipline,
      assessment_attempt_id: attemptId,
      job_posting_id: jobPostingId,
      ip_hash: hashCareerIp(ip),
      evidence_paths: evidenceOk,
    })
    .select('id')
    .maybeSingle();

  if (insertErr) {
    console.error('POST /api/careers/hunt-report', insertErr);
    return NextResponse.json({ ok: false, error: 'report_insert_failed' }, { status: 500 });
  }

  if (attemptId) {
    await recordHuntEvent({
      attemptId,
      eventType: 'reported',
      path: pageUrl,
      host: (() => {
        try {
          return new URL(pageUrl.includes('://') ? pageUrl : `https://${pageUrl}`).hostname;
        } catch {
          return '';
        }
      })(),
      payload: { report_id: inserted?.id || null, matched_seed_id: match?.seedId || null },
      ip: audit.ip,
    });
    if (urlLooksLikeFeed(pageUrl)) {
      await recordHuntEvent({
        attemptId,
        eventType: 'page_view',
        path: '/api/careers/feed',
        host: careerHostName(),
        ip: audit.ip,
      });
    }
  }

  await logActivity({
    entityType: 'hunt_report',
    entityId: inserted?.id || email,
    action: 'created',
    metadata: {
      matchedSeedId: match?.seedId || null,
      pageUrl,
      discipline,
      countsForCraft: match?.countsForCraft ?? false,
    },
  });

  const hunt = catalogKey ? await huntProgressForAttempt({ email, catalogKey }) : null;
  if (hunt?.ready && !huntBefore?.ready && jobPostingId) {
    await notifyCandidateApplyReady({
      email,
      name: fullName,
      catalogKey,
      jobPostingId,
    });
  }

  await notifyStaff({
    subject: match
      ? `[Hallazgo] ${fullName} · ${match.title}`
      : `[Hallazgo] ${fullName} · ${title}`,
    html: templateHuntReportStaff({
      name: fullName,
      email,
      pageUrl,
      title,
      description,
      expected,
      matchedTitle: match?.title,
      discipline: discipline ? CAREER_DISCIPLINE_LABELS[discipline] : undefined,
      opsHref: `${opsBaseUrl()}/inbox`,
    }),
    replyTo: email,
  }).catch(() => {});

  return NextResponse.json({
    ok: true,
    report_id: inserted?.id || null,
    hunt_ready: hunt?.ready ?? null,
  });
}
