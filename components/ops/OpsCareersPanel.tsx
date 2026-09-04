import CopyableUrl from '@/components/ops/CopyableUrl';
import JobPostingProcessFields from '@/components/ops/JobPostingProcessFields';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import ToastForm from '@/components/ops/ToastForm';
import HuntEvidenceLightbox from '@/components/ops/HuntEvidenceLightbox';
import CareerCvLightbox from '@/components/ops/CareerCvLightbox';
import OpsReportLightbox from '@/components/ops/OpsReportLightbox';
import {
  JOB_EMPLOYMENT_TYPES,
  careerOpsLabels,
  careerDisciplineLabels,
  applicationRoleLabel,
  huntFindingTypeLabel,
  isCareerDiscipline,
  isClosedApplicationStatus,
  isDiscardedApplicationStatus,
  isJobApplicationStatus,
  publicCareerListUrl,
  publicCareerUrl,
  type JobApplicationStatus,
  type JobEmploymentType,
  type JobPostingStatus,
} from '@/lib/ops/careers';
import OpsApplicationInterviews, {
  type OpsInterviewCommentRow,
  type OpsInterviewPartnerOption,
  type OpsInterviewReportRow,
  type OpsInterviewRoundRow,
  type OpsInterviewStaff,
} from '@/components/ops/OpsApplicationInterviews';
import {
  createJobPosting,
  createPersonnelOfferFromApplication,
  deleteJobApplication,
  deleteJobPosting,
  updateHuntReportReview,
  updateJobApplicationStatus,
} from '@/lib/ops/career-actions';
import { huntSeedById } from '@/lib/careers/hunt/seeds';
import { huntCoversAllCrafts, huntProgressFromReports } from '@/lib/careers/hunt/progress';
import { matchedSeedCountsForDiscipline } from '@/lib/careers/hunt/match';
import { splitHuntReports } from '@/lib/careers/hunt/review';
import {
  applicationCoversAttempt,
  attemptsForApplication,
  careerEmailKey as emailKey,
  isCandidateReadyForCv,
  latestAttemptByJobEmail,
  recruitingAttemptKey,
} from '@/lib/careers/recruiting-stage';
import {
  huntConsiderationLabel,
  huntDifficultyLabel,
  type HuntConsideration,
} from '@/lib/careers/hunt/score';
import { disciplineFromCatalogKey } from '@/lib/ops/career-disciplines';
import {
  attemptsSharingOrigin,
  distinctOriginEmails,
  originFingerprint,
  sharedOriginAttemptCount,
} from '@/lib/careers/assessments/origin';
import { labelsFor } from '@/lib/ops/labels';
import { getT, type Translator, type Locale } from '@/i18n/locale';
import { usageUrlLabel } from '@/lib/ops/host';

export type OpsJobPostingRow = {
  id: string;
  slug: string;
  title: string;
  location: string | null;
  employment_type: string | null;
  status: string;
  updated_at: string;
  careers_pipeline?: boolean | null;
  requires_hunt?: boolean | null;
};

export type OpsJobApplicationRow = {
  id: string;
  job_posting_id?: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  discipline: string | null;
  status: string;
  created_at: string;
  personnel_offer_id: string | null;
  original_filename: string | null;
  assessment_attempt_id?: string | null;
  cover_letter?: string | null;
  ops_job_postings:
    | { title: string; slug: string; careers_pipeline?: boolean | null }
    | { title: string; slug: string; careers_pipeline?: boolean | null }[]
    | null;
};

export type OpsHuntReportRow = {
  id: string;
  full_name: string;
  email: string;
  page_url: string;
  title: string;
  description?: string | null;
  expected?: string | null;
  matched_seed_id: string | null;
  discipline?: string | null;
  assessment_attempt_id?: string | null;
  review_status?: string | null;
  evidence_paths?: string[] | null;
  created_at: string;
};

export type OpsJobAttemptRow = {
  id: string;
  job_posting_id: string;
  catalog_key?: string | null;
  full_name: string;
  email: string;
  status: string;
  score_pct: number | null;
  passed: boolean | null;
  duration_ms: number | null;
  blur_count: number | null;
  started_at: string;
  completed_at: string | null;
  timezone: string | null;
  attempt_number: number | null;
  ip_hash?: string | null;
  user_agent?: string | null;
};

export type OpsPersonnelOfferLink = {
  email: string | null;
  career_email?: string | null;
  status: string;
};

function postingHint(status: string, t: Translator) {
  if (status === 'published') {
    return t('ops.careers.postingHintPublished', { host: usageUrlLabel(publicCareerListUrl()) });
  }
  if (status === 'closed') return t('ops.careers.postingHintClosed');
  return t('ops.careers.postingHintDraft');
}

function postingTone(status: string) {
  if (status === 'published') return 'success' as const;
  if (status === 'closed') return 'neutral' as const;
  return 'warning' as const;
}

function applicationTone(status: string) {
  if (status === 'hired') return 'success' as const;
  if (status === 'rejected') return 'danger' as const;
  if (status === 'interview') return 'info' as const;
  if (status === 'reviewed') return 'info' as const;
  return 'warning' as const;
}

function attemptStatusLabel(
  status: string,
  passed: boolean | null,
  t: (key: string) => string
) {
  if (status === 'completed' && passed) return t('ops.careers.attemptPassed');
  if (status === 'completed') return t('ops.careers.attemptFailed');
  if (status === 'expired') return t('ops.careers.attemptExpired');
  if (status === 'started') return t('ops.careers.attemptStarted');
  return status;
}

function considerationRank(value: HuntConsideration) {
  if (value === 'strong') return 3;
  if (value === 'solid') return 2;
  if (value === 'minimum') return 1;
  return 0;
}

function considerationTone(value: HuntConsideration) {
  if (value === 'strong') return 'success' as const;
  if (value === 'solid') return 'info' as const;
  if (value === 'minimum') return 'warning' as const;
  return 'neutral' as const;
}

function considerationHint(value: string, t: Translator) {
  if (value === 'strong') return t('ops.careers.signalHintStrong');
  if (value === 'solid') return t('ops.careers.signalHintSolid');
  if (value === 'minimum') return t('ops.careers.signalHintMinimum');
  if (value === 'none') return t('ops.careers.signalHintNone');
  return t('ops.careers.signalHintAll');
}

