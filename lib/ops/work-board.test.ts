import { describe, expect, it } from 'vitest';
import {
  activeMentionQuery,
  buildMentionToken,
  canMutateWorkAssignment,
  canRequestWorkSubtaskEdit,
  clampWorkProgress,
  dwellMsSince,
  filterMentionableStaff,
  formatDwellDuration,
  mentionedStaffIds,
  mentionPlainText,
  workAssigneeInitials,
  isOpenWorkStatus,
  isPendingMentionStatus,
  keepPendingMentions,
  unreadMentionCountByAssignmentId,
  workCardPendingCount,
  clearWorkAssignmentUnreadMentions,
  OPEN_WORK_STATUSES,
  parentCannotMarkDoneWithOpenSubtasks,
  parseSubtaskLines,
  patchWorkAssignmentStatus,
  patchWorkSubtaskStatus,
  planWorkSubtaskRewrite,
  processHref,
  rollupProgressFromSubtasks,
  splitMentionTokens,
  workFileHref,
  workFileKind,
  workFilePreviewMode,
  workFileProblem,
  workSubtaskCounts,
  appendWorkFormFiles,
  isWorkFormFile,
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

  it('lets the assignee act without manage, but not rewrite the list', () => {
    expect(canMutateWorkAssignment('u1', 'u1', false)).toBe(true);
    expect(canMutateWorkAssignment('u1', 'u2', false)).toBe(false);
    expect(canMutateWorkAssignment('u1', null, false)).toBe(false);
    expect(canMutateWorkAssignment('u1', 'u2', true)).toBe(true);
    expect(canRequestWorkSubtaskEdit('u1', 'u1', false)).toBe(true);
    expect(canRequestWorkSubtaskEdit('u1', 'u1', true)).toBe(false);
    expect(canRequestWorkSubtaskEdit('u1', 'u2', false)).toBe(false);
  });

  it('classifies work attachments', () => {
    expect(workFileKind('image/png', 'shot.png')).toBe('image');
    expect(workFileKind('application/pdf', 'brief.pdf')).toBe('file');
    expect(workFileKind('', 'notes.txt')).toBe('file');
    expect(workFileKind('image/heic', 'foto.heic')).toBe('file');
    expect(workFileKind('', 'deck.pptx')).toBe('file');
    expect(workFileKind('application/octet-stream', 'datos.csv')).toBe('file');
    expect(workFileKind('application/x-msdownload', 'x.exe')).toBeNull();
    expect(workFilePreviewMode({ kind: 'image', file_name: 'shot.png', content_type: 'image/png' })).toBe('image');
    expect(workFilePreviewMode({ kind: 'file', file_name: 'logo.svg', content_type: 'image/svg+xml' })).toBe('image');
    expect(workFilePreviewMode({ kind: 'file', file_name: 'brief.pdf', content_type: 'application/pdf' })).toBe('embed');
    expect(workFilePreviewMode({ kind: 'file', file_name: 'notes.txt', content_type: 'text/plain' })).toBe('embed');
    expect(workFilePreviewMode({ kind: 'file', file_name: 'deck.pptx', content_type: '' })).toBe('download');
    expect(workFileHref('abc')).toBe('/api/ops/assignment-file?id=abc');
    expect(workFileHref('abc', { download: true })).toBe('/api/ops/assignment-file?id=abc&download=1');
    expect(workFileProblem({ name: 'ok.png', type: 'image/png', size: 12 })).toBeNull();
    expect(workFileProblem({ name: 'x.exe', type: 'application/x-msdownload', size: 12 })).toBe('type');
    expect(workFileProblem({ name: 'big.pdf', type: 'application/pdf', size: 11 * 1024 * 1024 })).toBe('tooBig');
    expect(clampWorkProgress(140)).toBe(100);
    expect(clampWorkProgress(-4)).toBe(0);
  });

  it('keeps selected files in FormData for the server action', () => {
    const file = new File(['hola'], 'nota.txt', { type: 'text/plain' });
    expect(isWorkFormFile(file)).toBe(true);
    expect(isWorkFormFile('files')).toBe(false);
    const fd = new FormData();
    fd.append('files', 'stale');
    appendWorkFormFiles(fd, [file]);
    const stored = fd.getAll('files');
    expect(stored).toHaveLength(1);
    expect(stored[0]).toBeInstanceOf(File);
    expect((stored[0] as File).name).toBe('nota.txt');
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

describe('work-board pending status', () => {
  it('keeps only in-flight columns as open assignments', () => {
    expect(OPEN_WORK_STATUSES).toEqual(['backlog', 'discovery', 'build', 'review']);
    expect(isOpenWorkStatus('backlog')).toBe(true);
    expect(isOpenWorkStatus('blocked')).toBe(false);
    expect(isOpenWorkStatus('done')).toBe(false);
  });

  it('keeps mentions on blocked work and drops them once the assignment is done', () => {
    expect(isPendingMentionStatus('blocked')).toBe(true);
    expect(isPendingMentionStatus('review')).toBe(true);
    expect(isPendingMentionStatus('done')).toBe(false);
    expect(isPendingMentionStatus(undefined)).toBe(false);
  });

  it('hides Jean\'s mention on a done assignment and keeps the blocked DeskSpace ping', () => {
    const deskspace = '724f0924-db0b-4fbd-85f3-2753d448656c';
    const doneCriteria = '8b5e56ad-7062-47ef-8528-2edd558c0ccf';
    const openBacklog = '66ec24d5-6c66-4051-8730-649c18bbd34b';
    const kept = keepPendingMentions(
      [
        { id: 'mention-done', assignment_id: doneCriteria },
        { id: 'mention-blocked', assignment_id: deskspace },
        { id: 'mention-open', assignment_id: openBacklog },
        { id: 'mention-orphan', assignment_id: 'missing' },
      ],
      new Map([
        [deskspace, 'blocked'],
        [doneCriteria, 'done'],
        [openBacklog, 'backlog'],
      ])
    );
    expect(kept.map((row) => row.id)).toEqual(['mention-blocked', 'mention-open']);
  });

  it('counts unread mentions per assignment card', () => {
    expect(
      unreadMentionCountByAssignmentId([
        { assignment_id: 'a' },
        { assignment_id: 'a' },
        { assignment_id: 'b' },
        { assignment_id: '' },
      ]).get('a')
    ).toBe(2);
  });

  it('shows Pendientes items on the card: unread mentions and admin edit requests', () => {
    expect(
      workCardPendingCount({
        unreadMentionCount: 2,
        status: 'blocked',
        hasOpenEditRequest: true,
        canManage: true,
      })
    ).toBe(3);
    expect(
      workCardPendingCount({
        unreadMentionCount: 2,
        status: 'done',
        hasOpenEditRequest: true,
        canManage: true,
      })
    ).toBe(1);
    expect(
      workCardPendingCount({
        unreadMentionCount: 2,
        status: 'build',
        hasOpenEditRequest: true,
        canManage: false,
      })
    ).toBe(2);
  });

  it('clears unread mentions after opening the card', () => {
    const next = clearWorkAssignmentUnreadMentions(
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
          files: [],
          subtask_edit_request: null,
          unread_mention_count: 3,
        },
      ],
      'a'
    );
    expect(next[0].unread_mention_count).toBe(0);
  });
});

describe('work-board mentions', () => {
  it('builds initials from a full name', () => {
    expect(workAssigneeInitials('Jean Claude Martell')).toBe('JM');
    expect(workAssigneeInitials('Ada')).toBe('AD');
    expect(workAssigneeInitials('')).toBe('');
  });

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
          files: [],
          subtask_edit_request: null,
          unread_mention_count: 0,
        },
      ],
      'a',
      'build',
      '2026-08-27T00:00:00.000Z'
    );
    expect(next[0].status).toBe('build');
    expect(next[0].status_entered_at).toBe('2026-08-27T00:00:00.000Z');
  });

  it('patches a subtask and rolls up progress locally', () => {
    const next = patchWorkSubtaskStatus(
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
          subtasks: [
            { id: 's1', assignment_id: 'a', title: 'one', status: 'open', sort_order: 0, due_at: null },
            { id: 's2', assignment_id: 'a', title: 'two', status: 'open', sort_order: 1, due_at: null },
          ],
          stage_events: [],
          comments: [],
          files: [],
          subtask_edit_request: null,
          unread_mention_count: 0,
        },
      ],
      's1',
      'done'
    );
    expect(next[0].subtasks[0].status).toBe('done');
    expect(next[0].progress_pct).toBe(50);
  });

  it('rewrites subtask lines by index and keeps existing rows', () => {
    expect(parseSubtaskLines('  a \n\nb\n')).toEqual(['a', 'b']);
    const plan = planWorkSubtaskRewrite(
      [
        { id: '1', title: 'a', sort_order: 0 },
        { id: '2', title: 'b', sort_order: 1 },
        { id: '3', title: 'c', sort_order: 2 },
      ],
      ['a edited', 'b']
    );
    expect(plan.updates).toEqual([
      { id: '1', title: 'a edited', sort_order: 0 },
      { id: '2', title: 'b', sort_order: 1 },
    ]);
    expect(plan.inserts).toEqual([]);
    expect(plan.deleteIds).toEqual(['3']);
    expect(
      planWorkSubtaskRewrite([{ id: '1', title: 'a', sort_order: 0 }], ['a', 'b', 'c']).inserts
    ).toEqual([
      { title: 'b', sort_order: 1 },
      { title: 'c', sort_order: 2 },
    ]);
  });
});
