import StatusBadge from '@/components/ops/StatusBadge';
import { dateLocale, type Locale } from '@/i18n/config';
import type { Translator } from '@/i18n/locale';
import {
  huntTrailRoute,
  type HuntPageKind,
  type HuntTrailQuality,
  type HuntTrailRouteStop,
  type HuntTrailStep,
} from '@/lib/careers/hunt/trail';

function pageLabel(
  pageKind: HuntPageKind,
  t: Translator,
  extras?: { slug?: string; path?: string }
) {
  if (pageKind === 'job') return t('ops.attempt.huntPageJob', { slug: extras?.slug || extras?.path || '' });
  if (pageKind === 'other') return t('ops.attempt.huntPageOther', { path: extras?.path || '/' });
  return t(`ops.attempt.huntPage.${pageKind}`);
}

function stepLabel(step: HuntTrailStep | HuntTrailRouteStop, t: Translator) {
  return pageLabel(step.pageKind, t, { slug: step.slug, path: step.path });
}

export default function HuntTrailMap({
  trail,
  steps,
  formatDuration,
  t,
  locale,
}: {
  trail: HuntTrailQuality;
  steps: HuntTrailStep[];
  formatDuration: (ms: number | null | undefined) => string;
  t: Translator;
  locale: Locale;
}) {
  const route = huntTrailRoute(steps);
  const reading = trail.formOnly
    ? t('ops.attempt.huntFormOnly')
    : trail.browsedSite
      ? t('ops.attempt.huntBrowsed', { count: trail.uniquePages })
      : t('ops.attempt.huntNoTrail');
  const stats: { label: string; value: string }[] = [
    { label: t('ops.attempt.huntStatPages'), value: String(trail.uniquePages) },
    { label: t('ops.attempt.huntStatViews'), value: String(trail.pageViews) },
    {
      label: t('ops.attempt.huntStatScope'),
      value: trail.formOnly
        ? t('ops.attempt.huntStatForm')
        : trail.browsedSite
          ? t('ops.attempt.huntStatSite')
          : t('ops.attempt.huntStatNone'),
    },
    {
      label: t('ops.attempt.huntStatCraft'),
      value:
        trail.msToFirstCraft != null
          ? formatDuration(trail.msToFirstCraft)
          : t('ops.attempt.huntNoCraftYet'),
    },
  ];

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-semibold">{t('ops.attempt.huntMapTitle')}</h2>
        <p className="mt-1 text-sm text-zinc-500">{t('ops.attempt.huntMapHint')}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-zinc-200 bg-white px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{stat.label}</p>
            <p className="mt-1 text-sm font-semibold text-zinc-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <StatusBadge label={reading} tone={trail.formOnly ? 'warning' : trail.browsedSite ? 'success' : 'neutral'} />
        {trail.visitedCareer ? (
          <StatusBadge label={t('ops.attempt.huntSurfaceCareer')} tone="info" />
        ) : null}
        {trail.visitedMarketing ? (
          <StatusBadge label={t('ops.attempt.huntVisitedMarketing')} tone="info" />
        ) : null}
        {trail.visitedFeed ? (
          <StatusBadge label={t('ops.attempt.huntVisitedFeed')} tone="info" />
        ) : null}
      </div>

      {!steps.length ? (
        <p className="rounded-xl border border-dashed border-zinc-300 bg-white px-4 py-8 text-center text-sm text-zinc-500">
          {t('ops.attempt.huntMapEmpty')}
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
          {route.length ? (
            <div className="border-b border-zinc-100 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {t('ops.attempt.huntRoute')}
              </p>
              <ol className="mt-2 flex flex-wrap items-center gap-x-1 gap-y-2" aria-label={t('ops.attempt.huntRoute')}>
                {route.map((stop, index) => (
                  <li key={stop.key} className="flex items-center gap-1">
                    {index > 0 ? (
                      <span className="px-1 text-zinc-300" aria-hidden>
                        →
                      </span>
                    ) : null}
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        stop.reported
                          ? 'bg-amber-100 text-amber-900'
                          : stop.surface === 'career'
                            ? 'bg-sky-50 text-sky-800'
                            : 'bg-zinc-100 text-zinc-700'
                      }`}
                    >
                      {stepLabel(stop, t)}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          <ol className="relative px-4 py-4" aria-label={t('ops.attempt.huntMapTitle')}>
            {steps.map((step, index) => {
              const reported = step.kind === 'reported';
              const last = index === steps.length - 1;
              return (
                <li key={step.id} className="relative flex min-w-0 gap-3 pb-5 last:pb-0 sm:gap-4">
                  <div className="flex w-12 shrink-0 flex-col items-end pt-0.5 text-right sm:w-16">
                    <time
                      dateTime={step.at}
                      className="text-xs tabular-nums text-zinc-500"
                    >
                      {new Date(step.at).toLocaleString(dateLocale(locale), {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </time>
                    {step.elapsedMs > 0 ? (
                      <span className="text-[11px] tabular-nums text-zinc-400">
                        +{formatDuration(step.elapsedMs)}
                      </span>
                    ) : null}
                  </div>
                  <div className="relative flex w-4 shrink-0 justify-center">
                    {!last ? (
                      <span
                        className="absolute top-3 bottom-[-1.25rem] w-px bg-zinc-200"
                        aria-hidden
                      />
                    ) : null}
                    <span
                      className={`relative z-[1] mt-1 h-3 w-3 rounded-full ring-4 ring-white ${
                        reported
                          ? 'bg-amber-500'
                          : step.isFeed
                            ? 'bg-violet-500'
                            : step.surface === 'career'
                              ? 'bg-sky-500'
                              : 'bg-zinc-400'
                      }`}
                      aria-hidden
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-zinc-900">
                        {reported
                          ? t('ops.attempt.huntMapReportedShort')
                          : t('ops.attempt.huntMapPageShort')}{' '}
                        {stepLabel(step, t)}
                      </p>
                      <StatusBadge
                        label={
                          step.surface === 'career'
                            ? t('ops.attempt.huntSurfaceCareer')
                            : t('ops.attempt.huntSurfaceMarketing')
                        }
                        tone={step.surface === 'career' ? 'info' : 'neutral'}
                      />
                      {step.visits > 1 ? (
                        <span className="text-xs text-zinc-400">
                          {t('ops.attempt.huntVisits', { count: step.visits })}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 break-all font-mono text-xs text-zinc-400">
                      {(step.host || '') + step.path}
                    </p>
                    {reported && step.findingTitle ? (
                      <p className="mt-1 text-sm text-amber-900">
                        {t('ops.attempt.huntFinding', { title: step.findingTitle })}
                      </p>
                    ) : null}
                    {step.referrer ? (
                      <p className="mt-1 text-xs text-zinc-400">
                        {t('ops.attempt.huntMapFrom', { from: step.referrer })}
                      </p>
                    ) : null}
                    {step.dwellMs != null && step.dwellMs >= 1000 ? (
                      <p className="mt-1 text-xs text-zinc-500">
                        {t('ops.attempt.huntDwell', { time: formatDuration(step.dwellMs) })}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}
