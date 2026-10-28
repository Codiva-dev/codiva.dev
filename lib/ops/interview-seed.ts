import { after } from 'next/server';
import { getT } from '@/i18n/locale';
import { logActivity } from '@/lib/ops/activity';
import { parseInterviewPlan, seedInterviewKinds, type JobInterviewKind } from '@/lib/ops/careers';
import { sendClientEmail } from '@/lib/ops/email';
import { templateInterviewAssigned } from '@/lib/ops/email-templates';
import { interviewsApplicationUrl } from '@/lib/ops/host';
import { throwDb } from '@/lib/ops/throw-db';
import { createAdminClient } from '@/lib/supabase/admin';

type AdminClient = ReturnType<typeof createAdminClient>;

type AssignmentClient = {
  from: AdminClient['from'];
};

const HANDOFF_ELIGIBLE_STATUSES = new Set(['new', 'reviewed', 'interview']);

export function isExternalHandoffEligibleStatus(status: string): boolean {
  return HANDOFF_ELIGIBLE_STATUSES.has(status);
}

export async function partnerMemberIdsForApplication(
  supabase: AssignmentClient,
  applicationId: string,
  jobPostingId: string | null
): Promise<string[]> {
  const [{ data: byApplication }, { data: byJob }] = await Promise.all([
    supabase.from('ops_interview_assignments').select('member_id').eq('application_id', applicationId),
    jobPostingId
      ? supabase.from('ops_interview_assignments').select('member_id').eq('job_posting_id', jobPostingId)
      : Promise.resolve({ data: [] as { member_id: string }[] }),
  ]);
  const ids = [
    ...new Set([...(byApplication ?? []), ...(byJob ?? [])].map((row) => row.member_id).filter(Boolean)),
  ];
  if (!ids.length) return [];
  const { data: members } = await supabase
    .from('ops_recruiting_partner_members')
    .select('id')
    .in('id', ids)
    .eq('active', true);
  return (members ?? []).map((row) => row.id);
}

