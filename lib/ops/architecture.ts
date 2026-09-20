import { readFile } from 'fs/promises';
import path from 'path';
import { opsBaseUrl } from '@/lib/ops/host';
import { slugify } from '@/lib/ops/slug';

export const CANVAS_KINDS = ['architecture', 'mvp', 'proposal'] as const;
export type CanvasKind = (typeof CANVAS_KINDS)[number];

export const MAX_ARCHITECTURE_HTML_CHARS = 1_000_000;

const CLIENT_PACK_PREFIX = '/client-packs/';

export function isCanvasKind(kind: string | null | undefined): kind is CanvasKind {
  return CANVAS_KINDS.includes(kind as CanvasKind);
}

export function portalCanvasPath(slug: string, deliverableId: string): string {
  return `/p/${slug}/canvas/${deliverableId}`;
}

export function portalCanvasPdfPath(slug: string, deliverableId: string): string {
  return `${portalCanvasPath(slug, deliverableId)}/pdf`;
}

/** PDF generated from the live canvas HTML (`/p/:slug/canvas/:id/pdf`). */
export function portalCanvasPdfHref(canvasSrc: string | null | undefined): string | null {
  if (!canvasSrc) return null;
  const pathOnly = canvasSrc.split('?')[0].split('#')[0].replace(/\/$/, '');
  if (/\/p\/[^/]+\/canvas\/[^/]+$/.test(pathOnly)) return `${pathOnly}/pdf`;
  return null;
}

export function architecturePdfFilename(title: string): string {
  const base = slugify(title) || 'arquitectura';
  return `${base}.pdf`;
}

export function isClientPackUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  if (!url.startsWith(CLIENT_PACK_PREFIX)) return false;
  if (url.includes('..') || url.includes('\\') || url.includes('\0')) return false;
  return true;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function architectureStarterHtml(title: string): string {
  const safeTitle = escapeHtml(title.trim() || 'Arquitectura');
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle}</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
  <style>
    :root { --ink:#121212; --muted:#555; --line:#ccc; --accent:#203c7f; --bg-soft:#f0f4fc; }
    * { box-sizing: border-box; }
    body {
      margin: 0 auto; padding: 16px 20px 28px;
      font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
      color: var(--ink); font-size: 9.5pt; line-height: 1.4; max-width: 920px;
    }
    h1 { font-size: 16pt; color: var(--accent); margin: 0 0 4px; border-bottom: 2px solid var(--accent); padding-bottom: 4px; }
    h2 { font-size: 11.5pt; color: var(--accent); margin: 14px 0 6px; border-bottom: 1px solid var(--line); padding-bottom: 2px; }
    p, li { margin: 3px 0; }
    .meta { color: var(--muted); font-size: 8.5pt; margin: 0 0 8px; }
    .note { padding: 6px 8px; margin: 6px 0; font-size: 8.5pt; background: #fff8e6; border-left: 3px solid #c9a227; }
    .mermaid { background: #fff; border: 1px solid var(--line); padding: 8px; margin: 8px 0; }
  </style>
</head>
<body>
  <h1>${safeTitle}</h1>
  <p class="meta">Documento de arquitectura · Codiva</p>
  <h2>1. Visión</h2>
  <p>Describe el producto, los usuarios y el resultado esperado.</p>
  <h2>2. Arquitectura</h2>
  <pre class="mermaid">
flowchart LR
  Cliente --> App
  App --> API
  API --> DB
  </pre>
  <div class="note">Este documento se edita en Ops. El cliente lo ve en la pestaña Propuesta cuando está visible.</div>
  <script>
    mermaid.initialize({ startOnLoad: true, theme: 'neutral', securityLevel: 'strict' });
  </script>
</body>
</html>
`;
}

async function readClientPackFromFs(url: string): Promise<string | null> {
  const relative = url.replace(/^\//, '').split('/').filter(Boolean);
  if (relative[0] !== 'client-packs') return null;
  const abs = path.resolve(process.cwd(), 'public', ...relative);
  const root = path.resolve(process.cwd(), 'public', 'client-packs');
  const prefix = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
  if (abs !== root && !abs.startsWith(prefix)) return null;
  try {
    return await readFile(abs, 'utf8');
  } catch {
    return null;
  }
}

async function readClientPackFromOrigin(url: string): Promise<string | null> {
  const base = opsBaseUrl();
  try {
    const res = await fetch(`${base}${url}`, { cache: 'force-cache' });
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('text/html') || url.endsWith('.html') || url.endsWith('.md')) {
      const text = await res.text();
      if (!text.trim()) return null;
      if (text.includes('__missing') && text.length < 2000) return null;
      return text;
    }
    return null;
  } catch {
    return null;
  }
}

/** Carga HTML de un pack estático (fs local / Vercel tracing, o fetch en ops). */
export async function readClientPackHtml(url: string | null | undefined): Promise<string | null> {
  if (!isClientPackUrl(url)) return null;
  const fromFs = await readClientPackFromFs(url);
  if (fromFs) return fromFs;
  return readClientPackFromOrigin(url);
}

export async function resolveArchitectureHtml(deliverable: {
  body_html?: string | null;
  url?: string | null;
  title?: string | null;
}): Promise<{ html: string; source: 'ops' | 'pack' | 'starter' }> {
  const body = deliverable.body_html?.trim();
  if (body) return { html: body, source: 'ops' };
  const fromPack = await readClientPackHtml(deliverable.url);
  if (fromPack) return { html: fromPack, source: 'pack' };
  return { html: architectureStarterHtml(deliverable.title || 'Arquitectura'), source: 'starter' };
}
