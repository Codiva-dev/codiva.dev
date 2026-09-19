import Link from 'next/link';
import { publicCareerListUrl, isCareerDiscipline } from '@/lib/ops/careers';
import { huntCoversAllCrafts, huntProgressFromReports } from '@/lib/careers/hunt/progress';
import { splitHuntReports } from '@/lib/careers/hunt/review';
import { careerEmailKey as emailKey } from '@/lib/careers/recruiting-stage';
import {
  huntConsiderationLabel,
  huntCoverageLabel,
  type HuntConsideration,
} from '@/lib/careers/hunt/score';
import { type Translator, type Locale } from '@/i18n/locale';
import { usageUrlLabel } from '@/lib/ops/host';
import type { OpsHuntReportRow, OpsJobApplicationRow } from './types';

export function postingHint(status: string, t: Translator) {
  if (status === 'published') {
    return t('ops.careers.postingHintPublished', { host: usageUrlLabel(publicCareerListUrl()) });
  }
  if (status === 'closed') return t('ops.careers.postingHintClosed');
  return t('ops.careers.postingHintDraft');
}

export function postingTone(status: string) {
  if (status === 'published') return 'success' as const;
  if (status === 'closed') return 'neutral' as const;
  return 'warning' as const;
}

export function applicationTone(status: string) {
  if (status === 'hired') return 'success' as const;
  if (status === 'rejected') return 'danger' as const;
  if (status === 'interview') return 'info' as const;
  if (status === 'reviewed') return 'info' as const;
  return 'warning' as const;
}

export function attemptStatusLabel(
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

export function considerationRank(value: HuntConsideration) {
  if (value === 'strong') return 3;
  if (value === 'solid') return 2;
  if (value === 'minimum') return 1;
  return 0;
}

export function considerationTone(value: HuntConsideration) {
  if (value === 'strong') return 'success' as const;
  if (value === 'solid') return 'info' as const;
  if (value === 'minimum') return 'warning' as const;
  return 'neutral' as const;
}

export function considerationHint(value: string, t: Translator) {
  if (value === 'strong') return t('ops.careers.signalHintStrong');
  if (value === 'solid') return t('ops.careers.signalHintSolid');
  if (value === 'minimum') return t('ops.careers.signalHintMinimum');
  if (value === 'none') return t('ops.careers.signalHintNone');
  return t('ops.careers.signalHintAll');
}

export function huntSignalTag(hunt: { coverAllCrafts: boolean; craftHits: number; huntNeeded: number; score: { consideration: HuntConsideration } }, locale: Locale) {
  if (hunt.coverAllCrafts) {
    return huntCoverageLabel(hunt.craftHits, hunt.huntNeeded, locale);
  }
  return huntConsiderationLabel(hunt.score.consideration, locale);
}

export function HoverTip({ text, children }: { text?: string; children: React.ReactNode }) {
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

export function CareersTag({
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

export function huntForCandidate(
  reports: OpsHuntReportRow[],
  email: string,
  discipline?: string | null,
  catalogKey?: string | null,
  asksDiscipline?: boolean | null
) {
  const rows = reports.filter((row) => emailKey(row.email) === emailKey(email));
  const { active } = splitHuntReports(rows);
  const coverAllCrafts = huntCoversAllCrafts({ catalogKey, asksDiscipline });
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
    coverAllCrafts,
  };
}

export function relatedApplicationPosting(row: OpsJobApplicationRow) {
  return Array.isArray(row.ops_job_postings) ? row.ops_job_postings[0] : row.ops_job_postings;
}

export function postingAsksDisciplineFlag(posting?: { asks_discipline?: boolean | null } | null): boolean | null {
  return typeof posting?.asks_discipline === 'boolean' ? posting.asks_discipline : null;
}
