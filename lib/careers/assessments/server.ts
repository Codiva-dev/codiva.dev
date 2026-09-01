import { createAdminClient } from '@/lib/supabase/admin';
import { throwDb } from '@/lib/ops/throw-db';
import { hashCareerIp, safeCareerStr } from '@/lib/ops/careers';
import { catalogForApplication } from '@/lib/careers/assessments/engine';
import type { AssessmentAnswers, AssessmentOptionOrders } from '@/lib/careers/assessments/types';

export type AssessmentAttemptRow = {
  id: string;
  public_token: string;
  job_posting_id: string;
  catalog_key: string;
  full_name: string;
  email: string;
  status: string;
  attempt_number: number;
  started_at: string;
  completed_at: string | null;
  last_activity_at: string;
  expires_at: string;
  time_limit_sec: number;
  question_ids: string[];
  option_orders: AssessmentOptionOrders;
  answers: AssessmentAnswers;
  score_correct: number | null;
  score_total: number | null;
  score_pct: number | null;
  passed: boolean | null;
  duration_ms: number | null;
  blur_count: number;
  timezone: string | null;
};

export async function loadAttemptByToken(token: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('ops_job_assessment_attempts')
    .select(
      'id, public_token, job_posting_id, catalog_key, full_name, email, status, attempt_number, started_at, completed_at, last_activity_at, expires_at, time_limit_sec, question_ids, option_orders, answers, score_correct, score_total, score_pct, passed, duration_ms, blur_count, timezone'
    )
    .eq('public_token', token)
    .maybeSingle();
  if (error) await throwDb(error);
  return (data as AssessmentAttemptRow | null) ?? null;
}

export async function expireIfNeeded(row: AssessmentAttemptRow): Promise<AssessmentAttemptRow> {
  if (row.status !== 'started') return row;
  if (new Date(row.expires_at).getTime() > Date.now()) return row;
  const admin = createAdminClient();
  const { data } = await admin
    .from('ops_job_assessment_attempts')
    .update({
      status: 'expired',
      completed_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
    })
    .eq('id', row.id)
    .eq('status', 'started')
    .select(
      'id, public_token, job_posting_id, catalog_key, full_name, email, status, attempt_number, started_at, completed_at, last_activity_at, expires_at, time_limit_sec, question_ids, option_orders, answers, score_correct, score_total, score_pct, passed, duration_ms, blur_count, timezone'
    )
    .maybeSingle();
  return (data as AssessmentAttemptRow | null) ?? { ...row, status: 'expired' };
}

export async function recordAssessmentEvent(input: {
  attemptId: string;
  eventType: string;
  questionId?: string | null;
  payload?: Record<string, unknown>;
  ip?: string | null;
}) {
  const admin = createAdminClient();
  await admin.from('ops_job_assessment_events').insert({
    attempt_id: input.attemptId,
    event_type: input.eventType,
    question_id: input.questionId || null,
    payload: input.payload ?? {},
    ip_hash: hashCareerIp(input.ip),
  });
}

export function parseAnswers(raw: unknown): AssessmentAnswers {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: AssessmentAnswers = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(value)) continue;
    out[key] = value.map((v) => String(v));
  }
  return out;
}

export function parseOptionOrders(raw: unknown): AssessmentOptionOrders {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: AssessmentOptionOrders = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(value)) continue;
    out[key] = value.map((v) => String(v));
  }
  return out;
}

export async function loadPublishedPostingForAssessment(
  jobPostingId: string,
  discipline?: string | null
) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('ops_job_postings')
    .select('id, slug, title, status, assessment_key, asks_discipline, requires_hunt')
    .eq('id', jobPostingId)
    .maybeSingle();
  if (error) await throwDb(error);
  if (!data?.id || data.status !== 'published') return null;
  const catalog = catalogForApplication(
    data.assessment_key,
    data.slug,
    discipline,
    data.asks_discipline
  );
  if (!catalog) return null;
  return { posting: data, catalog };
}

export function safeTimezone(value: unknown): string | null {
  const tz = safeCareerStr(value, 80);
  if (!tz || tz.length > 64) return null;
  return tz;
}
