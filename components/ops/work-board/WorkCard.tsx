'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  clampWorkProgress,
  dwellMsSince,
  formatDwellDuration,
  canArchiveWorkStatus,
  canRestoreWorkStatus,
  workAssigneeInitials,
  workCardPendingCount,
  workColorTone,
  workFileHref,
  workSubtaskCounts,
  workUrgencyTone,
  type WorkAssignment,
  type WorkUrgency,
} from '@/lib/ops/work-board';
import WorkFileLightbox from './WorkFileLightbox';
import WorkSubtaskEditor from './WorkSubtaskEditor';
import { isWorkCardInteractiveTarget } from './useWorkBoardDrag';

function PresenceDots({
  viewers,
  label,
}: {
  viewers: Array<{ id: string; name: string }>;
  label: string;
}) {
  if (!viewers.length) return null;
  return (
    <span title={label} aria-label={label} className="flex shrink-0 -space-x-1">
      {viewers.slice(0, 3).map((row) => (
        <span
          key={row.id}
          className="flex h-5 w-5 items-center justify-center rounded-full bg-codiva-primary text-[9px] font-semibold text-white ring-1 ring-white"
        >
          {workAssigneeInitials(row.name) || '·'}
        </span>
      ))}
    </span>
  );
}

function PendingNotificationBadge({ count }: { count: number }) {
  const { t } = useTranslation();
  if (count <= 0) return null;
  const label = t('ops.asignaciones.pendingNotifications', { count });
  return (
    <span
      title={label}
      aria-label={label}
      className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-codiva-primary px-1.5 text-[10px] font-semibold tabular-nums text-white"
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

function CardExpandButton({
  expanded,
  expandLabel,
  collapseLabel,
  onToggle,
}: {
  expanded: boolean;
  expandLabel: string;
  collapseLabel: string;
  onToggle: () => void;
}) {
  const label = expanded ? collapseLabel : expandLabel;
  return (
    <button
      type="button"
      aria-expanded={expanded}
      aria-label={label}
      title={label}
      className="shrink-0 rounded-md p-0.5 text-zinc-500 hover:bg-white/80 hover:text-zinc-800"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
    >
      {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
    </button>
  );
}

function WorkUrgencyBadge({
  urgency,
  label,
  compact = false,
}: {
  urgency: WorkUrgency;
  label: string;
  compact?: boolean;
}) {
  const tone = workUrgencyTone(urgency);
  const showLabel = !compact || urgency !== 'normal';
  return (
    <span
      title={label}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full font-semibold ${tone.badge} ${
        compact ? 'px-1.5 py-0 text-[10px] leading-4' : 'px-2 py-0.5 text-[11px]'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} aria-hidden />
      {showLabel ? label : <span className="sr-only">{label}</span>}
    </span>
  );
}

function WorkLifecycleButton({
  assignment,
  onArchive,
  onRestore,
  compact = false,
}: {
  assignment: WorkAssignment;
  onArchive?: () => void;
  onRestore?: () => void;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const action =
    onArchive && canArchiveWorkStatus(assignment.status)
      ? { label: t('ops.asignaciones.archive'), run: onArchive }
      : onRestore && canRestoreWorkStatus(assignment.status)
        ? { label: t('ops.asignaciones.restore'), run: onRestore }
        : null;
  if (!action) return null;
  return (
    <button
      type="button"
      className={`shrink-0 rounded-md font-semibold text-zinc-700 hover:bg-white/80 ${
        compact ? 'px-1 py-0.5 text-[10px]' : 'px-1.5 py-0.5 text-[11px]'
      }`}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        action.run();
      }}
    >
      {action.label}
    </button>
  );
}

export function WorkCard({
  assignment,
  locale,
  streamLabel,
  urgencyLabel,
  statusLabel,
  compact = false,
  collapsible = false,
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
  onDelete,
  onArchive,
  onRestore,
  viewers = [],
}: {
  assignment: WorkAssignment;
  locale: 'es' | 'en';
  streamLabel: string;
  urgencyLabel: string;
  statusLabel?: string;
  compact?: boolean;
  collapsible?: boolean;
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
  onDelete?: () => void;
  onArchive?: () => void;
  onRestore?: () => void;
  viewers?: Array<{ id: string; name: string }>;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(!compact);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const tone = workColorTone(assignment.stream);
  const urgencyTone = workUrgencyTone(assignment.urgency);
  const counts = workSubtaskCounts(assignment);
  const pendingCount = workCardPendingCount({
    unreadMentionCount: assignment.unread_mention_count,
    status: assignment.status,
    hasOpenEditRequest: Boolean(assignment.subtask_edit_request),
    canManage,
  });
  const dwell = formatDwellDuration(dwellMsSince(assignment.status_entered_at), locale);
  const progress = clampWorkProgress(assignment.progress_pct);
  const images = assignment.files.filter((file) => file.kind === 'image').slice(0, 3);
  const assigneeName = assignment.assignee_name || t('ops.asignaciones.unassigned');
  const initials = workAssigneeInitials(assignment.assignee_name);
  const expandToggle = collapsible ? (
    <CardExpandButton
      expanded={expanded}
      expandLabel={t('ops.asignaciones.expandCard')}
      collapseLabel={t('ops.asignaciones.collapseCard')}
      onToggle={() => setExpanded((prev) => !prev)}
    />
  ) : null;
  const lifecycleButton = (
    <WorkLifecycleButton assignment={assignment} onArchive={onArchive} onRestore={onRestore} compact={!expanded} />
  );
  const presenceLabel = viewers.length
    ? t('ops.asignaciones.viewingNow', { names: viewers.map((row) => row.name).join(', ') })
    : '';
  const presenceDots = <PresenceDots viewers={viewers} label={presenceLabel} />;

  function open(event: React.MouseEvent) {
    if (isWorkCardInteractiveTarget(event.target)) return;
    if (consumeClickIfDragged?.()) return;
    onOpen();
  }

  if (!expanded) {
    const meta: string[] = [dwell];
    if (counts.total) meta.push(t('ops.asignaciones.subtaskCount', { done: counts.done, total: counts.total }));
    return (
      <article
        title={`${urgencyLabel} · ${streamLabel} · ${assigneeName}`}
        onPointerDown={draggable ? (event) => onPointerDownCard?.(event, assignment) : undefined}
        onClick={open}
        className={`h-auto w-full min-w-0 shrink-0 overflow-hidden rounded-lg border border-l-[3px] px-2.5 py-2 ${tone.card} ${urgencyTone.bar} ${
          draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
        } ${isDragging ? 'opacity-40 ring-2 ring-inset ring-zinc-400/70' : isMine ? `ring-2 ring-inset ${tone.ring}` : ''}`}
      >
        <div className="flex items-start gap-1">
          <h3 className="min-w-0 flex-1 text-[13px] font-semibold leading-snug text-zinc-900 [overflow-wrap:anywhere]">
            {assignment.title}
          </h3>
          {presenceDots}
          <PendingNotificationBadge count={pendingCount} />
          {lifecycleButton}
          {expandToggle}
        </div>
        {assignment.process_label ? (
          <p className="mt-0.5 break-words text-[11px] leading-snug text-zinc-500">{assignment.process_label}</p>
        ) : null}
        <div className="mt-1.5 flex min-w-0 items-center gap-1.5">
          <span
            title={assigneeName}
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/80 text-[10px] font-semibold ${
              initials ? 'text-zinc-700' : 'text-zinc-400'
            }`}
          >
            {initials || '–'}
          </span>
          <p className="min-w-0 flex-1 truncate text-[11px] text-zinc-600">{meta.join(' · ')}</p>
          {assignment.urgency === 'normal' ? null : (
            <WorkUrgencyBadge urgency={assignment.urgency} label={urgencyLabel} compact />
          )}
        </div>
        {assignment.subtask_edit_request ? (
          <p className="mt-1 text-[11px] font-medium text-amber-800">{t('ops.asignaciones.requestPendingBadge')}</p>
        ) : null}
        {progress > 0 ? (
          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/70">
            <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${progress}%` }} />
          </div>
        ) : null}
      </article>
    );
  }

  return (
    <article
      onPointerDown={draggable ? (event) => onPointerDownCard?.(event, assignment) : undefined}
      onClick={open}
      className={`h-auto w-full min-w-0 max-w-full shrink-0 overflow-hidden rounded-xl border border-l-[3px] p-3 ${tone.card} ${urgencyTone.bar} ${draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} ${
        isDragging ? 'opacity-40 ring-2 ring-inset ring-zinc-400/70' : isMine ? `ring-2 ring-inset ${tone.ring}` : ''
      }`}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <h3 className="min-w-0 flex-1 text-sm font-semibold text-zinc-900 [overflow-wrap:anywhere]">
              {assignment.title}
            </h3>
            {presenceDots}
            <PendingNotificationBadge count={pendingCount} />
          </div>
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
        {expandToggle}
        {lifecycleButton}
        {onDelete ? (
          <button
            type="button"
            className="shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-red-700 hover:bg-red-50"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
          >
            {t('ops.asignaciones.delete')}
          </button>
        ) : null}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{streamLabel}</p>
        <WorkUrgencyBadge urgency={assignment.urgency} label={urgencyLabel} />
      </div>
      {assignment.process_label ? (
        assignment.process_href ? (
          <Link
            href={assignment.process_href}
            className="mt-1 inline-block max-w-full break-words text-xs font-medium text-codiva-primary hover:underline"
            onClick={(event) => event.stopPropagation()}
          >
            {assignment.process_label}
          </Link>
        ) : (
          <p className="mt-1 break-words text-xs text-zinc-600">{assignment.process_label}</p>
        )
      ) : null}
      {assignment.description ? (
        <p className="mt-2 whitespace-pre-wrap break-words text-sm text-zinc-700">{assignment.description}</p>
      ) : null}
      <div className="mt-3 h-1.5 w-full max-w-full overflow-hidden rounded-full bg-white/70">
        <div className={`h-full max-w-full rounded-full ${tone.bar}`} style={{ width: `${progress}%` }} />
      </div>
      {images.length ? (
        <div className="mt-2 flex min-w-0 gap-1 overflow-hidden">
          {images.map((file) => {
            const index = assignment.files.findIndex((row) => row.id === file.id);
            return (
              <button
                key={file.id}
                type="button"
                className="shrink-0"
                onClick={() => setPreviewIndex(index < 0 ? 0 : index)}
                aria-haspopup="dialog"
                aria-label={file.file_name}
              >
                <img
                  src={workFileHref(file.id)}
                  alt=""
                  className="h-10 w-10 rounded-md object-cover"
                />
              </button>
            );
          })}
          {assignment.files.length > images.length ? (
            <button
              type="button"
              className="flex h-10 items-center rounded-md bg-white/80 px-2 text-[11px] font-medium text-zinc-600"
              onClick={() => setPreviewIndex(images.length)}
              aria-haspopup="dialog"
            >
              +{assignment.files.length - images.length}
            </button>
          ) : null}
        </div>
      ) : assignment.files.length ? (
        <button
          type="button"
          className="mt-2 truncate text-xs text-zinc-500 hover:text-zinc-800"
          onClick={() => setPreviewIndex(0)}
          aria-haspopup="dialog"
        >
          {t('ops.asignaciones.attachmentCount', { count: assignment.files.length })}
        </button>
      ) : null}
      <WorkFileLightbox
        files={assignment.files}
        openIndex={previewIndex}
        onClose={() => setPreviewIndex(null)}
        onChangeIndex={setPreviewIndex}
      />
      <WorkSubtaskEditor
        assignment={assignment}
        canAct={canEdit}
        canManage={canManage}
        currentUserId={currentUserId}
        showEditor
        onToggle={onToggleSubtask}
        onRefresh={onRefresh}
      />
    </article>
  );
}
