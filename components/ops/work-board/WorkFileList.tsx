'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import EmptyState from '@/components/ui/EmptyState';
import { toUserErrorMessage } from '@/lib/user-error';
import { formatBytes } from '@/lib/format-bytes';
import { deleteWorkAssignmentFile } from '@/lib/ops/work-board-actions';
import { workFileHref, type WorkFile } from '@/lib/ops/work-board';
import WorkFileLightbox from './WorkFileLightbox';

export function WorkFileList({
  files,
  canEdit,
  onRefresh,
}: {
  files: WorkFile[];
  canEdit: boolean;
  onRefresh: () => void;
}) {
  const { t } = useTranslation();
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  if (!files.length) return <EmptyState>{t('ops.asignaciones.noAttachments')}</EmptyState>;
  return (
    <>
      <ul className="space-y-2">
        {files.map((file, index) => (
          <li key={file.id} className="flex min-w-0 items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-2">
            {file.kind === 'image' ? (
              <button
                type="button"
                className="shrink-0"
                onClick={() => setPreviewIndex(index)}
                aria-haspopup="dialog"
                aria-label={file.file_name}
              >
                <img src={workFileHref(file.id)} alt="" className="h-14 w-14 rounded-md object-cover" />
              </button>
            ) : (
              <button
                type="button"
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-white text-[10px] font-semibold uppercase text-zinc-500"
                onClick={() => setPreviewIndex(index)}
                aria-haspopup="dialog"
                aria-label={file.file_name}
              >
                {file.file_name.split('.').pop() || 'file'}
              </button>
            )}
            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => setPreviewIndex(index)}
                aria-haspopup="dialog"
                className="block w-full truncate text-left text-sm font-medium text-codiva-primary hover:underline"
              >
                {file.file_name}
              </button>
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
      <WorkFileLightbox
        files={files}
        openIndex={previewIndex}
        onClose={() => setPreviewIndex(null)}
        onChangeIndex={setPreviewIndex}
      />
    </>
  );
}
