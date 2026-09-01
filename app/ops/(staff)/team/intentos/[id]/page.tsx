import OpsPageHeader from '@/components/ops/OpsPageHeader';
import { requireCareersReview } from '@/lib/ops/auth';
import { getAssessmentCatalog } from '@/lib/careers/assessments/catalog';
import { parseAnswers } from '@/lib/careers/assessments/server';
import { reviewRowsForAttempt, scoreAnswers } from '@/lib/careers/assessments/engine';
import { huntCoversAllCrafts, huntProgressFromReports } from '@/lib/careers/hunt/progress';
import { splitHuntReports } from '@/lib/careers/hunt/review';
import { huntConsiderationLabel } from '@/lib/careers/hunt/score';
import { summarizeHuntTrail, buildHuntTrailSteps } from '@/lib/careers/hunt/trail';
import HuntTrailMap from '@/components/ops/HuntTrailMap';
import { HuntFindingsBlock, type OpsHuntReportRow } from '@/components/ops/OpsCareersPanel';
import OpsReportLightbox from '@/components/ops/OpsReportLightbox';
import { careerDisciplineLabels, disciplineFromCatalogKey, isTesterPipelineItem } from '@/lib/ops/career-disciplines';
import {
  deviceLabelFromUserAgent,
  distinctOriginEmails,
  originFingerprint,
} from '@/lib/careers/assessments/origin';
import { can } from '@/lib/ops/permissions';
import { labelsFor } from '@/lib/ops/labels';
import { dateLocale } from '@/i18n/config';
import { getT, type Translator } from '@/i18n/locale';
import { findPersonnelOfferIdForEmail } from '@/lib/ops/offer-career-file';
import { notFound } from 'next/navigation';
import Link from 'next/link';

function formatDuration(ms: number | null | undefined, t: Translator) {
  if (!ms || ms < 0) return '-';
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? t('ops.attempt.durationMin', { m, s }) : t('ops.attempt.durationSec', { s });
}

function optionLabel(
  options: { key: string; label: string }[],
  keys: string[],
  empty: string
) {
  if (!keys.length) return empty;
  return keys
    .map((key) => options.find((o) => o.key === key)?.label || key)
    .join(' · ');
}

