import { NextResponse } from 'next/server';
import { requirePortalAccess } from '@/lib/ops/auth';
import { getAcceptanceStatus } from '@/lib/ops/legal/acceptances';
import { buildQuoteDocumentHtml } from '@/lib/ops/quote-preview';
import { getT } from '@/i18n/locale';

type RouteContext = { params: Promise<{ slug: string; quoteId: string }> };

const CLIENT_STATUSES = new Set(['sent', 'accepted', 'rejected', 'expired']);

export async function GET(_request: Request, context: RouteContext) {
  const { slug, quoteId } = await context.params;
  const access = await requirePortalAccess(slug);
  const t = await getT();

  if (!access.isStaffPreview) {
    const status = getAcceptanceStatus(access.membership);
    if (!status.complete) {
      return new NextResponse('Acepta los documentos legales para ver este material.', { status: 403 });
    }
  }

  const { data: quote } = await access.supabase
    .from('quotes')
    .select(
      'id, title, scope, service_type, project_state, deliverables, considerations, optional_extras, line_items, phases, total_amount, hourly_rate, currency, valid_until, version, status, created_at, visible_to_client, lead_id, project_id'
    )
    .eq('id', quoteId)
    .eq('project_id', access.project.id)
    .maybeSingle();

  if (!quote) {
    return new NextResponse('Cotización no encontrada', { status: 404 });
  }

  if (!access.isStaffPreview) {
    if (quote.visible_to_client === false || !CLIENT_STATUSES.has(quote.status)) {
      return new NextResponse('Cotización no publicada', { status: 403 });
    }
  }

  let lead = null;
  if (quote.lead_id) {
    const { data } = await access.supabase
      .from('leads')
      .select('company, name, partner_company, end_client_company, end_client_name')
      .eq('id', quote.lead_id)
      .maybeSingle();
    lead = data;
  }

  let organization: { name?: string; contact_email?: string } | null = null;
  if (access.project.organization_id) {
    const { data } = await access.supabase
      .from('organizations')
      .select('name, contact_email')
      .eq('id', access.project.organization_id)
      .maybeSingle();
    organization = data;
  }

  const html = buildQuoteDocumentHtml(
    quote,
    {
      lead,
      project: {
        name: access.project.name,
        organizations: organization,
      },
    },
    t.locale
  );

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'X-Frame-Options': 'SAMEORIGIN',
    },
  });
}
