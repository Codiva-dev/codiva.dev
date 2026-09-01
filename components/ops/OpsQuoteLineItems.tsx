'use client';

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { QuoteLineItem } from '@/lib/ops/quote-document';
import {
  DEFAULT_RATE_LABEL,
  applyHourlyRateToLineItems,
  parseHourlyRate,
  roundMoney,
  sumLineItemTotals,
} from '@/lib/ops/quote-rate';

const EMPTY_ITEM: QuoteLineItem = {
  title: '',
  detail: '',
  hours: null,
  rate: null,
  rateLabel: DEFAULT_RATE_LABEL,
  total: null,
};

function itemTotal(item: QuoteLineItem, hourlyRate: number | null): number | null {
  const rate = hourlyRate ?? item.rate ?? null;
  if (item.hours != null && rate != null) return roundMoney(item.hours * rate);
  return item.total ?? null;
}

export default function OpsQuoteLineItems({
  name = 'lineItems',
  initialItems,
  initialHourlyRate = null,
  initialTotal = null,
}: {
  name?: string;
  initialItems: QuoteLineItem[];
  initialHourlyRate?: number | null;
  initialTotal?: number | null;
}) {
  const { t } = useTranslation();
  const [hourlyRate, setHourlyRate] = useState<number | null>(initialHourlyRate);
  const [items, setItems] = useState<QuoteLineItem[]>(initialItems.length ? initialItems : [{ ...EMPTY_ITEM }]);
  const [manualTotal, setManualTotal] = useState<number | null>(initialTotal);

  const pricedItems = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        title: item.title.trim(),
        total: itemTotal(item, hourlyRate),
      })),
    [items, hourlyRate]
  );

  const computedTotal = sumLineItemTotals(pricedItems.filter((item) => item.title));
  const totalAmount = hourlyRate != null ? computedTotal : (manualTotal ?? computedTotal);

  const serialized = useMemo(
    () => JSON.stringify(pricedItems.filter((item) => item.title)),
    [pricedItems]
  );

  function update(index: number, patch: Partial<QuoteLineItem>) {
    setItems((current) =>
      current.map((item, i) => {
        if (i !== index) return item;
        const next = { ...item, ...patch };
        const rate = hourlyRate ?? next.rate ?? null;
        if (next.hours != null && rate != null) {
          next.rate = rate;
          next.total = roundMoney(next.hours * rate);
        }
        return next;
      })
    );
  }

  function onHourlyRateChange(raw: string) {
    const next = raw === '' ? null : parseHourlyRate(raw);
    setHourlyRate(next);
    if (next == null) return;
    setItems((current) => applyHourlyRateToLineItems(current, next, hourlyRate));
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={serialized} />
      <input type="hidden" name="hourlyRate" value={hourlyRate ?? ''} />
      <input type="hidden" name="totalAmount" value={totalAmount ?? ''} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-sm font-medium text-zinc-800">{t('ops.quoteLines.title')}</p>
        <button
          type="button"
          className="text-sm font-medium text-codiva-primary hover:underline"
          onClick={() =>
            setItems((current) => [
              ...current,
              { ...EMPTY_ITEM, rate: hourlyRate, rateLabel: DEFAULT_RATE_LABEL },
            ])
          }
        >
          {t('ops.quoteLines.add')}
        </button>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-500" htmlFor="quote-hourly-rate">
          {t('ops.quoteLines.hourlyRate')}
        </label>
        <input
          id="quote-hourly-rate"
          type="number"
          min={0}
          step="0.01"
          value={hourlyRate ?? ''}
          onChange={(event) => onHourlyRateChange(event.target.value)}
          placeholder={t('ops.quoteLines.rate')}
          className="w-full max-w-xs rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-zinc-500">{t('ops.quoteLines.hourlyRateHint')}</p>
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
              {hourlyRate == null ? (
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
              ) : (
                <p className="self-center text-sm text-zinc-500">
                  {t('ops.quoteLines.subtotal', {
                    amount: itemTotal(item, hourlyRate) != null ? itemTotal(item, hourlyRate) : '-',
                  })}
                </p>
              )}
            </div>
            <div className="flex items-center justify-between text-sm">
              {hourlyRate == null && (
                <p className="text-zinc-500">
                  {t('ops.quoteLines.subtotal', {
                    amount: itemTotal(item, hourlyRate) != null ? itemTotal(item, hourlyRate) : '-',
                  })}
                </p>
              )}
              {items.length > 1 && (
                <button
                  type="button"
                  className="ml-auto text-zinc-500 hover:text-red-700"
                  onClick={() => setItems((current) => current.filter((_, i) => i !== index))}
                >
                  {t('ops.quoteLines.remove')}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {hourlyRate != null ? (
        <p className="text-sm font-medium text-zinc-800">
          {t('ops.quoteLines.computedTotal', { amount: totalAmount != null ? totalAmount : '-' })}
        </p>
      ) : (
        <input
          type="number"
          step="0.01"
          value={manualTotal ?? ''}
          onChange={(event) =>
            setManualTotal(event.target.value === '' ? null : Number(event.target.value))
          }
          placeholder={t('ops.quoteEditor.total')}
          className="w-full max-w-xs rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
      )}
    </div>
  );
}
