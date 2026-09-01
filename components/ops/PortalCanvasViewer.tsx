'use client';

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PreviewPopupLink from '@/components/ops/PreviewPopupLink';

export type PortalCanvasItem = {
  id: string;
  title: string;
  description: string | null;
  kind: string;
  url: string | null;
  file_url: string | null;
  canvasPath?: string | null;
};

type CanvasTab = {
  id: string;
  kind: string;
  title: string;
  description: string | null;
  canvasSrc: string | null;
  pdfSrc: string | null;
  label: string;
};

function resolveSrc(item: PortalCanvasItem): string | null {
  return item.canvasPath || item.url || item.file_url || null;
}

function isCanvasRoute(src: string): boolean {
  return /\/canvas\//.test(src);
}

function isHtml(src: string): boolean {
  return isCanvasRoute(src) || /\.html?(\?|#|$)/i.test(src);
}

function isPdf(src: string): boolean {
  return /\.pdf(\?|#|$)/i.test(src);
}

function canvasPdfSrc(src: string | null): string | null {
  if (!src) return null;
  const pathOnly = src.split('?')[0].split('#')[0].replace(/\/$/, '');
  if (/\/p\/[^/]+\/canvas\/[^/]+$/.test(pathOnly)) return `${pathOnly}/pdf`;
  return null;
}

function isEmbeddable(src: string): boolean {
  return isHtml(src) || isPdf(src) || src.includes('/client-packs/');
}

/** Agrupa HTML (canvas) + PDF del mismo kind; prioriza vista interactiva. */
function buildTabs(items: PortalCanvasItem[], kindLabel: Record<string, string>): CanvasTab[] {
  const byKind = new Map<string, PortalCanvasItem[]>();
  for (const item of items) {
    const list = byKind.get(item.kind) ?? [];
    list.push(item);
    byKind.set(item.kind, list);
  }

  const kindOrder = ['architecture', 'mvp', 'proposal', 'other'];
  const kinds = [...byKind.keys()].sort(
    (a, b) => (kindOrder.indexOf(a) + 99) - (kindOrder.indexOf(b) + 99)
  );

  const tabs: CanvasTab[] = [];
  for (const kind of kinds) {
    const group = byKind.get(kind) ?? [];
    const htmlItems = group.filter((i) => {
      const src = resolveSrc(i);
      return src && isHtml(src);
    });
    const pdfItems = group.filter((i) => {
      const src = resolveSrc(i);
      return src && isPdf(src);
    });
    const otherItems = group.filter((i) => {
      const src = resolveSrc(i);
      return src && !isHtml(src) && !isPdf(src);
    });
    const kindName = kindLabel[kind] ?? kind;

    if (htmlItems.length) {
      const primary = htmlItems[0];
      const canvasSrc = resolveSrc(primary);
      tabs.push({
        id: primary.id,
        kind,
        title: primary.title.replace(/\s*\(PDF\)\s*/i, '').trim() || primary.title,
        description: primary.description,
        canvasSrc,
        pdfSrc: canvasPdfSrc(canvasSrc) ?? (pdfItems[0] ? resolveSrc(pdfItems[0]) : null),
        label: `${kindName}: Canvas`,
      });
      // PDFs sueltos del mismo kind ya van como descarga del canvas
    } else if (pdfItems.length) {
      const primary = pdfItems[0];
      tabs.push({
        id: primary.id,
        kind,
        title: primary.title,
        description: primary.description,
        canvasSrc: resolveSrc(primary),
        pdfSrc: null,
        label: `${kindName}: PDF`,
      });
    }

    for (const item of otherItems) {
      tabs.push({
        id: item.id,
        kind,
        title: item.title,
        description: item.description,
        canvasSrc: resolveSrc(item),
        pdfSrc: null,
        label: `${kindName}: ${item.title}`,
      });
    }

    // Si solo hay PDFs adicionales sin HTML (ya cubierto) o múltiples HTML
    for (const extra of htmlItems.slice(1)) {
      const canvasSrc = resolveSrc(extra);
      tabs.push({
        id: extra.id,
        kind,
        title: extra.title,
        description: extra.description,
        canvasSrc,
        pdfSrc: canvasPdfSrc(canvasSrc),
        label: `${kindName}: ${extra.title}`,
      });
    }
  }

  return tabs;
}

export default function PortalCanvasViewer({ items }: { items: PortalCanvasItem[] }) {
  const { t } = useTranslation();
  const kindLabel = useMemo(
    (): Record<string, string> => ({
      architecture: t('ops.labels.deliverableKind.architecture'),
      mvp: t('ops.labels.deliverableKind.mvp'),
      proposal: t('ops.labels.deliverableKind.proposal'),
      other: t('ops.labels.deliverableKind.other'),
    }),
    [t]
  );
  const tabs = useMemo(() => buildTabs(items, kindLabel), [items, kindLabel]);
  const [activeId, setActiveId] = useState(tabs[0]?.id ?? '');
  const active = useMemo(
    () => tabs.find((tab) => tab.id === activeId) ?? tabs[0],
    [activeId, tabs]
  );
  const src = active?.canvasSrc ?? null;
  const preferHtml = src ? isHtml(src) : false;

  if (!tabs.length) {
    return <p className="text-sm text-zinc-500">{t('portal.proposal.emptyCanvas')}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const selected = tab.id === active?.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveId(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                selected ? 'bg-codiva-primary text-white' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {active && (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100 px-4 py-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                {preferHtml
                  ? t('portal.proposal.interactive')
                  : kindLabel[active.kind] ?? t('portal.proposal.document')}
              </p>
              <h3 className="font-semibold text-zinc-900">{active.title}</h3>
              {active.description && (
                <p className="mt-1 text-sm text-zinc-600">{active.description}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {active.pdfSrc && (
                <a
                  href={active.pdfSrc}
                  download
                  className="shrink-0 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-50"
                >
                  {t('portal.proposal.downloadPdf')}
                </a>
              )}
              {src && (
                <PreviewPopupLink
                  href={src}
                  className="shrink-0 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-50"
                >
                  {t('portal.proposal.fullscreen')}
                </PreviewPopupLink>
              )}
            </div>
          </div>
          {src && isEmbeddable(src) ? (
            <iframe
              title={active.title}
              src={src}
              className={`w-full bg-white ${preferHtml ? 'h-[min(85vh,920px)]' : 'h-[70vh]'}`}
              allow="fullscreen"
              // Scripts for Mermaid; block popups / top navigation so vendor docs can't escape the canvas.
              sandbox={
                preferHtml
                  ? 'allow-scripts allow-same-origin allow-downloads'
                  : 'allow-scripts allow-same-origin allow-downloads allow-popups'
              }
              referrerPolicy="no-referrer"
            />
          ) : src ? (
            <div className="p-6 text-sm text-zinc-600">
              {t('portal.proposal.cannotPreview')}{' '}
              <PreviewPopupLink href={src} className="text-codiva-primary hover:underline">
                {t('portal.proposal.openIt')}
              </PreviewPopupLink>
            </div>
          ) : (
            <div className="p-6 text-sm text-zinc-500">{t('portal.proposal.noFile')}</div>
          )}
        </div>
      )}
    </div>
  );
}