function HoverTip({ text, children }: { text?: string; children: React.ReactNode }) {
  if (!text) return children;
  return (
    <span className="group/tip relative z-10 inline-flex max-w-full hover:z-50 focus-within:z-50">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-[calc(100%+4px)] left-0 z-50 hidden w-max max-w-[16rem] rounded-md bg-zinc-900 px-2.5 py-1.5 text-left text-xs font-normal leading-snug text-white group-hover/tip:block group-focus-within/tip:block"
      >
        {text}
      </span>
    </span>
  );
}

const TAG_TONES = {
  neutral: 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200',
  success: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200',
  warning: 'bg-amber-100 text-amber-800 hover:bg-amber-200',
  danger: 'bg-red-100 text-red-800 hover:bg-red-200',
  info: 'bg-sky-100 text-sky-800 hover:bg-sky-200',
};

function CareersTag({
  label,
  tone = 'neutral',
  href,
  title,
  active = false,
}: {
  label: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
  href?: string;
  title?: string;
  active?: boolean;
}) {
  const className = `inline-flex max-w-full items-center rounded-full px-2.5 py-0.5 text-left text-xs font-medium leading-snug transition ${TAG_TONES[tone]} ${
    active ? 'ring-1 ring-zinc-900' : ''
  }`;
  const control = href ? (
    href.startsWith('/api/') ||
    href.startsWith('mailto:') ||
    href.startsWith('tel:') ||
    href.startsWith('http') ? (
      <a
        href={href}
        aria-label={title ? `${label}. ${title}` : undefined}
        className={className}
        {...(href.startsWith('/api/') || href.startsWith('http')
          ? { target: '_blank', rel: 'noopener noreferrer' }
          : {})}
      >
        {label}
      </a>
    ) : (
      <Link href={href} aria-label={title ? `${label}. ${title}` : undefined} className={className}>
        {label}
      </Link>
    )
  ) : (
    <span aria-label={title ? `${label}. ${title}` : undefined} className={className}>
      {label}
    </span>
  );
  return <HoverTip text={title}>{control}</HoverTip>;
}

function huntForCandidate(
  reports: OpsHuntReportRow[],
  email: string,
  discipline?: string | null,
  catalogKey?: string | null
) {
  const rows = reports.filter((row) => emailKey(row.email) === emailKey(email));
  const { active } = splitHuntReports(rows);
  const coverAllCrafts = huntCoversAllCrafts({ catalogKey });
  const craft = discipline && isCareerDiscipline(discipline) ? discipline : null;
  const progress = huntProgressFromReports(active, {
    required: true,
    coverAllCrafts,
    discipline: coverAllCrafts ? null : craft,
  });
  return {
    rows,
    total: rows.length,
    craftHits: progress.matched,
    huntNeeded: progress.needed,
    score: progress.score,
  };
}

function HuntFindingEmbed({
  row,
  discipline,
  t,
  formatDate,
  locale,
  disciplineLabels,
  showAttemptLink = false,
  reviewAttemptId,
  reviewOfferId,
}: {
  row: OpsHuntReportRow;
  discipline?: string | null;
  t: Translator;
  formatDate: (date: string | null | undefined) => string;
  locale: Locale;
  disciplineLabels: Record<string, string>;
  showAttemptLink?: boolean;
  reviewAttemptId?: string;
  reviewOfferId?: string;
}) {
  const seed = row.matched_seed_id ? huntSeedById(row.matched_seed_id) : null;
  const craftDiscipline = discipline && isCareerDiscipline(discipline) ? discipline : null;
  const countsForCraft = Boolean(
    seed && craftDiscipline && matchedSeedCountsForDiscipline(seed.id, craftDiscipline)
  );
  const reviewStatus = row.review_status || 'open';
  const reviewLabel =
    reviewStatus === 'noted'
      ? t('ops.careers.reviewNoted')
      : reviewStatus === 'discarded'
        ? t('ops.careers.reviewDiscarded')
        : null;
  return (
    <details className="group min-w-0 rounded-lg border border-zinc-200 bg-zinc-50 open:bg-white">
      <summary className="flex cursor-pointer list-none items-start gap-2 px-3 py-2.5 hover:bg-zinc-100/80 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0 flex-1">
          <p className="break-words text-sm text-zinc-800">{row.title}</p>
          <p className="mt-0.5 text-xs text-zinc-400">
            {formatDate(row.created_at)}
            {seed
              ? ` · ${t('ops.careers.difficulty', {
                  label: huntDifficultyLabel(seed.difficulty, locale),
                })}`
              : ''}
            {reviewLabel ? ` · ${reviewLabel}` : ''}
          </p>
          <div className="mt-1.5">
            <CareersTag
              label={
                seed
                  ? countsForCraft
                    ? t('ops.careers.seedCounts')
                    : t('ops.careers.seed', { craft: huntFindingTypeLabel(seed.craft, locale) || seed.craft })
                  : t('ops.careers.noMatch')
              }
              tone={seed ? (countsForCraft ? 'success' : 'info') : 'neutral'}
              title={
                seed
                  ? countsForCraft
                    ? t('ops.careers.seedCountsHint')
                    : t('ops.careers.seedOtherHint')
                  : t('ops.careers.noMatchHint')
              }
            />
          </div>
        </div>
        <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400 transition group-open:rotate-180" aria-hidden />
      </summary>
      <div className="space-y-2 border-t border-zinc-200 px-3 pb-3 pt-2">
        {row.page_url ? (
          <p className="text-xs text-zinc-400">
            <a
              href={row.page_url}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all hover:text-codiva-primary hover:underline"
            >
              {row.page_url}
            </a>
          </p>
        ) : null}
        {seed ? <p className="text-xs text-zinc-500">{seed.title}</p> : (
          <p className="text-xs text-zinc-500">{t('ops.careers.noMatchHint')}</p>
        )}
        {row.description?.trim() ? (
          <p className="whitespace-pre-line text-sm text-zinc-700">{row.description.trim()}</p>
        ) : null}
        {row.expected?.trim() ? (
          <p className="text-sm text-zinc-600">
            <span className="font-medium text-zinc-800">{t('ops.attempt.expected')}</span>
            {row.expected.trim()}
          </p>
        ) : null}
        {(row.evidence_paths ?? []).length ? (
          <HuntEvidenceLightbox reportId={row.id} count={(row.evidence_paths ?? []).length} />
        ) : null}
        {showAttemptLink && row.assessment_attempt_id ? (
          <p>
            <Link
              href={`/team/intentos/${row.assessment_attempt_id}`}
              className="text-xs font-medium text-codiva-primary hover:underline"
            >
              {t('ops.careers.viewCandidateTest')}
            </Link>
          </p>
        ) : null}
        {!seed ? (
          <ToastForm
            success={t('ops.careers.reviewSaved')}
            action={async (fd) => {
              'use server';
              await updateHuntReportReview(row.id, fd);
            }}
            className="flex flex-wrap items-center gap-2"
          >
            <input
              type="hidden"
              name="attempt_id"
              value={reviewAttemptId || row.assessment_attempt_id || ''}
            />
            {reviewOfferId ? <input type="hidden" name="offer_id" value={reviewOfferId} /> : null}
            <select
              name="review_status"
              defaultValue={reviewStatus}
              className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
            >
              <option value="open">{t('ops.careers.reviewOpen')}</option>
              <option value="noted">{t('ops.careers.reviewNoted')}</option>
              <option value="discarded">{t('ops.careers.reviewDiscarded')}</option>
            </select>
            <button type="submit" className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50">
              {t('ops.team.save')}
            </button>
          </ToastForm>
        ) : null}
      </div>
    </details>
  );
}

