import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import ToastForm from '@/components/ops/ToastForm';
import CareerCvLightbox from '@/components/ops/CareerCvLightbox';
import OpsApplicationInterviews, {
  type OpsInterviewCommentRow,
  type OpsInterviewPartnerOption,
  type OpsInterviewReportRow,
  type OpsInterviewRoundRow,
  type OpsInterviewStaff,
} from '@/components/ops/OpsApplicationInterviews';
import {
  applicationRoleLabel,
  isDiscardedApplicationStatus,
  type JobApplicationStatus,
} from '@/lib/ops/careers';
import {
  createPersonnelOfferFromApplication,
  deleteJobApplication,
  updateJobApplicationStatus,
} from '@/lib/ops/career-actions';
import { type Translator, type Locale } from '@/i18n/locale';
import { formatDateTime } from '@/lib/ops/labels';
import { HuntFindingsBlock } from './HuntFindingsBlock';
import {
  applicationTone,
  considerationHint,
  considerationTone,
  huntForCandidate,
  huntSignalTag,
  CareersTag,
} from './shared';
import type { OpsJobApplicationRow, OpsJobAttemptRow } from './types';

type BolsaHref = (next: {
  signalValue?: string;
  originValue?: string;
  stageValue?: string;
  appValue?: string;
}) => string;

