import { describe, expect, it } from 'vitest';
import { attentionItemKey } from './attention';
import { buildPendingMonitor, groupMonitorByTime, monitorTimeKind } from './pending-monitor';

const now = new Date('2026-09-22T16:00:00.000Z');

describe('buildPendingMonitor', () => {
  it('keeps mentions as quick actions and drops duplicate stuck assignments', () => {
    const assignmentId = 'a2402c91-da4a-4e85-b46a-b8c37a61c195';
    const built = buildPendingMonitor({
      attention: [
        {
          key: attentionItemKey('assignment_stuck', assignmentId),
          kind: 'assignment_stuck',
          title: 'Portal',
          subtitle: 'Bloqueada',
          href: `/asignaciones?id=${assignmentId}`,
          rank: 2,
          at: '2026-09-20T10:00:00.000Z',
        },
      ],
      assignments: [
        { id: assignmentId, title: 'Portal', subtitle: 'Build', dueAt: '2026-09-22' },
        { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', title: 'Otra', subtitle: 'Review', dueAt: null },
      ],
      mentions: [
        {
          id: 'm1',
          assignmentId,
          title: 'Portal',
          subtitle: 'Ana te mencionó',
          at: '2026-09-22T12:00:00.000Z',
        },
      ],
      editRequests: [],
    });

    expect(built.actions.map((row) => row.kind)).toEqual(['mention']);
    expect(built.timeline.map((row) => row.kind).sort()).toEqual(['assignment_stuck', 'my_assignment']);
  });
});

describe('groupMonitorByTime', () => {
  it('splits overdue, today, this week and later', () => {
    const groups = groupMonitorByTime(
      [
        {
          key: '1',
          kind: 'charge_overdue',
          title: 'Cargo',
          subtitle: '',
          href: '/projects/p',
          at: '2026-09-20',
        },
        {
          key: '2',
          kind: 'ticket_stale',
          title: 'Ticket',
          subtitle: '',
          href: '/tickets/t',
          at: '2026-09-22T15:00:00.000Z',
        },
        {
          key: '3',
          kind: 'lead_stale',
          title: 'Lead',
          subtitle: '',
          href: '/leads/l',
          at: '2026-09-25T15:00:00.000Z',
        },
        {
          key: '4',
          kind: 'my_assignment',
          title: 'Después',
          subtitle: '',
          href: '/asignaciones?id=x',
          at: '2026-10-10',
        },
        {
          key: '5',
          kind: 'my_assignment',
          title: 'Sin fecha',
          subtitle: '',
          href: '/asignaciones?id=y',
          at: '',
        },
      ],
      now
    );

    expect(groups.map((row) => [row.bucket, row.items.map((item) => item.title)])).toEqual([
      ['overdue', ['Cargo']],
      ['today', ['Ticket']],
      ['week', ['Lead']],
      ['later', ['Después', 'Sin fecha']],
    ]);
  });
});

describe('monitorTimeKind', () => {
  it('labels calendar distance from today in Mexico City', () => {
    expect(monitorTimeKind('2026-09-22T15:00:00.000Z', now)).toEqual({ kind: 'today' });
    expect(monitorTimeKind('2026-09-21', now)).toEqual({ kind: 'yesterday' });
    expect(monitorTimeKind('2026-09-23', now)).toEqual({ kind: 'tomorrow' });
    expect(monitorTimeKind('2026-09-20', now)).toEqual({ kind: 'ago', days: 2 });
    expect(monitorTimeKind('2026-09-25', now)).toEqual({ kind: 'later', days: 3 });
    expect(monitorTimeKind('', now)).toEqual({ kind: 'none' });
  });
});
