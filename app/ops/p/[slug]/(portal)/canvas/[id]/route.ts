import { NextResponse } from 'next/server';
import { requirePortalAccess } from '@/lib/ops/auth';
import { getAcceptanceStatus } from '@/lib/ops/legal/acceptances';
import { resolveArchitectureHtml } from '@/lib/ops/architecture';

type RouteContext = { params: Promise<{ slug: string; id: string }> };

const EMBED_HTML_HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'private, no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'SAMEORIGIN',
  'Content-Security-Policy':
    "default-src 'none'; script-src 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'unsafe-inline'; img-src data: https:; connect-src https://cdn.jsdelivr.net; frame-ancestors 'self'",
} as const;

export async function GET(_request: Request, context: RouteContext) {
  const { slug, id } = await context.params;
  const access = await requirePortalAccess(slug);

  if (!access.isStaffPreview) {
    const status = getAcceptanceStatus(access.membership);
    if (!status.complete) {
      return new NextResponse('Acepta los documentos legales para ver este material.', { status: 403 });
    }
  }

  const { data: deliverable } = await access.supabase
    .from('deliverables')
    .select('id, title, kind, url, file_url, file_path, body_html, visible_to_client, project_id')
    .eq('id', id)
    .eq('project_id', access.project.id)
    .maybeSingle();

  if (!deliverable) {
    return new NextResponse('Canvas no encontrado', { status: 404 });
  }

  if (!access.isStaffPreview && !deliverable.visible_to_client) {
    return new NextResponse('Canvas no publicado', { status: 403 });
  }

  // Always serve HTML with embed-friendly headers.
  // Never redirect to /client-packs/*: static packs use frame-ancestors 'none'
  // and break the portal/ops iframe ("refused to connect").
  const { html } = await resolveArchitectureHtml(deliverable);
  return new NextResponse(html, {
    status: 200,
    headers: EMBED_HTML_HEADERS,
  });
}