async function notifyPartnerAssigned(memberId: string, applicationId: string) {
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

async function pinScreeningToPartner(opts: {
  supabase: AssignmentClient;
  screeningRoundId: string;
  applicationId: string;
  memberId: string;
  actorId: string | null;
}) {
  const { data: existing } = await opts.supabase
    .from('ops_interview_assignments')
    .select('id, member_id')
    .eq('round_id', opts.screeningRoundId);

  await opts.supabase
    .from('ops_job_interview_rounds')
    .update({ interviewer_id: null, partner_member_id: opts.memberId })
    .eq('id', opts.screeningRoundId);

  const already = (existing ?? []).some((row) => row.member_id === opts.memberId);
  for (const row of existing ?? []) {
    if (row.member_id !== opts.memberId) {
      await opts.supabase.from('ops_interview_assignments').delete().eq('id', row.id);
    }
  }
  if (!already) {
    const { error } = await opts.supabase.from('ops_interview_assignments').insert({
      member_id: opts.memberId,
      round_id: opts.screeningRoundId,
      assigned_by: opts.actorId,
    });
    if (error) throw await throwDb(error);
    after(() => notifyPartnerAssigned(opts.memberId, opts.applicationId));
  }
}

async function assignSeededScreeningToPartners(opts: {
  supabase: AssignmentClient;
  applicationId: string;
  jobPostingId: string | null;
  screeningRoundId: string;
  actorId: string | null;
  notify: boolean;
}) {
  const memberIds = await partnerMemberIdsForApplication(
    opts.supabase,
    opts.applicationId,
    opts.jobPostingId
  );
  if (!memberIds.length) return;
  if (memberIds.length === 1) {
    await pinScreeningToPartner({
      supabase: opts.supabase,
      screeningRoundId: opts.screeningRoundId,
      applicationId: opts.applicationId,
      memberId: memberIds[0],
      actorId: opts.actorId,
    });
    return;
  }
  if (opts.notify) {
    after(() => Promise.all(memberIds.map((memberId) => notifyPartnerAssigned(memberId, opts.applicationId))));
  }
}

export async function seedInterviewRoundsFromPosting(
  supabase: AssignmentClient,
  applicationId: string,
  actorId: string | null,
  opts?: { notifyPartners?: boolean }
): Promise<{ created: boolean; screeningId: string | null }> {
  const [{ data: existing }, { data: application }] = await Promise.all([
    supabase
      .from('ops_job_interview_rounds')
      .select('id, kind, sort_order')
      .eq('application_id', applicationId),
    supabase
      .from('ops_job_applications')
      .select('job_posting_id, ops_job_postings(interview_plan)')
      .eq('id', applicationId)
      .maybeSingle(),
  ]);

  const nested = application?.ops_job_postings;
  const posting = Array.isArray(nested) ? nested[0] : nested;
  const t = await getT();
  const screeningTitle = t('ops.careers.interviewKind.screening');
  let screeningId = (existing ?? []).find((row) => row.kind === 'screening')?.id ?? null;
  let created = false;

  if (!(existing ?? []).length) {
    const plan = seedInterviewKinds(parseInterviewPlan(posting?.interview_plan));
    const { data: inserted, error } = await supabase
      .from('ops_job_interview_rounds')
      .insert(
        plan.map((kind: JobInterviewKind, index: number) => ({
          application_id: applicationId,
          sort_order: index,
          kind,
          title: t(`ops.careers.interviewKind.${kind}`),
          status: 'planned',
          created_by: actorId,
        }))
      )
      .select('id, kind');
    if (error) throw await throwDb(error);
    screeningId = (inserted ?? []).find((row) => row.kind === 'screening')?.id ?? null;
    created = true;
  } else if (!screeningId) {
    const minOrder = Math.min(0, ...(existing ?? []).map((row) => row.sort_order));
    const { data: inserted, error } = await supabase
      .from('ops_job_interview_rounds')
      .insert({
        application_id: applicationId,
        sort_order: minOrder - 1,
        kind: 'screening',
        title: screeningTitle,
        status: 'planned',
        created_by: actorId,
      })
      .select('id')
      .single();
    if (error || !inserted) throw await throwDb(error);
    screeningId = inserted.id;
    created = true;
  }

  if (screeningId) {
    await assignSeededScreeningToPartners({
      supabase,
      applicationId,
      jobPostingId: application?.job_posting_id ?? null,
      screeningRoundId: screeningId,
      actorId,
      notify: opts?.notifyPartners ?? created,
    });
  }

  return { created, screeningId };
}

/** Promote + seed screening for external partners. Never emails the candidate. */
export async function handoffApplicationToExternalInterview(opts: {
  applicationId: string;
  actorId?: string | null;
  supabase?: AssignmentClient;
}): Promise<{ handedOff: boolean; reason?: string }> {
  const supabase = opts.supabase ?? createAdminClient();
  const { data: application } = await supabase
    .from('ops_job_applications')
    .select('id, status, job_posting_id')
    .eq('id', opts.applicationId)
    .maybeSingle();

  if (!application) return { handedOff: false, reason: 'missing' };
  if (!isExternalHandoffEligibleStatus(application.status)) {
    return { handedOff: false, reason: 'closed' };
  }

  const memberIds = await partnerMemberIdsForApplication(
    supabase,
    application.id,
    application.job_posting_id
  );
  if (!memberIds.length) return { handedOff: false, reason: 'no_partners' };

  const promoted = application.status !== 'interview';
  if (promoted) {
    const { error } = await supabase
      .from('ops_job_applications')
      .update({ status: 'interview' })
      .eq('id', application.id);
    if (error) throw await throwDb(error);
    await logActivity({
      entityType: 'job_application',
      entityId: application.id,
      action: 'status_updated',
      metadata: { status: 'interview', notified: false, autoExternalHandoff: true },
      actorId: opts.actorId ?? undefined,
    });
  }

  const seeded = await seedInterviewRoundsFromPosting(
    supabase,
    application.id,
    opts.actorId ?? null,
    { notifyPartners: promoted ? true : undefined }
  );

  return {
    handedOff: promoted || seeded.created || Boolean(seeded.screeningId),
    reason: promoted ? 'promoted' : seeded.created ? 'seeded' : 'assigned',
  };
}

export async function backfillExternalHandoffForJobPosting(opts: {
  jobPostingId: string;
  actorId?: string | null;
  supabase?: AssignmentClient;
}): Promise<{ handedOffIds: string[] }> {
  const supabase = opts.supabase ?? createAdminClient();
  const { data: applications } = await supabase
    .from('ops_job_applications')
    .select('id, status')
    .eq('job_posting_id', opts.jobPostingId)
    .in('status', [...HANDOFF_ELIGIBLE_STATUSES]);

  const handedOffIds: string[] = [];
  for (const row of applications ?? []) {
    const result = await handoffApplicationToExternalInterview({
      applicationId: row.id,
      actorId: opts.actorId,
      supabase,
    });
    if (result.handedOff) handedOffIds.push(row.id);
  }
  return { handedOffIds };
}
