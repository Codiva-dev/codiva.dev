import Link from 'next/link';
import InterviewsChrome from '@/components/ops/InterviewsChrome';
import InterviewCandidateBrief from '@/components/ops/InterviewCandidateBrief';
import StatusBadge from '@/components/ops/StatusBadge';
import ToastForm from '@/components/ops/ToastForm';
import CareerCvLightbox from '@/components/ops/CareerCvLightbox';
import OpsReportLightbox from '@/components/ops/OpsReportLightbox';
import { requireInterviewsAccess } from '@/lib/ops/auth';
import { getAcceptanceStatus } from '@/lib/ops/legal/acceptances';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect, notFound } from 'next/navigation';
import { getT } from '@/i18n/locale';
import { labelsFor } from '@/lib/ops/labels';
import {
  JOB_INTERVIEW_OUTCOMES,
  JOB_INTERVIEW_ROUND_STATUSES,
  isDiscardedApplicationStatus,
  isJobInterviewKind,
  isJobInterviewOutcome,
  isJobInterviewRoundStatus,
  jobApplicationStatusLabel,
} from '@/lib/ops/careers';
import {
  partnerAddInterviewComment,
  partnerUpdateInterviewRound,
  partnerUploadInterviewReport,
} from '@/lib/ops/interview-actions';
import {
  interviewFollowUp,
  isInterviewUuid,
  visibleApplicationIds,
} from '@/lib/ops/interview-partner';
import { interviewsHref } from '@/lib/ops/interview-view-as';
import { loadInterviewPartnerBrief } from '@/lib/ops/interview-brief';

