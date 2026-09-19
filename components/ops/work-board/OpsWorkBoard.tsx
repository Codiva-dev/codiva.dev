'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
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
import { CreateModal } from './CreateModal';
import { DetailModal } from './DetailModal';
import { WorkCard } from './WorkCard';
import { type ProcessOption } from './types';

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
  const pendingSubtasksRef = useRef(new Map<string, 'open' | 'done'>());

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
    setAssignments((prev) => patchWorkAssignmentStatus(prev, assignmentId, status));
    try {
      await updateWorkAssignmentStatus(assignmentId, status, source);
      if (successKey) toast.success(t(successKey));
    } catch (err) {
      router.refresh();
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
  useWorkBoardHoverScroll(scrollerRef, view === 'board' && !draggingId);

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
              <button
                type="button"
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${view === 'board' ? 'bg-codiva-primary text-white' : 'text-zinc-600'}`}
                onClick={() => setView('board')}
              >
                {t('ops.asignaciones.viewBoard')}
              </button>
              <button
                type="button"
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${view === 'list' ? 'bg-codiva-primary text-white' : 'text-zinc-600'}`}
                onClick={() => setView('list')}
              >
                {t('ops.asignaciones.viewList')}
              </button>
              <button
                type="button"
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${view === 'archive' ? 'bg-codiva-primary text-white' : 'text-zinc-600'}`}
                onClick={() => setView('archive')}
              >
                {t('ops.asignaciones.viewArchive')}
              </button>
            </div>
            {view === 'board' ? (
              <div className="flex rounded-lg border border-zinc-200 p-0.5">
                <button
                  type="button"
                  className={`rounded-md px-3 py-1.5 text-xs font-medium ${density === 'compact' ? 'bg-codiva-primary text-white' : 'text-zinc-600'}`}
                  onClick={() => setDensity('compact')}
                >
                  {t('ops.asignaciones.cardsCompact')}
                </button>
                <button
                  type="button"
                  className={`rounded-md px-3 py-1.5 text-xs font-medium ${density === 'expanded' ? 'bg-codiva-primary text-white' : 'text-zinc-600'}`}
                  onClick={() => setDensity('expanded')}
                >
                  {t('ops.asignaciones.cardsExpanded')}
                </button>
              </div>
            ) : null}
            {canManage ? (
              <Button size="xs" className="ml-auto" onClick={() => setCreateOpen(true)}>
                {t('ops.asignaciones.create')}
              </Button>
            ) : null}
          </>
        }
      />

      {view === 'board' ? (
        <div
          ref={scrollerRef}
          className="-mx-4 flex min-h-[28rem] min-w-0 gap-2 overflow-x-auto overflow-y-hidden overscroll-x-contain px-4 pb-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
        >
          {WORK_BOARD_COLUMNS.map((status) => {
            const cards = visible.filter((row) => row.status === status);
            const active = dropStatus === status;
            return (
              <section
                key={status}
                data-work-drop-status={status}
                className={`flex max-h-[calc(100dvh-8rem)] min-h-[min(28rem,calc(100dvh-8rem))] flex-1 flex-col overflow-hidden rounded-2xl border bg-zinc-50/80 p-1.5 ${
                  density === 'compact' ? 'min-w-64' : 'min-w-72'
                } ${active ? 'border-codiva-primary ring-2 ring-inset ring-codiva-primary/30' : 'border-zinc-200'}`}
              >
                <header className="mb-1.5 flex shrink-0 items-center justify-between px-1 py-0.5">
                  <h2 className="text-sm font-semibold text-zinc-800">{statusLabels[status]}</h2>
                  {status === 'done' ? null : (
                    <span className="text-xs text-zinc-500">{cards.length}</span>
                  )}
                </header>
                <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-1.5 overflow-x-hidden overflow-y-auto p-1">
                  {cards.map((row) => (
                    <WorkCard
                      key={`${row.id}-${density}`}
                      assignment={row}
                      locale={locale}
                      streamLabel={streamLabels[row.stream]}
                      urgencyLabel={urgencyLabels[row.urgency]}
                      collapsible
                      compact={density === 'compact'}
                      canEdit={canMutateWorkAssignment(currentUserId, row.assignee_id, canManage)}
                      canManage={canManage}
                      currentUserId={currentUserId}
                      isMine={canMutateWorkAssignment(currentUserId, row.assignee_id, false)}
                      draggable={canMutateWorkAssignment(currentUserId, row.assignee_id, canManage)}
                      isDragging={draggingId === row.id}
                      onOpen={() => selectAssignment(row.id)}
                      onToggleSubtask={onToggleSub}
                      onRefresh={() => router.refresh()}
                      onPointerDownCard={onCardPointerDown}
                      consumeClickIfDragged={consumeClickIfDragged}
                      onArchive={
                        canMutateWorkAssignment(currentUserId, row.assignee_id, canManage)
                          ? () => void changeStatus(row.id, 'archived', 'detail', 'ops.asignaciones.archivedToast')
                          : undefined
                      }
                    />
                  ))}
                  {!cards.length ? (
                    <p className="px-1 text-xs text-zinc-400">{t('ops.asignaciones.emptyColumn')}</p>
                  ) : null}
                </div>
              </section>
            );
          })}
        </div>
      ) : view === 'archive' && !visible.length ? (
        <EmptyState>{t('ops.asignaciones.emptyArchive')}</EmptyState>
      ) : (
        <div className="space-y-6">
          {WORK_STREAMS.map((streamId) => {
            const rows = visible.filter((row) => row.stream === streamId);
            if (view === 'archive' && !rows.length) return null;
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
                        onDelete={canManage ? () => setPendingDelete(row) : undefined}
                        onArchive={
                          canMutateWorkAssignment(currentUserId, row.assignee_id, canManage)
                            ? () => void changeStatus(row.id, 'archived', 'detail', 'ops.asignaciones.archivedToast')
                            : undefined
                        }
                        onRestore={
                          canMutateWorkAssignment(currentUserId, row.assignee_id, canManage)
                            ? () => void changeStatus(row.id, 'done', 'detail', 'ops.asignaciones.restored')
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
