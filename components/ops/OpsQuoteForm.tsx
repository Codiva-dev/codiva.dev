import { DEFAULT_PROJECT_STATE } from '@/lib/ops/labels';
import ToastForm from '@/components/ops/ToastForm';
import { getT } from '@/i18n/locale';
import { DEFAULT_HOURLY_RATE, DEFAULT_RATE_LABEL } from '@/lib/ops/quote-rate';

export const DEFAULT_QUOTE_LINE_ITEMS = JSON.stringify(
  [
    {
      title: 'Desarrollo Frontend',
      detail: 'ReactJS, TailwindCSS',
      hours: 96,
      rate: DEFAULT_HOURLY_RATE,
      rateLabel: DEFAULT_RATE_LABEL,
      total: 96 * DEFAULT_HOURLY_RATE,
    },
  ],
  null,
  2
);

type OpsQuoteFormProps = {
  action: (formData: FormData) => Promise<void>;
  title: string;
  heading?: string;
  defaultTitle?: string;
  submitLabel?: string;
};

export default async function OpsQuoteForm({
  action,
  title,
  heading,
  defaultTitle,
  submitLabel,
}: OpsQuoteFormProps) {
  const t = await getT();
  return (
    <ToastForm success={t('ops.quoteForm.created')} action={action} className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5">
      <h3 className="font-semibold">{heading || title}</h3>
      <div className="grid gap-3 md:grid-cols-2">
        <input
          name="title"
          defaultValue={defaultTitle ?? t('ops.quoteForm.defaultTitle')}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm md:col-span-2"
        />
        <select name="serviceType" className="rounded-lg border border-zinc-300 px-3 py-2 text-sm">
          <option value="PWA">PWA</option>
          <option value="Web">Web</option>
          <option value="App">App</option>
          <option value="Platform">{t('ops.quoteEditor.platform')}</option>
          <option value="E-Shop">E-Shop</option>
          <option value="LMS">LMS</option>
          <option value="Pentesting">Pentesting</option>
        </select>
        <input
          name="projectState"
          defaultValue={DEFAULT_PROJECT_STATE}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
      </div>
      <textarea
        name="scope"
        placeholder={t('ops.quoteEditor.scope')}
        rows={5}
        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
      />
      <textarea
        name="deliverables"
        placeholder={t('ops.quoteEditor.deliverables')}
        rows={4}
        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
      />
      <textarea
        name="considerations"
        placeholder={t('ops.quoteEditor.considerations')}
        rows={3}
        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
      />
      <textarea
        name="optionalExtras"
        placeholder={t('ops.quoteEditor.extras')}
        rows={3}
        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
      />
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-500">{t('ops.quoteLines.hourlyRate')}</label>
        <input
          name="hourlyRate"
          type="number"
          min={0}
          step="0.01"
          defaultValue={DEFAULT_HOURLY_RATE}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-zinc-500">{t('ops.quoteLines.hourlyRateHint')}</p>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-500">{t('ops.quoteForm.lineItemsJson')}</label>
        <textarea
          name="lineItems"
          defaultValue={DEFAULT_QUOTE_LINE_ITEMS}
          rows={6}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-xs"
        />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <input
          name="totalAmount"
          type="number"
          step="0.01"
          placeholder={t('ops.quoteEditor.total')}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
        <select name="currency" defaultValue="MXN" className="rounded-lg border border-zinc-300 px-3 py-2 text-sm">
          <option value="MXN">MXN</option>
          <option value="USD">USD</option>
        </select>
        <input name="validUntil" type="date" className="rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
      </div>
      <button type="submit" className="rounded-lg bg-codiva-primary px-4 py-2 text-sm text-white">
        {submitLabel ?? t('ops.quoteForm.createDraft')}
      </button>
    </ToastForm>
  );
}
