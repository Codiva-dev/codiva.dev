'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Archive, Kanban, List, Plus, Rows2, Rows3, type LucideIcon } from 'lucide-react';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import ConfirmDialog from '@/components/ops/ConfirmDialog';
import OpsBuscador, { type OpsBuscadorGroup, type OpsBuscadorValues } from '@/components/ops/search/OpsBuscador';
import { toUserErrorMessage } from '@/lib/user-error';
import {
  deleteWorkAssignment,
  markWorkMentionsReadForAssignment,
  toggleWorkSubtask,
  updateWorkAssignmentStatus,
} from '@/lib/ops/work-board-actions';
import {
  WORK_BOARD_COLUMNS,
  WORK_PROCESS_KINDS,
  WORK_STATUSES,
  WORK_STREAMS,
  WORK_URGENCIES,
  canMutateWorkAssignment,
  canTransitionWorkStatus,
  clearWorkAssignmentUnreadMentions,
  isWorkBoardColumn,
  isWorkStatus,
  openSubtasksBlockMessage,
  patchWorkAssignmentStatus,
  patchWorkSubtaskStatus,
  applyPendingWorkSubtaskStatuses,
  dropConfirmedWorkSubtaskStatuses,
  filterWorkAssignments,
  sortWorkCardsByUrgency,
  workBoardSearch,
  type WorkAssignment,
  type WorkUrgency,
} from '@/lib/ops/work-board';
import { tallyFilterValues } from '@/lib/ops/search-text';
import { type MentionStaff } from './OpsMentionComposer';
import { useWorkBoardDrag } from './useWorkBoardDrag';
import { useWorkBoardHoverScroll } from './useWorkBoardHoverScroll';
import { useWorkBoardRealtime, type WorkBoardPresence } from './useWorkBoardRealtime';
import { CreateModal } from './CreateModal';
import { DetailModal } from './DetailModal';
import { WorkCard } from './WorkCard';
import { type ProcessOption } from './types';

