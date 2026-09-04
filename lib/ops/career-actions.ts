'use server';

import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import { redirect } from 'next/navigation';
import { getT } from '@/i18n/locale';
import { requireAdminStaff, requireCareersReview } from '@/lib/ops/auth';
import { logActivity } from '@/lib/ops/activity';
import { can } from '@/lib/ops/permissions';
import { throwDb } from '@/lib/ops/throw-db';
import { isTesterPipelineItem, applicationRoleLabel } from '@/lib/ops/career-disciplines';
import {
  CAREER_CV_BUCKET,
  CAREER_DISCIPLINE_LABELS,
  isCareerDiscipline,
  isJobApplicationStatus,
  isJobEmploymentType,
  isJobHireOpsRole,
  isJobHireWorkModality,
  isJobInterviewKind,
  isJobInterviewOutcome,
  isJobInterviewRoundStatus,
  isJobPostingStatus,
  normalizeJobSlug,
  parseHireCompensation,
  parseHireCurrency,
  parseInterviewPlan,
  postingHireOpsRole,
  uniqueJobSlugCandidate,
} from '@/lib/ops/careers';
import { isAssessmentCatalogKey } from '@/lib/careers/assessments/catalog';
import { notifyCandidateApplicationStatus } from '@/lib/careers/notify-application-status';
import { syncRoundAssignee } from '@/lib/ops/interview-actions';
import { INTERVIEW_REPORT_BUCKET } from '@/lib/ops/interview-partner';
import { createAdminClient } from '@/lib/supabase/admin';

function revalidateCareerPaths(slug?: string) {
  revalidatePath('/team');
  revalidatePath('/empleos');
  if (slug) revalidatePath(`/empleos/${slug}`);
}

function isUuid(value: string) {
  return /^[0-9a-f-]{36}$/i.test(value);
}

function postingFromApplication(application: {
  ops_job_postings?:
    | { slug?: string | null; title?: string | null; careers_pipeline?: boolean | null }
    | { slug?: string | null; title?: string | null; careers_pipeline?: boolean | null }[]
    | null;
}) {
  return Array.isArray(application.ops_job_postings)
    ? application.ops_job_postings[0]
    : application.ops_job_postings;
}

async function requireApplicationForReview(
  supabase: Awaited<ReturnType<typeof requireCareersReview>>['supabase'],
  staff: Awaited<ReturnType<typeof requireCareersReview>>['staff'],
  applicationId: string
) {
  if (!isUuid(applicationId)) throw new Error('Postulación inválida');

  const { data: application } = await supabase
    .from('ops_job_applications')
    .select('id, status, discipline, ops_job_postings(slug, careers_pipeline)')
    .eq('id', applicationId)
    .maybeSingle();

  if (!application) throw new Error('Postulación no encontrada');

  const posting = postingFromApplication(application);
  if (
    !can(staff, 'team') &&
    !isTesterPipelineItem({
      postingSlug: posting?.slug,
      discipline: application.discipline,
      careersPipeline: posting?.careers_pipeline,
    })
  ) {
    throw new Error('No tienes permiso para esta postulación');
  }

  return application;
}

async function seedInterviewRoundsFromPosting(
  supabase: Awaited<ReturnType<typeof requireCareersReview>>['supabase'],
  applicationId: string,
  actorId: string
) {
  const { count } = await supabase
    .from('ops_job_interview_rounds')
    .select('id', { count: 'exact', head: true })
    .eq('application_id', applicationId);

  if ((count ?? 0) > 0) return false;

  const { data: application } = await supabase
    .from('ops_job_applications')
    .select('ops_job_postings(interview_plan)')
    .eq('id', applicationId)
    .maybeSingle();
  const nested = application?.ops_job_postings;
  const posting = Array.isArray(nested) ? nested[0] : nested;
  const plan = parseInterviewPlan(posting?.interview_plan);
  if (!plan.length) return false;

  const t = await getT();
  const { error } = await supabase.from('ops_job_interview_rounds').insert(
    plan.map((kind, index) => ({
      application_id: applicationId,
      sort_order: index,
      kind,
      title: t(`ops.careers.interviewKind.${kind}`),
      status: 'planned',
      created_by: actorId,
    }))
  );
  if (error) throw await throwDb(error);
  return true;
}