export function HuntFindingsBlock({
  rows,
  discipline,
  t,
  formatDate,
  locale,
  disciplineLabels,
  heading = true,
  showAttemptLink = false,
  reviewAttemptId,
  reviewOfferId,
}: {
  rows: OpsHuntReportRow[];
  discipline?: string | null;
  t: Translator;
  formatDate: (date: string | null | undefined) => string;
  locale: Locale;
  disciplineLabels: Record<string, string>;
  heading?: boolean;
  showAttemptLink?: boolean;
  reviewAttemptId?: string;
  reviewOfferId?: string;
}) {
  if (!rows.length) return null;
  return (
    <div className={heading ? 'mt-4 space-y-2' : 'mt-2 space-y-2'}>
      {heading ? (
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {t('ops.careers.findingsTitle')}
        </p>
      ) : null}
      {rows.map((report) => (
        <HuntFindingEmbed
          key={report.id}
          row={report}
          discipline={discipline}
          t={t}
          formatDate={formatDate}
          locale={locale}
          disciplineLabels={disciplineLabels}
          showAttemptLink={showAttemptLink}
          reviewAttemptId={reviewAttemptId}
          reviewOfferId={reviewOfferId}
        />
      ))}
    </div>
  );
}

type BolsaHref = (next: {
  signalValue?: string;
  originValue?: string;
  stageValue?: string;
  appValue?: string;
}) => string;

function ApplicationCard({
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
          label={t('ops.careers.tagSignal', {
            label: huntConsiderationLabel(hunt.score.consideration, locale),
          })}
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
      />
      <HuntFindingsBlock
        rows={hunt.rows}
        discipline={row.discipline}
        t={t}
        formatDate={formatDate}
        locale={locale}
        disciplineLabels={disciplineLabels}
      />
    </li>
  );
}

