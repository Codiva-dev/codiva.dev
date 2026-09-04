'use client';

import { Check, CircleAlert, Info, Loader2, X } from 'lucide-react';
import toast, { resolveValue, Toaster, type Toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';

const TONE = {
  success: {
    bar: 'bg-codiva-primary',
    iconWrap: 'bg-codiva-primary text-white',
    card: 'border-codiva-primary/20',
    label: 'text-codiva-primary',
  },
  error: {
    bar: 'bg-red-700',
    iconWrap: 'bg-red-50 text-red-700',
    card: 'border-red-200',
    label: 'text-red-700',
  },
  loading: {
    bar: 'bg-codiva-accent-light',
    iconWrap: 'bg-codiva-primary/10 text-codiva-primary',
    card: 'border-codiva-primary/15',
    label: 'text-codiva-secondary',
  },
  blank: {
    bar: 'bg-codiva-secondary',
    iconWrap: 'bg-zinc-100 text-zinc-600',
    card: 'border-zinc-200',
    label: 'text-zinc-500',
  },
  custom: {
    bar: 'bg-codiva-secondary',
    iconWrap: 'bg-zinc-100 text-zinc-600',
    card: 'border-zinc-200',
    label: 'text-zinc-500',
  },
} as const;

type TypeLabel = Record<Toast['type'], string>;

function CodivaToastIcon({ type }: { type: Toast['type'] }) {
  const wrap = 'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg';
  const icon = 'h-4 w-4';
  const tone = TONE[type];

  if (type === 'loading') {
    return (
      <span className={cn(wrap, tone.iconWrap)}>
        <Loader2 className={cn(icon, 'animate-spin')} aria-hidden />
      </span>
    );
  }
  if (type === 'error') {
    return (
      <span className={cn(wrap, tone.iconWrap)}>
        <CircleAlert className={icon} aria-hidden />
      </span>
    );
  }
  if (type === 'success') {
    return (
      <span className={cn(wrap, tone.iconWrap)}>
        <Check className={icon} strokeWidth={2.5} aria-hidden />
      </span>
    );
  }
  return (
    <span className={cn(wrap, tone.iconWrap)}>
      <Info className={icon} aria-hidden />
    </span>
  );
}

function CodivaToast({
  t,
  closeLabel,
  typeLabels,
}: {
  t: Toast;
  closeLabel: string;
  typeLabels: TypeLabel;
}) {
  const tone = TONE[t.type];

  return (
    <div
      {...t.ariaProps}
      className={cn(
        'codiva-toast flex w-[min(26rem,calc(100vw-2rem))] overflow-hidden rounded-xl border bg-white pr-1.5',
        t.visible ? 'codiva-toast-in' : 'codiva-toast-out',
        tone.card
      )}
    >
      <span className={cn('w-[3px] shrink-0', tone.bar)} aria-hidden />
      <div className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-3">
        {t.icon ?? <CodivaToastIcon type={t.type} />}
        <div className="min-w-0 flex-1">
          <p className={cn('text-[11px] font-semibold uppercase tracking-wider', tone.label)}>
            {typeLabels[t.type]}
          </p>
          <div className="mt-0.5 whitespace-pre-line text-sm font-medium leading-snug text-zinc-900">
            {resolveValue(t.message, t)}
          </div>
        </div>
        {t.type === 'loading' ? null : (
          <button
            type="button"
            className="shrink-0 rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-codiva-primary"
            aria-label={closeLabel}
            onClick={() => toast.dismiss(t.id)}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}

export default function CodivaToaster() {
  const { t } = useTranslation();
  const closeLabel = t('common.buttons.close');
  const typeLabels: TypeLabel = {
    success: t('common.toast.success'),
    error: t('common.toast.error'),
    loading: t('common.toast.loading'),
    blank: t('common.toast.info'),
    custom: t('common.toast.info'),
  };

  return (
    <Toaster
      position="top-right"
      gutter={12}
      containerClassName="font-sans"
      toastOptions={{
        duration: 4000,
        removeDelay: 220,
        error: { duration: 8000 },
      }}
    >
      {(item) => <CodivaToast t={item} closeLabel={closeLabel} typeLabels={typeLabels} />}
    </Toaster>
  );
}