async function purgeApplicationFiles(applicationIds: string[]) {
  const ids = applicationIds.filter(isUuid);
  if (!ids.length) return;
  const admin = createAdminClient();
  const { data: apps } = await admin
    .from('ops_job_applications')
    .select('cv_storage_path')
    .in('id', ids);
  const { data: rounds } = await admin
    .from('ops_job_interview_rounds')
    .select('id')
    .in('application_id', ids);
  const roundIds = (rounds ?? []).map((row) => row.id);
  const { data: reports } = roundIds.length
    ? await admin.from('ops_interview_reports').select('storage_path').in('round_id', roundIds)
    : { data: [] as { storage_path: string }[] };

  const cvPaths = (apps ?? []).map((row) => row.cv_storage_path).filter(Boolean);
  const reportPaths = (reports ?? []).map((row) => row.storage_path).filter(Boolean);
  if (cvPaths.length) await admin.storage.from(CAREER_CV_BUCKET).remove(cvPaths);
  if (reportPaths.length) await admin.storage.from(INTERVIEW_REPORT_BUCKET).remove(reportPaths);
}

async function maybePromoteToInterview(
  supabase: Awaited<ReturnType<typeof requireCareersReview>>['supabase'],
  application: { id: string; status: string },
  actorId: string
) {
  if (application.status !== 'new' && application.status !== 'reviewed') return;
  const { error } = await supabase
    .from('ops_job_applications')
    .update({ status: 'interview' })
    .eq('id', application.id);
  if (error) throw await throwDb(error);
  await logActivity({
    entityType: 'job_application',
    entityId: application.id,
    action: 'status_updated',
    metadata: { status: 'interview', notified: false, fromInterviewRound: true },
    actorId,
  });
}

async function pickUniqueSlug(
  supabase: Awaited<ReturnType<typeof requireAdminStaff>>['supabase'],
  desired: string,
  excludeId?: string
): Promise<string> {
  let slug = normalizeJobSlug(desired);
  for (let i = 0; i < 24; i += 1) {
    let query = supabase.from('ops_job_postings').select('id').eq('slug', slug);
    if (excludeId) query = query.neq('id', excludeId);
    const { data } = await query.maybeSingle();
    if (!data?.id) return slug;
    slug = uniqueJobSlugCandidate(desired);
  }
  return uniqueJobSlugCandidate(desired);
}

function parsePostingFields(formData: FormData) {
  const title = String(formData.get('title') || '').trim();
  const titleEn = String(formData.get('titleEn') || '').trim().slice(0, 300);
  const slugRaw = String(formData.get('slug') || '').trim();
  const description = String(formData.get('description') || '').slice(0, 20000);
  const descriptionEn = String(formData.get('descriptionEn') || '').slice(0, 20000);
  const requirements = String(formData.get('requirements') || '').slice(0, 20000);
  const requirementsEn = String(formData.get('requirementsEn') || '').slice(0, 20000);
  const location = String(formData.get('location') || '').trim().slice(0, 200);
  const locationEn = String(formData.get('locationEn') || '').trim().slice(0, 200);
  const employmentRaw = String(formData.get('employmentType') || '').trim();
  const statusRaw = String(formData.get('status') || 'draft').trim();
  const sortOrder = Number(formData.get('sortOrder') || 0);
  const assessmentRaw = String(formData.get('assessmentKey') || '').trim();
  const hireRaw = String(formData.get('hireOpsRole') || 'dev').trim();
  const asksDiscipline = formChecked(formData, 'asksDiscipline');
  const requiresHunt = formChecked(formData, 'requiresHunt');
  const careersPipeline = formChecked(formData, 'careersPipeline');
  const interviewPlan = parseInterviewPlan(formData.getAll('interviewPlan'));
  const hireCompensation = parseHireCompensation(formData.get('hireMonthlyCompensation'));
  const hireCurrency = parseHireCurrency(formData.get('hireCurrency'));
  const hireModalityRaw = String(formData.get('hireWorkModality') || 'remote').trim();
  const hireWorkModality = isJobHireWorkModality(hireModalityRaw) ? hireModalityRaw : 'remote';

  if (title.length < 2) throw new Error('Título requerido');
  if (!isJobPostingStatus(statusRaw)) throw new Error('Estado inválido');
  const employmentType = employmentRaw && isJobEmploymentType(employmentRaw) ? employmentRaw : null;
  const assessmentKey = assessmentRaw && isAssessmentCatalogKey(assessmentRaw) ? assessmentRaw : null;
  const hireOpsRole = isJobHireOpsRole(hireRaw) ? hireRaw : 'dev';

  return {
    title,
    titleEn,
    slugRaw,
    description,
    descriptionEn,
    requirements,
    requirementsEn,
    location,
    locationEn,
    employmentType,
    status: statusRaw,
    sortOrder: Number.isFinite(sortOrder) ? Math.floor(sortOrder) : 0,
    assessmentKey,
    asksDiscipline,
    requiresHunt,
    careersPipeline,
    hireOpsRole,
    interviewPlan,
    hireCompensation,
    hireCurrency,
    hireWorkModality,
  };
}