export default async function InterviewsApplicationPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;
  if (!isInterviewUuid(applicationId)) notFound();

  const access = await requireInterviewsAccess();
  if (!access.isStaffPreview && access.member && !getAcceptanceStatus(access.member).complete) {
    redirect(await interviewsHref('/aceptar'));
  }

  const admin = createAdminClient();
  const { data: application } = await admin
    .from('ops_job_applications')
    .select('id, full_name, email, phone, status, job_posting_id, ops_job_postings(title)')
    .eq('id', applicationId)
    .maybeSingle();
  if (!application) notFound();

  const [{ data: rounds }, { data: assignments }, brief] = await Promise.all([
    admin
      .from('ops_job_interview_rounds')
      .select('id, application_id, sort_order, kind, title, status, outcome, conducted_at')
      .eq('application_id', applicationId)
      .order('sort_order', { ascending: true }),
    access.member
      ? admin
          .from('ops_interview_assignments')
          .select('round_id, application_id, job_posting_id')
          .eq('member_id', access.member.id)
      : Promise.resolve({ data: [] as never[] }),
    loadInterviewPartnerBrief(applicationId),
  ]);

  if (access.member) {
    const allowed = visibleApplicationIds(
      assignments ?? [],
      [{ id: application.id, job_posting_id: application.job_posting_id }],
      rounds ?? []
    );
    if (!allowed.includes(application.id)) notFound();
  }

  const roundIds = (rounds ?? []).map((row) => row.id);
  const [{ data: comments }, { data: reports }] = await Promise.all([
    roundIds.length
      ? admin
          .from('ops_job_interview_comments')
          .select('id, round_id, author_id, body, created_at')
          .in('round_id', roundIds)
          .order('created_at', { ascending: true })
      : Promise.resolve({ data: [] as never[] }),
    roundIds.length
      ? admin
          .from('ops_interview_reports')
          .select('id, round_id, original_filename, created_at')
          .in('round_id', roundIds)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const authorIds = [...new Set((comments ?? []).map((row) => row.author_id))];
  const [{ data: staffNames }, { data: partnerNames }] = await Promise.all([
    authorIds.length
      ? admin.from('staff_profiles').select('id, full_name').in('id', authorIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
    authorIds.length
      ? admin
          .from('ops_recruiting_partner_members')
          .select('user_id, full_name')
          .in('user_id', authorIds)
      : Promise.resolve({ data: [] as { user_id: string; full_name: string }[] }),
  ]);
  const names = new Map<string, string>();
  for (const row of staffNames ?? []) names.set(row.id, row.full_name);
  for (const row of partnerNames ?? []) names.set(row.user_id, row.full_name);

  const t = await getT();
  const { formatDate } = labelsFor(t.locale);
  const posting = Array.isArray(application.ops_job_postings)
    ? application.ops_job_postings[0]
    : application.ops_job_postings;
  const canWrite = !access.isStaffPreview;
  const showPartnerActions = Boolean(access.member);
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
      <h1 className="mt-3 text-2xl font-bold text-zinc-900">{application.full_name}</h1>
      {posting?.title ? <p className="text-sm font-medium text-codiva-primary">{posting.title}</p> : null}
      <p className="mt-1 text-sm text-zinc-500">
        {t('interviews.contact')}: {application.email}
        {application.phone ? ` · ${application.phone}` : ''}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatusBadge
          label={jobApplicationStatusLabel(application.status, t.locale)}
          tone={isDiscardedApplicationStatus(application.status) ? 'danger' : 'info'}
        />
        <CareerCvLightbox
          applicationId={application.id}
          name={application.full_name}
          srcBase="/api/entrevistas/cv"
        />
        {brief ? (
          <OpsReportLightbox
            title={t('interviews.brief.title')}
            htmlSrc={`/api/entrevistas/recruiting-report?id=${application.id}`}
            downloadHref={`/api/entrevistas/recruiting-report?id=${application.id}&format=pdf`}
            triggerLabel={t('interviews.brief.openReport')}
            downloadLabel={t('interviews.brief.downloadPdf')}
          />
        ) : null}
      </div>

      {brief ? <InterviewCandidateBrief brief={brief} t={t} /> : null}

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-zinc-900">{t('interviews.roundsTitle')}</h2>
        <p className="mt-1 text-sm text-zinc-500">{t('interviews.roundsHint')}</p>

        {(rounds ?? []).length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-zinc-200 bg-white px-4 py-6 text-sm text-zinc-600">
            {t('interviews.roundsEmpty')}
          </p>
        ) : (
          <ul className="mt-4 space-y-4">
            {(rounds ?? []).map((round) => {
              const roundComments = (comments ?? []).filter((row) => row.round_id === round.id);
              const roundReports = (reports ?? []).filter((row) => row.round_id === round.id);
              const follow = interviewFollowUp({
                status: round.status,
                reportCount: roundReports.length,
              });
              return (
                <li key={round.id} className="rounded-2xl border border-zinc-200 bg-white p-5">
                  <p className="font-semibold text-zinc-900">{round.title}</p>
                  <p className="text-xs text-zinc-500">
                    {isJobInterviewKind(round.kind)
                      ? t(`ops.careers.interviewKind.${round.kind}` as const)
                      : round.kind}
                    {' · '}
                    {isJobInterviewRoundStatus(round.status)
                      ? t(`ops.careers.interviewRoundStatus.${round.status}` as const)
                      : round.status}
                    {round.outcome && isJobInterviewOutcome(round.outcome)
                      ? ` · ${t(`ops.careers.interviewOutcome.${round.outcome}` as const)}`
                      : ''}
                    {` · ${
                      follow === 'pending'
                        ? t('interviews.followUpPending')
                        : follow === 'needs_report'
                          ? t('interviews.followUpReport')
                          : t('interviews.followUpClosed')
                    }`}
                  </p>

                  {roundComments.length ? (
                    <ul className="mt-3 space-y-2">
                      {roundComments.map((comment) => (
                        <li key={comment.id} className="rounded-md bg-zinc-50 px-2.5 py-2 text-sm text-zinc-700">
                          <p className="whitespace-pre-line">{comment.body}</p>
                          <p className="mt-1 text-xs text-zinc-400">
                            {names.get(comment.author_id) || t('ops.careers.interviewUnknownAuthor')}
                            {' · '}
                            {formatDate(comment.created_at)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {roundReports.length ? (
                    <ul className="mt-3 space-y-1 text-sm">
                      {roundReports.map((report) => (
                        <li key={report.id}>
                          <a
                            href={`/api/entrevistas/report?id=${report.id}`}
                            className="text-codiva-primary hover:underline"
                            target="_blank"
                            rel="noreferrer"
                          >
                            {report.original_filename || t('interviews.reportOpen')}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {showPartnerActions ? (
                    <fieldset disabled={!canWrite} className="mt-3 space-y-3 disabled:opacity-60">
                      <legend className="sr-only">{t('interviews.previewWriteDisabled')}</legend>
                      <ToastForm
                        success={t('interviews.roundSaved')}
                        action={async (fd) => {
                          'use server';
                          await partnerUpdateInterviewRound(round.id, fd);
                        }}
                        className="grid gap-2 sm:grid-cols-2"
                      >
                        <select
                          name="status"
                          defaultValue={isJobInterviewRoundStatus(round.status) ? round.status : 'planned'}
                          className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
                        >
                          {JOB_INTERVIEW_ROUND_STATUSES.map((value) => (
                            <option key={value} value={value}>
                              {t(`ops.careers.interviewRoundStatus.${value}` as const)}
                            </option>
                          ))}
                        </select>
                        <select
                          name="outcome"
                          defaultValue={
                            round.outcome && isJobInterviewOutcome(round.outcome) ? round.outcome : ''
                          }
                          className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
                        >
                          <option value="">{t('ops.careers.interviewOutcomeNone')}</option>
                          {JOB_INTERVIEW_OUTCOMES.map((value) => (
                            <option key={value} value={value}>
                              {t(`ops.careers.interviewOutcome.${value}` as const)}
                            </option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm sm:col-span-2"
                        >
                          {t('interviews.saveRound')}
                        </button>
                      </ToastForm>

                      <ToastForm
                        success={t('ops.careers.interviewCommentSaved')}
                        action={async (fd) => {
                          'use server';
                          await partnerAddInterviewComment(round.id, fd);
                        }}
                        className="space-y-2"
                      >
                        <textarea
                          name="body"
                          required
                          rows={3}
                          maxLength={4000}
                          placeholder={t('ops.careers.interviewCommentPlaceholder')}
                          className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
                        />
                        <button
                          type="submit"
                          className="rounded-lg bg-codiva-primary px-3 py-1.5 text-sm text-white"
                        >
                          {t('ops.careers.interviewCommentSubmit')}
                        </button>
                      </ToastForm>

                      <ToastForm
                        success={t('interviews.reportSaved')}
                        action={async (fd) => {
                          'use server';
                          await partnerUploadInterviewReport(round.id, fd);
                        }}
                        className="space-y-2 rounded-xl border border-codiva-primary/20 bg-codiva-primary/5 p-3"
                      >
                        <p className="text-sm font-semibold text-zinc-900">{t('interviews.reportTitle')}</p>
                        <p className="text-xs text-zinc-600">{t('interviews.reportHint')}</p>
                        <label className="block text-xs font-medium text-zinc-700">
                          {t('interviews.reportFile')}
                          <input
                            type="file"
                            name="file"
                            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            required
                            className="mt-1 block w-full text-sm"
                          />
                        </label>
                        <textarea
                          name="notes"
                          rows={2}
                          maxLength={4000}
                          placeholder={t('interviews.reportNotes')}
                          className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
                        />
                        <button
                          type="submit"
                          className="rounded-lg bg-codiva-primary px-3 py-1.5 text-sm font-medium text-white"
                        >
                          {t('interviews.reportSubmit')}
                        </button>
                      </ToastForm>
                    </fieldset>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </InterviewsChrome>
  );
}
