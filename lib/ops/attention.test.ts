import { describe, expect, it } from 'vitest';
import {
  attentionItemKey,
  filterAttentionItems,
  isStuckAssignment,
  isStaleSince,
  snoozeUntilIso,
  weekStartYmd,
} from './attention';

describe('attention helpers', () => {
  const now = new Date('2026-09-22T16:00:00.000Z');

  it('flags tickets older than 48h', () => {
    expect(isStaleSince('2026-09-20T15:00:00.000Z', 48, now)).toBe(true);
    expect(isStaleSince('2026-09-21T16:00:00.000Z', 48, now)).toBe(false);
  });

  it('treats blocked and aging urgent cards as stuck', () => {
    expect(
      isStuckAssignment({
        status: 'blocked',
        urgency: 'normal',
        statusEnteredAt: '2026-09-21T16:00:00.000Z',
        now,
      })
    ).toBe(true);
    expect(
      isStuckAssignment({
        status: 'build',
        urgency: 'critical',
        statusEnteredAt: '2026-09-21T12:00:00.000Z',
        now,
      })
    ).toBe(true);
    expect(
      isStuckAssignment({
        status: 'build',
        urgency: 'normal',
        statusEnteredAt: '2026-09-01T12:00:00.000Z',
        now,
      })
    ).toBe(false);
  });

  it('drops snoozed rows and keeps rank order', () => {
    const items = [
      {
        key: attentionItemKey('lead_stale', 'l1'),
        kind: 'lead_stale' as const,
        title: 'Lead',
        subtitle: '',
        href: '/leads/l1',
        rank: 6,
        at: '2026-09-22T10:00:00.000Z',
      },
      {
        key: attentionItemKey('charge_overdue', 'c1'),
        kind: 'charge_overdue' as const,
        title: 'Cargo',
        subtitle: '',
        href: '/projects/p',
        rank: 0,
        at: '2026-09-20T10:00:00.000Z',
      },
    ];
    const filtered = filterAttentionItems(items, [{ item_key: items[1].key, until: snoozeUntilIso(now) }], now);
    expect(filtered.map((row) => row.kind)).toEqual(['lead_stale']);
  });

  it('returns Monday YMD in Mexico City', () => {
    expect(weekStartYmd(now)).toBe('2026-09-21');
  });
});
