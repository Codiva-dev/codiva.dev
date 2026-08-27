import { describe, expect, it } from 'vitest';
import {
  activeMentionQuery,
  buildMentionToken,
  dwellMsSince,
  filterMentionableStaff,
  formatDwellDuration,
  mentionedStaffIds,
  mentionPlainText,
  parentCannotMarkDoneWithOpenSubtasks,
  patchWorkAssignmentStatus,
  processHref,
  rollupProgressFromSubtasks,
  splitMentionTokens,
  workSubtaskCounts,
} from './work-board';

describe('work-board progress', () => {
  it('rolls up subtask completion', () => {
    expect(rollupProgressFromSubtasks([])).toBe(0);
    expect(
      rollupProgressFromSubtasks([
        { status: 'done' },
        { status: 'open' },
        { status: 'done' },
      ])
    ).toBe(67);
  });

  it('blocks done when a subtask is still open', () => {
    expect(parentCannotMarkDoneWithOpenSubtasks([{ status: 'done' }])).toBe(false);
    expect(parentCannotMarkDoneWithOpenSubtasks([{ status: 'open' }, { status: 'done' }])).toBe(true);
  });

  it('counts subtasks on a card', () => {
    expect(
      workSubtaskCounts({
        subtasks: [
          { id: '1', assignment_id: 'a', title: 'x', status: 'done', sort_order: 0, due_at: null },
          { id: '2', assignment_id: 'a', title: 'y', status: 'open', sort_order: 1, due_at: null },
        ],
      })
    ).toEqual({ total: 2, done: 1, pct: 50 });
  });
});

describe('work-board dwell', () => {
  it('formats durations', () => {
    expect(formatDwellDuration(12_000, 'es')).toBe('ahora');
    expect(formatDwellDuration(5 * 60_000, 'es')).toBe('5 min');
    expect(formatDwellDuration(3 * 3_600_000 + 10 * 60_000, 'en')).toBe('3h 10m');
    expect(formatDwellDuration(2 * 86_400_000, 'es')).toBe('2d');
  });

  it('measures time in the current column', () => {
    const now = Date.parse('2026-08-27T18:00:00.000Z');
    expect(dwellMsSince('2026-08-27T16:00:00.000Z', now)).toBe(2 * 3_600_000);
  });
});

describe('work-board mentions', () => {
  it('builds and splits mention tokens', () => {
    const token = buildMentionToken({ id: 'b0000001-0001-4000-8000-00000000000b', full_name: 'Ada Lovelace' });
    expect(token).toBe('@[Ada Lovelace](b0000001-0001-4000-8000-00000000000b)');
    const parts = splitMentionTokens(`Hola ${token} revisa esto`);
    expect(parts).toEqual([
      { type: 'text', text: 'Hola ' },
      {
        type: 'mention',
        label: 'Ada Lovelace',
        userId: 'b0000001-0001-4000-8000-00000000000b',
        raw: token,
      },
      { type: 'text', text: ' revisa esto' },
    ]);
    expect(mentionedStaffIds(`Hola ${token}`)).toEqual(['b0000001-0001-4000-8000-00000000000b']);
    expect(mentionPlainText(`Hola ${token}`)).toBe('Hola @Ada Lovelace');
  });

  it('detects an in-progress @query', () => {
    expect(activeMentionQuery('Hola @je', 8)).toEqual({ query: 'je', start: 5 });
    expect(activeMentionQuery('Hola jean', 9)).toBeNull();
  });

  it('filters mentionable staff', () => {
    const staff = [
      { id: '1', full_name: 'Jean Claude', email: 'jean@codiva.dev' },
      { id: '2', full_name: 'Ada', email: 'ada@codiva.dev' },
    ];
    expect(filterMentionableStaff(staff, 'jea').map((s) => s.id)).toEqual(['1']);
    expect(filterMentionableStaff(staff, '', '1').map((s) => s.id)).toEqual(['2']);
  });
});

describe('work-board process links', () => {
  it('builds ops hrefs', () => {
    expect(processHref('project', 'abc', { projectSlug: 'nirc' })).toBe('/projects/nirc');
    expect(processHref('lead', 'lead-1')).toBe('/leads/lead-1');
    expect(processHref('internal', 'x', { internalHref: '/team' })).toBe('/team');
    expect(processHref('none', 'x')).toBeNull();
  });

  it('patches status locally', () => {
    const next = patchWorkAssignmentStatus(
      [
        {
          id: 'a',
          title: 't',
          description: '',
          stream: 'delivery',
          status: 'backlog',
          assignee_id: null,
          assignee_name: '',
          due_at: null,
          progress_pct: 0,
          process_kind: 'none',
          process_id: null,
          process_label: '',
          process_href: null,
          status_entered_at: '2026-01-01T00:00:00.000Z',
          created_at: '2026-01-01T00:00:00.000Z',
          created_by: null,
          subtasks: [],
          stage_events: [],
          comments: [],
        },
      ],
      'a',
      'build',
      '2026-08-27T00:00:00.000Z'
    );
    expect(next[0].status).toBe('build');
    expect(next[0].status_entered_at).toBe('2026-08-27T00:00:00.000Z');
  });
});
