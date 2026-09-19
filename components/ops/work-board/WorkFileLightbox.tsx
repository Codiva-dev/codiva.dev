'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import dynamic from 'next/dynamic';
import Button from '@/components/ui/Button';
import Modal, { ModalHeader } from '@/components/ui/Modal';
import {
  workFileHref,
  workFilePreviewMode,
  type WorkFile,
} from '@/lib/ops/work-board';

function OfficePreviewFallback() {
  const { t } = useTranslation();
  return (
    <p className="m-auto max-w-md px-6 py-10 text-center text-sm text-zinc-600">
      {t('ops.asignaciones.previewLoading')}
    </p>
  );
}

const WorkOfficePreview = dynamic(() => import('./WorkOfficePreview'), {
  ssr: false,
  loading: () => <OfficePreviewFallback />,
});

function WorkEmbedPreview({ href, title }: { href: string; title: string }) {
  const { t } = useTranslation();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    let objectUrl: string | null = null;
    setBlobUrl(null);
    setLoadError(false);

    void (async () => {
      try {
        const res = await fetch(href, { credentials: 'same-origin', cache: 'no-store', signal: ac.signal });
        if (!res.ok) throw new Error(`embed ${res.status}`);
        const blob = await res.blob();
        const mime = (res.headers.get('content-type') || blob.type || '').split(';')[0].trim();
        const preview = mime && mime !== blob.type ? new Blob([blob], { type: mime }) : blob;
        objectUrl = URL.createObjectURL(preview);
        if (ac.signal.aborted) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        setBlobUrl(objectUrl);
      } catch {
        if (ac.signal.aborted) return;
        setLoadError(true);
      }
    })();

    return () => {
      ac.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [href]);

  if (blobUrl) {
    return <iframe title={title} src={blobUrl} className="min-h-0 w-full flex-1 bg-zinc-100" />;
  }

  return (
    <p className="m-auto max-w-md px-6 py-10 text-center text-sm text-zinc-600">
      {loadError ? t('ops.asignaciones.previewFailed') : t('ops.asignaciones.previewLoading')}
    </p>
  );
}

export default function WorkFileLightbox({
  files,
  openIndex,
  onClose,
  onChangeIndex,
}: {
  files: WorkFile[];
  openIndex: number | null;
  onClose: () => void;
  onChangeIndex: (index: number) => void;
}) {
  const { t } = useTranslation();
  const titleId = useId();
  const file = openIndex != null ? files[openIndex] : undefined;
  const count = files.length;
  const closeLabel = t('common.buttons.close');

  const showPrev = useCallback(() => {
    if (openIndex == null || count < 2) return;
    onChangeIndex((openIndex + count - 1) % count);
  }, [count, onChangeIndex, openIndex]);

  const showNext = useCallback(() => {
    if (openIndex == null || count < 2) return;
    onChangeIndex((openIndex + 1) % count);
  }, [count, onChangeIndex, openIndex]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        showPrev();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        showNext();
      }
    },
    [showNext, showPrev]
  );

  const title = file
    ? count > 1
      ? `${file.file_name} · ${t('ops.asignaciones.previewCount', { n: (openIndex ?? 0) + 1, total: count })}`
      : file.file_name
    : '';
  const mode = file ? workFilePreviewMode(file) : 'download';
  const href = file ? workFileHref(file.id) : '';
  const downloadHref = file ? workFileHref(file.id, { download: true }) : '';

  return (
    <Modal
      open={Boolean(file)}
      onClose={onClose}
      title={title}
      titleId={titleId}
      size="frame"
      closeLabel={closeLabel}
      backdrop="dark"
      layer="raised"
      onKeyDown={onKeyDown}
      header={
        <ModalHeader
          title={title}
          titleId={titleId}
          actions={
            <>
              {file ? (
                <Button as="a" href={downloadHref} size="xs">
                  {t('ops.asignaciones.downloadFile')}
                </Button>
              ) : null}
              <Button type="button" variant="secondary" size="xs" onClick={onClose}>
                {closeLabel}
              </Button>
            </>
          }
        />
      }
      footer={
        count > 1 ? (
          <div className="flex items-center justify-between gap-2 border-t border-zinc-200 px-4 py-3">
            <Button type="button" variant="secondary" size="xs" onClick={showPrev}>
              {t('ops.asignaciones.previewPrev')}
            </Button>
            <Button type="button" variant="secondary" size="xs" onClick={showNext}>
              {t('ops.asignaciones.previewNext')}
            </Button>
          </div>
        ) : null
      }
    >
      {file && mode === 'image' ? (
        <div className="flex min-h-0 flex-1 items-center justify-center bg-zinc-950 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={href}
            alt={file.file_name}
            className="max-h-[min(78vh,820px)] max-w-full object-contain"
          />
        </div>
      ) : file && mode === 'embed' ? (
        <WorkEmbedPreview href={href} title={title} />
      ) : file && mode === 'office' ? (
        <WorkOfficePreview href={href} fileName={file.file_name} contentType={file.content_type} />
      ) : (
        <p className="m-auto max-w-md px-6 py-10 text-center text-sm text-zinc-600">
          {t('ops.asignaciones.previewUnavailable')}
        </p>
      )}
    </Modal>
  );
}
