'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { after } from 'next/server';
import { requireAdminStaff, requireCareersReview, requireInterviewPartner, requireInterviewPartnerWithAcceptances } from '@/lib/ops/auth';
import {
  INTERVIEW_VIEW_AS_COOKIE,
  INTERVIEW_VIEW_AS_MAX_AGE,
  loadInterviewMemberById,
} from '@/lib/ops/interview-view-as';
import { LEGAL_DOCS_VERSION } from '@/lib/ops/legal/version';
import { logActivity } from '@/lib/ops/activity';
import { throwDb } from '@/lib/ops/throw-db';
import { inviteInterviewPartnerCore } from '@/lib/ops/interview-invite';
import {
  INTERVIEW_MAX_REPORT_BYTES,
  INTERVIEW_REPORT_BUCKET,
  buildInterviewReportPath,
  isInterviewUuid,
  parseInterviewAssignee,
  resolveInterviewReportMime,
} from '@/lib/ops/interview-partner';
import {
  isJobInterviewOutcome,
  isJobInterviewRoundStatus,
} from '@/lib/ops/careers';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendClientEmail } from '@/lib/ops/email';
import { templateInterviewAssigned } from '@/lib/ops/email-templates';
import { interviewsApplicationUrl } from '@/lib/ops/host';
import { getT } from '@/i18n/locale';

function revalidateInterviewPaths() {
  revalidatePath('/team');
  revalidatePath('/entrevistas');
}

export async function startInterviewPartnerViewAs(formData: FormData) {
  await requireCareersReview();
  const memberId = String(formData.get('member_id') || '').trim();
  const loaded = await loadInterviewMemberById(memberId);
  if (!loaded) throw new Error('Entrevistador no encontrado');
  const jar = await cookies();
  jar.set(INTERVIEW_VIEW_AS_COOKIE, loaded.member.id, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: INTERVIEW_VIEW_AS_MAX_AGE,
  });
  redirect('/entrevistas');
}

