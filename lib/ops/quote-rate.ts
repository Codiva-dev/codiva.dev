import type { QuoteLineItem, QuotePhase } from '@/lib/ops/quote-document';

export const DEFAULT_HOURLY_RATE = 450;
export const DEFAULT_RATE_LABEL = 'MXN/hora';

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function parseHourlyRate(raw: unknown): number | null {
  if (raw == null || raw === '') return null;
  const n = typeof raw === 'number' ? raw : Number(String(raw).replace(/,/g, '').trim());
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export function inferredQuoteHourlyRate(items: QuoteLineItem[]): number | null {
  const rates = [
    ...new Set(
      items
        .map((item) => item.rate)
        .filter((rate): rate is number => rate != null && Number.isFinite(rate))
    ),
  ];
  if (rates.length === 1 && items.some((item) => item.hours != null)) return rates[0];
  return null;
}

function looksHourly(item: QuoteLineItem): boolean {
  const label = (item.rateLabel ?? '').trim().toLowerCase();
  if (!label) return true;
  return label.includes('hora') || label.includes('hour');
}

function wholeIfClose(value: number): number {
  const rounded = Math.round(value);
  return Math.abs(value - rounded) < 1e-6 ? rounded : roundMoney(value);
}

export function applyHourlyRateToLineItems(
  items: QuoteLineItem[],
  rate: number | null,
  previousRate: number | null = null
): QuoteLineItem[] {
  if (rate == null) return items;
  return items.map((item) => {
    let hours = item.hours ?? null;
    if (hours == null && item.total != null && looksHourly(item)) {
      const basis = item.rate ?? previousRate;
      if (basis != null && basis > 0) hours = wholeIfClose(item.total / basis);
    }
    if (hours == null) return item;
    return {
      ...item,
      hours,
      rate,
      rateLabel: item.rateLabel?.trim() ? item.rateLabel : DEFAULT_RATE_LABEL,
      total: roundMoney(hours * rate),
    };
  });
}

export function sumLineItemTotals(items: QuoteLineItem[]): number | null {
  const totals = items
    .map((item) => item.total)
    .filter((n): n is number => n != null && Number.isFinite(n));
  if (!totals.length) return null;
  return roundMoney(totals.reduce((sum, n) => sum + n, 0));
}

function phaseIndexFromTitle(title: string): number | null {
  const match = title.trim().match(/^F(\d+)\b/i) || title.trim().match(/^(\d+)\s*[.·]/);
  return match ? Number(match[1]) : null;
}

function phaseIndexFromName(name: string): number | null {
  const match = name.trim().match(/^(\d+)\s*[.·]/);
  return match ? Number(match[1]) : null;
}

function formatCobroAmount(amount: number): string {
  const rounded = Math.round(amount);
  return `$${rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

const COBRO_RE = /cobro\s+\$[\d.,]+/i;

export function applyHourlyRateToPhases(phases: QuotePhase[], items: QuoteLineItem[]): QuotePhase[] {
  const byPhase = new Map<number, number>();
  for (const item of items) {
    const idx = phaseIndexFromTitle(item.title);
    if (idx == null || item.total == null) continue;
    byPhase.set(idx, roundMoney((byPhase.get(idx) ?? 0) + item.total));
  }
  return phases.map((phase) => {
    const idx = phaseIndexFromName(phase.name ?? '');
    if (idx == null || !phase.deliverable || !COBRO_RE.test(phase.deliverable)) return phase;
    const charge = byPhase.get(idx);
    if (charge == null) return phase;
    return {
      ...phase,
      deliverable: phase.deliverable.replace(COBRO_RE, `cobro ${formatCobroAmount(charge)}`),
    };
  });
}

export function applyQuoteHourlyRate(input: {
  items: QuoteLineItem[];
  phases: QuotePhase[];
  rate: number | null;
  previousRate?: number | null;
  fallbackTotal?: number | null;
}): { items: QuoteLineItem[]; phases: QuotePhase[]; total: number | null } {
  if (input.rate == null) {
    return {
      items: input.items,
      phases: input.phases,
      total: input.fallbackTotal ?? sumLineItemTotals(input.items),
    };
  }
  const items = applyHourlyRateToLineItems(input.items, input.rate, input.previousRate ?? null);
  const phases = applyHourlyRateToPhases(input.phases, items);
  return {
    items,
    phases,
    total: sumLineItemTotals(items) ?? input.fallbackTotal ?? null,
  };
}
