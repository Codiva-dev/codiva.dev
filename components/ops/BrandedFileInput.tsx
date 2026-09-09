'use client';

import { useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { formatBytes } from '@/lib/format-bytes';
import { OPS_FORM_MAX_FILES } from '@/lib/ops/form-files';

type Props = {
  name?: string;
  required?: boolean;
  accept?: string;
  hint?: string;
  className?: string;
  multiple?: boolean;
  maxFiles?: number;
};

export default function BrandedFileInput({
  name = 'file',
  required,
  accept,
  hint,
  className = '',
  multiple = false,
  maxFiles = OPS_FORM_MAX_FILES,
}: Props) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);

  function sync(next: File[]) {
    const unique = next.slice(0, maxFiles);
    setFiles(unique);
    if (!inputRef.current) return;
    const transfer = new DataTransfer();
    for (const file of unique) transfer.items.add(file);
    inputRef.current.files = transfer.files;
  }

  function add(list: FileList | File[] | null, replace: boolean) {
    if (!list?.length) return;
    const incoming = Array.from(list).filter((file) => file.size > 0);
    if (!incoming.length) return;
    if (!multiple) {
      sync(incoming.slice(0, 1));
      return;
    }
    const merged = replace ? incoming : [...files, ...incoming];
    const seen = new Set<string>();
    const unique: File[] = [];
    for (const file of merged) {
      const key = `${file.name}:${file.size}:${file.lastModified}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(file);
    }
    if (unique.length > maxFiles) {
      toast.error(t('ops.fileInput.tooMany', { max: maxFiles }));
    }
    sync(unique.slice(0, maxFiles));
  }

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const hasFiles = files.length > 0;

  return (
    <div className={className}>
      <input
        ref={inputRef}
        id={inputId}
        name={name}
        type="file"
        required={required && !hasFiles}
        accept={accept}
        multiple={multiple}
        className="sr-only"
        onChange={(e) => add(e.target.files, !multiple)}
      />

      <label
        htmlFor={inputId}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          add(e.dataTransfer.files, false);
        }}
        className={`group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-6 text-center transition ${
          dragging
            ? 'border-codiva-primary bg-codiva-primary/5'
            : hasFiles
              ? 'border-codiva-primary/40 bg-white'
              : 'border-zinc-300 bg-white hover:border-codiva-primary/50 hover:bg-zinc-50'
        }`}
      >
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-full ${
            hasFiles ? 'bg-codiva-primary text-white' : 'bg-zinc-100 text-codiva-primary'
          }`}
          aria-hidden
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 16V7m0 0 3.5 3.5M12 7 8.5 10.5M6 16.5V18a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-1.5"
            />
          </svg>
        </span>

        {hasFiles && !multiple ? (
          <>
            <p className="max-w-full truncate text-sm font-medium text-zinc-900">{files[0].name}</p>
            <p className="text-xs text-zinc-500">{t('ops.fileInput.change', { size: formatBytes(files[0].size) })}</p>
          </>
        ) : hasFiles ? (
          <>
            <p className="text-sm font-medium text-zinc-900">
              {t('ops.fileInput.selectedCount', { count: files.length, size: formatBytes(totalSize) })}
            </p>
            <p className="text-xs text-zinc-500">{t('ops.fileInput.addMore')}</p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-zinc-900">
              <span className="text-codiva-primary">
                {multiple ? t('ops.fileInput.selectMany') : t('ops.fileInput.select')}
              </span>
              <span className="text-zinc-500">
                {multiple ? t('ops.fileInput.orDropMany') : t('ops.fileInput.orDrop')}
              </span>
            </p>
            <p className="text-xs text-zinc-500">{hint ?? t('ops.fileInput.defaultHint')}</p>
          </>
        )}
      </label>

      {multiple && files.length > 0 && (
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
      )}

      {hasFiles && (
        <button
          type="button"
          onClick={() => sync([])}
          className="mt-2 text-xs font-medium text-zinc-500 hover:text-zinc-800"
        >
          {multiple ? t('ops.fileInput.removeAll') : t('ops.fileInput.remove')}
        </button>
      )}
    </div>
  );
}
