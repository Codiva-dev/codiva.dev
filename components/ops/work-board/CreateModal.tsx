'use client';

import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@/components/ui/Button';
import Field from '@/components/ui/Field';
import Input, { Select, Textarea } from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import ToastForm from '@/components/ops/ToastForm';
import { createWorkAssignment } from '@/lib/ops/work-board-actions';
import { WORK_STREAMS, WORK_URGENCIES } from '@/lib/ops/work-board';
import { type MentionStaff } from './OpsMentionComposer';
import WorkAttachmentField from './WorkAttachmentField';
import { ProcessFields } from './ProcessFields';
import { type ProcessOption } from './types';

export function CreateModal({
  open,
  onClose,
  staff,
  processOptions,
  streamLabels,
  urgencyLabels,
  processLabels,
}: {
  open: boolean;
  onClose: () => void;
  staff: MentionStaff[];
  processOptions: ProcessOption[];
  streamLabels: Record<string, string>;
  urgencyLabels: Record<string, string>;
  processLabels: Record<string, string>;
}) {
  const { t } = useTranslation();
  const filesRef = useRef<File[]>([]);
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
          await createWorkAssignment(fd, filesRef.current);
          filesRef.current = [];
          onClose();
        }}
      >
        <Field label={t('ops.asignaciones.titlePlaceholder')} htmlFor="work-title">
          <Input id="work-title" name="title" required size="sm" placeholder={t('ops.asignaciones.titlePlaceholder')} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('ops.asignaciones.stream')}>
            <Select name="stream" defaultValue="delivery" size="sm">
              {WORK_STREAMS.map((id) => (
                <option key={id} value={id}>
                  {streamLabels[id]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('ops.asignaciones.urgency')}>
            <Select name="urgency" defaultValue="normal" size="sm">
              {WORK_URGENCIES.map((id) => (
                <option key={id} value={id}>
                  {urgencyLabels[id]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
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
          <WorkAttachmentField onFilesChange={(files) => { filesRef.current = files; }} />
        </Field>
        <Button type="submit" size="sm">
          {t('ops.asignaciones.create')}
        </Button>
      </ToastForm>
    </Modal>
  );
}
