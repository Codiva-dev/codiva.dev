import { describe, expect, it } from 'vitest';
import { tSync } from '@/i18n/translate';
import {
  activeMentionQuery,
  buildMentionToken,
  canMutateWorkAssignment,
  canRequestWorkSubtaskEdit,
  clampWorkProgress,
  dwellMsSince,
  filterWorkAssignments,
  filterMentionableStaff,
  workAssignmentHaystack,
  workBoardSearch,
  formatDwellDuration,
  mentionedStaffIds,
  mentionLabelFor,
  mentionPlainText,
  mentionSerializedIndex,
  mentionShortName,
  workAssigneeInitials,
  asWorkUrgency,
  sortWorkCardsByUrgency,
  isWorkUrgency,
  isOpenWorkStatus,
  isPendingMentionStatus,
  canArchiveWorkStatus,
  canRestoreWorkStatus,
  canTransitionWorkStatus,
  isWorkBoardColumn,
  keepPendingMentions,
  unreadMentionCountByAssignmentId,
  workCardPendingCount,
  clearWorkAssignmentUnreadMentions,
  applyPendingWorkSubtaskStatuses,
  dropConfirmedWorkSubtaskStatuses,
  OPEN_WORK_STATUSES,
  parentCannotMarkDoneWithOpenSubtasks,
  openSubtasksBlockMessage,
  parseSubtaskLines,
  patchWorkAssignmentStatus,
  mergeRealtimeAssignment,
  patchWorkSubtaskStatus,
  planWorkSubtaskRewrite,
  processHref,
  rollupProgressFromSubtasks,
  splitMentionTokens,
  workFileHref,
  workFileKind,
  workFilePreviewMode,
  workOfficeKind,
  workFileProblem,
  workSubtaskCounts,
  appendWorkFormFiles,
  isWorkFormFile,
  workFilesFromInput,
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

  it('names the open subtask in the done-block message', () => {
    const t = (key: string, options?: Record<string, unknown>) =>
      `${key}:${options?.title ?? options?.count ?? ''}`;
    expect(openSubtasksBlockMessage(t, [{ status: 'done', title: 'Listo' }])).toBeNull();
    expect(
      openSubtasksBlockMessage(t, [{ status: 'open', title: 'Problemas de contraste' }])
    ).toBe('ops.asignaciones.openSubtasksNamed:Problemas de contraste');
    expect(
      openSubtasksBlockMessage(t, [
        { status: 'open', title: 'Uno' },
        { status: 'open', title: 'Dos' },
      ])
    ).toBe('ops.asignaciones.openSubtasksCount:2');
    expect(
      openSubtasksBlockMessage(tSync.bind(null, 'es'), [
        { status: 'open', title: 'Problemas de contraste' },
      ])
    ).toBe('Cierra la subtarea «Problemas de contraste» antes de marcarla como hecha.');
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
    expect(workFilePreviewMode({ kind: 'file', file_name: 'deck.pptx', content_type: '' })).toBe('office');
    expect(workFilePreviewMode({ kind: 'file', file_name: 'brief.docx', content_type: '' })).toBe('office');
    expect(workOfficeKind({ file_name: 'deck.pptx', content_type: '' })).toBe('pptx');
    expect(workOfficeKind({ file_name: 'nota.docx', content_type: '' })).toBe('docx');
    expect(workOfficeKind({ file_name: 'brief.pdf', content_type: 'application/pdf' })).toBeNull();
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
    expect(workFilesFromInput([file]).map((row) => row.name)).toEqual(['nota.txt']);
    expect(workFilesFromInput(fd)).toHaveLength(1);
    expect(workFilesFromInput(undefined)).toEqual([]);
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
    expect(isOpenWorkStatus('archived')).toBe(false);
  });

  it('archives from done and restores only to done', () => {
    expect(canArchiveWorkStatus('done')).toBe(true);
    expect(canArchiveWorkStatus('review')).toBe(false);
    expect(canRestoreWorkStatus('archived')).toBe(true);
    expect(canTransitionWorkStatus('done', 'archived')).toBe(true);
    expect(canTransitionWorkStatus('review', 'archived')).toBe(false);
    expect(canTransitionWorkStatus('archived', 'done')).toBe(true);
    expect(canTransitionWorkStatus('archived', 'review')).toBe(false);
    expect(canTransitionWorkStatus('done', 'review')).toBe(true);
    expect(isWorkBoardColumn('done')).toBe(true);
    expect(isWorkBoardColumn('archived')).toBe(false);
  });

  it('keeps mentions on blocked work and drops them once the assignment is done or archived', () => {
    expect(isPendingMentionStatus('blocked')).toBe(true);
    expect(isPendingMentionStatus('review')).toBe(true);
    expect(isPendingMentionStatus('done')).toBe(false);
    expect(isPendingMentionStatus('archived')).toBe(false);
    expect(isPendingMentionStatus(undefined)).toBe(false);
  });

  it('hides Jean\'s mention on a done assignment and keeps the blocked DeskSpace ping', () => {
    const deskspace = '724f0924-db0b-4fbd-85f3-2753d448656c';
    const doneCriteria = '8b5e56ad-7062-47ef-8528-2edd558c0ccf';
    const openBacklog = '66ec24d5-6c66-4051-8730-649c18bbd34b';
    const archivedId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const kept = keepPendingMentions(
      [
        { id: 'mention-done', assignment_id: doneCriteria },
        { id: 'mention-blocked', assignment_id: deskspace },
        { id: 'mention-open', assignment_id: openBacklog },
        { id: 'mention-archived', assignment_id: archivedId },
        { id: 'mention-orphan', assignment_id: 'missing' },
      ],
      new Map([
        [deskspace, 'blocked'],
        [doneCriteria, 'done'],
        [openBacklog, 'backlog'],
        [archivedId, 'archived'],
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
        status: 'archived',
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
          urgency: 'normal',
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

  it('keeps in-flight subtask toggles when the server snapshot is stale', () => {
    const assignments = [
      {
        id: 'a',
        title: 't',
        description: '',
        stream: 'delivery' as const,
        urgency: 'normal' as const,
        status: 'backlog' as const,
        assignee_id: null,
        assignee_name: '',
        due_at: null,
        progress_pct: 0,
        process_kind: 'none' as const,
        process_id: null,
        process_label: '',
        process_href: null,
        status_entered_at: '2026-01-01T00:00:00.000Z',
        created_at: '2026-01-01T00:00:00.000Z',
        created_by: null,
        subtasks: [
          { id: 's1', assignment_id: 'a', title: 'one', status: 'open' as const, sort_order: 0, due_at: null },
        ],
        stage_events: [],
        comments: [],
        files: [],
        subtask_edit_request: null,
        unread_mention_count: 0,
      },
    ];
    const pending = new Map<string, 'open' | 'done'>([['s1', 'done']]);
    const next = applyPendingWorkSubtaskStatuses(assignments, pending);
    expect(next[0].subtasks[0].status).toBe('done');
    expect(next[0].progress_pct).toBe(100);
    dropConfirmedWorkSubtaskStatuses(assignments, pending);
    expect(pending.get('s1')).toBe('done');
    dropConfirmedWorkSubtaskStatuses(next, pending);
    expect(pending.has('s1')).toBe(false);
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
    expect(token).toBe('@[Ada](b0000001-0001-4000-8000-00000000000b)');
    const parts = splitMentionTokens(`Hola ${token} revisa esto`);
    expect(parts).toEqual([
      { type: 'text', text: 'Hola ' },
      {
        type: 'mention',
        label: 'Ada',
        userId: 'b0000001-0001-4000-8000-00000000000b',
        raw: token,
      },
      { type: 'text', text: ' revisa esto' },
    ]);
    expect(mentionedStaffIds(`Hola ${token}`)).toEqual(['b0000001-0001-4000-8000-00000000000b']);
    expect(mentionPlainText(`Hola ${token}`)).toBe('Hola @Ada');
  });

  it('uses a short mention name and disambiguates collisions', () => {
    expect(mentionShortName({ full_name: 'Rafael Alejandro Castillo Martinez' })).toBe('Rafael');
    expect(mentionShortName({ email: 'ada@codiva.dev' })).toBe('ada');
    const staff = [
      { id: '1', full_name: 'Rafael Alejandro Castillo Martinez' },
      { id: '2', full_name: 'Rafael Perez' },
    ];
    expect(mentionShortName(staff[0], staff)).toBe('Rafael Martinez');
    expect(mentionShortName(staff[1], staff)).toBe('Rafael Perez');
  });

  it('maps visual caret past a short mention chip back to the stored token', () => {
    const token = buildMentionToken({ id: 'b0000001-0001-4000-8000-00000000000b', full_name: 'Ada Lovelace' });
    const body = `Hola ${token} revisa`;
    expect(mentionSerializedIndex(body, 5)).toBe(5);
    expect(mentionSerializedIndex(body, 9)).toBe(5 + token.length);
    const mention = splitMentionTokens(body).find((part) => part.type === 'mention');
    expect(mention && mention.type === 'mention' ? mentionLabelFor(mention) : null).toBe('Ada');
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

describe('work-board search', () => {
  const row = {
    id: 'a',
    title: 'Portal NIRC',
    description: 'Sprints y auth',
    stream: 'delivery' as const,
    urgency: 'high' as const,
    status: 'build' as const,
    assignee_id: 'jean',
    assignee_name: 'Jean Claude',
    due_at: null,
    progress_pct: 0,
    process_kind: 'project' as const,
    process_id: 'p1',
    process_label: 'NIRC',
    process_href: '/projects/nirc',
    status_entered_at: '2026-01-01T00:00:00.000Z',
    created_at: '2026-01-01T00:00:00.000Z',
    created_by: null,
    subtasks: [{ id: 's1', assignment_id: 'a', title: 'Migrar RLS', status: 'open' as const, sort_order: 0, due_at: null }],
    stage_events: [],
    comments: [],
    files: [],
    subtask_edit_request: null,
    unread_mention_count: 0,
  };

  it('builds a shareable query string', () => {
    expect(workBoardSearch({ q: ' nirc ', stream: 'delivery', id: 'a' })).toBe(
      '?id=a&q=nirc&stream=delivery'
    );
    expect(workBoardSearch({})).toBe('');
  });

  it('filters by query chips together', () => {
    const labels = () => ({ stream: 'Entrega', status: 'Desarrollo', urgency: 'Alta' });
    expect(
      filterWorkAssignments([row], { q: 'migrar rls', stream: 'delivery', person: '', urgency: '', status: '', archive: false }, labels).map(
        (item) => item.id
      )
    ).toEqual(['a']);
    expect(
      filterWorkAssignments([row], { q: 'nirc', stream: 'people', person: '', urgency: '', status: '', archive: false }, labels)
    ).toEqual([]);
    expect(workAssignmentHaystack(row, labels())).toContain('Migrar RLS');
  });
});

describe('work-board urgency', () => {
  it('defaults unknown values to normal and ranks critical first', () => {
    expect(isWorkUrgency('high')).toBe(true);
    expect(isWorkUrgency('asap')).toBe(false);
    expect(asWorkUrgency('')).toBe('normal');
    expect(asWorkUrgency('CRITICAL')).toBe('critical');
    expect(sortWorkCardsByUrgency([{ urgency: 'low' }, { urgency: 'critical' }, { urgency: 'high' }])).toEqual([
      { urgency: 'critical' },
      { urgency: 'high' },
      { urgency: 'low' },
    ]);
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
          urgency: 'normal',
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

  it('merges a realtime row onto a loaded card', () => {
    const current = {
      id: 'a',
      title: 't',
      description: '',
      stream: 'delivery' as const,
      urgency: 'normal' as const,
      status: 'backlog' as const,
      assignee_id: null as string | null,
      assignee_name: '',
      due_at: null as string | null,
      progress_pct: 0,
      process_kind: 'none' as const,
      process_id: null as string | null,
      process_label: '',
      process_href: null as string | null,
      status_entered_at: '2026-01-01T00:00:00.000Z',
      created_at: '2026-01-01T00:00:00.000Z',
      created_by: null as string | null,
      subtasks: [],
      stage_events: [],
      comments: [],
      files: [],
      subtask_edit_request: null,
      unread_mention_count: 0,
    };
    const next = mergeRealtimeAssignment(
      [current],
      {
        id: 'a',
        title: 'Nuevo',
        status: 'review',
        assignee_id: 'staff-1',
        progress_pct: 40,
      },
      new Map([['staff-1', 'Ana']])
    );
    expect(next?.[0].title).toBe('Nuevo');
    expect(next?.[0].status).toBe('review');
    expect(next?.[0].assignee_name).toBe('Ana');
    expect(mergeRealtimeAssignment([current], { id: 'missing' }, new Map())).toBeNull();
  });

  it('patches a subtask and rolls up progress locally', () => {
    const next = patchWorkSubtaskStatus(
      [
        {
          id: 'a',
          title: 't',
          description: '',
          stream: 'delivery',
          urgency: 'normal',
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
