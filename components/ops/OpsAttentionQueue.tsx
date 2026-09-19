import Card, { CardHeader } from '@/components/ui/Card';
import ToastForm from '@/components/ops/ToastForm';
import { snoozeAttentionItem } from '@/lib/ops/attention-actions';
import type { AttentionItem } from '@/lib/ops/attention';
import type { Translator } from '@/i18n/locale';
import Link from 'next/link';

export default function OpsAttentionQueue({
  items,
  t,
}: {
  items: AttentionItem[];
  t: Translator;
}) {
  return (
    <Card as="section" className="mb-6">
      <CardHeader
        title={t('ops.dashboard.attentionTitle')}
        action={
          <Link href="/pendientes" className="text-sm text-codiva-primary hover:underline">
            {t('ops.dashboard.attentionSeeAll')}
          </Link>
        }
      />
      <p className="-mt-2 mb-4 text-sm text-zinc-500">{t('ops.dashboard.attentionHint')}</p>
      {items.length ? (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.key}
              className="flex flex-wrap items-start justify-between gap-2 border-b border-zinc-100 pb-3 last:border-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                  {t(`ops.dashboard.attentionKind.${item.kind}`)}
                </p>
                <Link href={item.href} className="font-medium text-zinc-900 hover:text-codiva-primary">
                  {item.title}
                </Link>
                {item.subtitle ? <p className="text-sm text-zinc-500">{item.subtitle}</p> : null}
              </div>
              <ToastForm
                success={t('ops.dashboard.attentionSnoozed')}
                action={snoozeAttentionItem}
                className="shrink-0"
              >
                <input type="hidden" name="item_key" value={item.key} />
                <button type="submit" className="text-xs text-zinc-500 hover:text-zinc-800 hover:underline">
                  {t('ops.dashboard.attentionSnooze')}
                </button>
              </ToastForm>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-zinc-500">{t('ops.dashboard.attentionEmpty')}</p>
      )}
    </Card>
  );
}
