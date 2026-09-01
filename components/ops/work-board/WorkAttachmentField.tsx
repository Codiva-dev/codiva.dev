'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatBytes } from '@/lib/format-bytes';
import { WORK_FILE_ACCEPT, WORK_FILE_MAX_COUNT } from '@/lib/ops/work-board';

export default function WorkAttachmentField({
  hint,
  onFilesChange,
}: {
  hint?: string;
  onFilesChange?: (files: File[]) => void;
}) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const onFilesChangeRef = useRef(onFilesChange);
  onFilesChangeRef.current = onFilesChange;

  function sync(next: File[]) {
    const unique = next.slice(0, WORK_FILE_MAX_COUNT);
    setFiles(unique);
    onFilesChangeRef.current?.(unique);
  }

  useEffect(() => {
    onFilesChangeRef.current?.([]);
    return () => onFilesChangeRef.current?.([]);
  }, []);

  function add(list: FileList | File[] | null) {
    if (!list?.length) return;
    sync([...files, ...Array.from(list)]);
  }

  return (
    <div>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        multiple
        accept={WORK_FILE_ACCEPT}
        className="sr-only"
        onChange={(event) => {
          add(event.target.files);
          event.target.value = '';
        }}
      />
      <label
        htmlFor={inputId}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          add(event.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed px-3 py-4 text-center transition ${
          dragging
            ? 'border-codiva-primary bg-codiva-primary/5'
            : 'border-zinc-300 bg-white hover:border-codiva-primary/50 hover:bg-zinc-50'
        }`}
      >
        <p className="text-sm font-medium text-zinc-900">
          <span className="text-codiva-primary">{t('ops.fileInput.select')}</span>
          <span className="text-zinc-500">{t('ops.fileInput.orDrop')}</span>
        </p>
        <p className="text-xs text-zinc-500">{hint ?? t('ops.asignaciones.attachmentsHint')}</p>
      </label>
      {files.length ? (
        <ul className="mt-2 space-y-1">
          {files.map((file, index) => (
            <li key={`${file.name}-${file.size}-${index}`} className="flex items-center justify-between gap-2 text-xs">
              <span className="min-w-0 truncate text-zinc-700">
                {file.name} · {formatBytes(file.size)}
              </span>
              <button
                type="button"
                className="shrink-0 font-medium text-zinc-500 hover:text-zinc-800"
                onClick={() => sync(files.filter((_, i) => i !== index))}
              >
                {t('ops.fileInput.remove')}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
