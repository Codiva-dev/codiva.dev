import Link from 'next/link';
import PortalRenewalNotices from '@/components/ops/PortalRenewalNotices';
import StatusBadge, { projectTone } from '@/components/ops/StatusBadge';
import { requireProjectMember } from '@/lib/ops/auth';
import { getActiveChargeNotices } from '@/lib/ops/charges';
import { labelsFor } from '@/lib/ops/labels';
import { filterProposalCanvases, filterQuoteCanvases, getPortalVisibility, withQuoteNav } from '@/lib/ops/portal-visibility';
import { getT } from '@/i18n/locale';
import type { Translator } from '@/i18n/translate';

function milestoneTone(status: string) {
  const map: Record<string, 'neutral' | 'success' | 'warning' | 'danger' | 'info'> = {
    pending: 'neutral',
    in_progress: 'info',
    completed: 'success',
    blocked: 'danger',
  };
  return map[status] ?? 'neutral';
}

/** Last completed + current + upcoming — the live slice of the plan, not a stale prefix. */
function recentMilestonesForHome<T extends { status: string }>(items: T[], limit = 6): T[] {
  if (items.length <= limit) return items;
  const currentIdx = items.findIndex((m) => m.status !== 'completed');
  if (currentIdx === -1) return items.slice(-limit);
  const start = Math.max(0, currentIdx - 1);
  const end = Math.min(items.length, start + limit);
  return items.slice(Math.max(0, end - limit), end);
}

function quoteCardSubtitle(
  t: Translator,
  formatDate: (date: string | null | undefined) => string,
  quoteStatusLabels: Record<string, string>,
  quote:
    | {
        status: string;
        valid_until: string | null;
      }
    | undefined
) {
  if (!quote) return t('portal.home.quoteNone');
  if (quote.status === 'accepted') return t('portal.home.quoteAccepted');
  if (quote.status === 'rejected') return t('portal.home.quoteRejected');
  if (quote.status === 'expired') return t('portal.home.quoteExpired');
  if (quote.valid_until) return t('portal.home.quoteValidUntil', { date: formatDate(quote.valid_until) });
  if (quote.status === 'sent') return t('portal.home.quotePending');
  return quoteStatusLabels[quote.status] ?? t('portal.home.quoteView');
}

function proposalCardCopy(t: Translator, kinds: string[]) {
  const set = new Set(kinds);
  const hasArch = set.has('architecture');
  const hasProposal = set.has('proposal') || set.has('other');
  const empty = t('portal.home.pendingPublish');
  if (hasArch) return { title: t('portal.home.architecture'), empty };
  if (hasProposal) return { title: t('portal.home.identity'), empty };
  return { title: t('portal.home.proposal'), empty };
}

