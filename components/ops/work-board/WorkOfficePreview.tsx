'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@/components/ui/Button';
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
  const viewerRef = useRef<{
    nextSlide: (canvas?: HTMLCanvasElement | null) => Promise<unknown>;
    previousSlide: (canvas?: HTMLCanvasElement | null) => Promise<unknown>;
    getCurrentSlideIndex: () => number;
    getSlideCount: () => number;
    destroy: () => void;
  } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [slide, setSlide] = useState(1);
  const [slideCount, setSlideCount] = useState(1);
  const kind = workOfficeKind({ file_name: fileName, content_type: contentType });

  useEffect(() => {
    const stage = stageRef.current;
    const root = rootRef.current;
    if (!stage || !kind) {
      setStatus('error');
      return;
    }

    let cancelled = false;
    viewerRef.current = null;
    canvasRef.current = null;
    setStatus('loading');
    setSlide(1);
    setSlideCount(1);
    stage.replaceChildren();

    void (async () => {
      try {
        const res = await fetch(href, { cache: 'no-store' });
        if (!res.ok) throw new Error(`fetch ${res.status}`);
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
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
          const { PPTXViewer } = await import('pptxviewjs');
          if (cancelled || !stageRef.current || !PPTXViewer) throw new Error('pptx viewer missing');
          const width = Math.max(320, Math.floor((root?.clientWidth || 960) - 32));
          const height = Math.round((width * 9) / 16);
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          canvas.className = 'mx-auto block max-w-full bg-white shadow';
          stageRef.current.replaceChildren(canvas);
          const viewer = new PPTXViewer({
            canvas,
            slideSizeMode: 'fit',
            backgroundColor: '#ffffff',
          });
          viewerRef.current = viewer;
          canvasRef.current = canvas;
          await viewer.loadFile(buf);
          await viewer.render(canvas);
          if (cancelled) {
            viewer.destroy();
            return;
          }
          const total = Math.max(1, viewer.getSlideCount() || 1);
          setSlideCount(total);
          setSlide(viewer.getCurrentSlideIndex() + 1);
        }
        if (!cancelled) setStatus('ready');
      } catch (err) {
        console.error('work office preview:', err);
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      viewerRef.current?.destroy();
      viewerRef.current = null;
      canvasRef.current = null;
      stage.replaceChildren();
    };
  }, [href, kind]);

  async function goSlide(dir: -1 | 1) {
    const viewer = viewerRef.current;
    const canvas = canvasRef.current;
    if (!viewer || !canvas) return;
    try {
      if (dir > 0) await viewer.nextSlide(canvas);
      else await viewer.previousSlide(canvas);
      const current = viewer.getCurrentSlideIndex();
      setSlide(Math.min(slideCount, Math.max(1, current + 1)));
    } catch (err) {
      console.error('work office preview slide:', err);
    }
  }

  if (!kind) {
    return (
      <p className="m-auto max-w-md px-6 py-10 text-center text-sm text-zinc-600">
        {t('ops.asignaciones.previewUnavailable')}
      </p>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-zinc-200">
      <div ref={rootRef} className="relative min-h-0 flex-1 overflow-auto">
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
      {kind === 'pptx' && status === 'ready' && slideCount > 1 ? (
        <div className="flex items-center justify-between gap-2 border-t border-zinc-200 bg-white px-4 py-2">
          <Button type="button" size="xs" variant="secondary" disabled={slide <= 1} onClick={() => void goSlide(-1)}>
            {t('ops.asignaciones.previewPrev')}
          </Button>
          <p className="text-xs text-zinc-500">{t('ops.asignaciones.previewCount', { n: slide, total: slideCount })}</p>
          <Button type="button" size="xs" variant="secondary" disabled={slide >= slideCount} onClick={() => void goSlide(1)}>
            {t('ops.asignaciones.previewNext')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