export default async function OpsCareersPanel({
  postings,
  applications,
  attempts = [],
  huntReports = [],
  offers: _offers = [],
  signal = '',
  origin = '',
  stage = '',
  app = '',
  canManage = true,
  interviewRounds = [],
  interviewComments = [],
  interviewStaff = [],
  interviewPartners = [],
  interviewReports = [],
  currentUserId = '',
}: {
  postings: OpsJobPostingRow[];
  applications: OpsJobApplicationRow[];
  attempts?: OpsJobAttemptRow[];
  huntReports?: OpsHuntReportRow[];
  offers?: OpsPersonnelOfferLink[];
  signal?: string;
  origin?: string;
  stage?: string;
  app?: string;
  canManage?: boolean;
  interviewRounds?: OpsInterviewRoundRow[];
  interviewComments?: OpsInterviewCommentRow[];
  interviewStaff?: OpsInterviewStaff[];
  interviewPartners?: OpsInterviewPartnerOption[];
  interviewReports?: OpsInterviewReportRow[];
  currentUserId?: string;
}) {
  const t = await getT();
  const { formatDate } = labelsFor(t.locale);
  const { JOB_POSTING_STATUS_LABELS, JOB_EMPLOYMENT_LABELS, JOB_APPLICATION_STATUS_LABELS } =
    careerOpsLabels(t.locale);
  const DISCIPLINE_LABELS = careerDisciplineLabels(t.locale);
  const locale = t.locale === 'en' ? 'en' : 'es';
  const interviewRoundsByApp = new Map<string, OpsInterviewRoundRow[]>();
  for (const round of interviewRounds) {
    const list = interviewRoundsByApp.get(round.application_id) ?? [];
    list.push(round);
    interviewRoundsByApp.set(round.application_id, list);
  }
  const roundApplicationId = new Map(interviewRounds.map((row) => [row.id, row.application_id]));
  const interviewCommentsByApp = new Map<string, OpsInterviewCommentRow[]>();
  for (const comment of interviewComments) {
    const applicationId = roundApplicationId.get(comment.round_id);
    if (!applicationId) continue;
    const list = interviewCommentsByApp.get(applicationId) ?? [];
    list.push(comment);
    interviewCommentsByApp.set(applicationId, list);
  }
  async function onCreate(formData: FormData) {
    'use server';
    await createJobPosting(formData);
  }

  const attemptById = new Map(attempts.map((row) => [row.id, row]));
  const postingById = new Map(postings.map((row) => [row.id, row]));
  const attemptByJobEmail = latestAttemptByJobEmail(attempts);

  const attemptsOnApplication = (row: OpsJobApplicationRow) => {
    const forJob = attemptsForApplication(attempts, row);
    const linked =
      (row.assessment_attempt_id && attemptById.get(row.assessment_attempt_id)) ||
      attemptByJobEmail.get(recruitingAttemptKey(row.email, row.job_posting_id)) ||
      forJob[0] ||
      null;
    return {
      linked,
      extra: forJob.filter((attempt) => attempt.id !== linked?.id),
    };
  };
  const signalFilter =
    signal === 'strong' || signal === 'solid' || signal === 'minimum' || signal === 'none' ? signal : '';
  const originFilter = origin === 'shared';
  const stageFilter =
    stage === 'ready' || stage === 'applied' || stage === 'test' || stage === 'discarded' ? stage : '';
  const appFilter = isJobApplicationStatus(app) ? app : '';
  const sharedOriginCount = sharedOriginAttemptCount(attempts);
  const originSize = new Map<string, number>();
  for (const row of attempts) {
    const hash = String(row.ip_hash || '').trim();
    if (!hash) continue;
    originSize.set(hash, (originSize.get(hash) || 0) + 1);
  }

  const attemptsRanked = [...attempts]
    .sort((a, b) => {
      const aHash = String(a.ip_hash || '').trim();
      const bHash = String(b.ip_hash || '').trim();
      const aShared = (originSize.get(aHash) || 0) >= 2 ? 1 : 0;
      const bShared = (originSize.get(bHash) || 0) >= 2 ? 1 : 0;
      if (originFilter && aShared !== bShared) return bShared - aShared;
      if (originFilter && aShared && aHash && aHash === bHash) {
        return new Date(b.started_at).getTime() - new Date(a.started_at).getTime();
      }
      if (originFilter && aShared && bShared && aHash !== bHash) return aHash.localeCompare(bHash);
      const ha = huntForCandidate(huntReports, a.email, disciplineFromCatalogKey(a.catalog_key), a.catalog_key);
      const hb = huntForCandidate(huntReports, b.email, disciplineFromCatalogKey(b.catalog_key), b.catalog_key);
      const diff = considerationRank(hb.score.consideration) - considerationRank(ha.score.consideration);
      if (diff) return diff;
      return new Date(b.started_at).getTime() - new Date(a.started_at).getTime();
    })
    .filter((row) => {
      if (originFilter && (originSize.get(String(row.ip_hash || '').trim()) || 0) < 2) return false;
      if (!signalFilter) return true;
      return (
        huntForCandidate(huntReports, row.email, disciplineFromCatalogKey(row.catalog_key), row.catalog_key).score
          .consideration === signalFilter
      );
    });

  const matchesApplicationSignal = (row: OpsJobApplicationRow) => {
    if (!signalFilter) return true;
    return huntForCandidate(huntReports, row.email, row.discipline).score.consideration === signalFilter;
  };
  const rankApplications = (rows: OpsJobApplicationRow[]) =>
    [...rows].sort((a, b) => {
      const ha = huntForCandidate(huntReports, a.email, a.discipline);
      const hb = huntForCandidate(huntReports, b.email, b.discipline);
      const diff = considerationRank(hb.score.consideration) - considerationRank(ha.score.consideration);
      if (diff) return diff;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  const activeApplications = applications.filter((row) => !isClosedApplicationStatus(row.status));
  const applicationsRanked = rankApplications(activeApplications).filter((row) => {
    if (appFilter && appFilter !== 'rejected' && row.status !== appFilter) return false;
    return matchesApplicationSignal(row);
  });
  const applicationsForStage = activeApplications.filter(matchesApplicationSignal);
  const discardedApplications = rankApplications(
    applications.filter((row) => isDiscardedApplicationStatus(row.status) && matchesApplicationSignal(row))
  );
  const appliedEmails = new Set(applications.map((row) => emailKey(row.email)));
  const claimedFindingEmails = new Set([
    ...appliedEmails,
    ...attempts.map((row) => emailKey(row.email)),
  ]);
  const orphanFindings = huntReports.filter((row) => !claimedFindingEmails.has(emailKey(row.email)));
  const readyForCv = [...attemptByJobEmail.values()]
    .filter((row) => {
      if (originFilter && (originSize.get(String(row.ip_hash || '').trim()) || 0) < 2) return false;
      if (
        applicationCoversAttempt({
          email: row.email,
          jobPostingId: row.job_posting_id,
          applications,
        })
      ) {
        return false;
      }
      const hunt = huntForCandidate(
        huntReports,
        row.email,
        disciplineFromCatalogKey(row.catalog_key),
        row.catalog_key
      );
      const postingHunt = postingById.get(row.job_posting_id)?.requires_hunt;
      if (
        !isCandidateReadyForCv({
          email: row.email,
          passed: row.passed,
          catalogKey: row.catalog_key,
          craftHits: hunt.craftHits,
          leftActiveQueueEmails: [],
          huntRequired: typeof postingHunt === 'boolean' ? postingHunt : undefined,
          huntNeeded: hunt.huntNeeded,
        })
      ) {
        return false;
      }
      if (signalFilter && hunt.score.consideration !== signalFilter) return false;
      return true;
    })
    .sort((a, b) => {
      const ha = huntForCandidate(huntReports, a.email, disciplineFromCatalogKey(a.catalog_key), a.catalog_key);
      const hb = huntForCandidate(huntReports, b.email, disciplineFromCatalogKey(b.catalog_key), b.catalog_key);
      const diff = considerationRank(hb.score.consideration) - considerationRank(ha.score.consideration);
      if (diff) return diff;
      return new Date(b.started_at).getTime() - new Date(a.started_at).getTime();
    });
  const readyKeys = new Set(readyForCv.map((row) => recruitingAttemptKey(row.email, row.job_posting_id)));
  const attemptsActive = attemptsRanked.filter((row) => {
    const key = recruitingAttemptKey(row.email, row.job_posting_id);
    if (
      applicationCoversAttempt({
        email: row.email,
        jobPostingId: row.job_posting_id,
        applications,
      })
    ) {
      return false;
    }
    if (readyKeys.has(key)) return false;
    if (row.status === 'started') return true;
    return attemptByJobEmail.get(key)?.id === row.id;
  });
  const effectiveStage =
    stageFilter === 'discarded' || appFilter === 'rejected'
      ? 'discarded'
      : appFilter
        ? 'applied'
        : stageFilter;
  const showDiscarded = effectiveStage === 'discarded';
  const showReady = !showDiscarded && (!effectiveStage || effectiveStage === 'ready');
  const showApplied = !showDiscarded && (!effectiveStage || effectiveStage === 'applied');
  const showTest = !showDiscarded && (!effectiveStage || effectiveStage === 'test');
  const peopleEmpty =
    (showReady ? readyForCv.length : 0) +
      (showApplied ? applicationsRanked.length : 0) +
      (showTest ? attemptsActive.length : 0) ===
    0;

  const bolsaHref = ({
    signalValue,
    originValue,
    stageValue,
    appValue,
  }: {
    signalValue?: string;
    originValue?: string;
    stageValue?: string;
    appValue?: string;
  }) => {
    const params = new URLSearchParams({ tab: 'bolsa' });
    const nextSignal = signalValue === undefined ? signalFilter : signalValue;
    const nextOrigin = originValue === undefined ? (originFilter ? 'shared' : '') : originValue;
    const nextStage = stageValue === undefined ? stageFilter : stageValue;
    const nextApp = appValue === undefined ? appFilter : appValue;
    if (nextSignal) params.set('signal', nextSignal);
    if (nextOrigin) params.set('origin', nextOrigin);
    if (nextStage) params.set('stage', nextStage);
    if (nextApp) params.set('app', nextApp);
    return `/team?${params.toString()}`;
  };


  return (
    <div className="max-w-6xl min-w-0 space-y-10">
      {canManage ? (
      <details
        className="group rounded-xl border border-zinc-200 bg-white open:bg-white"
        {...(!postings.length ? { open: true } : {})}
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-5 py-4 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 [&::-webkit-details-marker]:hidden">
          {t('ops.careers.createTitle')}
          <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400 transition group-open:rotate-180" aria-hidden />
        </summary>
      <ToastForm
        success={t('ops.careers.created')}
        action={onCreate}
        className="space-y-3 border-t border-zinc-200 px-5 pb-5 pt-4"
      >
        <p className="text-sm text-zinc-500">
          {t('ops.careers.createHint')}{' '}
          <a href={publicCareerListUrl()} className="text-codiva-primary hover:underline">
            {usageUrlLabel(publicCareerListUrl())}
          </a>
          {t('ops.careers.createHintEnd')}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            name="title"
            required
            placeholder={t('ops.careers.titlePlaceholder')}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm sm:col-span-2"
          />
          <input
            name="titleEn"
            placeholder={t('ops.careers.titleEn')}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm sm:col-span-2"
          />
          <input
            name="slug"
            placeholder={t('ops.careers.slugPlaceholder')}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <input
            name="location"
            placeholder={t('ops.careers.locationPlaceholder')}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <input
            name="locationEn"
            placeholder={t('ops.careers.locationEn')}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm sm:col-span-2"
          />
          <select name="employmentType" defaultValue="full_time" className="rounded-lg border border-zinc-300 px-3 py-2 text-sm">
            {JOB_EMPLOYMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {JOB_EMPLOYMENT_LABELS[type]}
              </option>
            ))}
          </select>
          <select name="status" defaultValue="draft" className="rounded-lg border border-zinc-300 px-3 py-2 text-sm">
            {Object.entries(JOB_POSTING_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <label className="text-sm text-zinc-600 sm:col-span-2">
            {t('ops.careers.description')}
            <textarea
              name="description"
              rows={5}
              placeholder={t('ops.careers.descPlaceholder')}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm text-zinc-600 sm:col-span-2">
            {t('ops.careers.descriptionEn')}
            <textarea
              name="descriptionEn"
              rows={5}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm text-zinc-600 sm:col-span-2">
            {t('ops.careers.requirements')}
            <textarea
              name="requirements"
              rows={4}
              placeholder={t('ops.careers.reqPlaceholder')}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm text-zinc-600 sm:col-span-2">
            {t('ops.careers.requirementsEn')}
            <textarea
              name="requirementsEn"
              rows={4}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <p className="text-xs text-zinc-500 sm:col-span-2">{t('ops.careers.enHint')}</p>
          <JobPostingProcessFields t={t} />
        </div>
        <button type="submit" className="rounded-lg bg-codiva-primary px-4 py-2 text-sm text-white">
          {t('ops.careers.createSubmit')}
        </button>
      </ToastForm>
      </details>
      ) : null}

      <section className="space-y-3">
        <h2 className="font-semibold">{t('ops.careers.listTitle')}</h2>
        {!postings.length ? (
          <p className="rounded-xl border border-dashed border-zinc-300 bg-white px-4 py-8 text-center text-sm text-zinc-500">
            {t('ops.careers.empty')}
          </p>
        ) : (
          <ul className="space-y-3">
            {postings.map((row) => (
              <li key={row.id} className="rounded-xl border border-zinc-200 bg-white p-4">
                <p className="font-medium">
                  {canManage ? (
                    <Link href={`/team/vacantes/${row.id}`} className="hover:text-codiva-primary hover:underline">
                      {row.title}
                    </Link>
                  ) : (
                    row.title
                  )}
                </p>
                <p className="text-sm text-zinc-500">
                  {row.slug}
                  {row.location ? ` · ${row.location}` : ''}
                  {row.employment_type
                    ? ` · ${JOB_EMPLOYMENT_LABELS[row.employment_type as JobEmploymentType] ?? row.employment_type}`
                    : ''}
                  {` · ${t('ops.careers.updated', { date: formatDate(row.updated_at) })}`}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <CareersTag
                    label={JOB_POSTING_STATUS_LABELS[row.status as JobPostingStatus] ?? row.status}
                    tone={postingTone(row.status)}
                    title={postingHint(row.status, t)}
                  />
                  {canManage ? (
                    <CareersTag label={t('ops.careers.edit')} href={`/team/vacantes/${row.id}`} />
                  ) : null}
                  {row.status === 'published' ? (
                    <>
                      <CareersTag
                        label={t('ops.careers.viewPublic')}
                        href={publicCareerUrl(row.slug)}
                        title={t('ops.careers.viewPublicHint')}
                      />
                      <CopyableUrl href={publicCareerUrl(row.slug)} />
                    </>
                  ) : null}
                  <OpsReportLightbox
                    title={t('ops.careers.pipelineTitleJob', { title: row.title })}
                    htmlSrc={`/api/ops/careers/recruiting-report?pipeline=1&job=${row.id}`}
                    downloadHref={`/api/ops/careers/recruiting-report?pipeline=1&job=${row.id}&format=pdf`}
                    triggerLabel={t('ops.careers.pipelineHtml')}
                    triggerHint={t('ops.careers.pipelineHint')}
                  />
                  {canManage ? (
                    <ToastForm
                      success={t('ops.careers.deleted')}
                      confirmTitle={t('ops.careers.deleteConfirmTitle')}
                      confirmMessage={t('ops.careers.deleteConfirm')}
                      confirmLabel={t('ops.careers.delete')}
                      action={async () => {
                        'use server';
                        await deleteJobPosting(row.id);
                      }}
                    >
                      <button
                        type="submit"
                        className="inline-flex max-w-full items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-800 transition hover:bg-red-100"
                      >
                        {t('ops.careers.delete')}
                      </button>
                    </ToastForm>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">{t('ops.careers.peopleTitle')}</h2>
            <p className="text-sm text-zinc-500">{t('ops.careers.peopleHint')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <OpsReportLightbox
              title={t('ops.careers.pipelineTitle')}
              htmlSrc="/api/ops/careers/recruiting-report?pipeline=1"
              downloadHref="/api/ops/careers/recruiting-report?pipeline=1&format=pdf"
              triggerLabel={t('ops.careers.pipelineHtml')}
              triggerHint={t('ops.careers.pipelineHint')}
              trigger="button"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['', t('ops.careers.stageAll'), readyForCv.length + applicationsForStage.length + attemptsActive.length],
              ['ready', t('ops.careers.stageReady'), readyForCv.length],
              ['applied', t('ops.careers.stageApplied'), applicationsForStage.length],
              ['test', t('ops.careers.stageTest'), attemptsActive.length],
              ['discarded', t('ops.careers.stageDiscarded'), discardedApplications.length],
            ] as const
          ).map(([value, label, count]) => (
            <HoverTip
              key={value || 'all'}
              text={
                value === 'ready'
                  ? t('ops.careers.stageHintReady')
                  : value === 'applied'
                    ? t('ops.careers.stageHintApplied')
                    : value === 'test'
                      ? t('ops.careers.stageHintTest')
                      : value === 'discarded'
                        ? t('ops.careers.stageHintDiscarded')
                        : t('ops.careers.stageHintAll')
              }
            >
              <Link
                href={bolsaHref({
                  stageValue: (value ? effectiveStage === value : !effectiveStage) ? '' : value,
                  appValue: '',
                })}
                className={
                  (value ? effectiveStage === value : !effectiveStage)
                    ? 'rounded-full bg-codiva-primary px-3 py-1 text-xs font-semibold text-white'
                    : 'rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50'
                }
              >
                {t('ops.careers.stageCount', { label, count })}
              </Link>
            </HoverTip>
          ))}
          <HoverTip text={t('ops.careers.tagOriginHint', { count: sharedOriginCount, code: '' })}>
            <Link
              href={bolsaHref({ originValue: originFilter ? '' : 'shared' })}
              className={
                originFilter
                  ? 'rounded-full bg-amber-700 px-3 py-1 text-xs font-semibold text-white'
                  : 'rounded-full border border-amber-300 px-3 py-1 text-xs font-medium text-amber-800 hover:bg-amber-50'
              }
            >
              {t('ops.careers.stageCount', {
                label: t('ops.careers.tagOrigin'),
                count: sharedOriginCount,
              })}
            </Link>
          </HoverTip>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-zinc-500">{t('ops.careers.signalGroup')}</span>
          {[
            ['', t('ops.careers.signalAll')],
            ['strong', huntConsiderationLabel('strong', locale)],
            ['solid', huntConsiderationLabel('solid', locale)],
            ['minimum', huntConsiderationLabel('minimum', locale)],
            ['none', huntConsiderationLabel('none', locale)],
          ].map(([value, label]) => (
            <HoverTip key={value || 'all'} text={considerationHint(value, t)}>
              <Link
                href={bolsaHref({ signalValue: signalFilter === value ? '' : value })}
                aria-label={`${label}. ${considerationHint(value, t)}`}
                className={
                  signalFilter === value
                    ? 'rounded-full bg-codiva-primary px-3 py-1 text-xs font-semibold text-white'
                    : 'rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50'
                }
              >
                {label}
              </Link>
            </HoverTip>
          ))}
        </div>
        {showDiscarded ? (
          discardedApplications.length ? (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-zinc-800">{t('ops.careers.discardedTitle')}</h3>
              <p className="text-sm text-zinc-500">{t('ops.careers.discardedHint')}</p>
              <ul className="space-y-3">
                {discardedApplications.map((row) => {
                  const tests = attemptsOnApplication(row);
                  return (
                  <ApplicationCard
                    key={row.id}
                    row={row}
                    hunt={huntForCandidate(huntReports, row.email, row.discipline)}
                    linkedAttempt={tests.linked}
                    extraAttempts={tests.extra}
                    t={t}
                    formatDate={formatDate}
                    locale={locale}
                    disciplineLabels={DISCIPLINE_LABELS}
                    statusLabels={JOB_APPLICATION_STATUS_LABELS}
                    canManage={canManage}
                    bolsaHref={bolsaHref}
                    effectiveStage={effectiveStage}
                    appFilter={appFilter}
                    signalFilter={signalFilter}
                    interviewRounds={interviewRoundsByApp.get(row.id) ?? []}
                    interviewComments={interviewCommentsByApp.get(row.id) ?? []}
                    interviewStaff={interviewStaff}
                    interviewPartners={interviewPartners}
                    interviewReports={interviewReports}
                    currentUserId={currentUserId}
                    canTeam={canManage}
                  />
                  );
                })}
              </ul>
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-zinc-300 bg-white px-4 py-8 text-center text-sm text-zinc-500">
              {t('ops.careers.discardedEmpty')}
            </p>
          )
        ) : peopleEmpty ? (
          <p className="rounded-xl border border-dashed border-zinc-300 bg-white px-4 py-8 text-center text-sm text-zinc-500">
            {t('ops.careers.peopleEmpty')}
          </p>
        ) : (
          <div className="space-y-8">
            {showReady && readyForCv.length ? (
              <div className="space-y-3">
                {!effectiveStage ? (
                  <h3 className="text-sm font-semibold text-zinc-800">{t('ops.careers.stageReady')}</h3>
                ) : null}
                <ul className="space-y-3">
                  {readyForCv.map((row) => {
                    const posting = postings.find((p) => p.id === row.job_posting_id);
                    const discipline = disciplineFromCatalogKey(row.catalog_key);
                    const hunt = huntForCandidate(huntReports, row.email, discipline, row.catalog_key);
                    const role = applicationRoleLabel({
                      postingTitle: posting?.title,
                      discipline,
                      locale: t.locale,
                    });
                    const peers = attemptsSharingOrigin(attempts, row.ip_hash).filter((peer) => peer.id !== row.id);
                    const fingerprint = originFingerprint(row.ip_hash);
                    const identities = distinctOriginEmails([row, ...peers]);
                    return (
                      <li
                        key={row.id}
                        className={`rounded-xl border bg-white p-4 ${
                          peers.length ? 'border-amber-300' : 'border-zinc-200'
                        }`}
                      >
                        <p className="font-medium">
                          <Link href={`/team/intentos/${row.id}`} className="hover:text-codiva-primary hover:underline">
                            {row.full_name}
                          </Link>
                        </p>
                        {role ? <p className="text-sm font-medium text-codiva-primary">{role}</p> : null}
                        <p className="text-sm text-zinc-500">
                          <a href={`mailto:${row.email}`} className="hover:text-codiva-primary hover:underline">
                            {row.email}
                          </a>
                          {` · ${formatDate(row.started_at)}`}
                          {posting?.title ? ` · ${posting.title}` : ''}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <CareersTag
                            label={t('ops.careers.stageReady')}
                            tone="success"
                            href={bolsaHref({
                              stageValue: effectiveStage === 'ready' ? '' : 'ready',
                              appValue: '',
                            })}
                            title={t('ops.careers.tagStageHint')}
                            active={effectiveStage === 'ready'}
                          />
                          {row.score_pct != null ? (
                            <CareersTag
                              label={t('ops.careers.testScore', { pct: row.score_pct })}
                              tone="success"
                              href={`/team/intentos/${row.id}`}
                              title={t('ops.careers.tagTestHint')}
                            />
                          ) : (
                            <CareersTag
                              label={attemptStatusLabel(row.status, row.passed, t)}
                              tone="success"
                              href={`/team/intentos/${row.id}`}
                              title={t('ops.careers.tagTestHint')}
                            />
                          )}
                          <CareersTag
                            label={t('ops.careers.tagSignal', {
                              label: huntConsiderationLabel(hunt.score.consideration, locale),
                            })}
                            tone={considerationTone(hunt.score.consideration)}
                            href={bolsaHref({
                              signalValue:
                                signalFilter === hunt.score.consideration ? '' : hunt.score.consideration,
                            })}
                            title={considerationHint(hunt.score.consideration, t)}
                            active={signalFilter === hunt.score.consideration}
                          />
                          {peers.length ? (
                            <CareersTag
                              label={t('ops.careers.tagOrigin')}
                              tone="warning"
                              href={bolsaHref({ originValue: originFilter ? '' : 'shared' })}
                              title={t('ops.careers.tagOriginHint', {
                                count: peers.length + 1,
                                code: fingerprint
                                  ? t('ops.careers.tagOriginCode', { code: fingerprint })
                                  : '',
                              })}
                              active={originFilter}
                            />
                          ) : null}
                        </div>
                        {peers.length ? (
                          <p className="mt-2 text-xs text-amber-800">
                            {t('ops.careers.sameOrigin', { count: peers.length + 1 })}
                            {identities > 1
                              ? ` · ${t('ops.careers.sameOriginIdentities', { count: identities })}`
                              : ''}
                            {': '}
                            {peers
                              .filter(
                                (peer, index, list) =>
                                  list.findIndex((p) => p.full_name === peer.full_name) === index
                              )
                              .slice(0, 3)
                              .map((peer, index) => (
                                <span key={peer.id}>
                                  {index > 0 ? ', ' : ''}
                                  <Link
                                    href={`/team/intentos/${peer.id}`}
                                    className="underline decoration-amber-400 hover:text-amber-950"
                                  >
                                    {peer.full_name}
                                  </Link>
                                </span>
                              ))}
                          </p>
                        ) : null}
                        <HuntFindingsBlock
                          rows={hunt.rows}
                          discipline={discipline}
                          t={t}
                          formatDate={formatDate}
                          locale={locale}
                          disciplineLabels={DISCIPLINE_LABELS}
                        />
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

            {showApplied && (applicationsRanked.length || effectiveStage === 'applied') ? (
              <div className="space-y-3">
                {!effectiveStage ? (
                  <h3 className="text-sm font-semibold text-zinc-800">{t('ops.careers.appsTitle')}</h3>
                ) : null}
                {!applicationsRanked.length ? (
                  effectiveStage === 'applied' ? (
                    <p className="rounded-xl border border-dashed border-zinc-300 bg-white px-4 py-8 text-center text-sm text-zinc-500">
                      {t('ops.careers.appsEmpty')}
                    </p>
                  ) : null
                ) : (
                  <ul className="space-y-3">
                    {applicationsRanked.map((row) => {
                      const tests = attemptsOnApplication(row);
                      return (
                      <ApplicationCard
                        key={row.id}
                        row={row}
                        hunt={huntForCandidate(huntReports, row.email, row.discipline)}
                        linkedAttempt={tests.linked}
                        extraAttempts={tests.extra}
                        t={t}
                        formatDate={formatDate}
                        locale={locale}
                        disciplineLabels={DISCIPLINE_LABELS}
                        statusLabels={JOB_APPLICATION_STATUS_LABELS}
                        canManage={canManage}
                        bolsaHref={bolsaHref}
                        effectiveStage={effectiveStage}
                        appFilter={appFilter}
                        signalFilter={signalFilter}
                        interviewRounds={interviewRoundsByApp.get(row.id) ?? []}
                        interviewComments={interviewCommentsByApp.get(row.id) ?? []}
                        interviewStaff={interviewStaff}
                        interviewPartners={interviewPartners}
                        interviewReports={interviewReports}
                        currentUserId={currentUserId}
                        canTeam={canManage}
                      />
                      );
                    })}
                  </ul>
                )}
              </div>
            ) : null}

            {showTest && attemptsActive.length ? (
              <div className="space-y-3">
                {!effectiveStage ? (
                  <h3 className="text-sm font-semibold text-zinc-800">{t('ops.careers.stageTest')}</h3>
                ) : null}
                <ul className="space-y-3">
                  {attemptsActive.slice(0, 40).map((row) => {
                    const posting = postings.find((p) => p.id === row.job_posting_id);
                    const discipline = disciplineFromCatalogKey(row.catalog_key);
                    const hunt = huntForCandidate(huntReports, row.email, discipline, row.catalog_key);
                    const role = applicationRoleLabel({
                      postingTitle: posting?.title,
                      discipline,
                      locale: t.locale,
                    });
                    const peers = attemptsSharingOrigin(attempts, row.ip_hash).filter((peer) => peer.id !== row.id);
                    const fingerprint = originFingerprint(row.ip_hash);
                    const identities = distinctOriginEmails([row, ...peers]);
                    const priorAttempts = attempts.filter(
                      (peer) =>
                        peer.id !== row.id &&
                        recruitingAttemptKey(peer.email, peer.job_posting_id) ===
                          recruitingAttemptKey(row.email, row.job_posting_id)
                    );
                    const findingRows = hunt.rows;
                    return (
                      <li
                        key={row.id}
                        className={`rounded-xl border bg-white p-4 ${
                          peers.length ? 'border-amber-300' : 'border-zinc-200'
                        }`}
                      >
                        <p className="font-medium">
                          <Link href={`/team/intentos/${row.id}`} className="hover:text-codiva-primary hover:underline">
                            {row.full_name}
                          </Link>
                        </p>
                        {role ? <p className="text-sm font-medium text-codiva-primary">{role}</p> : null}
                        <p className="text-sm text-zinc-500">
                          <a href={`mailto:${row.email}`} className="hover:text-codiva-primary hover:underline">
                            {row.email}
                          </a>
                          {` · ${formatDate(row.started_at)}`}
                          {posting?.title ? ` · ${posting.title}` : ''}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <CareersTag
                            label={t('ops.careers.stageTest')}
                            href={bolsaHref({
                              stageValue: effectiveStage === 'test' ? '' : 'test',
                              appValue: '',
                            })}
                            title={t('ops.careers.tagStageHint')}
                            active={effectiveStage === 'test'}
                          />
                          <CareersTag
                            label={
                              row.score_pct != null
                                ? `${attemptStatusLabel(row.status, row.passed, t)} · ${row.score_pct}%`
                                : attemptStatusLabel(row.status, row.passed, t)
                            }
                            tone={row.passed ? 'success' : row.status === 'started' ? 'warning' : 'neutral'}
                            href={`/team/intentos/${row.id}`}
                            title={t('ops.careers.tagTestHint')}
                          />
                          {priorAttempts.map((attempt) => (
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
                            label={t('ops.careers.tagSignal', {
                              label: huntConsiderationLabel(hunt.score.consideration, locale),
                            })}
                            tone={considerationTone(hunt.score.consideration)}
                            href={bolsaHref({
                              signalValue:
                                signalFilter === hunt.score.consideration ? '' : hunt.score.consideration,
                            })}
                            title={considerationHint(hunt.score.consideration, t)}
                            active={signalFilter === hunt.score.consideration}
                          />
                          {peers.length ? (
                            <CareersTag
                              label={t('ops.careers.tagOrigin')}
                              tone="warning"
                              href={bolsaHref({ originValue: originFilter ? '' : 'shared' })}
                              title={t('ops.careers.tagOriginHint', {
                                count: peers.length + 1,
                                code: fingerprint
                                  ? t('ops.careers.tagOriginCode', { code: fingerprint })
                                  : '',
                              })}
                              active={originFilter}
                            />
                          ) : null}
                          {(row.attempt_number ?? 1) > 1 ? (
                            <CareersTag
                              label={t('ops.careers.attemptN', { n: row.attempt_number ?? 1 })}
                              href={`/team/intentos/${row.id}`}
                              title={t('ops.careers.tagTestHint')}
                            />
                          ) : null}
                        </div>
                        {peers.length ? (
                          <p className="mt-2 text-xs text-amber-800">
                            {t('ops.careers.sameOrigin', { count: peers.length + 1 })}
                            {identities > 1
                              ? ` · ${t('ops.careers.sameOriginIdentities', { count: identities })}`
                              : ''}
                            {': '}
                            {peers
                              .filter(
                                (peer, index, list) =>
                                  list.findIndex((p) => p.full_name === peer.full_name) === index
                              )
                              .slice(0, 3)
                              .map((peer, index) => (
                                <span key={peer.id}>
                                  {index > 0 ? ', ' : ''}
                                  <Link
                                    href={`/team/intentos/${peer.id}`}
                                    className="underline decoration-amber-400 hover:text-amber-950"
                                  >
                                    {peer.full_name}
                                  </Link>
                                </span>
                              ))}
                          </p>
                        ) : null}
                        {findingRows.length ? (
                          <details className="group mt-3">
                            <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 hover:text-zinc-800 [&::-webkit-details-marker]:hidden">
                              {t('ops.careers.findingsToggle', { count: findingRows.length })}
                              <ChevronDown
                                className="h-3.5 w-3.5 text-zinc-400 transition group-open:rotate-180"
                                aria-hidden
                              />
                            </summary>
                            <HuntFindingsBlock
                              rows={findingRows}
                              discipline={discipline}
                              t={t}
                              formatDate={formatDate}
                              locale={locale}
                              disciplineLabels={DISCIPLINE_LABELS}
                              heading={false}
                            />
                          </details>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </section>

      {orphanFindings.length && !showDiscarded ? (
      <section className="space-y-3">
        <h2 className="font-semibold">{t('ops.careers.findingsOrphanTitle')}</h2>
        <p className="text-sm text-zinc-500">{t('ops.careers.findingsOrphanHint')}</p>
        <ul className="space-y-3">
          {orphanFindings.slice(0, 40).map((row) => (
            <li key={row.id} className="rounded-xl border border-zinc-200 bg-white p-4">
              <p className="font-medium">{row.full_name}</p>
              <p className="text-sm text-zinc-500">
                <a href={`mailto:${row.email}`} className="hover:text-codiva-primary hover:underline">
                  {row.email}
                </a>
              </p>
              <div className="mt-3">
                <HuntFindingEmbed
                  row={row}
                  discipline={row.discipline}
                  t={t}
                  formatDate={formatDate}
                  locale={locale}
                  disciplineLabels={DISCIPLINE_LABELS}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>
      ) : null}
    </div>
  );
}