function formChecked(formData: FormData, name: string) {
  const value = String(formData.get(name) || '').trim();
  return value === '1' || value === 'on' || value === 'true';
}

export async function createJobPosting(formData: FormData) {
  const { user, supabase } = await requireAdminStaff();
  const fields = parsePostingFields(formData);
  const slug = await pickUniqueSlug(supabase, fields.slugRaw || fields.title);
  const publishedAt = fields.status === 'published' ? new Date().toISOString() : null;

  const { data, error } = await supabase
    .from('ops_job_postings')
    .insert({
      title: fields.title,
      title_en: fields.titleEn,
      slug,
      description: fields.description,
      description_en: fields.descriptionEn,
      requirements: fields.requirements,
      requirements_en: fields.requirementsEn,
      location: fields.location,
      location_en: fields.locationEn,
      employment_type: fields.employmentType,
      status: fields.status,
      sort_order: fields.sortOrder,
      assessment_key: fields.assessmentKey,
      asks_discipline: fields.asksDiscipline,
      requires_hunt: fields.requiresHunt,
      careers_pipeline: fields.careersPipeline,
      hire_ops_role: fields.hireOpsRole,
      interview_plan: fields.interviewPlan,
      hire_monthly_compensation: fields.hireCompensation,
      hire_currency: fields.hireCurrency,
      hire_work_modality: fields.hireWorkModality,
      published_at: publishedAt,
      created_by: user.id,
    })
    .select('id, slug')
    .single();

  if (error || !data) throw await throwDb(error);

  await logActivity({
    entityType: 'job_posting',
    entityId: data.id,
    action: 'created',
    metadata: { slug: data.slug, status: fields.status },
    actorId: user.id,
  });

  revalidateCareerPaths(data.slug);
}

export async function updateJobPosting(postingId: string, formData: FormData) {
  const { user, supabase } = await requireAdminStaff();
  const fields = parsePostingFields(formData);

  const { data: current, error: currentError } = await supabase
    .from('ops_job_postings')
    .select('id, slug, status, published_at')
    .eq('id', postingId)
    .single();

  if (currentError || !current) throw new Error('Vacante no encontrada');

  const slug = await pickUniqueSlug(supabase, fields.slugRaw || fields.title, postingId);
  let publishedAt = current.published_at as string | null;
  if (fields.status === 'published' && current.status !== 'published') {
    publishedAt = new Date().toISOString();
  }

  const { error } = await supabase
    .from('ops_job_postings')
    .update({
      title: fields.title,
      title_en: fields.titleEn,
      slug,
      description: fields.description,
      description_en: fields.descriptionEn,
      requirements: fields.requirements,
      requirements_en: fields.requirementsEn,
      location: fields.location,
      location_en: fields.locationEn,
      employment_type: fields.employmentType,
      status: fields.status,
      sort_order: fields.sortOrder,
      assessment_key: fields.assessmentKey,
      asks_discipline: fields.asksDiscipline,
      requires_hunt: fields.requiresHunt,
      careers_pipeline: fields.careersPipeline,
      hire_ops_role: fields.hireOpsRole,
      interview_plan: fields.interviewPlan,
      hire_monthly_compensation: fields.hireCompensation,
      hire_currency: fields.hireCurrency,
      hire_work_modality: fields.hireWorkModality,
      published_at: publishedAt,
    })
    .eq('id', postingId);

  if (error) throw await throwDb(error);

  await logActivity({
    entityType: 'job_posting',
    entityId: postingId,
    action: 'updated',
    metadata: { slug, status: fields.status },
    actorId: user.id,
  });

  revalidateCareerPaths(slug);
  if (current.slug !== slug) revalidateCareerPaths(current.slug);
  revalidatePath(`/team/vacantes/${postingId}`);
}