export default async function AssessmentAttemptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, staff } = await requireCareersReview();
  const t = await getT();
  const { EMPTY_LABEL, formatDate } = labelsFor(t.locale);
  const DISCIPLINE_LABELS = careerDisciplineLabels(t.locale);

  const { data: attempt } = await supabase
    .from('ops_job_assessment_attempts')
    .select(
      'id, job_posting_id, catalog_key, full_name, email, status, attempt_number, started_at, completed_at, expires_at, time_limit_sec, question_ids, option_orders, answers, score_correct, score_total, score_pct, passed, duration_ms, blur_count, timezone, user_agent, ip_hash'
    )
    .eq('id', id)
    .maybeSingle();

  if (!attempt) notFound();

  const [{ data: posting }, { data: events }, { data: application }, { data: huntByAttempt }, { data: huntByEmail }, { data: huntTrail }, { data: sameOrigin }] =
    await Promise.all([
    supabase.from('ops_job_postings').select('id, title, slug, careers_pipeline').eq('id', attempt.job_posting_id).maybeSingle(),
    supabase
      .from('ops_job_assessment_events')
      .select('id, event_type, question_id, payload, created_at')
      .eq('attempt_id', attempt.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('ops_job_applications')
      .select('id')
      .eq('assessment_attempt_id', attempt.id)
      .maybeSingle(),
    supabase
      .from('ops_hunt_reports')
      .select(
        'id, full_name, email, page_url, title, description, expected, matched_seed_id, discipline, assessment_attempt_id, review_status, evidence_paths, created_at'
      )
      .eq('assessment_attempt_id', attempt.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('ops_hunt_reports')
      .select(
        'id, full_name, email, page_url, title, description, expected, matched_seed_id, discipline, assessment_attempt_id, review_status, evidence_paths, created_at'
      )
      .ilike('email', attempt.email)
      .order('created_at', { ascending: false })
      .limit(40),
    supabase
      .from('ops_hunt_events')
      .select('id, event_type, path, host, referrer, created_at')
      .eq('assessment_attempt_id', attempt.id)
      .order('created_at', { ascending: true })
      .limit(200),
    attempt.ip_hash
      ? supabase
          .from('ops_job_assessment_attempts')
          .select(
            'id, catalog_key, full_name, email, status, score_pct, passed, started_at, timezone, user_agent'
          )
          .eq('ip_hash', attempt.ip_hash)
          .neq('id', attempt.id)
          .order('started_at', { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] as {
          id: string;
          catalog_key: string;
          full_name: string;
          email: string;
          status: string;
          score_pct: number | null;
          passed: boolean | null;
          started_at: string;
          timezone: string | null;
          user_agent: string | null;
        }[] }),
  ]);

  if (
    !can(staff, 'team') &&
    !isTesterPipelineItem({
      catalogKey: attempt.catalog_key,
      postingSlug: posting?.slug,
      careersPipeline: posting?.careers_pipeline,
    })
  ) {
    notFound();
  }

  const catalog = getAssessmentCatalog(attempt.catalog_key);
  const answers = parseAnswers(attempt.answers);
  const questionIds = (attempt.question_ids as string[]) || [];
  const scored = catalog
    ? scoreAnswers(catalog, questionIds, answers)
    : { byQuestion: {} as Record<string, boolean>, pct: attempt.score_pct ?? 0 };
  const review = catalog
    ? reviewRowsForAttempt(catalog, questionIds, answers, scored.byQuestion)
    : [];
  const discipline = disciplineFromCatalogKey(attempt.catalog_key);
  const huntById = new Map<string, OpsHuntReportRow>();
  for (const row of [...(huntByAttempt ?? []), ...(huntByEmail ?? [])]) {
    huntById.set(row.id, row as OpsHuntReportRow);
  }
  const huntReports = [...huntById.values()].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const { active: huntScoring } = splitHuntReports(huntReports);
  const coverAllCrafts = huntCoversAllCrafts({ catalogKey: attempt.catalog_key });
  const huntProgress = huntProgressFromReports(huntScoring, {
    required: true,
    coverAllCrafts,
    discipline: coverAllCrafts ? null : discipline,
  });
  const craftHits = huntProgress.matched;
  const huntScore = huntProgress.score;
  const locale = t.locale === 'en' ? 'en' : 'es';
  const trail = summarizeHuntTrail({
    passedAt: attempt.completed_at,
    discipline,
    events: huntTrail ?? [],
    reports: huntReports,
  });
  const trailSteps = buildHuntTrailSteps(huntTrail ?? [], huntReports);
  const fingerprint = originFingerprint(attempt.ip_hash);
  const device = deviceLabelFromUserAgent(attempt.user_agent);
  const originPeers = sameOrigin ?? [];
  const originIdentities = distinctOriginEmails([{ email: attempt.email }, ...originPeers]);
  const linkedOfferId = await findPersonnelOfferIdForEmail(attempt.email);

  const timeOnQuestion = new Map<string, number>();
  let lastView: { id: string; at: number } | null = null;
  for (const event of events ?? []) {
    const at = new Date(event.created_at).getTime();
    if (event.event_type === 'question_viewed' && event.question_id) {
      if (lastView) {
        timeOnQuestion.set(lastView.id, (timeOnQuestion.get(lastView.id) || 0) + (at - lastView.at));
      }
      lastView = { id: event.question_id, at };
    }
  }
  if (lastView && attempt.completed_at) {
    timeOnQuestion.set(
      lastView.id,
      (timeOnQuestion.get(lastView.id) || 0) + (new Date(attempt.completed_at).getTime() - lastView.at)
    );
  }

  return (
    <div className="max-w-3xl min-w-0 space-y-8">
      <OpsPageHeader
        title={attempt.full_name}
        description={t('ops.attempt.description')}
      />
      <p className="text-sm">
        <Link href="/team?tab=bolsa" className="text-codiva-primary hover:underline">
          {t('ops.attempt.backJobs')}
        </Link>
        {posting ? (
          <>
            {' · '}
            <Link href={`/team/vacantes/${posting.id}`} className="text-codiva-primary hover:underline">
              {posting.title}
            </Link>
          </>
        ) : null}
        {' · '}
        <OpsReportLightbox
          title={t('ops.attempt.reportHtml')}
          htmlSrc={`/api/ops/careers/recruiting-report?attempt=${attempt.id}`}
          downloadHref={`/api/ops/careers/recruiting-report?attempt=${attempt.id}&format=pdf`}
          triggerLabel={t('ops.attempt.reportHtml')}
          downloadLabel={t('ops.attempt.reportPdf')}
          trigger="link"
        />
        {linkedOfferId ? (
          <>
            {' · '}
            <Link href={`/team/ofertas/${linkedOfferId}`} className="text-codiva-primary hover:underline">
              {t('ops.offer.careerFile')}
            </Link>
          </>
        ) : null}
      </p>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t('ops.attempt.result')}</p>
          <p className="mt-1 text-lg font-semibold text-zinc-900">
            {attempt.passed
              ? t('ops.attempt.passed')
              : attempt.status === 'completed'
                ? t('ops.attempt.failed')
                : attempt.status}
            {attempt.score_pct != null ? ` · ${attempt.score_pct}%` : ''}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {t('ops.attempt.pts', {
              correct: attempt.score_correct ?? '-',
              total: attempt.score_total ?? '-',
              n: attempt.attempt_number,
            })}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t('ops.attempt.time')}</p>
          <p className="mt-1 text-lg font-semibold text-zinc-900">{formatDuration(attempt.duration_ms, t)}</p>
          <p className="mt-1 text-xs text-zinc-500">
            {t('ops.attempt.limit', {
              min: Math.round((attempt.time_limit_sec || 0) / 60),
              date: formatDate(attempt.started_at),
            })}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t('ops.attempt.context')}</p>
          <p className="mt-1 break-all text-sm text-zinc-800">{attempt.email}</p>
          <p className="mt-1 text-xs text-zinc-500">
            {attempt.timezone || t('ops.attempt.noTimezone')}
            {device ? ` · ${t('ops.attempt.device', { device })}` : ''}
            {fingerprint ? ` · ${t('ops.attempt.originCode', { code: fingerprint })}` : ''}
            {attempt.blur_count
              ? ` · ${t('ops.attempt.blurs', { count: attempt.blur_count })}`
              : ` · ${t('ops.attempt.noBlurs')}`}
            {application?.id ? ` · ${t('ops.attempt.applied')}` : ` · ${t('ops.attempt.notApplied')}`}
            {huntReports.length
              ? ` · ${t('ops.careers.findingsCount', { count: huntReports.length })}${
                  craftHits ? ` ${t('ops.careers.craftHits', { count: craftHits })}` : ''
                }`
              : ''}
            {huntScore.consideration !== 'none'
              ? ` · ${t('ops.careers.consideration', {
                  label: huntConsiderationLabel(huntScore.consideration, locale),
                })}`
              : ''}
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">{t('ops.attempt.originTitle')}</h2>
        <p className="text-sm text-zinc-500">{t('ops.attempt.originHint')}</p>
        {!fingerprint ? (
          <p className="rounded-xl border border-dashed border-zinc-300 bg-white px-4 py-8 text-center text-sm text-zinc-500">
            {t('ops.attempt.originEmpty')}
          </p>
        ) : !originPeers.length ? (
          <p className="rounded-xl border border-dashed border-zinc-300 bg-white px-4 py-8 text-center text-sm text-zinc-500">
            {t('ops.attempt.originCode', { code: fingerprint })} · {t('ops.attempt.originAlone')}
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-amber-800">
              {t('ops.attempt.originCode', { code: fingerprint })}
              {' · '}
              {t('ops.attempt.originCount', { count: originPeers.length })}
              {originIdentities > 1
                ? ` · ${t('ops.careers.sameOriginIdentities', { count: originIdentities })}`
                : ''}
            </p>
            <ul className="space-y-3">
              {originPeers.map((row) => {
                const craft = disciplineFromCatalogKey(row.catalog_key);
                const peerDevice = deviceLabelFromUserAgent(row.user_agent);
                return (
                  <li key={row.id} className="rounded-xl border border-amber-300 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{row.full_name}</p>
                        <p className="text-sm text-zinc-500">{row.email}</p>
                        <p className="mt-1 text-xs text-zinc-400">
                          {craft ? DISCIPLINE_LABELS[craft] : row.catalog_key}
                          {' · '}
                          {formatDate(row.started_at)}
                          {row.timezone ? ` · ${row.timezone}` : ''}
                          {peerDevice ? ` · ${peerDevice}` : ''}
                        </p>
                      </div>
                      <p className="text-sm font-medium text-zinc-800">
                        {row.passed
                          ? t('ops.attempt.passed')
                          : row.status === 'completed'
                            ? t('ops.attempt.failed')
                            : row.status}
                        {row.score_pct != null ? ` · ${row.score_pct}%` : ''}
                      </p>
                    </div>
                    <Link
                      href={`/team/intentos/${row.id}`}
                      className="mt-3 inline-flex rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50"
                    >
                      {t('ops.careers.viewProgress')}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">{t('ops.attempt.findingsTitle')}</h2>
        <p className="text-sm text-zinc-500">
          {t('ops.attempt.findingsHint', {
            craft: discipline ? t('ops.attempt.findingsHintCraft', { craft: DISCIPLINE_LABELS[discipline] }) : '',
          })}{' '}
          {t('ops.attempt.findingsHintRest')}
        </p>
        {!huntReports.length ? (
          <p className="rounded-xl border border-dashed border-zinc-300 bg-white px-4 py-8 text-center text-sm text-zinc-500">
            {t('ops.attempt.findingsEmpty')}
          </p>
        ) : (
          <HuntFindingsBlock
            rows={huntReports}
            discipline={discipline}
            t={t}
            formatDate={formatDate}
            locale={locale}
            disciplineLabels={DISCIPLINE_LABELS}
            heading={false}
            reviewAttemptId={attempt.id}
          />
        )}
      </section>

      <HuntTrailMap
        trail={trail}
        steps={trailSteps}
        formatDuration={(ms) => formatDuration(ms, t)}
        t={t}
        locale={locale}
      />

      <section className="space-y-3">
        <h2 className="font-semibold">{t('ops.attempt.answers')}</h2>
        {!review.length ? (
          <p className="text-sm text-zinc-500">{t('ops.attempt.noCatalog')}</p>
        ) : (
          <ol className="space-y-3">
            {review.map((row, index) => (
              <li key={row.id} className="rounded-xl border border-zinc-200 bg-white p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-codiva-primary">
                    {index + 1}. {row.competency}
                  </p>
                  <span className={`text-xs font-semibold ${row.ok ? 'text-codiva-primary' : 'text-red-700'}`}>
                    {row.ok ? t('ops.attempt.correct') : t('ops.attempt.incorrect')} ·{' '}
                    {formatDuration(timeOnQuestion.get(row.id) || 0, t)}
                  </span>
                </div>
                <p className="text-sm font-medium text-zinc-900">{row.prompt}</p>
                <p className="mt-2 text-sm text-zinc-600">
                  <span className="font-medium text-zinc-800">{t('ops.attempt.given')}</span>
                  {optionLabel(row.options, row.given, t('ops.attempt.noAnswer'))}
                </p>
                {!row.ok ? (
                  <p className="mt-1 text-sm text-zinc-600">
                    <span className="font-medium text-zinc-800">{t('ops.attempt.expected')}</span>
                    {optionLabel(row.options, row.correct, t('ops.attempt.noAnswer'))}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">{t('ops.attempt.timeline')}</h2>
        {!events?.length ? (
          <p className="text-sm text-zinc-500">{t('ops.attempt.noEvents')}</p>
        ) : (
          <ol className="space-y-2">
            {events.map((event) => (
              <li key={event.id} className="flex min-w-0 gap-3 text-sm">
                <span className="w-[4.75rem] shrink-0 tabular-nums text-zinc-400 sm:w-36">
                  {new Date(event.created_at).toLocaleString(dateLocale(t.locale), {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
                <span className="min-w-0 break-words text-zinc-800">
                  {t(`ops.attempt.events.${event.event_type}`, { defaultValue: event.event_type })}
                  {event.question_id ? ` · ${event.question_id}` : ''}
                </span>
              </li>
            ))}
          </ol>
        )}
        {attempt.user_agent ? (
          <p className="text-xs text-zinc-400">{t('ops.attempt.agent', { ua: attempt.user_agent })}</p>
        ) : null}
        {!attempt.timezone && !attempt.user_agent ? (
          <p className="text-xs text-zinc-400">{EMPTY_LABEL}</p>
        ) : null}
      </section>
    </div>
  );
}
