import { describe, expect, it } from 'vitest';
import {
  attentionBucket,
  attentionItemKey,
  filterAttentionItems,
  isFinishedWorkProgress,
  isStuckAssignment,
  isStaleSince,
  isUnscheduledInterviewAttention,
  snoozeUntilIso,
  weekStartYmd,
} from './attention';

describe('attention helpers', () => {
  const now = new Date('2026-09-22T16:00:00.000Z');

  it('flags tickets older than 48h', () => {
    expect(isStaleSince('2026-09-20T15:00:00.000Z', 48, now)).toBe(true);
    expect(isStaleSince('2026-09-21T16:00:00.000Z', 48, now)).toBe(false);
  });

  it('treats aging urgent cards as stuck and ignores cancelled work', () => {
    expect(
      isStuckAssignment({
        status: 'blocked',
        urgency: 'normal',
        statusEnteredAt: '2026-09-21T16:00:00.000Z',
        now,
      })
    ).toBe(false);
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
    expect(
      isStuckAssignment({
        status: 'build',
        urgency: 'high',
        statusEnteredAt: '2026-09-01T12:00:00.000Z',
        progressPct: 100,
        now,
      })
    ).toBe(false);
    expect(
      isStuckAssignment({
        status: 'blocked',
        urgency: 'critical',
        statusEnteredAt: '2026-09-21T16:00:00.000Z',
        progressPct: 100,
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

  it('can return the uncapped queue', () => {
    const items = Array.from({ length: 15 }, (_, index) => ({
      key: attentionItemKey('lead_stale', `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`),
      kind: 'lead_stale' as const,
      title: `Lead ${index}`,
      subtitle: '',
      href: `/leads/${index}`,
      rank: 6,
      at: '2026-09-22T10:00:00.000Z',
    }));
    expect(filterAttentionItems(items, [], now)).toHaveLength(12);
    expect(filterAttentionItems(items, [], now, 0)).toHaveLength(15);
  });

  it('returns Monday YMD in Mexico City', () => {
    expect(weekStartYmd(now)).toBe('2026-09-21');
  });

  it('buckets dates relative to today in Mexico City', () => {
    expect(attentionBucket('2026-09-20', now)).toBe('overdue');
    expect(attentionBucket('2026-09-22T15:00:00.000Z', now)).toBe('today');
    expect(attentionBucket('2026-09-25T15:00:00.000Z', now)).toBe('week');
    expect(attentionBucket('2026-10-10', now)).toBe('later');
    expect(attentionBucket('', now)).toBe('later');
  });

  it('treats 100% progress as finished work', () => {
    expect(isFinishedWorkProgress(100)).toBe(true);
    expect(isFinishedWorkProgress(99)).toBe(false);
    expect(isFinishedWorkProgress(null)).toBe(false);
  });

  it('drops unscheduled interviews on closed applications', () => {
    expect(
      isUnscheduledInterviewAttention({
        roundStatus: 'planned',
        scheduledAt: null,
        applicationStatus: 'interview',
      })
    ).toBe(true);
    expect(
      isUnscheduledInterviewAttention({
        roundStatus: 'planned',
        scheduledAt: null,
        applicationStatus: 'rejected',
      })
    ).toBe(false);
    expect(
      isUnscheduledInterviewAttention({
        roundStatus: 'planned',
        scheduledAt: '2026-09-20T15:00:00.000Z',
        applicationStatus: 'interview',
      })
    ).toBe(false);
  });
});