export async function deleteJobPosting(postingId: string) {
  const { user, supabase } = await requireAdminStaff();
  const t = await getT();

  const { data: current, error: currentError } = await supabase
    .from('ops_job_postings')
    .select('id, slug, status')
    .eq('id', postingId)
    .single();

  if (currentError || !current) throw new Error(t('ops.careers.notFound'));

  const { data: apps } = await supabase.from('ops_job_applications').select('id').eq('job_posting_id', postingId);
  await purgeApplicationFiles((apps ?? []).map((row) => row.id));

  const { error } = await supabase.from('ops_job_postings').delete().eq('id', postingId);
  if (error) throw await throwDb(error);

  await logActivity({
    entityType: 'job_posting',
    entityId: postingId,
    action: 'deleted',
    metadata: { slug: current.slug },
    actorId: user.id,
  });

  revalidateCareerPaths(current.slug);
}

export async function deleteJobApplication(applicationId: string) {
  const { user, supabase, staff } = await requireAdminStaff();
  const t = await getT();
  await requireApplicationForReview(supabase, staff, applicationId);

  const { data: current, error: currentError } = await supabase
    .from('ops_job_applications')
    .select('id, full_name')
    .eq('id', applicationId)
    .maybeSingle();
  if (currentError || !current) throw new Error(t('ops.careers.applicationNotFound'));

  await purgeApplicationFiles([applicationId]);
  const { error } = await supabase.from('ops_job_applications').delete().eq('id', applicationId);
  if (error) throw await throwDb(error);

  await logActivity({
    entityType: 'job_application',
    entityId: applicationId,
    action: 'deleted',
    metadata: { name: current.full_name },
    actorId: user.id,
  });

  revalidatePath('/team');
  revalidatePath('/inbox');
  revalidatePath('/dashboard');
}

export async function updateJobApplicationStatus(applicationId: string, formData: FormData) {
  const { user, supabase, staff } = await requireCareersReview();
  const status = String(formData.get('status') || '').trim();
  if (!isJobApplicationStatus(status)) throw new Error('Estado inválido');

  await requireApplicationForReview(supabase, staff, applicationId);

  const { data: application } = await supabase
    .from('ops_job_applications')
    .select('id, email, full_name, status, discipline, ops_job_postings(title, slug)')
    .eq('id', applicationId)
    .maybeSingle();

  if (!application) throw new Error('Postulación no encontrada');

  const posting = postingFromApplication(application);

  const { error } = await supabase
    .from('ops_job_applications')
    .update({ status })
    .eq('id', applicationId);

  if (error) throw await throwDb(error);

  const jobTitle = applicationRoleLabel({
    postingTitle: posting?.title,
    discipline: application.discipline,
  });
  const notify =
    formData.get('notify_candidate') === '1' &&
    application.status !== status &&
    Boolean(application.email) &&
    Boolean(jobTitle);

  if (notify) {
    const email = application.email;
    const name = application.full_name;
    after(() =>
      notifyCandidateApplicationStatus({
        email,
        name,
        jobTitle,
        status,
      })
    );
  }

  await logActivity({
    entityType: 'job_application',
    entityId: applicationId,
    action: 'status_updated',
    metadata: { status, notified: Boolean(notify) },
    actorId: user.id,
  });

  if (status === 'interview' && application.status !== 'interview') {
    await seedInterviewRoundsFromPosting(supabase, applicationId, user.id);
  }

  revalidatePath('/team');
  revalidatePath('/inbox');
  revalidatePath('/dashboard');
}

export async function addJobInterviewRound(applicationId: string, formData: FormData) {
  const { user, supabase, staff } = await requireCareersReview();
  const application = await requireApplicationForReview(supabase, staff, applicationId);

  const kind = String(formData.get('kind') || '').trim();
  if (!isJobInterviewKind(kind)) throw new Error('Tipo de entrevista inválido');
  const t = await getT();
  const title =
    String(formData.get('title') || '').trim().slice(0, 120) || t(`ops.careers.interviewKind.${kind}`);
  const assigneeRaw = String(formData.get('assignee') || formData.get('interviewer_id') || '').trim();

  const { data: last } = await supabase
    .from('ops_job_interview_rounds')
    .select('sort_order')
    .eq('application_id', applicationId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: round, error } = await supabase
    .from('ops_job_interview_rounds')
    .insert({
      application_id: applicationId,
      sort_order: (last?.sort_order ?? -1) + 1,
      kind,
      title,
      status: 'planned',
      created_by: user.id,
    })
    .select('id')
    .single();

  if (error || !round) throw await throwDb(error);

  await syncRoundAssignee({
    roundId: round.id,
    applicationId: application.id,
    assigneeRaw,
    actorId: user.id,
  });
  await maybePromoteToInterview(supabase, application, user.id);
  await logActivity({
    entityType: 'job_application',
    entityId: applicationId,
    action: 'interview_round_added',
    metadata: { roundId: round.id, kind },
    actorId: user.id,
  });

  revalidatePath('/team');
}