function BoardSegButton({
  active,
  label,
  icon: Icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium ${
        active ? 'bg-codiva-primary text-white' : 'text-zinc-600'
      }`}
      onClick={onClick}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

export type { ProcessOption } from './types';

export default function OpsWorkBoard({
  assignments: initialAssignments,
  staff,
  processOptions,
  canManage,
  currentUserId,
  locale,
  initialAssignmentId,
  initialQuery = '',
  initialStream = '',
  initialPerson = '',
  initialUrgency = '',
  initialStatus = '',
}: {
  assignments: WorkAssignment[];
  staff: MentionStaff[];
  processOptions: ProcessOption[];
  canManage: boolean;
  currentUserId: string;
  locale: 'es' | 'en';
  initialAssignmentId?: string;
  initialQuery?: string;
  initialStream?: string;
  initialPerson?: string;
  initialUrgency?: string;
  initialStatus?: string;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const [assignments, setAssignments] = useState(initialAssignments);
  const [query, setQuery] = useState(initialQuery);
  const [stream, setStream] = useState(initialStream);
  const [person, setPerson] = useState(initialPerson);
  const [urgency, setUrgency] = useState(initialUrgency);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [view, setView] = useState<'board' | 'list' | 'archive'>(() =>
    initialAssignments.some((row) => row.id === (initialAssignmentId || '') && row.status === 'archived')
      ? 'archive'
      : 'board'
  );
  const [density, setDensity] = useState<'compact' | 'expanded'>('compact');
  const [createOpen, setCreateOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<WorkAssignment | null>(null);
  const urlId = initialAssignmentId || '';
  const [selectedId, setSelectedId] = useState(urlId);
  const [presence, setPresence] = useState<WorkBoardPresence[]>([]);
  const pendingSubtasksRef = useRef(new Map<string, 'open' | 'done'>());
  const currentUserName = staff.find((row) => row.id === currentUserId)?.full_name || 'Staff';

  useWorkBoardRealtime({
    setAssignments,
    staff,
    currentUserId,
    currentUserName,
    selectedId,
    onPresence: setPresence,
    remoteChangeLabel: t('ops.asignaciones.remoteChange'),
  });

  useEffect(() => {
    const fromServer = selectedId
      ? clearWorkAssignmentUnreadMentions(initialAssignments, selectedId)
      : initialAssignments;
    setAssignments(applyPendingWorkSubtaskStatuses(fromServer, pendingSubtasksRef.current));
    dropConfirmedWorkSubtaskStatuses(initialAssignments, pendingSubtasksRef.current);
  }, [initialAssignments, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    void markWorkMentionsReadForAssignment(selectedId).catch((err) => {
      console.error('mark work mentions read:', err);
    });
  }, [selectedId]);

  function writeBoardUrl(next: {
    id?: string;
    q?: string;
    stream?: string;
    person?: string;
    urgency?: string;
    status?: string;
  }) {
    const href = `${pathname}${workBoardSearch({
      id: next.id ?? selectedId,
      q: next.q ?? query,
      stream: next.stream ?? stream,
      person: next.person ?? person,
      urgency: next.urgency ?? urgency,
      status: next.status ?? statusFilter,
    })}`;
    if (typeof window === 'undefined') return;
    const current = `${window.location.pathname}${window.location.search}`;
    if (current === href) return;
    window.history.replaceState(window.history.state, '', href);
  }

  function selectAssignment(id: string) {
    setSelectedId(id);
    writeBoardUrl({ id });
  }

  const statusLabels = useMemo(
    () => Object.fromEntries(WORK_STATUSES.map((id) => [id, t(`ops.labels.workStatus.${id}`)])) as Record<
      string,
      string
    >,
    [t]
  );
  const streamLabels = useMemo(
    () => Object.fromEntries(WORK_STREAMS.map((id) => [id, t(`ops.labels.workStream.${id}`)])) as Record<
      string,
      string
    >,
    [t]
  );
  const processLabels = useMemo(
    () =>
      Object.fromEntries(WORK_PROCESS_KINDS.map((id) => [id, t(`ops.labels.workProcess.${id}`)])) as Record<
        string,
        string
      >,
    [t]
  );
  const urgencyLabels = useMemo(
    () => Object.fromEntries(WORK_URGENCIES.map((id) => [id, t(`ops.labels.workUrgency.${id}`)])) as Record<
      WorkUrgency,
      string
    >,
    [t]
  );

  const catalog = useMemo(
    () => assignments.filter((row) => (view === 'archive' ? row.status === 'archived' : row.status !== 'archived')),
    [assignments, view]
  );

  const people = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of catalog) {
      if (row.assignee_id) map.set(row.assignee_id, row.assignee_name);
    }
    return [...map.entries()]
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label, locale));
  }, [catalog, locale]);

  const visible = useMemo(() => {
    return sortWorkCardsByUrgency(
      filterWorkAssignments(
        assignments,
        {
          q: query,
          stream,
          person,
          urgency,
          status: statusFilter,
          archive: view === 'archive',
        },
        (row) => ({
          stream: streamLabels[row.stream],
          status: statusLabels[row.status],
          urgency: urgencyLabels[row.urgency],
        })
      )
    );
  }, [assignments, query, stream, person, urgency, statusFilter, view, streamLabels, statusLabels, urgencyLabels]);

  const hits = useMemo(
    () =>
      visible.slice(0, 8).map((row) => ({
        id: row.id,
        title: row.title,
        subtitle: [row.assignee_name || t('ops.asignaciones.unassigned'), streamLabels[row.stream], statusLabels[row.status]]
          .filter(Boolean)
          .join(' · '),
      })),
    [visible, streamLabels, statusLabels, t]
  );

  const buscadorGroups = useMemo<OpsBuscadorGroup[]>(() => {
    const streamCounts = tallyFilterValues(catalog, (row) => row.stream);
    const personCounts = tallyFilterValues(catalog, (row) => row.assignee_id);
    const urgencyCounts = tallyFilterValues(catalog, (row) => row.urgency);
    const statusCounts = tallyFilterValues(catalog, (row) => row.status);
    const groups: OpsBuscadorGroup[] = [
      {
        id: 'stream',
        label: t('ops.asignaciones.stream'),
        options: WORK_STREAMS.map((id) => ({
          value: id,
          label: streamLabels[id],
          count: streamCounts.get(id) || 0,
        })),
      },
      {
        id: 'person',
        label: t('ops.asignaciones.assignee'),
        options: people.map((row) => ({
          value: row.id,
          label: row.label,
          count: personCounts.get(row.id) || 0,
        })),
      },
      {
        id: 'urgency',
        label: t('ops.asignaciones.urgency'),
        options: WORK_URGENCIES.map((id) => ({
          value: id,
          label: urgencyLabels[id],
          count: urgencyCounts.get(id) || 0,
        })),
      },
    ];
    if (view !== 'archive') {
      groups.push({
        id: 'status',
        label: t('ops.asignaciones.statusFilter'),
        options: WORK_BOARD_COLUMNS.map((id) => ({
          value: id,
          label: statusLabels[id],
          count: statusCounts.get(id) || 0,
        })),
      });
    }
    return groups;
  }, [catalog, people, streamLabels, urgencyLabels, statusLabels, t, view]);

  const buscadorValues = useMemo<OpsBuscadorValues>(
    () => ({
      stream,
      person,
      urgency,
      status: statusFilter,
    }),
    [stream, person, urgency, statusFilter]
  );

  function onBuscadorChange(groupId: string, value: string | string[]) {
    const next = Array.isArray(value) ? value[0] || '' : value;
    if (groupId === 'stream') {
      setStream(next);
      writeBoardUrl({ stream: next });
    } else if (groupId === 'person') {
      setPerson(next);
      writeBoardUrl({ person: next });
    } else if (groupId === 'urgency') {
      setUrgency(next);
      writeBoardUrl({ urgency: next });
    } else if (groupId === 'status') {
      setStatusFilter(next);
      writeBoardUrl({ status: next });
    }
  }

  function clearBuscador() {
    setQuery('');
    setStream('');
    setPerson('');
    setUrgency('');
    setStatusFilter('');
    writeBoardUrl({ q: '', stream: '', person: '', urgency: '', status: '' });
  }

  const selected = visible.find((row) => row.id === selectedId) ?? assignments.find((row) => row.id === selectedId);
  const viewersByAssignment = useMemo(() => {
    const map = new Map<string, WorkBoardPresence[]>();
    for (const row of presence) {
      if (!row.assignmentId) continue;
      const list = map.get(row.assignmentId) ?? [];
      list.push(row);
      map.set(row.assignmentId, list);
    }
    return map;
  }, [presence]);

  async function changeStatus(
    assignmentId: string,
    status: string,
    source: 'kanban' | 'detail',
    successKey?: 'ops.asignaciones.archivedToast' | 'ops.asignaciones.restored'
  ) {
    if (!isWorkStatus(status)) return;
    const current = assignments.find((row) => row.id === assignmentId);
    if (!current || current.status === status) return;
    if (!canMutateWorkAssignment(currentUserId, current.assignee_id, canManage)) {
      toast.error(t('ops.asignaciones.forbiddenEdit'));
      return;
    }
    if (!canTransitionWorkStatus(current.status, status)) {
      toast.error(
        status === 'archived'
          ? t('ops.asignaciones.archiveOnlyDone')
          : current.status === 'archived'
            ? t('ops.asignaciones.restoreOnlyDone')
            : t('ops.asignaciones.statusFailed')
      );
      return;
    }
    if (status === 'done') {
      const blocked = openSubtasksBlockMessage(t, current.subtasks);
      if (blocked) {
        toast.error(blocked);
        selectAssignment(assignmentId);
        return;
      }
    }
    const previous = current.status;
    setAssignments((prev) => patchWorkAssignmentStatus(prev, assignmentId, status));
    try {
      const result = await updateWorkAssignmentStatus(assignmentId, status, source);
      if (!result.ok) {
        setAssignments((prev) => patchWorkAssignmentStatus(prev, assignmentId, previous));
        toast.error(result.message);
        if (result.reason === 'open_subtasks') selectAssignment(assignmentId);
        return;
      }
      if (successKey) toast.success(t(successKey));
    } catch (err) {
      setAssignments((prev) => patchWorkAssignmentStatus(prev, assignmentId, previous));
      toast.error(toUserErrorMessage(err, t('ops.asignaciones.statusFailed')));
    }
  }

  async function onDropStatus(assignmentId: string, status: string) {
    if (!isWorkBoardColumn(status)) return;
    await changeStatus(assignmentId, status, 'kanban');
  }

  const { draggingId, dropStatus, onCardPointerDown, consumeClickIfDragged, ghost, scrollerRef } =
    useWorkBoardDrag({
      onDrop: onDropStatus,
    });
  useWorkBoardHoverScroll(scrollerRef, (view === 'board' || view === 'archive') && !draggingId);

  async function confirmDelete() {
    const row = pendingDelete;
    if (!row) return;
    setPendingDelete(null);
    const toastId = toast.loading(t('ops.toast.saving'));
    try {
      await deleteWorkAssignment(row.id);
      if (selectedId === row.id) selectAssignment('');
      setAssignments((prev) => prev.filter((item) => item.id !== row.id));
      toast.success(t('ops.asignaciones.deleted'), { id: toastId });
      router.refresh();
    } catch (err) {
      toast.error(toUserErrorMessage(err, t('common.status.actionFailed')), { id: toastId });
    }
  }

  async function onToggleSub(id: string) {
    const current = assignments.flatMap((row) => row.subtasks).find((sub) => sub.id === id);
    if (!current) return;
    const from = current.status;
    const next = current.status === 'done' ? 'open' : 'done';
    pendingSubtasksRef.current.set(id, next);
    setAssignments((prev) => patchWorkSubtaskStatus(prev, id, next));
    try {
      await toggleWorkSubtask(id, next);
    } catch (err) {
      pendingSubtasksRef.current.delete(id);
      setAssignments((prev) => patchWorkSubtaskStatus(prev, id, from));
      toast.error(toUserErrorMessage(err, t('common.status.actionFailed')));
    }
  }

  const boardLanes = useMemo(() => {
    if (view === 'archive') {
      return WORK_STREAMS.map((streamId) => ({
        id: streamId,
        title: streamLabels[streamId],
        cards: visible.filter((row) => row.stream === streamId),
        droppable: false,
        hideCount: false,
      })).filter((lane) => lane.cards.length);
    }
    return WORK_BOARD_COLUMNS.map((status) => ({
      id: status,
      title: statusLabels[status],
      cards: visible.filter((row) => row.status === status),
      droppable: true,
      hideCount: status === 'done',
    }));
  }, [view, visible, streamLabels, statusLabels]);

  return (
    <div className="min-w-0 space-y-4">
      {ghost}
      <OpsBuscador
        query={query}
        onQueryChange={(value) => {
          setQuery(value);
          writeBoardUrl({ q: value });
        }}
        placeholder={t('ops.asignaciones.searchPlaceholder')}
        groups={buscadorGroups}
        values={buscadorValues}
        onChange={onBuscadorChange}
        onClearAll={clearBuscador}
        catalogCount={catalog.length}
        matchedCount={visible.length}
        noun={t('ops.buscador.nouns.assignments')}
        nounOne={t('ops.buscador.nouns.assignment')}
        hits={query.trim() ? hits : []}
        onHitSelect={selectAssignment}
        empty={
          <EmptyState>
            {t('ops.buscador.undoQueryHint', { noun: t('ops.buscador.nouns.assignments') })}{' '}
            <button type="button" className="font-medium text-codiva-primary" onClick={clearBuscador}>
              {t('ops.buscador.clearQuery')}
            </button>
          </EmptyState>
        }
        actions={
          <>
            <div className="flex rounded-lg border border-zinc-200 p-0.5">
              <BoardSegButton
                active={view === 'board'}
                label={t('ops.asignaciones.viewBoard')}
                icon={Kanban}
                onClick={() => setView('board')}
              />
              <BoardSegButton
                active={view === 'list'}
                label={t('ops.asignaciones.viewList')}
                icon={List}
                onClick={() => setView('list')}
              />
              <BoardSegButton
                active={view === 'archive'}
                label={t('ops.asignaciones.viewArchive')}
                icon={Archive}
                onClick={() => setView('archive')}
              />
            </div>
            {view === 'board' || view === 'archive' ? (
              <div className="flex rounded-lg border border-zinc-200 p-0.5">
                <BoardSegButton
                  active={density === 'compact'}
                  label={t('ops.asignaciones.cardsCompact')}
                  icon={Rows3}
                  onClick={() => setDensity('compact')}
                />
                <BoardSegButton
                  active={density === 'expanded'}
                  label={t('ops.asignaciones.cardsExpanded')}
                  icon={Rows2}
                  onClick={() => setDensity('expanded')}
                />
              </div>
            ) : null}
            {canManage ? (
              <Button size="xs" className="ml-auto gap-1" onClick={() => setCreateOpen(true)}>
                <Plus className="h-3.5 w-3.5" aria-hidden />
                <span className="hidden sm:inline">{t('ops.asignaciones.create')}</span>
                <span className="sm:hidden">{t('ops.asignaciones.createShort')}</span>
              </Button>
            ) : null}
          </>
        }
      />

      {view === 'board' || view === 'archive' ? (
        view === 'archive' && !visible.length ? (
          <EmptyState>{t('ops.asignaciones.emptyArchive')}</EmptyState>
        ) : (
          <div
            ref={scrollerRef}
            className="-mx-4 flex min-h-[28rem] min-w-0 gap-2 overflow-x-auto overflow-y-hidden overscroll-x-contain px-4 pb-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
          >
            {boardLanes.map((lane) => {
              const active = lane.droppable && dropStatus === lane.id;
              return (
                <section
                  key={lane.id}
                  data-work-drop-status={lane.droppable ? lane.id : undefined}
                  className={`flex max-h-[calc(100dvh-8rem)] min-h-[min(28rem,calc(100dvh-8rem))] flex-1 flex-col overflow-hidden rounded-2xl border bg-zinc-50/80 p-1.5 ${
                    density === 'compact' ? 'min-w-64' : 'min-w-72'
                  } ${active ? 'border-codiva-primary ring-2 ring-inset ring-codiva-primary/30' : 'border-zinc-200'}`}
                >
                  <header className="mb-1.5 flex shrink-0 items-center justify-between px-1 py-0.5">
                    <h2 className="text-sm font-semibold text-zinc-800">{lane.title}</h2>
                    {lane.hideCount ? null : <span className="text-xs text-zinc-500">{lane.cards.length}</span>}
                  </header>
                  <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-1.5 overflow-x-hidden overflow-y-auto p-1">
                    {lane.cards.map((row) => {
                      const canAct = canMutateWorkAssignment(currentUserId, row.assignee_id, canManage);
                      return (
                        <WorkCard
                          key={`${row.id}-${density}`}
                          assignment={row}
                          locale={locale}
                          streamLabel={streamLabels[row.stream]}
                          urgencyLabel={urgencyLabels[row.urgency]}
                          collapsible
                          compact={density === 'compact'}
                          canEdit={canAct}
                          canManage={canManage}
                          currentUserId={currentUserId}
                          isMine={canMutateWorkAssignment(currentUserId, row.assignee_id, false)}
                          draggable={view === 'board' && canAct}
                          isDragging={draggingId === row.id}
                          onOpen={() => selectAssignment(row.id)}
                          onToggleSubtask={onToggleSub}
                          onRefresh={() => router.refresh()}
                          onPointerDownCard={view === 'board' ? onCardPointerDown : undefined}
                          consumeClickIfDragged={view === 'board' ? consumeClickIfDragged : undefined}
                          viewers={viewersByAssignment.get(row.id) ?? []}
                          onDelete={view === 'archive' && canManage ? () => setPendingDelete(row) : undefined}
                          onArchive={
                            view === 'board' && canAct
                              ? () => void changeStatus(row.id, 'archived', 'detail', 'ops.asignaciones.archivedToast')
                              : undefined
                          }
                          onRestore={
                            view === 'archive' && canAct
                              ? () => void changeStatus(row.id, 'done', 'detail', 'ops.asignaciones.restored')
                              : undefined
                          }
                        />
                      );
                    })}
                    {!lane.cards.length ? (
                      <p className="px-1 text-xs text-zinc-400">{t('ops.asignaciones.emptyColumn')}</p>
                    ) : null}
                  </div>
                </section>
              );
            })}
          </div>
        )
      ) : (
        <div className="space-y-6">
          {WORK_STREAMS.map((streamId) => {
            const rows = visible.filter((row) => row.stream === streamId);
            return (
              <section key={streamId}>
                <h2 className="mb-2 text-sm font-semibold text-zinc-800">{streamLabels[streamId]}</h2>
                {rows.length ? (
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {rows.map((row) => (
                      <WorkCard
                        key={row.id}
                        assignment={row}
                        locale={locale}
                        streamLabel={streamLabels[row.stream]}
                        urgencyLabel={urgencyLabels[row.urgency]}
                        showStatus
                        canEdit={canMutateWorkAssignment(currentUserId, row.assignee_id, canManage)}
                        canManage={canManage}
                        currentUserId={currentUserId}
                        isMine={canMutateWorkAssignment(currentUserId, row.assignee_id, false)}
                        statusLabel={statusLabels[row.status]}
                        onOpen={() => selectAssignment(row.id)}
                        onToggleSubtask={onToggleSub}
                        onRefresh={() => router.refresh()}
                        viewers={viewersByAssignment.get(row.id) ?? []}
                        onDelete={canManage ? () => setPendingDelete(row) : undefined}
                        onArchive={
                          canMutateWorkAssignment(currentUserId, row.assignee_id, canManage)
                            ? () => void changeStatus(row.id, 'archived', 'detail', 'ops.asignaciones.archivedToast')
                            : undefined
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState>{t('ops.asignaciones.emptyColumn')}</EmptyState>
                )}
              </section>
            );
          })}
        </div>
      )}

      <CreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        staff={staff}
        processOptions={processOptions}
        streamLabels={streamLabels}
        urgencyLabels={urgencyLabels}
        processLabels={processLabels}
      />

      {selected ? (
        <DetailModal
          assignment={selected}
          onClose={() => selectAssignment('')}
          staff={staff}
          processOptions={processOptions}
          canManage={canManage}
          currentUserId={currentUserId}
          locale={locale}
          statusLabels={statusLabels}
          streamLabels={streamLabels}
          urgencyLabels={urgencyLabels}
          processLabels={processLabels}
          onRefresh={() => router.refresh()}
          onToggleSubtask={onToggleSub}
          onDelete={canManage ? () => setPendingDelete(selected) : undefined}
          onArchive={
            canMutateWorkAssignment(currentUserId, selected.assignee_id, canManage)
              ? () => void changeStatus(selected.id, 'archived', 'detail', 'ops.asignaciones.archivedToast')
              : undefined
          }
          onRestore={
            canMutateWorkAssignment(currentUserId, selected.assignee_id, canManage)
              ? () => void changeStatus(selected.id, 'done', 'detail', 'ops.asignaciones.restored')
              : undefined
          }
        />
      ) : null}

      <ConfirmDialog
        open={pendingDelete !== null}
        title={t('ops.asignaciones.deleteConfirmTitle')}
        message={t('ops.asignaciones.deleteConfirm')}
        confirmLabel={t('ops.asignaciones.delete')}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