export function ApplicationCard({
  row,
  hunt,
  linkedAttempt,
  extraAttempts = [],
  t,
  formatDate,
  locale,
  disciplineLabels,
  statusLabels,
  canManage,
  bolsaHref,
  effectiveStage,
  appFilter,
  signalFilter,
  interviewRounds,
  interviewComments,
  interviewStaff,
  interviewPartners,
  interviewReports,
  currentUserId,
  canTeam,
}: {
  row: OpsJobApplicationRow;
  hunt: ReturnType<typeof huntForCandidate>;
  linkedAttempt: OpsJobAttemptRow | null;
  extraAttempts?: OpsJobAttemptRow[];
  t: Translator;
  formatDate: (date: string | null | undefined) => string;
  locale: Locale;
  disciplineLabels: Record<string, string>;
  statusLabels: Record<JobApplicationStatus, string>;
  canManage: boolean;
  bolsaHref: BolsaHref;
  effectiveStage: string;
  appFilter: string;
  signalFilter: string;
  interviewRounds: OpsInterviewRoundRow[];
  interviewComments: OpsInterviewCommentRow[];
  interviewStaff: OpsInterviewStaff[];
  interviewPartners: OpsInterviewPartnerOption[];
  interviewReports: OpsInterviewReportRow[];
  currentUserId: string;
  canTeam: boolean;
}) {
  const posting = Array.isArray(row.ops_job_postings) ? row.ops_job_postings[0] : row.ops_job_postings;
  const role = applicationRoleLabel({
    postingTitle: posting?.title,
    discipline: row.discipline,
    locale: t.locale,
  });
  const discarded = isDiscardedApplicationStatus(row.status);
  return (
    <li className="rounded-xl border border-zinc-200 bg-white p-4">
      <p className="font-medium">
        {linkedAttempt ? (
          <Link href={`/team/intentos/${linkedAttempt.id}`} className="hover:text-codiva-primary hover:underline">
            {row.full_name}
          </Link>
        ) : (
          row.full_name
        )}
      </p>
      {role ? <p className="text-sm font-medium text-codiva-primary">{role}</p> : null}
      <p className="text-sm text-zinc-500">
        <a href={`mailto:${row.email}`} className="hover:text-codiva-primary hover:underline">
          {row.email}
        </a>
        {row.phone ? (
          <>
            {' · '}
            <a href={`tel:${row.phone}`} className="hover:text-codiva-primary hover:underline">
              {row.phone}
            </a>
          </>
        ) : null}
        {` · ${formatDate(row.created_at)}`}
      </p>
      {row.cover_letter?.trim() ? (
        <details className="group mt-2">
          <summary className="cursor-pointer list-none text-sm font-medium text-zinc-700 hover:text-zinc-900 [&::-webkit-details-marker]:hidden">
            {t('ops.careers.coverLetter')}
          </summary>
          <p className="mt-1 whitespace-pre-line text-sm text-zinc-600">{row.cover_letter.trim()}</p>
        </details>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-1.5">
        <CareersTag
          label={discarded ? t('ops.careers.stageDiscarded') : t('ops.careers.stageApplied')}
          tone={discarded ? 'danger' : 'info'}
          href={bolsaHref({
            stageValue: discarded
              ? effectiveStage === 'discarded'
                ? ''
                : 'discarded'
              : effectiveStage === 'applied'
                ? ''
                : 'applied',
            appValue: '',
          })}
          title={t('ops.careers.tagStageHint')}
          active={discarded ? effectiveStage === 'discarded' : effectiveStage === 'applied' && !appFilter}
        />
        <CareersTag
          label={statusLabels[row.status as JobApplicationStatus] ?? row.status}
          tone={applicationTone(row.status)}
          href={bolsaHref({
            stageValue: discarded ? 'discarded' : 'applied',
            appValue: discarded ? '' : appFilter === row.status ? '' : row.status,
          })}
          title={t('ops.careers.tagStatusHint')}
          active={discarded ? effectiveStage === 'discarded' : appFilter === row.status}
        />
        {interviewRounds.length ? (
          <CareersTag
            label={t('ops.careers.interviewProgress', {
              done: String(interviewRounds.filter((item) => item.status === 'done').length),
              total: String(interviewRounds.filter((item) => item.status !== 'skipped').length || interviewRounds.length),
            })}
            tone="info"
            title={t('ops.careers.interviewTagHint')}
          />
        ) : null}
        {linkedAttempt?.score_pct != null ? (
          <CareersTag
            label={t('ops.careers.testScore', { pct: linkedAttempt.score_pct })}
            tone={linkedAttempt.passed ? 'success' : 'neutral'}
            href={`/team/intentos/${linkedAttempt.id}`}
            title={t('ops.careers.tagTestHint')}
          />
        ) : linkedAttempt ? (
          <CareersTag
            label={t('ops.careers.viewTest')}
            href={`/team/intentos/${linkedAttempt.id}`}
            title={t('ops.careers.tagTestHint')}
          />
        ) : null}
        {extraAttempts.map((attempt) => (
          <CareersTag
            key={attempt.id}
            label={
              attempt.score_pct != null
                ? t('ops.careers.extraTestScore', { pct: attempt.score_pct })
                : t('ops.careers.extraTest')
            }
            tone={attempt.passed ? 'success' : attempt.status === 'started' ? 'warning' : 'neutral'}
            href={`/team/intentos/${attempt.id}`}
            title={t('ops.careers.tagTestHint')}
          />
        ))}
        <CareersTag
          label={hunt.coverAllCrafts ? huntSignalTag(hunt, locale) : t('ops.careers.tagSignal', { label: huntSignalTag(hunt, locale) })}
          tone={considerationTone(hunt.score.consideration)}
          href={bolsaHref({
            signalValue: signalFilter === hunt.score.consideration ? '' : hunt.score.consideration,
          })}
          title={considerationHint(hunt.score.consideration, t)}
          active={signalFilter === hunt.score.consideration}
        />
        <CareerCvLightbox applicationId={row.id} name={row.full_name} />
        {canManage && row.personnel_offer_id ? (
          <CareersTag
            label={t('ops.careers.viewOffer')}
            tone="success"
            href={`/team/ofertas/${row.personnel_offer_id}`}
          />
        ) : null}
      </div>
      <details className="group mt-3 rounded-lg border border-zinc-200 bg-zinc-50 open:bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100/80 [&::-webkit-details-marker]:hidden">
          {t('ops.careers.manageApplication')}
          <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400 transition group-open:rotate-180" aria-hidden />
        </summary>
        <div className="flex flex-wrap items-center gap-2 border-t border-zinc-200 px-3 py-3">
          {canManage && !row.personnel_offer_id ? (
            <ToastForm
              success={t('ops.careers.offerCreated')}
              loading={t('ops.careers.creating')}
              action={async () => {
                'use server';
                await createPersonnelOfferFromApplication(row.id);
              }}
            >
              <button type="submit" className="rounded-lg bg-codiva-primary px-3 py-1.5 text-sm text-white">
                {t('ops.careers.hire')}
              </button>
            </ToastForm>
          ) : null}
          <ToastForm
            success={t('ops.careers.statusUpdated')}
            action={async (fd) => {
              'use server';
              await updateJobApplicationStatus(row.id, fd);
            }}
            className="flex flex-wrap items-center gap-2"
          >
            <select name="status" defaultValue={row.status} className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm">
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1.5 text-sm text-zinc-600">
              <input
                type="checkbox"
                name="notify_candidate"
                value="1"
                defaultChecked
                className="rounded border-zinc-300"
              />
              {t('ops.careers.notifyCandidate')}
            </label>
            <button type="submit" className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50">
              {t('ops.team.save')}
            </button>
          </ToastForm>
          {canManage ? (
            <ToastForm
              success={t('ops.careers.applicationDeleted')}
              confirmTitle={t('ops.careers.deleteApplicationConfirmTitle')}
              confirmMessage={t('ops.careers.deleteApplicationConfirm')}
              confirmLabel={t('ops.careers.deleteApplication')}
              action={async () => {
                'use server';
                await deleteJobApplication(row.id);
              }}
            >
              <button type="submit" className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50">
                {t('ops.careers.deleteApplication')}
              </button>
            </ToastForm>
          ) : null}
        </div>
      </details>
      <OpsApplicationInterviews
        applicationId={row.id}
        rounds={interviewRounds}
        comments={interviewComments}
        staff={interviewStaff}
        partners={interviewPartners}
        reports={interviewReports}
        currentUserId={currentUserId}
        canTeam={canTeam}
        t={t}
        formatDate={formatDate}
        formatDateTime={(date) => formatDateTime(date, locale)}
      />
      <HuntFindingsBlock
        rows={hunt.rows}
        discipline={row.discipline}
        t={t}
        formatDate={formatDate}
        locale={locale}
        disciplineLabels={disciplineLabels}
        coverAllCrafts={hunt.coverAllCrafts}
      />
    </li>
  );
}
