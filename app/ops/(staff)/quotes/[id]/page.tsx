import Link from 'next/link';
import { notFound } from 'next/navigation';
import OpsPageHeader from '@/components/ops/OpsPageHeader';
import OpsQuoteEditor from '@/components/ops/OpsQuoteEditor';
import StatusBadge from '@/components/ops/StatusBadge';
import { requireStaff } from '@/lib/ops/auth';
import { can } from '@/lib/ops/permissions';
import { updateQuote } from '@/lib/ops/actions';
import { buildQuoteDocumentHtml } from '@/lib/ops/quote-preview';
import { parseLineItemsJson, parsePhasesJson } from '@/lib/ops/quote-document';
import { applyQuoteHourlyRate, inferredQuoteHourlyRate, parseHourlyRate } from '@/lib/ops/quote-rate';
import { labelsFor } from '@/lib/ops/labels';
import { getT } from '@/i18n/locale';
import { staffPortalPreviewPath } from '@/lib/ops/host';

export default async function QuoteEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, staff } = await requireStaff();
  const t = await getT();
  const { QUOTE_STATUS_LABELS } = labelsFor(t.locale);

  if (!can(staff, 'quotes')) notFound();

  const { data: quote } = await supabase.from('quotes').select('*').eq('id', id).single();
  if (!quote) notFound();

  let backHref = '/leads';
  let backLabel = t('ops.quotePage.backLeads');
  let lead = null;
  let project = null;
  let projectSlug: string | null = null;

  if (quote.lead_id) {
    const { data } = await supabase.from('leads').select('*').eq('id', quote.lead_id).single();
    lead = data;
    backHref = `/leads/${quote.lead_id}?tab=cotizaciones`;
    backLabel = t('ops.quotePage.backLead');
  } else if (quote.project_id) {
    const { data } = await supabase
      .from('projects')
      .select('id, name, slug, organizations(name, contact_email)')
      .eq('id', quote.project_id)
      .single();
    if (data) {
      const org = data.organizations as
        | { name?: string; contact_email?: string }
        | { name?: string; contact_email?: string }[]
        | null;
      projectSlug = data.slug;
      project = {
        name: data.name,
        organizations: Array.isArray(org) ? org[0] ?? null : org,
      };
      backHref = `/projects/${projectSlug}?tab=cotizaciones`;
      backLabel = t('ops.quotePage.backProject');
    }
  }

  const html = buildQuoteDocumentHtml(quote, { lead, project }, t.locale);
  const isDraft = quote.status === 'draft';
  const lineItems = parseLineItemsJson(quote.line_items);
  const hourlyRate = parseHourlyRate(quote.hourly_rate) ?? inferredQuoteHourlyRate(lineItems);
  const priced = applyQuoteHourlyRate({
    items: lineItems,
    phases: parsePhasesJson(quote.phases),
    rate: hourlyRate,
    previousRate: inferredQuoteHourlyRate(lineItems),
    fallbackTotal: quote.total_amount != null ? Number(quote.total_amount) : null,
  });

  return (
    <div className="space-y-6">
      <OpsPageHeader
        title={quote.title}
        description={t('ops.quotePage.versionClient', { version: quote.version })}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              label={QUOTE_STATUS_LABELS[quote.status] || quote.status}
              tone={quote.status === 'accepted' ? 'success' : isDraft ? 'warning' : 'info'}
            />
            <Link
              href={backHref}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50"
            >
              {backLabel}
            </Link>
            {projectSlug && (
              <Link
                href={staffPortalPreviewPath(projectSlug, '/cotizacion')}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50"
              >
                {t('ops.quotePage.viewAsClient')}
              </Link>
            )}
          </div>
        }
      />

      <OpsQuoteEditor
        values={{
          title: quote.title,
          serviceType: quote.service_type || 'Web',
          projectState: quote.project_state || '',
          scope: quote.scope || '',
          deliverables: quote.deliverables || '',
          considerations: quote.considerations || '',
          optionalExtras: quote.optional_extras || '',
          lineItems: priced.items,
          phases: priced.phases,
          hourlyRate,
          totalAmount: priced.total,
          currency: quote.currency || 'MXN',
          validUntil: quote.valid_until,
          status: quote.status,
        }}
        action={async (formData) => {
          'use server';
          await updateQuote(id, formData);
        }}
      />

      <div>
        <p className="mb-2 text-sm font-medium text-zinc-700">{t('ops.quotePage.clientDoc')}</p>
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
          <iframe
            title={t('ops.quotePage.iframeTitle')}
            srcDoc={html}
            className="h-[min(80vh,900px)] w-full border-0"
            sandbox="allow-same-origin"
          />
        </div>
      </div>
    </div>
  );
}
