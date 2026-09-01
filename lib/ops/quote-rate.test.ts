import { describe, expect, it } from 'vitest';
import {
  applyHourlyRateToLineItems,
  applyHourlyRateToPhases,
  applyQuoteHourlyRate,
  inferredQuoteHourlyRate,
  parseHourlyRate,
  roundMoney,
  sumLineItemTotals,
} from './quote-rate';

describe('quote hourly rate', () => {
  it('parses rates and rejects negatives', () => {
    expect(parseHourlyRate('200')).toBe(200);
    expect(parseHourlyRate(450)).toBe(450);
    expect(parseHourlyRate('')).toBeNull();
    expect(parseHourlyRate(-1)).toBeNull();
  });

  it('infers a shared rate when every hourly module matches', () => {
    expect(
      inferredQuoteHourlyRate([
        { title: 'A', hours: 10, rate: 450, total: 4500 },
        { title: 'B', hours: 4, rate: 450, total: 1800 },
      ])
    ).toBe(450);
    expect(
      inferredQuoteHourlyRate([
        { title: 'A', hours: 10, rate: 450, total: 4500 },
        { title: 'B', hours: 4, rate: 200, total: 800 },
      ])
    ).toBeNull();
  });

  it('reprices modules with hours and leaves percentage milestones alone', () => {
    const items = applyHourlyRateToLineItems(
      [
        { title: 'F0 · Marca', hours: 40, rate: 450, rateLabel: 'MXN/hora', total: 18000 },
        { title: 'Hito 1', rate: null, rateLabel: '25%', total: 245000 },
      ],
      200,
      450
    );
    expect(items[0]).toMatchObject({ hours: 40, rate: 200, total: 8000 });
    expect(items[1]).toMatchObject({ rate: null, rateLabel: '25%', total: 245000 });
  });

  it('infers hours from a previous hourly total', () => {
    const [item] = applyHourlyRateToLineItems(
      [{ title: 'F0 · Marca', total: 18000 }],
      200,
      450
    );
    expect(item).toMatchObject({ hours: 40, rate: 200, total: 8000 });
  });

  it('rewrites phase cobro from matching F# modules', () => {
    const phases = applyHourlyRateToPhases(
      [
        {
          name: '0. Identidad y dirección',
          weeks: '1-3',
          deliverable: 'Brand web + storyboard · cobro $36,000 al certificar',
        },
      ],
      [
        { title: 'F0 · Marca', total: 8000 },
        { title: 'F0 · Motion', total: 8000 },
      ]
    );
    expect(phases[0].deliverable).toBe('Brand web + storyboard · cobro $16,000 al certificar');
  });

  it('applies rate to modules, phases and total together', () => {
    const priced = applyQuoteHourlyRate({
      rate: 200,
      previousRate: 450,
      items: [
        { title: 'F1 · One-scroll', hours: 80, rate: 450, total: 36000 },
        { title: 'F1 · Dual', hours: 24, rate: 450, total: 10800 },
      ],
      phases: [
        {
          name: '1. Tesis',
          deliverable: 'Preview · cobro $46,800 al certificar',
        },
      ],
    });
    expect(priced.items.map((item) => item.total)).toEqual([16000, 4800]);
    expect(priced.total).toBe(20800);
    expect(priced.phases[0].deliverable).toContain('$20,800');
    expect(sumLineItemTotals(priced.items)).toBe(roundMoney(20800));
  });
});
