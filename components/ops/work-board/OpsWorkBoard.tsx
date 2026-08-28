'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import Field from '@/components/ui/Field';
import Input, { Select, Textarea } from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import ToastForm from '@/components/ops/ToastForm';
import { toUserErrorMessage } from '@/lib/user-error';
import { formatBytes } from '@/lib/format-bytes';
import {
  addWorkAssignmentComment,
  addWorkAssignmentFiles,
  createWorkAssignment,
  deleteWorkAssignmentFile,
  toggleWorkSubtask,
  updateWorkAssignment,
  updateWorkAssignmentStatus,
} from '@/lib/ops/work-board-actions';
import {
  WORK_BOARD_COLUMNS,
  WORK_PROCESS_KINDS,
  WORK_STATUSES,
  WORK_STREAMS,
  canMutateWorkAssignment,
  clampWorkProgress,
  dwellMsSince,
  formatDwellDuration,
  isWorkStatus,
  patchWorkAssignmentStatus,
  patchWorkSubtaskStatus,
  splitMentionTokens,
  stageEventDurationMs,
  workAssignmentPreview,
  workColorTone,
  workFileHref,
  workSubtaskCounts,
  type WorkAssignment,
  type WorkFile,
  type WorkProcessKind,
  type WorkStatus,
} from '@/lib/ops/work-board';
import OpsMentionComposer, { type MentionStaff } from './OpsMentionComposer';
import WorkAttachmentField from './WorkAttachmentField';
import WorkSubtaskEditor from './WorkSubtaskEditor';
import { isWorkCardInteractiveTarget, useWorkBoardDrag } from './useWorkBoardDrag';

export type ProcessOption = {
  id: string;
  kind: Exclude<WorkProcessKind, 'none'>;
  label: string;
};


function dueInputValue(iso: string | null) {
  if (!iso) return '';
  return iso.slice(0, 10);
}

