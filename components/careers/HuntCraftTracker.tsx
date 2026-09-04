'use client';

import { useTranslation } from 'react-i18next';
import { HUNT_FINDING_TYPE_LABELS, isHuntFindingType, type HuntFindingType } from '@/lib/ops/career-disciplines';

export type HuntCraftPublic = { craft: string; found: boolean };

type Props = {
  crafts: HuntCraftPublic[];
  matched: number;
  needed: number;
  variant?: 'panel' | 'dock';
  reportHref?: string;
};

export default function HuntCraftTracker({
  crafts,
  matched,
  needed,
  variant = 'panel',
  reportHref,
}: Props) {
  const { t } = useTranslation();
  const complete = needed > 0 && matched >= needed;
  const list = crafts.filter((slot): slot is { craft: HuntFindingType; found: boolean } =>
    isHuntFindingType(slot.craft)
  );

  return (
    <section
      className={
        variant === 'dock'
          ? 'w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-zinc-200 bg-white/95 p-3 shadow-lg backdrop-blur'
          : 'rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5'
      }
      aria-label={t('career.hunt_tracker_title', { defaultValue: 'Hallazgos por tipo de prueba' })}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className={`font-semibold text-zinc-900 ${variant === 'dock' ? 'text-sm' : 'text-base'}`}>
          {t('career.hunt_tracker_title', { defaultValue: 'Hallazgos por tipo de prueba' })}
        </h2>
        <p className="text-xs font-semibold tabular-nums text-codiva-primary">
          {t('career.hunt_tracker_progress', { found: matched, needed, defaultValue: '{{found}} de {{needed}}' })}
        </p>
      </div>
      <ul className={`mt-3 grid gap-1.5 ${variant === 'dock' ? 'grid-cols-1' : 'sm:grid-cols-2'}`}>
        {list.map((slot) => {
          const label = t(`career.hunt_type.${slot.craft}`, {
            defaultValue: HUNT_FINDING_TYPE_LABELS[slot.craft],
          });
          return (
            <li
              key={slot.craft}
              className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-sm ${
                slot.found ? 'bg-codiva-primary/10 text-zinc-800' : 'bg-zinc-50 text-zinc-500'
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  slot.found ? 'bg-codiva-primary text-white' : 'border border-zinc-300 text-zinc-400'
                }`}
                aria-hidden
              >
                {slot.found ? '✓' : '·'}
              </span>
              <span className="min-w-0 flex-1">
                {label}
                <span className="sr-only">
                  {slot.found ? t('career.hunt_tracker_found', { defaultValue: 'Encontrado' }) : t('career.hunt_tracker_missing', { defaultValue: 'Falta' })}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
      {complete ? (
        <p className="mt-3 text-sm text-codiva-primary">
          {t('career.hunt_tracker_done', { defaultValue: 'Cubriste los tres tipos de prueba. Ya puedes enviar el CV.' })}
        </p>
      ) : (
        <p className={`mt-3 text-zinc-600 ${variant === 'dock' ? 'text-xs' : 'text-sm'}`}>
          {t('career.hunt_tracker_hint', {
            defaultValue: 'Un hallazgo plantado o real por tipo: funcional, de API y de seguridad.',
          })}
        </p>
      )}
      {variant === 'dock' && reportHref && !complete ? (
        <a
          href={reportHref}
          className="mt-3 inline-flex text-sm font-medium text-codiva-primary hover:underline"
        >
          {t('career.hunt_tracker_report', { defaultValue: 'Reportar hallazgo' })}
        </a>
      ) : null}
    </section>
  );
}
