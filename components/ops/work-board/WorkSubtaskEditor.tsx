'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { toUserErrorMessage } from '@/lib/user-error';
import {
  applyWorkSubtaskEditRequest,
  dismissWorkSubtaskEditRequest,
  replaceWorkSubtasks,
  requestWorkSubtaskEdit,
} from '@/lib/ops/work-board-actions';
import {
  canRequestWorkSubtaskEdit,
  workSubtaskEditorText,
  type WorkAssignment,
} from '@/lib/ops/work-board';

export default function WorkSubtaskEditor({
  assignment,
  canAct,
  canManage,
  currentUserId,
  showEditor,
  visibleLimit,
  onToggle,
  onRefresh,
  onExpand,
}: {
  assignment: WorkAssignment;
  canAct: boolean;
  canManage: boolean;
  currentUserId: string;
  showEditor: boolean;
  visibleLimit?: number;
  onToggle: (id: string) => void;
  onRefresh: () => void;
  onExpand?: () => void;
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const request = assignment.subtask_edit_request;
  const canRequest = canRequestWorkSubtaskEdit(currentUserId, assignment.assignee_id, canManage);
  const subs = assignment.subtasks;
  const visible = typeof visibleLimit === 'number' ? subs.slice(0, visibleLimit) : subs;

  useEffect(() => {
    setEditing(false);
    setText('');
  }, [assignment.id]);

  function startEdit() {
    onExpand?.();
    setText(request && canRequest ? request.payload : workSubtaskEditorText(subs));
    setEditing(true);
  }

  const canChangeList = canManage || canRequest;
  const actionLabel = !subs.length
    ? t('ops.asignaciones.addSubtasks')
    : canManage
      ? t('ops.asignaciones.editSubtasks')
      : t('ops.asignaciones.requestEdit');

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      if (canManage) {
        await replaceWorkSubtasks(assignment.id, text);
        toast.success(t('ops.asignaciones.subtasksSaved'));
      } else {
        await requestWorkSubtaskEdit(assignment.id, text);
        toast.success(t('ops.asignaciones.editRequested'));
      }
      setEditing(false);
      onRefresh();
    } catch (err) {
      toast.error(toUserErrorMessage(err, t('common.status.actionFailed')));
    } finally {
      setSaving(false);
    }
  }

  async function applyRequest() {
    if (!request || saving) return;
    setSaving(true);
    try {
      await applyWorkSubtaskEditRequest(request.id);
      toast.success(t('ops.asignaciones.requestApplied'));
      setEditing(false);
      onRefresh();
    } catch (err) {
      toast.error(toUserErrorMessage(err, t('common.status.actionFailed')));
    } finally {
      setSaving(false);
    }
  }

  async function dismissRequest() {
    if (!request || saving) return;
    setSaving(true);
    try {
      await dismissWorkSubtaskEditRequest(request.id);
      toast.success(t('ops.asignaciones.requestDismissed'));
      onRefresh();
    } catch (err) {
      toast.error(toUserErrorMessage(err, t('common.status.actionFailed')));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div onClick={(event) => event.stopPropagation()}>
      {visible.length ? (
        <ul className="mt-3 space-y-1">
          {visible.map((sub) => (
            <li key={sub.id}>
              <label className="flex items-start gap-2 text-sm text-zinc-800">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={sub.status === 'done'}
                  disabled={!canAct}
                  onChange={() => canAct && onToggle(sub.id)}
                />
                <span className={`min-w-0 break-words ${sub.status === 'done' ? 'text-zinc-500 line-through' : ''}`}>
                  {sub.title}
                </span>
              </label>
            </li>
          ))}
        </ul>
      ) : null}

      {!showEditor && request ? (
        <p className="mt-2 text-[11px] font-medium text-amber-800">{t('ops.asignaciones.requestPendingBadge')}</p>
      ) : null}

      {showEditor && request && !editing ? (
        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2">
          <p className="text-xs font-medium text-amber-900">
            {t('ops.asignaciones.requestPending', { name: request.requested_by_name })}
          </p>
          <p className="mt-1 whitespace-pre-wrap break-words text-xs text-zinc-700">{request.payload || '-'}</p>
          {canManage ? (
            <div className="mt-2 flex flex-wrap gap-1">
              <Button type="button" size="xs" disabled={saving} onClick={() => void applyRequest()}>
                {t('ops.asignaciones.applyRequest')}
              </Button>
              <Button
                type="button"
                size="xs"
                variant="secondary"
                disabled={saving}
                onClick={() => void dismissRequest()}
              >
                {t('ops.asignaciones.dismissRequest')}
              </Button>
            </div>
          ) : canRequest ? (
            <p className="mt-1 text-xs text-amber-800">{t('ops.asignaciones.requestSent')}</p>
          ) : null}
        </div>
      ) : null}

      {editing ? (
        <div className="mt-2 space-y-2">
          <Textarea
            size="sm"
            rows={Math.min(8, Math.max(3, text.split('\n').length + 1))}
            className="min-w-0 w-full"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={t('ops.asignaciones.subtasksPlaceholder')}
          />
          <div className="flex flex-wrap gap-1">
            <Button type="button" size="xs" disabled={saving} onClick={() => void save()}>
              {canManage ? t('ops.asignaciones.save') : t('ops.asignaciones.requestEdit')}
            </Button>
            <Button
              type="button"
              size="xs"
              variant="secondary"
              disabled={saving}
              onClick={() => setEditing(false)}
            >
              {t('ops.asignaciones.cancelEdit')}
            </Button>
          </div>
        </div>
      ) : null}

      {!editing && canChangeList ? (
        !subs.length ? (
          <button
            type="button"
            className="mt-2 w-full rounded-lg border border-dashed border-codiva-primary/40 bg-white/80 px-2 py-2 text-left text-xs font-medium text-codiva-primary"
            onClick={startEdit}
          >
            {actionLabel}
          </button>
        ) : (
          <button
            type="button"
            className="mt-2 text-xs font-medium text-codiva-primary underline-offset-2 hover:underline"
            onClick={startEdit}
          >
            {actionLabel}
          </button>
        )
      ) : null}
    </div>
  );
}