export default function OpsWorkBoard({
  assignments: initialAssignments,
  staff,
  processOptions,
  canManage,
  currentUserId,
  locale,
  initialAssignmentId,
}: {
  assignments: WorkAssignment[];
  staff: MentionStaff[];
  processOptions: ProcessOption[];
  canManage: boolean;
  currentUserId: string;
  locale: 'es' | 'en';
  initialAssignmentId?: string;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const [assignments, setAssignments] = useState(initialAssignments);
  const [stream, setStream] = useState('');
  const [person, setPerson] = useState('');
  const [view, setView] = useState<'board' | 'list'>('board');
  const [createOpen, setCreateOpen] = useState(false);
  const urlId = initialAssignmentId || '';
  const [selectedId, setSelectedId] = useState(urlId);

  useEffect(() => {
    setAssignments(initialAssignments);
  }, [initialAssignments]);

  useEffect(() => {
    setSelectedId(urlId);
  }, [urlId]);

  function selectAssignment(id: string) {
    setSelectedId(id);
    if (id === urlId) return;
    const href = id ? `${pathname}?id=${encodeURIComponent(id)}` : pathname;
    router.replace(href, { scroll: false });
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

  const people = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of assignments) {
      if (row.assignee_id) map.set(row.assignee_id, row.assignee_name);
    }
    return [...map.entries()]
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label, locale));
  }, [assignments, locale]);

  const visible = useMemo(() => {
    return assignments.filter((row) => {
      if (stream && row.stream !== stream) return false;
      if (person && row.assignee_id !== person) return false;
      return true;
    });
  }, [assignments, stream, person]);

  const selected = visible.find((row) => row.id === selectedId) ?? assignments.find((row) => row.id === selectedId);

  async function onDropStatus(assignmentId: string, status: string) {
    if (!isWorkStatus(status)) return;
    const current = assignments.find((row) => row.id === assignmentId);
    if (!current || current.status === status) return;
    if (!canMutateWorkAssignment(currentUserId, current.assignee_id, canManage)) {
      toast.error(t('ops.asignaciones.forbiddenEdit'));
      return;
    }
    setAssignments((prev) => patchWorkAssignmentStatus(prev, assignmentId, status));
    try {
      await updateWorkAssignmentStatus(assignmentId, status, 'kanban');
      router.refresh();
    } catch (err) {
      router.refresh();
      toast.error(toUserErrorMessage(err, t('ops.asignaciones.statusFailed')));
    }
  }

  const { draggingId, dropStatus, onCardPointerDown, consumeClickIfDragged, ghost } = useWorkBoardDrag({
    onDrop: onDropStatus,
  });

  async function onToggleSub(id: string) {
    let from: 'open' | 'done' | null = null;
    let next: 'open' | 'done' | null = null;
    setAssignments((prev) => {
      const current = prev.flatMap((row) => row.subtasks).find((sub) => sub.id === id);
      if (!current) return prev;
      from = current.status;
      next = current.status === 'done' ? 'open' : 'done';
      return patchWorkSubtaskStatus(prev, id, next);
    });
    if (!from || !next) return;
    try {
      await toggleWorkSubtask(id, next);
    } catch (err) {
      setAssignments((prev) => patchWorkSubtaskStatus(prev, id, from as 'open' | 'done'));
      toast.error(toUserErrorMessage(err, t('common.status.actionFailed')));
    }
  }

  return (
    <div className="min-w-0 space-y-4">
      {ghost}
      <div className="flex flex-wrap items-center gap-2">
        <Select size="sm" className="w-auto min-w-40" value={stream} onChange={(e) => setStream(e.target.value)}>
          <option value="">{t('ops.asignaciones.allStreams')}</option>
          {WORK_STREAMS.map((id) => (
            <option key={id} value={id}>
              {streamLabels[id]}
            </option>
          ))}
        </Select>
        <Select size="sm" className="w-auto min-w-40" value={person} onChange={(e) => setPerson(e.target.value)}>
          <option value="">{t('ops.asignaciones.allPeople')}</option>
          {people.map((row) => (
            <option key={row.id} value={row.id}>
              {row.label}
            </option>
          ))}
        </Select>
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
        </div>
        {canManage ? (
          <Button size="xs" className="ml-auto" onClick={() => setCreateOpen(true)}>
            {t('ops.asignaciones.create')}
          </Button>
        ) : null}
      </div>

      {view === 'board' ? (
        <div className="flex min-h-[28rem] min-w-0 max-w-full gap-3 overflow-x-auto pb-2">
          {WORK_BOARD_COLUMNS.map((status) => {
            const cards = visible.filter((row) => row.status === status);
            const active = dropStatus === status;
            return (
              <section
                key={status}
                data-work-drop-status={status}
                className={`flex w-72 min-w-72 max-w-72 shrink-0 flex-col overflow-hidden rounded-2xl border bg-zinc-50/80 p-2 ${
                  active ? 'border-codiva-primary ring-2 ring-codiva-primary/30' : 'border-zinc-200'
                }`}
              >
                <header className="mb-2 flex items-center justify-between px-1 py-1">
                  <h2 className="text-sm font-semibold text-zinc-800">{statusLabels[status]}</h2>
                  <span className="text-xs text-zinc-500">{cards.length}</span>
                </header>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  {cards.map((row) => (
                    <WorkCard
                      key={row.id}
                      assignment={row}
                      locale={locale}
                      streamLabel={streamLabels[row.stream]}
                      compact
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
                        showStatus
                        canEdit={canMutateWorkAssignment(currentUserId, row.assignee_id, canManage)}
                        canManage={canManage}
                        currentUserId={currentUserId}
                        isMine={canMutateWorkAssignment(currentUserId, row.assignee_id, false)}
                        statusLabel={statusLabels[row.status]}
                        onOpen={() => selectAssignment(row.id)}
                        onToggleSubtask={onToggleSub}
                        onRefresh={() => router.refresh()}
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
          processLabels={processLabels}
          onRefresh={() => router.refresh()}
          onToggleSubtask={onToggleSub}
        />
      ) : null}
    </div>
  );
}

function WorkCard({
  assignment,
  locale,
  streamLabel,
  statusLabel,
  compact = false,
  canEdit = false,
  canManage = false,
  currentUserId = '',
  isMine = false,
  draggable = false,
  showStatus = false,
  isDragging = false,
  onOpen,
  onToggleSubtask,
  onRefresh,
  onPointerDownCard,
  consumeClickIfDragged,
}: {
  assignment: WorkAssignment;
  locale: 'es' | 'en';
  streamLabel: string;
  statusLabel?: string;
  compact?: boolean;
  canEdit?: boolean;
  canManage?: boolean;
  currentUserId?: string;
  isMine?: boolean;
  draggable?: boolean;
  showStatus?: boolean;
  isDragging?: boolean;
  onOpen: () => void;
  onToggleSubtask: (id: string) => void;
  onRefresh: () => void;
  onPointerDownCard?: (event: React.PointerEvent<HTMLElement>, assignment: WorkAssignment) => void;
  consumeClickIfDragged?: () => boolean;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(!compact || isMine);
  const tone = workColorTone(assignment.stream);
  const preview = workAssignmentPreview(assignment, compact ? 110 : 220);
  const counts = workSubtaskCounts(assignment);
  const subs = assignment.subtasks;
  const dwell = formatDwellDuration(dwellMsSince(assignment.status_entered_at), locale);
  const progress = clampWorkProgress(assignment.progress_pct);
  const images = assignment.files.filter((file) => file.kind === 'image').slice(0, 3);

  function open(event: React.MouseEvent) {
    if (isWorkCardInteractiveTarget(event.target)) return;
    if (consumeClickIfDragged?.()) return;
    onOpen();
  }

  return (
    <article
      onPointerDown={draggable ? (event) => onPointerDownCard?.(event, assignment) : undefined}
      onClick={open}
      className={`min-w-0 max-w-full overflow-hidden rounded-xl border p-3 ${tone.card} ${draggable ? 'cursor-grab touch-none active:cursor-grabbing' : 'cursor-pointer'} ${
        isDragging ? 'opacity-40 ring-2 ring-zinc-400/70' : ''
      }`}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="break-words text-sm font-semibold text-zinc-900">{assignment.title}</h3>
          <p className="mt-0.5 text-xs text-zinc-600">
            {assignment.assignee_name || t('ops.asignaciones.unassigned')}
            {counts.total
              ? ` · ${t('ops.asignaciones.subtaskCount', { done: counts.done, total: counts.total })}`
              : ''}
            {` · ${dwell}`}
          </p>
        </div>
        {showStatus && statusLabel ? (
          <span className="shrink-0 rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-semibold text-zinc-600">
            {statusLabel}
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500">{streamLabel}</p>
      {assignment.process_label ? (
        assignment.process_href ? (
          <Link
            href={assignment.process_href}
            className="mt-1 inline-block max-w-full truncate text-xs font-medium text-codiva-primary hover:underline"
            onClick={(event) => event.stopPropagation()}
          >
            {assignment.process_label}
          </Link>
        ) : (
          <p className="mt-1 truncate text-xs text-zinc-600">{assignment.process_label}</p>
        )
      ) : null}
      {expanded && assignment.description ? (
        <p className="mt-2 whitespace-pre-wrap break-words text-sm text-zinc-700">{assignment.description}</p>
      ) : !expanded && preview ? (
        <p className="mt-2 line-clamp-2 break-words text-sm text-zinc-700">{preview}</p>
      ) : null}
      <div className="mt-3 h-1.5 w-full max-w-full overflow-hidden rounded-full bg-white/70">
        <div className={`h-full max-w-full rounded-full ${tone.bar}`} style={{ width: `${progress}%` }} />
      </div>
      {images.length ? (
        <div className="mt-2 flex min-w-0 gap-1 overflow-hidden" onClick={(event) => event.stopPropagation()}>
          {images.map((file) => (
            <img
              key={file.id}
              src={workFileHref(file.id)}
              alt={file.file_name}
              className="h-10 w-10 shrink-0 rounded-md object-cover"
            />
          ))}
          {assignment.files.length > images.length ? (
            <span className="flex h-10 items-center rounded-md bg-white/80 px-2 text-[11px] font-medium text-zinc-600">
              +{assignment.files.length - images.length}
            </span>
          ) : null}
        </div>
      ) : assignment.files.length ? (
        <p className="mt-2 truncate text-xs text-zinc-500">
          {t('ops.asignaciones.attachmentCount', { count: assignment.files.length })}
        </p>
      ) : null}
      <WorkSubtaskEditor
        assignment={assignment}
        canAct={canEdit}
        canManage={canManage}
        currentUserId={currentUserId}
        showEditor={expanded}
        visibleLimit={expanded ? undefined : 2}
        onToggle={onToggleSubtask}
        onRefresh={onRefresh}
      />
      {!expanded && (subs.length > 2 || canEdit || canManage) ? (
        <button
          type="button"
          className="mt-1 text-xs font-medium text-zinc-600 underline-offset-2 hover:underline"
          onClick={(event) => {
            event.stopPropagation();
            setExpanded(true);
          }}
        >
          {subs.length > 2 ? `+${subs.length - 2}` : t('ops.asignaciones.editSubtasks')}
        </button>
      ) : null}
    </article>
  );
}

function WorkFileList({
  files,
  canEdit,
  onRefresh,
}: {
  files: WorkFile[];
  canEdit: boolean;
  onRefresh: () => void;
}) {
  const { t } = useTranslation();
  if (!files.length) return <EmptyState>{t('ops.asignaciones.noAttachments')}</EmptyState>;
  return (
    <ul className="space-y-2">
      {files.map((file) => (
        <li key={file.id} className="flex min-w-0 items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-2">
          {file.kind === 'image' ? (
            <a href={workFileHref(file.id)} target="_blank" rel="noreferrer" className="shrink-0">
              <img src={workFileHref(file.id)} alt="" className="h-14 w-14 rounded-md object-cover" />
            </a>
          ) : (
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-white text-[10px] font-semibold uppercase text-zinc-500">
              {file.file_name.split('.').pop() || 'file'}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <a
              href={workFileHref(file.id)}
              target="_blank"
              rel="noreferrer"
              className="block truncate text-sm font-medium text-codiva-primary"
            >
              {file.file_name}
            </a>
            <p className="text-xs text-zinc-500">{formatBytes(file.byte_size)}</p>
          </div>
          {canEdit ? (
            <button
              type="button"
              className="shrink-0 text-xs font-medium text-zinc-500 hover:text-red-700"
              onClick={async () => {
                try {
                  await deleteWorkAssignmentFile(file.id);
                  onRefresh();
                } catch (err) {
                  toast.error(toUserErrorMessage(err, t('common.status.actionFailed')));
                }
              }}
            >
              {t('ops.fileInput.remove')}
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function CreateModal({
  open,
  onClose,
  staff,
  processOptions,
  streamLabels,
  processLabels,
}: {
  open: boolean;
  onClose: () => void;
  staff: MentionStaff[];
  processOptions: ProcessOption[];
  streamLabels: Record<string, string>;
  processLabels: Record<string, string>;
}) {
  const { t } = useTranslation();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('ops.asignaciones.create')}
      closeLabel={t('common.buttons.close')}
      size="md"
      className="flex max-h-[min(92vh,880px)] max-w-lg flex-col overflow-hidden"
    >
      <ToastForm
        className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1"
        success={t('ops.asignaciones.created')}
        action={async (fd) => {
          await createWorkAssignment(fd);
          onClose();
        }}
      >
        <Field label={t('ops.asignaciones.titlePlaceholder')} htmlFor="work-title">
          <Input id="work-title" name="title" required size="sm" placeholder={t('ops.asignaciones.titlePlaceholder')} />
        </Field>
        <Field label={t('ops.asignaciones.stream')}>
          <Select name="stream" defaultValue="delivery" size="sm">
            {WORK_STREAMS.map((id) => (
              <option key={id} value={id}>
                {streamLabels[id]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('ops.asignaciones.assignee')}>
          <Select name="assigneeId" defaultValue="" size="sm">
            <option value="">{t('ops.asignaciones.unassigned')}</option>
            {staff.map((row) => (
              <option key={row.id} value={row.id}>
                {row.full_name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('ops.asignaciones.due')}>
          <Input name="dueAt" type="date" size="sm" />
        </Field>
        <ProcessFields processOptions={processOptions} processLabels={processLabels} />
        <Field label={t('ops.asignaciones.descriptionPlaceholder')}>
          <Textarea name="description" rows={3} size="sm" placeholder={t('ops.asignaciones.descriptionPlaceholder')} />
        </Field>
        <Field label={t('ops.asignaciones.addSubtask')} hint={t('ops.asignaciones.subtasksPlaceholder')}>
          <Textarea name="subtasks" rows={3} size="sm" placeholder={t('ops.asignaciones.subtasksPlaceholder')} />
        </Field>
        <Field label={t('ops.asignaciones.attachments')} hint={t('ops.asignaciones.attachmentsHint')}>
          <WorkAttachmentField />
        </Field>
        <Button type="submit" size="sm">
          {t('ops.asignaciones.create')}
        </Button>
      </ToastForm>
    </Modal>
  );
}

function ProcessFields({
  processOptions,
  processLabels,
  defaultKind = 'none',
  defaultId = '',
}: {
  processOptions: ProcessOption[];
  processLabels: Record<string, string>;
  defaultKind?: WorkProcessKind;
  defaultId?: string;
}) {
  const { t } = useTranslation();
  const [kind, setKind] = useState<WorkProcessKind>(defaultKind);
  const options = processOptions.filter((row) => row.kind === kind);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label={t('ops.asignaciones.process')}>
        <Select name="processKind" size="sm" value={kind} onChange={(event) => setKind(event.target.value as WorkProcessKind)}>
          {WORK_PROCESS_KINDS.map((id) => (
            <option key={id} value={id}>
              {processLabels[id]}
            </option>
          ))}
        </Select>
      </Field>
      {kind !== 'none' ? (
        <Field label={processLabels[kind]}>
          <Select name="processId" size="sm" required defaultValue={defaultId} key={kind}>
            <option value="">{t('ops.asignaciones.processRequired')}</option>
            {options.map((row) => (
              <option key={row.id} value={row.id}>
                {row.label}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}
    </div>
  );
}

function DetailModal({
  assignment,
  onClose,
  staff,
  processOptions,
  canManage,
  currentUserId,
  locale,
  statusLabels,
  streamLabels,
  processLabels,
  onRefresh,
  onToggleSubtask,
}: {
  assignment: WorkAssignment;
  onClose: () => void;
  staff: MentionStaff[];
  processOptions: ProcessOption[];
  canManage: boolean;
  currentUserId: string;
  locale: 'es' | 'en';
  statusLabels: Record<string, string>;
  streamLabels: Record<string, string>;
  processLabels: Record<string, string>;
  onRefresh: () => void;
  onToggleSubtask: (id: string) => void;
}) {
  const { t } = useTranslation();
  const [comment, setComment] = useState('');
  const canAct = canMutateWorkAssignment(currentUserId, assignment.assignee_id, canManage);
  const events = [...assignment.stage_events].sort(
    (a, b) => Date.parse(a.entered_at) - Date.parse(b.entered_at)
  );

  async function onStatusChange(next: string) {
    if (!isWorkStatus(next) || next === assignment.status) return;
    try {
      await updateWorkAssignmentStatus(assignment.id, next, 'detail');
      onRefresh();
    } catch (err) {
      toast.error(toUserErrorMessage(err, t('ops.asignaciones.statusFailed')));
    }
  }

  const statusSelect = canAct ? (
    <Field label={t('ops.labels.workStatus.' + assignment.status)}>
      <Select
        size="sm"
        key={assignment.status}
        defaultValue={assignment.status}
        onChange={(event) => void onStatusChange(event.target.value)}
      >
        {WORK_STATUSES.map((id) => (
          <option key={id} value={id}>
            {statusLabels[id]}
          </option>
        ))}
      </Select>
    </Field>
  ) : (
    <p className="self-end text-sm text-zinc-600">{statusLabels[assignment.status]}</p>
  );

  return (
    <Modal
      open
      onClose={onClose}
      title={assignment.title}
      closeLabel={t('common.buttons.close')}
      size="md"
      className="max-h-[min(92vh,880px)] max-w-2xl overflow-y-auto"
    >
      <div className="mt-4 space-y-6">
        {canManage ? (
          <ToastForm
            className="space-y-3"
            success={t('ops.asignaciones.saved')}
            action={async (fd) => {
              await updateWorkAssignment(assignment.id, fd);
              onRefresh();
            }}
          >
            <Field label={t('ops.asignaciones.titlePlaceholder')}>
              <Input name="title" required size="sm" defaultValue={assignment.title} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t('ops.asignaciones.stream')}>
                <Select name="stream" size="sm" defaultValue={assignment.stream}>
                  {WORK_STREAMS.map((id) => (
                    <option key={id} value={id}>
                      {streamLabels[id]}
                    </option>
                  ))}
                </Select>
              </Field>
              {statusSelect}
              <Field label={t('ops.asignaciones.assignee')}>
                <Select name="assigneeId" size="sm" defaultValue={assignment.assignee_id || ''}>
                  <option value="">{t('ops.asignaciones.unassigned')}</option>
                  {staff.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.full_name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t('ops.asignaciones.due')}>
                <Input name="dueAt" type="date" size="sm" defaultValue={dueInputValue(assignment.due_at)} />
              </Field>
            </div>
            <ProcessFields
              processOptions={processOptions}
              processLabels={processLabels}
              defaultKind={assignment.process_kind}
              defaultId={assignment.process_id || ''}
            />
            <Field label={t('ops.asignaciones.descriptionPlaceholder')}>
              <Textarea name="description" rows={3} size="sm" defaultValue={assignment.description} />
            </Field>
            <Button type="submit" size="sm">
              {t('ops.asignaciones.save')}
            </Button>
          </ToastForm>
        ) : (
          <div className="space-y-3 text-sm text-zinc-700">
            <p className="break-words">{assignment.description || '—'}</p>
            {assignment.process_href ? (
              <Link href={assignment.process_href} className="font-medium text-codiva-primary hover:underline">
                {assignment.process_label}
              </Link>
            ) : assignment.process_label ? (
              <p>{assignment.process_label}</p>
            ) : null}
            <p>
              {assignment.assignee_name || t('ops.asignaciones.unassigned')}
              {assignment.due_at ? ` · ${assignment.due_at.slice(0, 10)}` : ''}
            </p>
            {statusSelect}
          </div>
        )}

        <section>
          <h3 className="mb-2 text-sm font-semibold text-zinc-900">{t('ops.asignaciones.attachments')}</h3>
          <WorkFileList files={assignment.files} canEdit={canAct} onRefresh={onRefresh} />
          {canAct ? (
            <ToastForm
              className="mt-3 space-y-2"
              success={t('ops.asignaciones.attachmentsAdded')}
              action={async (fd) => {
                await addWorkAssignmentFiles(assignment.id, fd);
                onRefresh();
              }}
            >
              <WorkAttachmentField />
              <Button type="submit" size="xs" variant="secondary">
                {t('ops.asignaciones.attach')}
              </Button>
            </ToastForm>
          ) : null}
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-zinc-900">{t('ops.asignaciones.timeline')}</h3>
          {events.length ? (
            <ol className="space-y-2">
              {events.map((event) => {
                const duration = formatDwellDuration(stageEventDurationMs(event), locale);
                const current = !event.left_at;
                return (
                  <li key={event.id} className="flex items-start justify-between gap-3 text-sm">
                    <span className="text-zinc-700">
                      {event.from_status
                        ? t('ops.asignaciones.fromTo', {
                            from: statusLabels[event.from_status] ?? event.from_status,
                            to: statusLabels[event.to_status] ?? event.to_status,
                          })
                        : statusLabels[event.to_status] ?? event.to_status}
                      {current ? ` · ${t('ops.asignaciones.currentStage')}` : ''}
                    </span>
                    <span className="shrink-0 text-xs text-zinc-500">{duration}</span>
                  </li>
                );
              })}
            </ol>
          ) : (
            <EmptyState>{t('ops.asignaciones.noEvents')}</EmptyState>
          )}
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-zinc-900">{t('ops.asignaciones.progress')}</h3>
          <WorkSubtaskEditor
            assignment={assignment}
            canAct={canAct}
            canManage={canManage}
            currentUserId={currentUserId}
            showEditor
            onToggle={onToggleSubtask}
            onRefresh={onRefresh}
          />
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-zinc-900">{t('ops.asignaciones.commentSubmit')}</h3>
          {assignment.comments.length ? (
            <ul className="mb-3 space-y-3">
              {assignment.comments.map((row) => (
                <li key={row.id} className="rounded-lg bg-zinc-50 px-3 py-2 text-sm">
                  <p className="text-xs font-medium text-zinc-500">
                    {row.author_name} · {new Date(row.created_at).toLocaleString(locale === 'en' ? 'en-US' : 'es-MX')}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-zinc-800">
                    {splitMentionTokens(row.body).map((part, index) =>
                      part.type === 'mention' ? (
                        <span
                          key={index}
                          className="rounded bg-codiva-primary/10 px-1 font-medium text-codiva-primary"
                        >
                          @{part.label}
                        </span>
                      ) : (
                        <span key={index}>{part.text}</span>
                      )
                    )}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState className="mb-3">{t('ops.asignaciones.noComments')}</EmptyState>
          )}
          <ToastForm
            success={t('ops.asignaciones.commented')}
            action={async () => {
              await addWorkAssignmentComment(assignment.id, comment);
              setComment('');
              onRefresh();
            }}
            className="space-y-2"
          >
            <OpsMentionComposer
              value={comment}
              onChange={setComment}
              staff={staff}
              excludeUserId={currentUserId}
              placeholder={t('ops.asignaciones.commentPlaceholder')}
            />
            <Button type="submit" size="sm" disabled={!comment.trim()}>
              {t('ops.asignaciones.commentSubmit')}
            </Button>
          </ToastForm>
        </section>
      </div>
    </Modal>
  );
}
