'use client';

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { QuoteLineItem } from '@/lib/ops/quote-document';

const EMPTY_ITEM: QuoteLineItem = {
  title: '',
  detail: '',
  hours: null,
  rate: null,
  rateLabel: 'MXN/hora',
  total: null,
};

function itemTotal(item: QuoteLineItem): number | null {
  if (item.hours != null && item.rate != null) return Math.round(item.hours * item.rate * 100) / 100;
  return item.total ?? null;
}

export default function OpsQuoteLineItems({
  name = 'lineItems',
  initialItems,
}: {
  name?: string;
  initialItems: QuoteLineItem[];
}) {
  const { t } = useTranslation();
  const [items, setItems] = useState<QuoteLineItem[]>(initialItems.length ? initialItems : [{ ...EMPTY_ITEM }]);

  const serialized = useMemo(
    () =>
      JSON.stringify(
        items
          .map((item) => ({
            ...item,
            title: item.title.trim(),
            total: itemTotal(item),
          }))
          .filter((item) => item.title)
      ),
    [items]
  );

  function update(index: number, patch: Partial<QuoteLineItem>) {
    setItems((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={serialized} />
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-800">{t('ops.quoteLines.title')}</p>
        <button
          type="button"
          className="text-sm font-medium text-codiva-primary hover:underline"
          onClick={() => setItems((current) => [...current, { ...EMPTY_ITEM }])}
        >
          {t('ops.quoteLines.add')}
        </button>
      </div>
      <ul className="space-y-3">
        {items.map((item, index) => (
          <li key={index} className="rounded-xl border border-zinc-200 p-3 space-y-2">
            <div className="grid gap-2 md:grid-cols-2">
              <input
                value={item.title}
                onChange={(event) => update(index, { title: event.target.value })}
                placeholder={t('ops.quoteLines.module')}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
              <input
                value={item.detail ?? ''}
                onChange={(event) => update(index, { detail: event.target.value })}
                placeholder={t('ops.quoteLines.detail')}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
              <input
                type="number"
                value={item.hours ?? ''}
                onChange={(event) =>
                  update(index, { hours: event.target.value === '' ? null : Number(event.target.value) })
                }
                placeholder={t('ops.quoteLines.hours')}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  value={item.rate ?? ''}
                  onChange={(event) =>
                    update(index, { rate: event.target.value === '' ? null : Number(event.target.value) })
                  }
                  placeholder={t('ops.quoteLines.rate')}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
                <input
                  value={item.rateLabel ?? ''}
                  onChange={(event) => update(index, { rateLabel: event.target.value })}
                  placeholder={t('ops.quoteLines.rateLabel')}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <p className="text-zinc-500">
                {t('ops.quoteLines.subtotal', { amount: itemTotal(item) != null ? itemTotal(item) : '-' })}
              </p>
              {items.length > 1 && (
                <button
                  type="button"
                  className="text-zinc-500 hover:text-red-700"
                  onClick={() => setItems((current) => current.filter((_, i) => i !== index))}
                >
                  {t('ops.quoteLines.remove')}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
