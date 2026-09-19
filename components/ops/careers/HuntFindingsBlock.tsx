import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import ToastForm from '@/components/ops/ToastForm';
import HuntEvidenceLightbox from '@/components/ops/HuntEvidenceLightbox';
import { huntFindingTypeLabel, isCareerDiscipline } from '@/lib/ops/careers';
import { updateHuntReportReview } from '@/lib/ops/career-actions';
import { huntSeedById } from '@/lib/careers/hunt/seeds';
import { matchedSeedCountsForDiscipline } from '@/lib/careers/hunt/match';
import { huntDifficultyLabel } from '@/lib/careers/hunt/score';
import { type Translator, type Locale } from '@/i18n/locale';
import type { OpsHuntReportRow } from './types';
import { CareersTag } from './shared';

export function HuntFindingEmbed({
  row,
  discipline,
  t,
  formatDate,
  locale,
  disciplineLabels,
  showAttemptLink = false,
  reviewAttemptId,
  reviewOfferId,
  coverAllCrafts = false,
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
  coverAllCrafts?: boolean;
}) {
  const seed = row.matched_seed_id ? huntSeedById(row.matched_seed_id) : null;
  const craftDiscipline = discipline && isCareerDiscipline(discipline) ? discipline : null;
  const tagByFindingType = coverAllCrafts || !craftDiscipline || craftDiscipline === 'other';
  const countsForCraft = Boolean(
    seed && !tagByFindingType && craftDiscipline && matchedSeedCountsForDiscipline(seed.id, craftDiscipline)
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
  coverAllCrafts = false,
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
  coverAllCrafts?: boolean;
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
          coverAllCrafts={coverAllCrafts}
        />
      ))}
    </div>
  );
}
