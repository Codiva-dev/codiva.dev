import Link from 'next/link';
import PortalCanvasViewer from '@/components/ops/PortalCanvasViewer';
import StatusBadge from '@/components/ops/StatusBadge';
import { requireProjectMember } from '@/lib/ops/auth';
import { labelsFor } from '@/lib/ops/labels';
import { getT } from '@/i18n/locale';
import { filterProposalCanvases, getPortalVisibility } from '@/lib/ops/portal-visibility';
import { portalCanvasPath } from '@/lib/ops/architecture';

export default async function PortalProposalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { project, supabase } = await requireProjectMember(slug);
  const t = await getT();
  const { formatCurrency, formatDate, QUOTE_STATUS_LABELS } = labelsFor(t.locale);
  const visibility = getPortalVisibility(project);

  const [{ data: canvases }, { data: quotes }] = await Promise.all([
    supabase
      .from('deliverables')
      .select('id, title, description, kind, url, file_url, sort_order')
      .eq('project_id', project.id)
      .eq('visible_to_client', true)
      .in('kind', ['architecture', 'proposal', 'other'])
      .order('sort_order', { ascending: true }),
    visibility.showQuote
      ? supabase
          .from('quotes')
          .select('id, title, total_amount, currency, status, valid_until, version')
          .eq('project_id', project.id)
          .eq('visible_to_client', true)
          .in('status', ['sent', 'accepted', 'rejected', 'expired'])
          .order('version', { ascending: false })
          .limit(1)
      : Promise.resolve({
          data: [] as {
            id: string;
            title: string;
            total_amount: number;
            currency: string;
            status: string;
            valid_until: string | null;
            version: number;
          }[],
        }),
  ]);

  const quote = quotes?.[0];
  const visibleCanvases = filterProposalCanvases(canvases ?? []);
  const showValidity = Boolean(quote?.valid_until && quote.status !== 'accepted');

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-5 text-lg font-semibold">{t('portal.proposal.title')}</h2>
        <PortalCanvasViewer
          items={visibleCanvases.map((item) => ({
            ...item,
            canvasPath: portalCanvasPath(slug, item.id),
          }))}
        />
      </section>

      {visibility.showQuote && quote && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                {t('portal.proposal.quote')}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-zinc-900">{quote.title}</h3>
                <StatusBadge
                  label={QUOTE_STATUS_LABELS[quote.status] ?? quote.status}
                  tone={quote.status === 'accepted' ? 'success' : 'info'}
                />
              </div>
              <p className="mt-1 text-2xl font-bold text-codiva-primary">
                {formatCurrency(quote.total_amount, quote.currency)}
              </p>
              {showValidity && (
                <p className="text-sm text-zinc-500">
                  {t('portal.proposal.validUntil', { date: formatDate(quote.valid_until) })}
                </p>
              )}
            </div>
            <Link
              href={`/p/${slug}/cotizacion`}
              className="rounded-lg bg-codiva-primary px-4 py-2 text-sm font-semibold text-white"
            >
              {t('portal.proposal.viewFull')}
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
