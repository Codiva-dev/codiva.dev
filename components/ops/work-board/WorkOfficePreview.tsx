'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { workOfficeKind } from '@/lib/ops/work-board';

export default function WorkOfficePreview({
  href,
  fileName,
  contentType,
}: {
  href: string;
  fileName: string;
  contentType: string;
}) {
  const { t } = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const kind = workOfficeKind({ file_name: fileName, content_type: contentType });

  useEffect(() => {
    const stage = stageRef.current;
    const root = rootRef.current;
    if (!stage || !kind) {
      setStatus('error');
      return;
    }

    let cancelled = false;
    let destroy = () => {};
    setStatus('loading');
    stage.replaceChildren();

    void (async () => {
      try {
        const res = await fetch(href);
        if (!res.ok) throw new Error('fetch');
        const buf = await res.arrayBuffer();
        if (cancelled || !stageRef.current) return;

        if (kind === 'docx') {
          const { renderAsync } = await import('docx-preview');
          if (cancelled || !stageRef.current) return;
          await renderAsync(buf, stageRef.current, undefined, {
            inWrapper: true,
            ignoreWidth: false,
            useBase64URL: true,
          });
        } else {
          const { init } = await import('pptx-preview');
          if (cancelled || !stageRef.current) return;
          const width = Math.max(320, Math.floor((root?.clientWidth || 960) - 24));
          const previewer = init(stageRef.current, {
            width,
            height: Math.round((width * 9) / 16),
            mode: 'slide',
          });
          destroy = () => previewer.destroy();
          await previewer.preview(buf);
        }
        if (!cancelled) setStatus('ready');
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      destroy();
      stage.replaceChildren();
    };
  }, [href, kind]);

  if (!kind) {
    return (
      <p className="m-auto max-w-md px-6 py-10 text-center text-sm text-zinc-600">
        {t('ops.asignaciones.previewUnavailable')}
      </p>
    );
  }

  return (
    <div ref={rootRef} className="relative min-h-0 flex-1 overflow-auto bg-zinc-200">
      {status === 'loading' ? (
        <p className="pointer-events-none absolute inset-x-0 top-10 z-10 text-center text-sm text-zinc-600">
          {t('ops.asignaciones.previewLoading')}
        </p>
      ) : null}
      {status === 'error' ? (
        <p className="px-6 py-10 text-center text-sm text-zinc-600">
          {t('ops.asignaciones.previewFailed')}
        </p>
      ) : null}
      <div ref={stageRef} className={status === 'error' ? 'hidden' : 'min-h-full p-3'} />
    </div>
  );
}
