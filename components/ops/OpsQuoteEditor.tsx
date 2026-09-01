import ToastForm from '@/components/ops/ToastForm';
import OpsQuoteLineItems from '@/components/ops/OpsQuoteLineItems';
import OpsQuotePhases from '@/components/ops/OpsQuotePhases';
import { DEFAULT_PROJECT_STATE } from '@/lib/ops/labels';
import type { QuoteLineItem, QuotePhase } from '@/lib/ops/quote-document';
import { getT } from '@/i18n/locale';

const SERVICE_TYPES = ['PWA', 'Web', 'App', 'Platform', 'E-Shop', 'LMS', 'Pentesting'];

export default async function OpsQuoteEditor({
  action,
  submitLabel,
  values,
}: {
  action: (formData: FormData) => Promise<void>;
  submitLabel?: string;
  values: {
    title: string;
    serviceType: string;
    projectState: string;
    scope: string;
    deliverables: string;
    considerations: string;
    optionalExtras: string;
    lineItems: QuoteLineItem[];
    phases: QuotePhase[];
    hourlyRate: number | null;
    totalAmount: number | null;
    currency: string;
    validUntil: string | null;
    status?: string;
  };
}) {
  const t = await getT();
  return (
    <ToastForm success={t('ops.quoteEditor.saved')} action={action} className="space-y-4">
      {values.status && values.status !== 'draft' && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {values.status === 'accepted' ? t('ops.quoteEditor.alreadyAccepted') : t('ops.quoteEditor.alreadySent')}
        </p>
      )}
      <div className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-5 md:grid-cols-2">
        <input
          name="title"
          required
          defaultValue={values.title}
          placeholder={t('ops.quoteEditor.title')}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm md:col-span-2"
        />
        <select
          name="serviceType"
          defaultValue={values.serviceType || 'Web'}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        >
          {SERVICE_TYPES.map((type) => (
            <option key={type} value={type}>
              {type === 'Platform' ? t('ops.quoteEditor.platform') : type}
            </option>
          ))}
        </select>
        <input
          name="projectState"
          defaultValue={values.projectState || DEFAULT_PROJECT_STATE}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
        <textarea
          name="scope"
          defaultValue={values.scope}
          placeholder={t('ops.quoteEditor.scope')}
          rows={5}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm md:col-span-2"
        />
        <textarea
          name="deliverables"
          defaultValue={values.deliverables}
          placeholder={t('ops.quoteEditor.deliverables')}
          rows={4}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm md:col-span-2"
        />
        <textarea
          name="considerations"
          defaultValue={values.considerations}
          placeholder={t('ops.quoteEditor.considerations')}
          rows={3}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm md:col-span-2"
        />
        <textarea
          name="optionalExtras"
          defaultValue={values.optionalExtras}
          placeholder={t('ops.quoteEditor.extras')}
          rows={3}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm md:col-span-2"
        />
        <div className="md:col-span-2">
          <OpsQuoteLineItems
            initialItems={values.lineItems}
            initialHourlyRate={values.hourlyRate}
            initialTotal={values.totalAmount}
          />
        </div>
        <div className="md:col-span-2">
          <OpsQuotePhases initialPhases={values.phases} />
        </div>
        <select
          name="currency"
          defaultValue={values.currency || 'MXN'}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        >
          <option value="MXN">MXN</option>
          <option value="USD">USD</option>
        </select>
        <input
          name="validUntil"
          type="date"
          defaultValue={values.validUntil ?? ''}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
      </div>
      <button type="submit" className="rounded-lg bg-codiva-primary px-4 py-2 text-sm font-semibold text-white">
        {submitLabel ?? t('ops.quoteEditor.save')}
      </button>
    </ToastForm>
  );
}