export async function updateJobInterviewRound(roundId: string, formData: FormData) {
  const { user, supabase, staff } = await requireCareersReview();
  if (!isUuid(roundId)) throw new Error('Fase inválida');

  const { data: round } = await supabase
    .from('ops_job_interview_rounds')
    .select('id, application_id, status, conducted_at')
    .eq('id', roundId)
    .maybeSingle();
  if (!round) throw new Error('Fase no encontrada');
  await requireApplicationForReview(supabase, staff, round.application_id);

  const title = String(formData.get('title') || '').trim().slice(0, 120);
  if (title.length < 1) throw new Error('Título requerido');
  const kind = String(formData.get('kind') || '').trim();
  if (!isJobInterviewKind(kind)) throw new Error('Tipo de entrevista inválido');
  const status = String(formData.get('status') || '').trim();
  if (!isJobInterviewRoundStatus(status)) throw new Error('Estado de fase inválido');
  const outcomeRaw = String(formData.get('outcome') || '').trim();
  const outcome = outcomeRaw && isJobInterviewOutcome(outcomeRaw) ? outcomeRaw : null;
  const assigneeRaw = String(formData.get('assignee') || formData.get('interviewer_id') || '').trim();

  const conductedAt =
    status === 'done' && !round.conducted_at ? new Date().toISOString() : round.conducted_at;

  const { error } = await supabase
    .from('ops_job_interview_rounds')
    .update({
      title,
      kind,
      status,
      outcome,
      conducted_at: conductedAt,
    })
    .eq('id', roundId);

  if (error) throw await throwDb(error);

  await syncRoundAssignee({
    roundId,
    applicationId: round.application_id,
    assigneeRaw,
    actorId: user.id,
  });

  await logActivity({
    entityType: 'job_application',
    entityId: round.application_id,
    action: 'interview_round_updated',
    metadata: { roundId, status, outcome },
    actorId: user.id,
  });

  revalidatePath('/team');
}

export async function addJobInterviewComment(roundId: string, formData: FormData) {
  const { user, supabase, staff } = await requireCareersReview();
  if (!isUuid(roundId)) throw new Error('Fase inválida');

  const { data: round } = await supabase
    .from('ops_job_interview_rounds')
    .select('id, application_id, interviewer_id')
    .eq('id', roundId)
    .maybeSingle();
  if (!round) throw new Error('Fase no encontrada');
  await requireApplicationForReview(supabase, staff, round.application_id);

  const canComment =
    can(staff, 'team') || !round.interviewer_id || round.interviewer_id === user.id;
  if (!canComment) throw new Error('Solo quien entrevistó puede comentar esta fase');

  const body = String(formData.get('body') || '').trim().slice(0, 4000);
  if (body.length < 1) throw new Error('Escribe un comentario');

  const { error } = await supabase.from('ops_job_interview_comments').insert({
    round_id: roundId,
    author_id: user.id,
    body,
  });
  if (error) throw await throwDb(error);

  await logActivity({
    entityType: 'job_application',
    entityId: round.application_id,
    action: 'interview_commented',
    metadata: { roundId },
    actorId: user.id,
  });

  revalidatePath('/team');
}

export async function deleteJobInterviewRound(roundId: string) {
  const { user, supabase, staff } = await requireCareersReview();
  const t = await getT();
  if (!isUuid(roundId)) throw new Error(t('ops.careers.interviewRoundInvalid'));

  const { data: round } = await supabase
    .from('ops_job_interview_rounds')
    .select('id, application_id')
    .eq('id', roundId)
    .maybeSingle();
  if (!round) throw new Error(t('ops.careers.interviewRoundNotFound'));
  await requireApplicationForReview(supabase, staff, round.application_id);

  const { data: reports } = await supabase
    .from('ops_interview_reports')
    .select('storage_path')
    .eq('round_id', roundId);
  const reportPaths = (reports ?? []).map((row) => row.storage_path).filter(Boolean);
  if (reportPaths.length) {
    const admin = createAdminClient();
    await admin.storage.from(INTERVIEW_REPORT_BUCKET).remove(reportPaths);
  }

  const { error } = await supabase.from('ops_job_interview_rounds').delete().eq('id', roundId);
  if (error) throw await throwDb(error);

  await logActivity({
    entityType: 'job_application',
    entityId: round.application_id,
    action: 'interview_round_deleted',
    metadata: { roundId },
    actorId: user.id,
  });

  revalidatePath('/team');
}

