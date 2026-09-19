'use client';

import Link from 'next/link';
import { useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import Field from '@/components/ui/Field';
import Input, { Select, Textarea } from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import ToastForm from '@/components/ops/ToastForm';
import { toUserErrorMessage } from '@/lib/user-error';
import {
  addWorkAssignmentComment,
  addWorkAssignmentFiles,
  updateWorkAssignment,
  updateWorkAssignmentStatus,
} from '@/lib/ops/work-board-actions';
import {
  WORK_BOARD_COLUMNS,
  WORK_STREAMS,
  WORK_URGENCIES,
  canArchiveWorkStatus,
  canMutateWorkAssignment,
  canRestoreWorkStatus,
  canTransitionWorkStatus,
  formatDwellDuration,
  isWorkBoardColumn,
  splitMentionTokens,
  stageEventDurationMs,
  type WorkAssignment,
} from '@/lib/ops/work-board';
import OpsMentionComposer, { type MentionStaff } from './OpsMentionComposer';
import WorkAttachmentField from './WorkAttachmentField';
import WorkSubtaskEditor from './WorkSubtaskEditor';
import { ProcessFields } from './ProcessFields';
import { WorkFileList } from './WorkFileList';
import { dueInputValue, type ProcessOption } from './types';

export function DetailModal({
  assignment,
  onClose,
  staff,
  processOptions,
  canManage,
  currentUserId,
  locale,
  statusLabels,
  streamLabels,
  urgencyLabels,
  processLabels,
  onRefresh,
  onToggleSubtask,
  onDelete,
  onArchive,
  onRestore,
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
  urgencyLabels: Record<string, string>;
  processLabels: Record<string, string>;
  onRefresh: () => void;
  onToggleSubtask: (id: string) => void;
  onDelete?: () => void;
  onArchive?: () => void;
  onRestore?: () => void;
}) {
  const { t } = useTranslation();
  const titleId = useId();
  const [comment, setComment] = useState('');
  const filesRef = useRef<File[]>([]);
  const canAct = canMutateWorkAssignment(currentUserId, assignment.assignee_id, canManage);
  const events = [...assignment.stage_events].sort(
    (a, b) => Date.parse(a.entered_at) - Date.parse(b.entered_at)
  );

  async function onStatusChange(next: string) {
    if (!isWorkBoardColumn(next) || next === assignment.status) return;
    if (!canTransitionWorkStatus(assignment.status, next)) return;
    try {
      await updateWorkAssignmentStatus(assignment.id, next, 'detail');
      onRefresh();
    } catch (err) {
      toast.error(toUserErrorMessage(err, t('ops.asignaciones.statusFailed')));
    }
  }

  const statusSelect =
    canAct && assignment.status !== 'archived' ? (
    <Field label={t('ops.labels.workStatus.' + assignment.status)}>
      <Select
        size="sm"
        key={assignment.status}
        defaultValue={assignment.status}
        onChange={(event) => void onStatusChange(event.target.value)}
      >
        {WORK_BOARD_COLUMNS.map((id) => (
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
      titleId={titleId}
      closeLabel={t('common.buttons.close')}
      size="md"
      className="max-h-[min(92vh,880px)] max-w-2xl overflow-y-auto"
      header={
        <div className="flex items-start justify-between gap-3">
          <p id={titleId} className="text-base font-semibold text-zinc-900">{assignment.title}</p>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {onArchive && canArchiveWorkStatus(assignment.status) ? (
              <Button type="button" size="xs" variant="secondary" onClick={onArchive}>
                {t('ops.asignaciones.archive')}
              </Button>
            ) : null}
            {onRestore && canRestoreWorkStatus(assignment.status) ? (
              <Button type="button" size="xs" variant="secondary" onClick={onRestore}>
                {t('ops.asignaciones.restore')}
              </Button>
            ) : null}
            {onDelete ? (
              <Button type="button" size="xs" variant="danger" onClick={onDelete}>
                {t('ops.asignaciones.delete')}
              </Button>
            ) : null}
          </div>
        </div>
      }
    >
      <div className="mt-4 space-y-6">
        {canManage ? (
          <div className="space-y-3">
          <ToastForm
            className="space-y-3"
            success={t('ops.asignaciones.saved')}
            action={async (fd) => {
              await updateWorkAssignment(assignment.id, fd, filesRef.current);
              filesRef.current = [];
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
              <Field label={t('ops.asignaciones.urgency')}>
                <Select name="urgency" size="sm" defaultValue={assignment.urgency}>
                  {WORK_URGENCIES.map((id) => (
                    <option key={id} value={id}>
                      {urgencyLabels[id]}
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
          </div>
        ) : (
          <div className="space-y-3 text-sm text-zinc-700">
            <p className="break-words">{assignment.description || '-'}</p>
            {assignment.process_href ? (
              <Link href={assignment.process_href} className="font-medium text-codiva-primary hover:underline">
                {assignment.process_label}
              </Link>
            ) : assignment.process_label ? (
              <p>{assignment.process_label}</p>
            ) : null}
            <p>
              {urgencyLabels[assignment.urgency]}
              {' · '}
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
              validate={() =>
                filesRef.current.length ? null : t('ops.asignaciones.fileRequired')
              }
              action={async () => {
                await addWorkAssignmentFiles(assignment.id, filesRef.current);
                filesRef.current = [];
                onRefresh();
              }}
            >
              <WorkAttachmentField
                key={`${assignment.id}-${assignment.files.length}`}
                onFilesChange={(files) => {
                  filesRef.current = files;
                }}
              />
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
