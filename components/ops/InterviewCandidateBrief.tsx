import type { InterviewPartnerBrief } from '@/lib/ops/interview-brief';
import type { Translator } from '@/i18n/locale';

export default function InterviewCandidateBrief({
  brief,
  t,
}: {
  brief: InterviewPartnerBrief;
  t: Translator;
}) {
  const scoreBits = [
    brief.passed === true
      ? t('interviews.brief.passed')
      : brief.passed === false
        ? t('interviews.brief.failed')
        : t('interviews.brief.scoreUnknown'),
    brief.scorePct != null ? `${brief.scorePct}%` : null,
    brief.scoreCorrect != null && brief.scoreTotal != null
      ? `${brief.scoreCorrect}/${brief.scoreTotal}`
      : null,
    brief.attemptNumber != null ? t('interviews.brief.attempt', { n: brief.attemptNumber }) : null,
    brief.durationLabel || null,
  ].filter(Boolean);

  const huntBits = [
    brief.considerationLabel,
    t('interviews.brief.craftHits', { n: brief.craftHits }),
    t('interviews.brief.findingsTotal', { n: brief.findingsTotal }),
    brief.difficultyMix || null,
  ].filter(Boolean);

  return (
    <section className="mt-8 space-y-6 rounded-2xl border border-zinc-200 bg-white p-5">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">{t('interviews.brief.title')}</h2>
        <p className="mt-1 text-sm text-zinc-500">{t('interviews.brief.subtitle')}</p>
        {brief.craft ? (
          <p className="mt-2 text-sm font-medium text-codiva-primary">
            {t('interviews.brief.craft')}: {brief.craft}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {t('interviews.brief.assessment')}
          </p>
          <p className="mt-2 text-sm text-zinc-800">{scoreBits.join(' · ')}</p>
        </div>
        <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {t('interviews.brief.hunt')}
          </p>
          <p className="mt-2 text-sm text-zinc-800">{huntBits.join(' · ')}</p>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {t('interviews.brief.trail')}
        </p>
        <p className="mt-2 text-sm text-zinc-700">{brief.trailSummary}</p>
        {brief.trailRoute ? (
          <p className="mt-1 text-xs text-zinc-500">
            {t('interviews.brief.route')}: {brief.trailRoute}
          </p>
        ) : null}
      </div>

      {brief.competencies.length ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {t('interviews.brief.competencies')}
          </p>
          <ul className="mt-2 divide-y divide-zinc-100 rounded-xl border border-zinc-100">
            {brief.competencies.map((row) => (
              <li key={row.name} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span className="text-zinc-800">{row.name}</span>
                <span className={row.ok ? 'font-medium text-emerald-700' : 'font-medium text-red-700'}>
                  {row.ok ? t('interviews.brief.competencyOk') : t('interviews.brief.competencyFail')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {t('interviews.brief.findings')}
        </p>
        {brief.findings.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">{t('interviews.brief.findingsEmpty')}</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {brief.findings.map((finding, index) => (
              <li key={`${finding.pageUrl}-${index}`} className="min-w-0 rounded-xl border border-zinc-100 p-3">
                <p className="break-words font-medium text-zinc-900">{finding.title}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px] font-medium">
                  {finding.reviewDiscarded ? (
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-600">
                      {t('interviews.brief.discarded')}
                    </span>
                  ) : finding.counts ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">
                      {t('interviews.brief.counts')}
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-800">
                      {t('interviews.brief.doesNotCount')}
                    </span>
                  )}
                  {finding.difficultyLabel ? (
                    <span className="rounded-full bg-sky-50 px-2 py-0.5 text-sky-800">
                      {finding.difficultyLabel}
                    </span>
                  ) : null}
                  {finding.evidenceCount > 0 ? (
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-600">
                      {t('interviews.brief.evidence', { n: finding.evidenceCount })}
                    </span>
                  ) : null}
                </div>
                {finding.pageUrl ? (
                  <a
                    href={finding.pageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block truncate text-xs text-codiva-primary hover:underline"
                  >
                    {finding.pageUrl}
                  </a>
                ) : null}
                {finding.description ? (
                  <p className="mt-2 whitespace-pre-line break-words text-sm text-zinc-700">{finding.description}</p>
                ) : null}
                {finding.expected ? (
                  <p className="mt-2 text-sm text-zinc-500">
                    <span className="font-medium text-zinc-600">{t('interviews.brief.expected')}: </span>
                    {finding.expected}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