export async function updateJobInterviewComment(commentId: string, formData: FormData) {
  const { user, supabase, staff } = await requireCareersReview();
  const t = await getT();
  if (!isUuid(commentId)) throw new Error(t('ops.careers.interviewCommentInvalid'));
  const body = String(formData.get('body') || '').trim().slice(0, 4000);
  if (body.length < 1) throw new Error(t('ops.careers.interviewCommentRequired'));

  const { data: comment } = await supabase
    .from('ops_job_interview_comments')
    .select('id, round_id, author_id')
    .eq('id', commentId)
    .maybeSingle();
  if (!comment) throw new Error(t('ops.careers.interviewCommentNotFound'));

  const { data: round } = await supabase
    .from('ops_job_interview_rounds')
    .select('id, application_id')
    .eq('id', comment.round_id)
    .maybeSingle();
  if (!round) throw new Error(t('ops.careers.interviewRoundNotFound'));
  await requireApplicationForReview(supabase, staff, round.application_id);
  if (!can(staff, 'team') && comment.author_id !== user.id) {
    throw new Error(t('ops.careers.interviewCommentForbidden'));
  }

  const { error } = await supabase.from('ops_job_interview_comments').update({ body }).eq('id', commentId);
  if (error) throw await throwDb(error);

  await logActivity({
    entityType: 'job_application',
    entityId: round.application_id,
    action: 'interview_comment_updated',
    metadata: { commentId },
    actorId: user.id,
  });

  revalidatePath('/team');
}

export async function deleteJobInterviewComment(commentId: string) {
  const { user, supabase, staff } = await requireCareersReview();
  const t = await getT();
  if (!isUuid(commentId)) throw new Error(t('ops.careers.interviewCommentInvalid'));

  const { data: comment } = await supabase
    .from('ops_job_interview_comments')
    .select('id, round_id, author_id')
    .eq('id', commentId)
    .maybeSingle();
  if (!comment) throw new Error(t('ops.careers.interviewCommentNotFound'));

  const { data: round } = await supabase
    .from('ops_job_interview_rounds')
    .select('id, application_id')
    .eq('id', comment.round_id)
    .maybeSingle();
  if (!round) throw new Error(t('ops.careers.interviewRoundNotFound'));
  await requireApplicationForReview(supabase, staff, round.application_id);
  if (!can(staff, 'team') && comment.author_id !== user.id) {
    throw new Error(t('ops.careers.interviewCommentForbidden'));
  }

  const { error } = await supabase.from('ops_job_interview_comments').delete().eq('id', commentId);
  if (error) throw await throwDb(error);

  await logActivity({
    entityType: 'job_application',
    entityId: round.application_id,
    action: 'interview_comment_deleted',
    metadata: { commentId },
    actorId: user.id,
  });

  revalidatePath('/team');
}