export async function stopInterviewPartnerViewAs() {
  await requireCareersReview();
  const jar = await cookies();
  jar.set(INTERVIEW_VIEW_AS_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  redirect('/team?tab=entrevistadores');
}

export async function inviteInterviewPartner(formData: FormData) {
  const { user } = await requireAdminStaff();
  await inviteInterviewPartnerCore({
    email: String(formData.get('email') || ''),
    fullName: String(formData.get('fullName') || ''),
    role: String(formData.get('role') || 'interviewer'),
    partnerId: String(formData.get('partnerId') || '').trim() || null,
    partnerName: String(formData.get('partnerName') || '').trim() || null,
    actorId: user.id,
  });
  revalidateInterviewPaths();
}

export async function setInterviewPartnerMemberActive(memberId: string, formData: FormData) {
  await requireAdminStaff();
  if (!isInterviewUuid(memberId)) throw new Error('Miembro inválido');
  const active = String(formData.get('active') || '') === '1';
  const admin = createAdminClient();
  const { error } = await admin
    .from('ops_recruiting_partner_members')
    .update({ active })
    .eq('id', memberId);
  if (error) throw await throwDb(error);
  await logActivity({
    entityType: 'interview_partner_member',
    entityId: memberId,
    action: active ? 'interview_partner_activated' : 'interview_partner_revoked',
  });
  revalidateInterviewPaths();
}

export async function assignInterviewScope(formData: FormData) {
  const { user } = await requireCareersReview();
  const memberId = String(formData.get('member_id') || '').trim();
  if (!isInterviewUuid(memberId)) throw new Error('Elige un entrevistador');
  const roundId = String(formData.get('round_id') || '').trim();
  const applicationId = String(formData.get('application_id') || '').trim();
  const jobPostingId = String(formData.get('job_posting_id') || '').trim();
  const scopes = [roundId, applicationId, jobPostingId].filter((value) => isInterviewUuid(value));
  if (scopes.length !== 1) throw new Error('Elige un alcance');

  const payload = {
    member_id: memberId,
    assigned_by: user.id,
    round_id: isInterviewUuid(roundId) ? roundId : null,
    application_id: isInterviewUuid(applicationId) ? applicationId : null,
    job_posting_id: isInterviewUuid(jobPostingId) ? jobPostingId : null,
  };

  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from('ops_interview_assignments')
    .insert(payload)
    .select('id, application_id, round_id, job_posting_id')
    .single();
  if (error || !row) throw await throwDb(error);

  if (payload.round_id) {
    await admin
      .from('ops_job_interview_rounds')
      .update({ partner_member_id: memberId, interviewer_id: null })
      .eq('id', payload.round_id);
  }

  const applicationIdForMail = await resolveAssignmentApplicationId(admin, payload);
  after(() => notifyAssignment(memberId, applicationIdForMail));
  await logActivity({
    entityType: 'job_application',
    entityId: applicationIdForMail || memberId,
    action: 'interview_assigned',
    metadata: { assignmentId: row.id, memberId },
    actorId: user.id,
  });
  revalidateInterviewPaths();
}

export async function removeInterviewAssignment(assignmentId: string) {
  await requireCareersReview();
  if (!isInterviewUuid(assignmentId)) throw new Error('Asignación inválida');
  const admin = createAdminClient();
  const { data: row } = await admin
    .from('ops_interview_assignments')
    .select('id, round_id, member_id')
    .eq('id', assignmentId)
    .maybeSingle();
  if (!row) throw new Error('Asignación no encontrada');
  const { error } = await admin.from('ops_interview_assignments').delete().eq('id', assignmentId);
  if (error) throw await throwDb(error);
  if (row.round_id) {
    await admin
      .from('ops_job_interview_rounds')
      .update({ partner_member_id: null })
      .eq('id', row.round_id)
      .eq('partner_member_id', row.member_id);
  }
  revalidateInterviewPaths();
}

export async function deleteInterviewPartnerMember(memberId: string) {
  await requireAdminStaff();
  const t = await getT();
  if (!isInterviewUuid(memberId)) throw new Error(t('ops.team.interviewerInvalid'));
  const admin = createAdminClient();
  const { data: row } = await admin
    .from('ops_recruiting_partner_members')
    .select('id, user_id, full_name')
    .eq('id', memberId)
    .maybeSingle();
  if (!row) throw new Error(t('ops.team.interviewerNotFound'));

  await admin.from('ops_interview_assignments').delete().eq('member_id', memberId);
  await admin
    .from('ops_job_interview_rounds')
    .update({ partner_member_id: null })
    .eq('partner_member_id', memberId);
  const { error } = await admin.from('ops_recruiting_partner_members').delete().eq('id', memberId);
  if (error) throw await throwDb(error);

  const { data: staff } = await admin.from('staff_profiles').select('id').eq('id', row.user_id).maybeSingle();
  if (!staff?.id) {
    await admin.auth.admin.deleteUser(row.user_id).catch(() => undefined);
  }

  await logActivity({
    entityType: 'interview_partner_member',
    entityId: memberId,
    action: 'interview_partner_deleted',
    metadata: { name: row.full_name },
  });
  revalidateInterviewPaths();
}

export async function syncRoundAssignee(opts: {
  roundId: string;
  applicationId: string;
  assigneeRaw: string;
  actorId: string;
}) {
  const assignee = parseInterviewAssignee(opts.assigneeRaw);
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from('ops_interview_assignments')
    .select('id, member_id')
    .eq('round_id', opts.roundId);

  if (assignee.kind === 'partner') {
    await admin
      .from('ops_job_interview_rounds')
      .update({ interviewer_id: null, partner_member_id: assignee.id })
      .eq('id', opts.roundId);
    const already = (existing ?? []).some((row) => row.member_id === assignee.id);
    for (const row of existing ?? []) {
      if (row.member_id !== assignee.id) {
        await admin.from('ops_interview_assignments').delete().eq('id', row.id);
      }
    }
    if (!already) {
      const { error } = await admin.from('ops_interview_assignments').insert({
        member_id: assignee.id,
        round_id: opts.roundId,
        assigned_by: opts.actorId,
      });
      if (error) throw await throwDb(error);
      after(() => notifyAssignment(assignee.id, opts.applicationId));
    }
    return { interviewerId: null as string | null, partnerMemberId: assignee.id };
  }

  for (const row of existing ?? []) {
    await admin.from('ops_interview_assignments').delete().eq('id', row.id);
  }
  await admin
    .from('ops_job_interview_rounds')
    .update({
      interviewer_id: assignee.kind === 'staff' ? assignee.id : null,
      partner_member_id: null,
    })
    .eq('id', opts.roundId);
  return {
    interviewerId: assignee.kind === 'staff' ? assignee.id : null,
    partnerMemberId: null as string | null,
  };
}

export async function acceptInterviewLegalDocuments(formData: FormData) {
  const { member, supabase } = await requireInterviewPartner();
  const t = await getT();
  if (formData.get('acceptTerms') !== 'on' || formData.get('acceptPrivacy') !== 'on' || formData.get('acceptNda') !== 'on') {
    throw new Error(t('interviews.legal.required'));
  }
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('ops_recruiting_partner_members')
    .update({
      terms_accepted_at: now,
      terms_version: LEGAL_DOCS_VERSION,
      privacy_accepted_at: now,
      privacy_version: LEGAL_DOCS_VERSION,
      nda_accepted_at: now,
      nda_version: LEGAL_DOCS_VERSION,
    })
    .eq('id', member.id);
  if (error) throw await throwDb(error);
  revalidatePath('/entrevistas');
  revalidatePath('/aceptar');
}

export async function partnerUpdateInterviewRound(roundId: string, formData: FormData) {
  const { user, supabase } = await requireInterviewPartnerWithAcceptances();
  if (!isInterviewUuid(roundId)) throw new Error('Fase inválida');
  const status = String(formData.get('status') || '').trim();
  if (!isJobInterviewRoundStatus(status)) throw new Error('Estado de fase inválido');
  const outcomeRaw = String(formData.get('outcome') || '').trim();
  const outcome = outcomeRaw && isJobInterviewOutcome(outcomeRaw) ? outcomeRaw : null;

  const { data: round } = await supabase
    .from('ops_job_interview_rounds')
    .select('id, application_id, conducted_at, status')
    .eq('id', roundId)
    .maybeSingle();
  if (!round) throw new Error('Fase no encontrada');

  const conductedAt =
    status === 'done' && !round.conducted_at ? new Date().toISOString() : round.conducted_at;

  const { error } = await supabase
    .from('ops_job_interview_rounds')
    .update({ status, outcome, conducted_at: conductedAt })
    .eq('id', roundId);
  if (error) throw await throwDb(error);

  await logActivity({
    entityType: 'job_application',
    entityId: round.application_id,
    action: 'interview_round_updated',
    metadata: { roundId, status, outcome, partner: true },
    actorId: user.id,
  });
  revalidateInterviewPaths();
  revalidatePath(`/entrevistas/${round.application_id}`);
}

export async function partnerAddInterviewComment(roundId: string, formData: FormData) {
  const { user, supabase } = await requireInterviewPartnerWithAcceptances();
  if (!isInterviewUuid(roundId)) throw new Error('Fase inválida');
  const body = String(formData.get('body') || '').trim().slice(0, 4000);
  if (body.length < 1) throw new Error('Escribe un comentario');

  const { data: round } = await supabase
    .from('ops_job_interview_rounds')
    .select('id, application_id')
    .eq('id', roundId)
    .maybeSingle();
  if (!round) throw new Error('Fase no encontrada');

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
    metadata: { roundId, partner: true },
    actorId: user.id,
  });
  revalidatePath(`/entrevistas/${round.application_id}`);
}

