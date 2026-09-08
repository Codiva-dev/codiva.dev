'use client';

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { QuotePhase } from '@/lib/ops/quote-document';

const EMPTY_PHASE: QuotePhase = { name: '', weeks: '', deliverable: '' };

export default function OpsQuotePhases({
  name = 'phases',
  initialPhases,
}: {
  name?: string;
  initialPhases: QuotePhase[];
}) {
  const { t } = useTranslation();
  const [phases, setPhases] = useState<QuotePhase[]>(initialPhases.length ? initialPhases : []);

  const serialized = useMemo(
    () =>
      JSON.stringify(
        phases
          .map((phase) => ({
            name: (phase.name ?? '').trim(),
            weeks: (phase.weeks ?? '').trim(),
            deliverable: (phase.deliverable ?? '').trim(),
          }))
          .filter((phase) => phase.name || phase.deliverable)
      ),
    [phases]
  );

  function update(index: number, patch: Partial<QuotePhase>) {
    setPhases((current) => current.map((phase, i) => (i === index ? { ...phase, ...patch } : phase)));
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={serialized} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-zinc-800">{t('ops.quotePhases.title')}</p>
        <button
          type="button"
          className="text-sm font-medium text-codiva-primary hover:underline"
          onClick={() => setPhases((current) => [...current, { ...EMPTY_PHASE }])}
        >
          {t('ops.quotePhases.add')}
        </button>
      </div>
      {phases.length === 0 && (
        <p className="text-sm text-zinc-500">{t('ops.quotePhases.empty')}</p>
      )}
      <ul className="space-y-3">
        {phases.map((phase, index) => (
          <li key={index} className="grid gap-2 rounded-xl border border-zinc-200 p-3 md:grid-cols-[1fr_8rem_auto]">
            <input
              value={phase.name ?? ''}
              onChange={(event) => update(index, { name: event.target.value })}
              placeholder={t('ops.quotePhases.phase')}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
            <input
              value={phase.weeks ?? ''}
              onChange={(event) => update(index, { weeks: event.target.value })}
              placeholder={t('ops.quotePhases.weeks')}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
            <button
              type="button"
              className="text-sm text-zinc-500 hover:text-red-700"
              onClick={() => setPhases((current) => current.filter((_, i) => i !== index))}
            >
              {t('ops.quotePhases.remove')}
            </button>
            <textarea
              value={phase.deliverable ?? ''}
              onChange={(event) => update(index, { deliverable: event.target.value })}
              placeholder={t('ops.quotePhases.deliverable')}
              rows={2}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm md:col-span-3"
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