export async function createPersonnelOfferFromApplication(applicationId: string) {
  const { user, supabase } = await requireAdminStaff();

  const { data: application, error } = await supabase
    .from('ops_job_applications')
    .select(
      'id, full_name, email, cover_letter, discipline, personnel_offer_id, ops_job_postings(title, slug, hire_ops_role, hire_monthly_compensation, hire_currency, hire_work_modality, requirements)'
    )
    .eq('id', applicationId)
    .single();

  if (error || !application) throw new Error('Postulación no encontrada');
  if (application.personnel_offer_id) {
    redirect(`/team/ofertas/${application.personnel_offer_id}`);
  }

  const posting = Array.isArray(application.ops_job_postings)
    ? application.ops_job_postings[0]
    : application.ops_job_postings;
  const discipline =
    typeof application.discipline === 'string' && isCareerDiscipline(application.discipline)
      ? application.discipline
      : null;
  const disciplineLabel = discipline ? CAREER_DISCIPLINE_LABELS[discipline] : null;
  const positionTitle = String(posting?.title || application.full_name).trim() || application.full_name;
  const careerEmail = application.email.toLowerCase();
  const notes = [
    `Origen: bolsa de trabajo (${posting?.slug || 'vacante'}).`,
    disciplineLabel ? `Oficio: ${disciplineLabel}.` : null,
    application.cover_letter ? `Mensaje del candidato:\n${application.cover_letter}` : null,
  ]
    .filter(Boolean)
    .join('\n\n');
  const hireCompensation = parseHireCompensation(
    posting && typeof posting === 'object' ? posting.hire_monthly_compensation : null
  );
  if (hireCompensation == null) {
    const t = await getT();
    throw new Error(t('ops.careers.hireCompensationRequired'));
  }
  const hireCurrency = parseHireCurrency(
    posting && typeof posting === 'object' ? posting.hire_currency : null
  );
  const hireModalityRaw =
    posting && typeof posting === 'object' ? String(posting.hire_work_modality || '').trim() : '';
  const hireWorkModality = isJobHireWorkModality(hireModalityRaw) ? hireModalityRaw : 'remote';
  const responsibilities =
    posting && typeof posting === 'object' ? String(posting.requirements || '').trim() : '';

  const { data: existing } = await supabase
    .from('ops_personnel_offers')
    .select('id, career_email')
    .or(`career_email.ilike."${careerEmail}",email.ilike."${careerEmail}"`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    if (!existing.career_email) {
      await supabase.from('ops_personnel_offers').update({ career_email: careerEmail }).eq('id', existing.id);
    }
    await supabase
      .from('ops_job_applications')
      .update({ status: 'hired', personnel_offer_id: existing.id })
      .eq('id', applicationId);
    await logActivity({
      entityType: 'job_application',
      entityId: applicationId,
      action: 'hired',
      metadata: { offerId: existing.id, linkedExisting: true },
      actorId: user.id,
    });
    revalidatePath('/team');
    revalidatePath(`/team/ofertas/${existing.id}`);
    redirect(`/team/ofertas/${existing.id}`);
  }

  const { data: offer, error: offerError } = await supabase
    .from('ops_personnel_offers')
    .insert({
      full_name: application.full_name,
      email: application.email,
      career_email: careerEmail,
      position_title: positionTitle,
      ops_role: postingHireOpsRole(posting),
      monthly_compensation: hireCompensation,
      currency: hireCurrency,
      work_modality: hireWorkModality,
      status: 'draft',
      issued_at: new Date().toISOString().slice(0, 10),
      responsibilities,
      notes_internal: notes,
      created_by: user.id,
    })
    .select('id')
    .single();

  if (offerError || !offer) throw await throwDb(offerError);

  await supabase
    .from('ops_job_applications')
    .update({ status: 'hired', personnel_offer_id: offer.id })
    .eq('id', applicationId);

  await logActivity({
    entityType: 'job_application',
    entityId: applicationId,
    action: 'hired',
    metadata: { offerId: offer.id },
    actorId: user.id,
  });

  revalidatePath('/team');
  revalidatePath(`/team/ofertas/${offer.id}`);
  redirect(`/team/ofertas/${offer.id}`);
}

export async function updateHuntReportReview(reportId: string, formData: FormData) {
  const { user, supabase } = await requireCareersReview();
  const status = String(formData.get('review_status') || '').trim();
  if (status !== 'open' && status !== 'noted' && status !== 'discarded') {
    throw new Error('Estado de revisión inválido');
  }
  if (!/^[0-9a-f-]{36}$/i.test(reportId)) throw new Error('Hallazgo inválido');

  const { error } = await supabase
    .from('ops_hunt_reports')
    .update({
      review_status: status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq('id', reportId);

  if (error) throw new Error('No se pudo guardar la revisión');

  await logActivity({
    entityType: 'hunt_report',
    entityId: reportId,
    action: 'reviewed',
    metadata: { review_status: status },
    actorId: user.id,
  });

  const attemptId = String(formData.get('attempt_id') || '').trim();
  const offerId = String(formData.get('offer_id') || '').trim();
  revalidatePath('/team');
  if (attemptId) revalidatePath(`/team/intentos/${attemptId}`);
  if (offerId) revalidatePath(`/team/ofertas/${offerId}`);
  revalidatePath('/inbox');
  revalidatePath('/dashboard');
}
