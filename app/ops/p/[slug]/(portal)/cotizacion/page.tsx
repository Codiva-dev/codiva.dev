import Link from 'next/link';
import PreviewPopupLink from '@/components/ops/PreviewPopupLink';
import ToastForm from '@/components/ops/ToastForm';
import PortalCanvasViewer from '@/components/ops/PortalCanvasViewer';
import { redirect } from 'next/navigation';
import StatusBadge from '@/components/ops/StatusBadge';
import { requireProjectMember } from '@/lib/ops/auth';
import { clientAcceptQuote, clientRejectQuote } from '@/lib/ops/actions';
import { labelsFor } from '@/lib/ops/labels';
import { getT } from '@/i18n/locale';
import { filterQuoteCanvases, getPortalVisibility } from '@/lib/ops/portal-visibility';
import { portalCanvasPath } from '@/lib/ops/architecture';
import { buildQuoteDocumentHtml } from '@/lib/ops/quote-preview';
import { portalQuoteDocumentPath } from '@/lib/ops/quotes';

export default async function PortalQuotePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { slug } = await params;
  const { q: quoteParam } = await searchParams;
  const { project, supabase } = await requireProjectMember(slug);
  const t = await getT();
  const { QUOTE_STATUS_LABELS, formatCurrency } = labelsFor(t.locale);
  const visibility = getPortalVisibility(project);

  const { data: canvases } = await supabase
    .from('deliverables')
    .select('id, title, description, kind, url, file_url, sort_order')
    .eq('project_id', project.id)
    .eq('visible_to_client', true)
    .eq('kind', 'mvp')
    .order('sort_order', { ascending: true });

  const quoteCanvases = filterQuoteCanvases(canvases ?? [], visibility);

  if (!visibility.showQuote && quoteCanvases.length === 0) {
    redirect(`/p/${slug}`);
  }

  const { data: quotes } = await (visibility.showQuote
    ? supabase
        .from('quotes')
        .select(
          'id, title, scope, service_type, project_state, deliverables, considerations, optional_extras, line_items, phases, total_amount, hourly_rate, currency, valid_until, version, status, created_at, visible_to_client, lead_id, project_id'
        )
        .eq('project_id', project.id)
        .eq('visible_to_client', true)
        .in('status', ['sent', 'accepted', 'rejected', 'expired'])
        .order('version', { ascending: false })
    : Promise.resolve({ data: [] as never[] }));

  const list = quotes ?? [];
  const preferred =
    list.find((item) => item.id === quoteParam) ??
    list.find((item) => item.status === 'accepted') ??
    list.find((item) => item.status === 'sent') ??
    list[0];

  let organization: { name?: string; contact_email?: string } | null = null;
  if (preferred && project.organization_id) {
    const { data } = await supabase
      .from('organizations')
      .select('name, contact_email')
      .eq('id', project.organization_id)
      .maybeSingle();
    organization = data;
  }

  let lead = null;
  if (preferred?.lead_id) {
    const { data } = await supabase
      .from('leads')
      .select('company, name, partner_company, end_client_company, end_client_name')
      .eq('id', preferred.lead_id)
      .maybeSingle();
    lead = data;
  }

  const quoteHtml = preferred
    ? buildQuoteDocumentHtml(
        preferred,
        {
          lead,
          project: {
            name: project.name,
            organizations: organization,
          },
        },
        t.locale
      )
    : null;

  async function onAccept(formData: FormData) {
    'use server';
    const quoteId = String(formData.get('quoteId'));
    await clientAcceptQuote(quoteId, project.id);
  }

  async function onReject(formData: FormData) {
    'use server';
    const quoteId = String(formData.get('quoteId'));
    await clientRejectQuote(quoteId, project.id);
  }

  if (!preferred && quoteCanvases.length === 0) {
    return <p className="text-sm text-zinc-500">{t('portal.quote.empty')}</p>;
  }

  const src = preferred ? portalQuoteDocumentPath(slug, preferred.id) : null;

  return (
    <div className="space-y-8">
      <p className="text-sm text-zinc-600">
        {t('portal.quote.introPrefix')}{' '}
        <Link href={`/p/${slug}/propuesta`} className="text-codiva-primary hover:underline">
          {t('portal.quote.proposalLink')}
        </Link>
        {visibility.showCosts ? (
          <>
            {t('portal.quote.introCosts')}{' '}
            <Link href={`/p/${slug}/pagos`} className="text-codiva-primary hover:underline">
              {t('portal.quote.paymentsLink')}
            </Link>
          </>
        ) : null}
        .
      </p>

      {quoteCanvases.length > 0 && (
        <PortalCanvasViewer
          items={quoteCanvases.map((item) => ({
            ...item,
            canvasPath: portalCanvasPath(slug, item.id),
          }))}
        />
      )}

      {list.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {list.map((item) => {
            const selected = item.id === preferred?.id;
            return (
              <Link
                key={item.id}
                href={`/p/${slug}/cotizacion?q=${item.id}`}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  selected ? 'bg-codiva-primary text-white' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                }`}
              >
                {item.title} · v{item.version}
              </Link>
            );
          })}
        </div>
      )}

      {preferred && src && (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100 px-4 py-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                {t('portal.quote.interactive')}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <h2 className="font-semibold text-zinc-900">{preferred.title}</h2>
                <StatusBadge
                  label={QUOTE_STATUS_LABELS[preferred.status]}
                  tone={
                    preferred.status === 'accepted'
                      ? 'success'
                      : preferred.status === 'rejected'
                        ? 'danger'
                        : 'info'
                  }
                />
              </div>
              <p className="mt-1 text-sm font-medium text-codiva-primary">
                {formatCurrency(preferred.total_amount, preferred.currency)}
              </p>
            </div>
            <PreviewPopupLink
              href={src}
              className="shrink-0 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-50"
            >
              {t('portal.quote.fullscreen')}
            </PreviewPopupLink>
          </div>
          <iframe
            title={preferred.title}
            srcDoc={quoteHtml ?? undefined}
            className="h-[min(85vh,920px)] w-full bg-white"
            sandbox="allow-same-origin allow-downloads"
          />
        </div>
      )}

      {preferred?.status === 'sent' && (
        <div className="flex flex-wrap gap-3">
          <ToastForm success={t('portal.quote.accepted')} action={onAccept}>
            <input type="hidden" name="quoteId" value={preferred.id} />
            <button
              type="submit"
              className="rounded-lg bg-codiva-primary px-4 py-2 text-sm font-semibold text-white"
            >
              {t('portal.quote.accept')}
            </button>
          </ToastForm>
          <ToastForm success={t('portal.quote.rejected')} action={onReject}>
            <input type="hidden" name="quoteId" value={preferred.id} />
            <button type="submit" className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium">
              {t('portal.quote.reject')}
            </button>
          </ToastForm>
        </div>
      )}
    </div>
  );
}
