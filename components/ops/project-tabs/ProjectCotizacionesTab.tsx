import Link from 'next/link';
import OpsQuoteForm from '@/components/ops/OpsQuoteForm';
import PreviewPopupLink from '@/components/ops/PreviewPopupLink';
import StatusBadge from '@/components/ops/StatusBadge';
import ToastForm from '@/components/ops/ToastForm';
import { getT } from '@/i18n/locale';
import { createQuote, deleteDraftQuote, sendQuote, setQuoteVisibility } from '@/lib/ops/actions';
import { labelsFor } from '@/lib/ops/labels';
import type { QuoteRow } from './types';

export default async function ProjectCotizacionesTab({
  projectId,
  projectName,
  portalShowQuote,
  quotes,
}: {
  projectId: string;
  projectName: string;
  portalShowQuote: boolean;
  quotes: QuoteRow[];
}) {
  const t = await getT();
  const { QUOTE_STATUS_LABELS, formatCurrency } = labelsFor(t.locale);

  async function onCreateQuote(formData: FormData) {
    'use server';
    await createQuote(projectId, formData);
  }

  return (
    <div className="space-y-6">
      <OpsQuoteForm
        title={t('ops.project.newQuote')}
        defaultTitle={t('ops.project.proposalTitle', { name: projectName })}
        action={onCreateQuote}
      />
      {quotes.map((q) => (
        <QuoteCard
          key={q.id}
          quote={q}
          projectId={projectId}
          portalShowQuote={portalShowQuote}
          labels={QUOTE_STATUS_LABELS}
          formatCurrency={formatCurrency}
        />
      ))}
    </div>
  );
}

async function QuoteCard({
  quote,
  projectId,
  portalShowQuote,
  labels,
  formatCurrency,
}: {
  quote: QuoteRow;
  projectId: string;
  portalShowQuote: boolean;
  labels: Record<string, string>;
  formatCurrency: (amount: number | null | undefined, currency?: string) => string;
}) {
  const t = await getT();
  const quoteId = quote.id;
  const showInPortal = quote.visible_to_client === false;

  async function onSendQuote() {
    'use server';
    await sendQuote(quoteId, projectId);
  }

  async function onToggleVisibility() {
    'use server';
    await setQuoteVisibility(projectId, quoteId, showInPortal);
  }

  async function onDeleteDraft() {
    'use server';
    await deleteDraftQuote(quoteId);
  }

  return (
    <article className="rounded-xl border border-zinc-200 bg-white p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">{quote.title} · v{quote.version}</h3>
        <StatusBadge label={labels[quote.status]} tone={quote.status === 'accepted' ? 'success' : 'info'} />
      </div>
      <p className="text-sm text-zinc-600 whitespace-pre-wrap">{quote.scope}</p>
      <p className="mt-2 text-sm font-medium">
        {formatCurrency(quote.total_amount, quote.currency)}
        {quote.hourly_rate != null && Number.isFinite(Number(quote.hourly_rate)) ? (
          <span className="font-normal text-zinc-500">
            {' '}
            · {t('ops.project.hourlyRateValue', { amount: formatCurrency(Number(quote.hourly_rate), quote.currency) })}
          </span>
        ) : null}
      </p>
      <p className="mt-2 text-xs text-zinc-500">
        {t('ops.project.portal')}{' '}
        {quote.visible_to_client !== false ? t('ops.project.visibleClient') : t('ops.project.hiddenClient')}
        {!portalShowQuote ? t('ops.project.quoteModuleOff') : ''}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={`/quotes/${quote.id}`}
          className="rounded-lg bg-codiva-primary px-3 py-1.5 text-sm font-medium text-white"
        >
          {t('ops.project.editInOps')}
        </Link>
        <PreviewPopupLink
          href={`/quotes/${quote.id}/preview`}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-50"
        >
          {t('ops.project.preview')}
        </PreviewPopupLink>
        {quote.status === 'draft' && (
          <ToastForm success={t('ops.project.quoteSent')} action={onSendQuote}>
            <button type="submit" className="rounded-lg bg-codiva-primary px-3 py-1.5 text-sm text-white">
              {t('ops.project.sendQuote')}
            </button>
          </ToastForm>
        )}
        <ToastForm success={t('ops.project.visibilityUpdated')} action={onToggleVisibility}>
          <button type="submit" className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50">
            {quote.visible_to_client === false ? t('ops.project.showInPortal') : t('ops.project.hideInPortal')}
          </button>
        </ToastForm>
        {quote.status === 'draft' && (
          <ToastForm
            success={t('ops.quoteEditor.deleted')}
            confirmTitle={t('ops.quoteEditor.deleteConfirmTitle')}
            confirmMessage={t('ops.quoteEditor.deleteConfirm')}
            confirmLabel={t('ops.quoteEditor.delete')}
            confirmTone="danger"
            action={onDeleteDraft}
          >
            <button type="submit" className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50">
              {t('ops.quoteEditor.delete')}
            </button>
          </ToastForm>
        )}
      </div>
    </article>
  );
}
