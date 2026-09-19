import CopyableUrl from '@/components/ops/CopyableUrl';
import JobPostingProcessFields from '@/components/ops/JobPostingProcessFields';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import ToastForm from '@/components/ops/ToastForm';
import OpsReportLightbox from '@/components/ops/OpsReportLightbox';
import {
  JOB_EMPLOYMENT_TYPES,
  careerOpsLabels,
  careerDisciplineLabels,
  applicationRoleLabel,
  isClosedApplicationStatus,
  isDiscardedApplicationStatus,
  isJobApplicationStatus,
  publicCareerListUrl,
  publicCareerUrl,
  type JobEmploymentType,
  type JobPostingStatus,
} from '@/lib/ops/careers';
import {
  type OpsInterviewCommentRow,
  type OpsInterviewPartnerOption,
  type OpsInterviewReportRow,
  type OpsInterviewRoundRow,
  type OpsInterviewStaff,
} from '@/components/ops/OpsApplicationInterviews';
import { createJobPosting, deleteJobPosting } from '@/lib/ops/career-actions';
import {
  applicationCoversAttempt,
  attemptsForApplication,
  careerEmailKey as emailKey,
  isCandidateReadyForCv,
  latestAttemptByJobEmail,
  recruitingAttemptKey,
} from '@/lib/careers/recruiting-stage';
import { huntTypeFilterLabel } from '@/lib/careers/hunt/score';
import { disciplineFromCatalogKey } from '@/lib/ops/career-disciplines';
import {
  attemptsSharingOrigin,
  distinctOriginEmails,
  originFingerprint,
  sharedOriginAttemptCount,
} from '@/lib/careers/assessments/origin';
import { labelsFor } from '@/lib/ops/labels';
import { getT } from '@/i18n/locale';
import { usageUrlLabel } from '@/lib/ops/host';
import { ApplicationCard } from './careers/ApplicationCard';
import { HuntFindingEmbed, HuntFindingsBlock } from './careers/HuntFindingsBlock';
import {
  CareersTag,
  HoverTip,
  attemptStatusLabel,
  considerationHint,
  considerationRank,
  considerationTone,
  huntForCandidate,
  huntSignalTag,
  postingAsksDisciplineFlag,
  postingHint,
  postingTone,
  relatedApplicationPosting,
} from './careers/shared';
import type {
  OpsHuntReportRow,
  OpsJobApplicationRow,
  OpsJobAttemptRow,
  OpsJobPostingRow,
  OpsPersonnelOfferLink,
} from './careers/types';

export type {
  OpsHuntReportRow,
  OpsJobApplicationRow,
  OpsJobAttemptRow,
  OpsJobPostingRow,
  OpsPersonnelOfferLink,
} from './careers/types';
export { HuntFindingsBlock } from './careers/HuntFindingsBlock';

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
  const huntForApp = (row: OpsJobApplicationRow) => {
    const tests = attemptsOnApplication(row);
    const posting = (row.job_posting_id && postingById.get(row.job_posting_id)) || relatedApplicationPosting(row);
    return huntForCandidate(
      huntReports,
      row.email,
      row.discipline,
      tests.linked?.catalog_key,
      postingAsksDisciplineFlag(posting)
    );
  };
  const huntForAttempt = (row: OpsJobAttemptRow) =>
    huntForCandidate(
      huntReports,
      row.email,
      disciplineFromCatalogKey(row.catalog_key),
      row.catalog_key,
      postingById.get(row.job_posting_id)?.asks_discipline
    );
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
      const ha = huntForAttempt(a);
      const hb = huntForAttempt(b);
      const diff = considerationRank(hb.score.consideration) - considerationRank(ha.score.consideration);
      if (diff) return diff;
      return new Date(b.started_at).getTime() - new Date(a.started_at).getTime();
    })
    .filter((row) => {
      if (originFilter && (originSize.get(String(row.ip_hash || '').trim()) || 0) < 2) return false;
      if (!signalFilter) return true;
      return (
        huntForAttempt(row).score.consideration === signalFilter
      );
    });

  const matchesApplicationSignal = (row: OpsJobApplicationRow) => {
    if (!signalFilter) return true;
    return huntForApp(row).score.consideration === signalFilter;
  };
  const rankApplications = (rows: OpsJobApplicationRow[]) =>
    [...rows].sort((a, b) => {
      const ha = huntForApp(a);
      const hb = huntForApp(b);
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
      const hunt = huntForAttempt(row);
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
      const ha = huntForAttempt(a);
      const hb = huntForAttempt(b);
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
            ['', huntTypeFilterLabel('', locale)],
            ['strong', huntTypeFilterLabel('strong', locale)],
            ['solid', huntTypeFilterLabel('solid', locale)],
            ['minimum', huntTypeFilterLabel('minimum', locale)],
            ['none', huntTypeFilterLabel('none', locale)],
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
                    hunt={huntForApp(row)}
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
                    const hunt = huntForAttempt(row);
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
                            label={
                              hunt.coverAllCrafts
                                ? huntSignalTag(hunt, locale)
                                : t('ops.careers.tagSignal', { label: huntSignalTag(hunt, locale) })
                            }
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
                          coverAllCrafts={hunt.coverAllCrafts}
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
                        hunt={huntForApp(row)}
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
                    const hunt = huntForAttempt(row);
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
                            label={
                              hunt.coverAllCrafts
                                ? huntSignalTag(hunt, locale)
                                : t('ops.careers.tagSignal', { label: huntSignalTag(hunt, locale) })
                            }
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
                              coverAllCrafts={hunt.coverAllCrafts}
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
                  coverAllCrafts={!row.discipline || row.discipline === 'other'}
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
