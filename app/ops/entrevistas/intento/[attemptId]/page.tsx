import Link from 'next/link';
import InterviewsChrome from '@/components/ops/InterviewsChrome';
import InterviewCandidateBrief from '@/components/ops/InterviewCandidateBrief';
import StatusBadge from '@/components/ops/StatusBadge';
import OpsReportLightbox from '@/components/ops/OpsReportLightbox';
import { requireInterviewsAccess } from '@/lib/ops/auth';
import { getAcceptanceStatus } from '@/lib/ops/legal/acceptances';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect, notFound } from 'next/navigation';
import { getT } from '@/i18n/locale';
import { isInterviewUuid } from '@/lib/ops/interview-partner';
import { partnerCanReadJobPosting } from '@/lib/ops/interview-file-access';
import { interviewsHref } from '@/lib/ops/interview-view-as';
import { loadInterviewPartnerBriefFromAttempt } from '@/lib/ops/interview-brief';
import { isFailedAssessmentAttempt } from '@/lib/careers/recruiting-stage';

export default async function InterviewsFailedAttemptPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  if (!isInterviewUuid(attemptId)) notFound();

  const access = await requireInterviewsAccess();
  if (!access.isStaffPreview && access.member && !getAcceptanceStatus(access.member).complete) {
    redirect(await interviewsHref('/aceptar'));
  }

  const admin = createAdminClient();
  const { data: attempt } = await admin
    .from('ops_job_assessment_attempts')
    .select('id, full_name, email, status, passed, score_pct, job_posting_id')
    .eq('id', attemptId)
    .maybeSingle();
  if (!attempt) notFound();
  if (!isFailedAssessmentAttempt(attempt)) notFound();

  if (access.member) {
    const allowed = await partnerCanReadJobPosting({
      memberId: access.member.id,
      jobPostingId: attempt.job_posting_id,
    });
    if (!allowed) notFound();
  } else if (!access.isStaffPreview) {
    notFound();
  }

  const [{ data: posting }, brief] = await Promise.all([
    admin.from('ops_job_postings').select('title').eq('id', attempt.job_posting_id).maybeSingle(),
    loadInterviewPartnerBriefFromAttempt(attemptId),
  ]);
  const t = await getT();
  const homeHref = await interviewsHref('/');

  return (
    <InterviewsChrome
      isStaffPreview={access.isStaffPreview}
      orgName={access.partner?.name}
      viewAsName={access.isStaffPreview ? access.member?.full_name : null}
    >
      <p className="text-sm">
        <Link href={homeHref} className="text-codiva-primary hover:underline">
          {t('interviews.back')}
        </Link>
      </p>
      <h1 className="mt-3 text-2xl font-bold text-zinc-900">{attempt.full_name}</h1>
      {posting?.title ? <p className="text-sm font-medium text-codiva-primary">{posting.title}</p> : null}
      <p className="mt-1 text-sm text-zinc-500">
        {t('interviews.contact')}: {attempt.email}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatusBadge
          label={attempt.status === 'expired' ? t('interviews.expiredBadge') : t('interviews.failedBadge')}
          tone="danger"
        />
        {attempt.score_pct != null ? <StatusBadge label={`${attempt.score_pct}%`} tone="neutral" /> : null}
        {brief ? (
          <OpsReportLightbox
            title={t('interviews.brief.title')}
            htmlSrc={`/api/entrevistas/recruiting-report?attempt=${attempt.id}`}
            downloadHref={`/api/entrevistas/recruiting-report?attempt=${attempt.id}&format=pdf`}
            triggerLabel={t('interviews.brief.openReport')}
            downloadLabel={t('interviews.brief.downloadPdf')}
          />
        ) : null}
      </div>
      <p className="mt-4 text-sm text-zinc-600">{t('interviews.failedReadOnly')}</p>
      {brief ? <InterviewCandidateBrief brief={brief} t={t} /> : null}
    </InterviewsChrome>
  );
}