export async function partnerUploadInterviewReport(roundId: string, formData: FormData) {
  const { user, supabase } = await requireInterviewPartnerWithAcceptances();
  if (!isInterviewUuid(roundId)) throw new Error('Fase inválida');
  const { data: round } = await supabase
    .from('ops_job_interview_rounds')
    .select('id, application_id')
    .eq('id', roundId)
    .maybeSingle();
  if (!round) throw new Error('Fase no encontrada');

  const file = formData.get('file');
  if (!(file instanceof File) || file.size < 1) throw new Error('Adjunta un análisis (.pdf, .doc o .docx)');
  const mime = resolveInterviewReportMime({ mimeType: file.type, filename: file.name });
  if (!mime) throw new Error('El análisis debe ser PDF o Word (.doc / .docx)');
  if (file.size > INTERVIEW_MAX_REPORT_BYTES) throw new Error('El archivo supera 10 MB');
  const notes = String(formData.get('notes') || '').trim().slice(0, 4000) || null;
  const originalFilename = file.name || `analisis${mime === 'application/pdf' ? '.pdf' : mime === 'application/msword' ? '.doc' : '.docx'}`;
  const path = buildInterviewReportPath(roundId, originalFilename, mime);
  const buffer = Buffer.from(await file.arrayBuffer());
  const admin = createAdminClient();
  const { error: uploadError } = await admin.storage.from(INTERVIEW_REPORT_BUCKET).upload(path, buffer, {
    contentType: mime,
    upsert: false,
  });
  if (uploadError) throw await throwDb(uploadError);

  const { error } = await supabase.from('ops_interview_reports').insert({
    round_id: roundId,
    uploaded_by: user.id,
    storage_path: path,
    original_filename: originalFilename.slice(0, 200),
    notes,
  });
  if (error) throw await throwDb(error);
  await logActivity({
    entityType: 'job_application',
    entityId: round.application_id,
    action: 'interview_report_uploaded',
    metadata: { roundId, path },
    actorId: user.id,
  });
  revalidatePath(`/entrevistas/${round.application_id}`);
  revalidatePath('/team');
}