export default async function PortalHomePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { project, supabase } = await requireProjectMember(slug);
  const visibility = getPortalVisibility(project);
  const t = await getT();
  const {
    PROJECT_STATUS_LABELS,
    MILESTONE_STATUS_LABELS,
    QUOTE_STATUS_LABELS,
    formatCurrency,
    formatDate,
  } = labelsFor(t.locale);

  const [{ data: milestones }, { data: quotes }, { data: canvases }, { data: docs }, { data: orgNda }, { data: charges }] =
    await Promise.all([
    supabase
      .from('milestones')
      .select('id, title, description, status, due_date')
      .eq('project_id', project.id)
      .eq('visible_to_client', true)
      .order('sort_order'),
    visibility.showQuote
      ? supabase
          .from('quotes')
          .select('id, title, total_amount, currency, status, valid_until')
          .eq('project_id', project.id)
          .eq('visible_to_client', true)
          .in('status', ['sent', 'accepted', 'rejected', 'expired'])
          .order('version', { ascending: false })
          .limit(1)
      : Promise.resolve({ data: [] as { id: string; title: string; total_amount: number; currency: string; status: string; valid_until: string | null }[] }),
    supabase
      .from('deliverables')
      .select('id, kind')
      .eq('project_id', project.id)
      .eq('visible_to_client', true)
      .in('kind', ['architecture', 'mvp', 'proposal']),
    supabase
      .from('documents')
      .select('id, type, signed')
      .eq('project_id', project.id)
      .eq('visible_to_client', true)
      .eq('type', 'nda'),
    project.organization_id
      ? supabase
          .from('documents')
          .select('id, type, signed')
          .eq('organization_id', project.organization_id)
          .eq('visible_to_client', true)
          .eq('type', 'nda')
          .eq('signed', true)
          .limit(1)
      : Promise.resolve({ data: [] as { id: string; type: string; signed: boolean }[] }),
    visibility.showCosts
      ? supabase
          .from('project_charges')
          .select('id, kind, title, amount, currency, status, due_date, notice_days, period_label')
          .eq('project_id', project.id)
          .eq('visible_to_client', true)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const nextMilestone = milestones?.find((m) => m.status !== 'completed');
  const recentMilestones = recentMilestonesForHome(milestones ?? []);
  const quote =
    quotes?.find((q) => q.status === 'accepted') ??
    quotes?.find((q) => q.status === 'sent') ??
    quotes?.[0];
  const ndaDocs = [...(docs ?? []), ...(orgNda ?? [])];
  const hasNda = ndaDocs.length > 0;
  const signedNda = ndaDocs.some((d) => d.type === 'nda' && d.signed);
  const proposalCanvases = filterProposalCanvases(canvases ?? []);
  const quoteCanvases = filterQuoteCanvases(canvases ?? [], visibility);
  const navVisibility = withQuoteNav(visibility, quoteCanvases.length > 0);
  const renewalNotices = getActiveChargeNotices(charges ?? []);
  const proposalCopy = proposalCardCopy(t, proposalCanvases.map((c) => c.kind));

  return (
    <div className="space-y-6">
      {visibility.showCosts && <PortalRenewalNotices slug={slug} notices={renewalNotices} />}

      <section className="rounded-2xl border border-zinc-200 bg-white p-6">
        <div className="flex flex-wrap items-center gap-2.5">
          <StatusBadge label={PROJECT_STATUS_LABELS[project.status]} tone={projectTone(project.status)} />
          <span className="text-sm text-zinc-500">{t('portal.home.projectStatus')}</span>
        </div>
        {project.description && (
          <p className="mt-4 text-sm leading-relaxed text-zinc-600 whitespace-pre-line">{project.description}</p>
        )}
        <div className="mt-6">
          <div className="mb-2 flex justify-between text-sm">
            <span className="font-medium">{t('portal.home.progress')}</span>
            <span>{project.progress_percent ?? 0}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full rounded-full bg-codiva-primary transition-all"
              style={{ width: `${project.progress_percent ?? 0}%` }}
            />
          </div>
        </div>
        {nextMilestone && (
          <div className="mt-6 rounded-lg bg-zinc-50 p-4">
            <p className="text-xs font-semibold uppercase text-zinc-500">{t('portal.home.nextMilestone')}</p>
            <p className="mt-1 font-medium">{nextMilestone.title}</p>
            <p className="text-sm text-zinc-500">{formatDate(nextMilestone.due_date)}</p>
          </div>
        )}
      </section>

      <section
        className={`grid gap-3 sm:grid-cols-2 ${
          navVisibility.showQuoteNav && visibility.showCosts
            ? 'lg:grid-cols-3 xl:grid-cols-5'
            : navVisibility.showQuoteNav || visibility.showCosts
              ? 'lg:grid-cols-4'
              : 'lg:grid-cols-3'
        }`}
      >
        <Link
          href={`/p/${slug}/propuesta`}
          className="rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-codiva-primary/40"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{t('portal.home.proposal')}</p>
          <p className="mt-2 font-semibold text-zinc-900">{proposalCopy.title}</p>
          <p className="mt-1 text-sm text-zinc-600">
            {proposalCanvases.length
              ? t('portal.home.materials', { count: proposalCanvases.length })
              : proposalCopy.empty}
          </p>
        </Link>
        {navVisibility.showQuoteNav && (
          <Link
            href={`/p/${slug}/cotizacion`}
            className="rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-codiva-primary/40"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{t('portal.home.quote')}</p>
            <p className="mt-2 font-semibold text-zinc-900">
              {quote
                ? formatCurrency(quote.total_amount, quote.currency)
                : t('portal.home.quoteCommercial')}
            </p>
            <p className="mt-1 text-sm text-zinc-600">
              {quote
                ? quoteCardSubtitle(t, formatDate, QUOTE_STATUS_LABELS, quote)
                : t('portal.home.quoteCanvasHint')}
            </p>
          </Link>
        )}
        {visibility.showCosts && (
          <Link
            href={`/p/${slug}/pagos`}
            className="rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-codiva-primary/40"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{t('portal.home.payments')}</p>
            <p className="mt-2 font-semibold text-zinc-900">{t('portal.home.paymentsTitle')}</p>
            <p className="mt-1 text-sm text-zinc-600">{t('portal.home.paymentsHint')}</p>
          </Link>
        )}
        <Link
          href={`/p/${slug}/sitio`}
          className="rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-codiva-primary/40"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{t('portal.home.site')}</p>
          <p className="mt-2 font-semibold text-zinc-900">
            {project.site_preview_url || project.site_production_url
              ? t('portal.home.siteReady')
              : t('portal.home.sitePending')}
          </p>
          <p className="mt-1 text-sm text-zinc-600">{t('portal.home.siteHint')}</p>
        </Link>
        <Link
          href={`/p/${slug}/documentos`}
          className="rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-codiva-primary/40"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{t('portal.home.docs')}</p>
          <p className="mt-2 font-semibold text-zinc-900">
            {signedNda
              ? t('portal.home.ndaSigned')
              : hasNda
                ? t('portal.home.ndaAvailable')
                : t('portal.home.docsReady')}
          </p>
          <p className="mt-1 text-sm text-zinc-600">{t('portal.home.docsHint')}</p>
        </Link>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="font-semibold">{t('portal.home.recentMilestones')}</h2>
          {recentMilestones.length > 0 && (
            <Link href={`/p/${slug}/timeline`} className="text-sm font-medium text-codiva-primary hover:underline">
              {t('portal.home.viewTimeline')}
            </Link>
          )}
        </div>
        <ul className="space-y-4">
          {recentMilestones.map((m) => (
            <li key={m.id} className="flex items-start justify-between gap-4 text-sm">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-zinc-900">{m.title}</p>
                {m.description ? (
                  <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">{m.description}</p>
                ) : null}
              </div>
              <StatusBadge label={MILESTONE_STATUS_LABELS[m.status]} tone={milestoneTone(m.status)} />
            </li>
          ))}
          {!recentMilestones.length && <p className="text-sm text-zinc-500">{t('portal.home.noMilestones')}</p>}
        </ul>
      </section>
    </div>
  );
}