async function resolveAssignmentApplicationId(
  admin: ReturnType<typeof createAdminClient>,
  payload: { round_id: string | null; application_id: string | null; job_posting_id: string | null }
) {
  if (payload.application_id) return payload.application_id;
  if (payload.round_id) {
    const { data } = await admin
      .from('ops_job_interview_rounds')
      .select('application_id')
      .eq('id', payload.round_id)
      .maybeSingle();
    return data?.application_id ?? null;
  }
  if (payload.job_posting_id) {
    const { data } = await admin
      .from('ops_job_applications')
      .select('id')
      .eq('job_posting_id', payload.job_posting_id)
      .eq('status', 'interview')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return data?.id ?? null;
  }
  return null;
}

async function notifyAssignment(memberId: string, applicationId: string | null) {
  if (!applicationId) return;
  const admin = createAdminClient();
  const { data: member } = await admin
    .from('ops_recruiting_partner_members')
    .select('full_name, user_id')
    .eq('id', memberId)
    .maybeSingle();
  if (!member?.user_id) return;
  const { data: authUser } = await admin.auth.admin.getUserById(member.user_id);
  const email = authUser.user?.email;
  if (!email) return;
  const { data: application } = await admin
    .from('ops_job_applications')
    .select('full_name, ops_job_postings(title)')
    .eq('id', applicationId)
    .maybeSingle();
  const posting = Array.isArray(application?.ops_job_postings)
    ? application?.ops_job_postings[0]
    : application?.ops_job_postings;
  const html = templateInterviewAssigned({
    recipientName: member.full_name,
    candidateName: application?.full_name || 'candidato',
    jobTitle: posting?.title || 'vacante',
    href: interviewsApplicationUrl(applicationId),
  });
  await sendClientEmail({
    to: email,
    subject: `Fase de entrevista pendiente · ${application?.full_name || 'candidato'}`,
    html,
  });
}
