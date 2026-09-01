import Link from 'next/link';
import { redirect } from 'next/navigation';
import OpsPageHeader from '@/components/ops/OpsPageHeader';
import CopyableUrl from '@/components/ops/CopyableUrl';
import PreviewPopupLink from '@/components/ops/PreviewPopupLink';
import ToastForm from '@/components/ops/ToastForm';
import StatusBadge, { leadTone } from '@/components/ops/StatusBadge';
import { requireCapability } from '@/lib/ops/auth';
import { can } from '@/lib/ops/permissions';
import { opsProjectPath } from '@/lib/ops/project-path';
import {
  updateLeadStatus,
  updateLeadDetails,
  convertLeadToProject,
  createLeadQuote,
  sendLeadQuote,
} from '@/lib/ops/actions';
import { labelsFor } from '@/lib/ops/labels';
import { getT } from '@/i18n/locale';
import { publicQuoteUrl } from '@/lib/ops/quote-tokens';
import { createAdminClient } from '@/lib/supabase/admin';
import OpsQuoteForm from '@/components/ops/OpsQuoteForm';

export default async function LeadDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab = 'resumen' } = await searchParams;
  const { supabase, staff } = await requireCapability('leads');
  const canQuotes = can(staff, 'quotes');
  const t = await getT();
  const { LEAD_STATUS_LABELS, LEAD_SOURCE_LABELS, QUOTE_STATUS_LABELS, formatDate, formatCurrency, EMPTY_LABEL } =
    labelsFor(t.locale);

  const { data: lead } = await supabase.from('leads').select('*').eq('id', id).single();
  if (!lead) redirect('/leads');

  let convertedSlug: string | null = null;
  if (lead.converted_project_id) {
    const { data: converted } = await supabase
      .from('projects')
      .select('slug')
      .eq('id', lead.converted_project_id)
      .maybeSingle();
    convertedSlug = converted?.slug ?? null;
  }

  const { data: staffList } = await supabase
    .from('staff_profiles')
    .select('id, full_name')
    .eq('active', true)
    .order('full_name');

  const { data: quotes } = canQuotes
    ? await supabase
        .from('quotes')
        .select('id, title, version, status, total_amount, currency, sent_at, created_at')
        .eq('lead_id', id)
        .order('version', { ascending: false })
    : { data: [] as never[] };

  const admin = createAdminClient();
  const publicLinks: Record<string, string> = {};
  if (canQuotes) {
    for (const q of quotes ?? []) {
      if (q.status === 'sent' || q.status === 'accepted' || q.status === 'rejected') {
        const { data: tokenRow } = await admin
          .from('quote_access_tokens')
          .select('token')
          .eq('quote_id', q.id)
          .is('revoked_at', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (tokenRow?.token) publicLinks[q.id] = publicQuoteUrl(tokenRow.token);
      }
    }
  }

  const activeTab = tab === 'cotizaciones' && canQuotes ? 'cotizaciones' : 'resumen';
  const tabs = [
    { key: 'resumen', labelKey: 'ops.leadDetail.tabResumen' },
    ...(canQuotes ? [{ key: 'cotizaciones', labelKey: 'ops.leadDetail.tabQuotes' }] : []),
  ];
  const convertedMsg = t('ops.leadDetail.converted');

  async function onStatus(formData: FormData) {
    'use server';
    await updateLeadStatus(id, String(formData.get('status')));
  }

  async function onUpdateDetails(formData: FormData) {
    'use server';
    await updateLeadDetails(id, formData);
  }

  async function onConvert() {
    'use server';
    const result = await convertLeadToProject(id);
    const { redirectWithToast } = await import('@/lib/ops/toast');
    redirectWithToast(opsProjectPath(result.slug), convertedMsg);
  }

  const displayTitle =
    lead.end_client_company || lead.partner_company || lead.company || lead.name;

  return (
    <div>
      <OpsPageHeader
        title={displayTitle}
        description={`${LEAD_SOURCE_LABELS[lead.source] || lead.source}${lead.partner_company ? t('ops.leadDetail.via', { company: lead.partner_company }) : ''}`}
        actions={
          lead.status !== 'converted' ? (
            <ToastForm success={t('ops.leadDetail.convertToast')} action={onConvert}>
              <button type="submit" className="rounded-lg bg-codiva-primary px-4 py-2 text-sm font-semibold text-white">
                {t('ops.leadDetail.convert')}
              </button>
            </ToastForm>
          ) : lead.converted_project_id ? (
            <Link
              href={opsProjectPath(convertedSlug ?? lead.converted_project_id)}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium"
            >
              {t('ops.leadDetail.viewProject')}
            </Link>
          ) : null
        }
      />

      <div className="mb-6 flex items-center gap-3">
        <StatusBadge label={LEAD_STATUS_LABELS[lead.status]} tone={leadTone(lead.status)} />
        <span className="text-sm text-zinc-500">{formatDate(lead.created_at)}</span>
      </div>

      <nav className="mb-8 flex flex-wrap gap-2 border-b border-zinc-200 pb-3">
        {tabs.map((tabItem) => (
          <Link
            key={tabItem.key}
            href={`/leads/${id}?tab=${tabItem.key}`}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              activeTab === tabItem.key ? 'bg-codiva-primary text-white' : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            {t(tabItem.labelKey)}
          </Link>
        ))}
      </nav>

      {activeTab === 'resumen' && (
        <div className="space-y-8">
          <ToastForm success={t('ops.leadDetail.saved')} action={onStatus} className="flex items-end gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">{t('ops.leadDetail.status')}</label>
              <select name="status" defaultValue={lead.status} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm">
                {Object.entries(LEAD_STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <button type="submit" className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50">
              {t('ops.leadDetail.updateStatus')}
            </button>
          </ToastForm>

          <ToastForm success={t('ops.leadDetail.saved')} action={onUpdateDetails} className="max-w-3xl space-y-6 rounded-xl border border-zinc-200 bg-white p-5">
            <h2 className="font-semibold">{t('ops.leadDetail.dataTitle')}</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <input name="name" defaultValue={lead.name} placeholder={t('ops.leadDetail.contactName')} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
              <input name="company" defaultValue={lead.company} placeholder={t('ops.leadDetail.company')} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
              <input name="email" type="email" defaultValue={lead.email} placeholder={t('ops.leadDetail.email')} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
              <input name="phone" defaultValue={lead.phone ?? ''} placeholder={t('ops.leadDetail.phone')} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium">{t('ops.leadDetail.assignedTo')}</label>
                <select name="assignedTo" defaultValue={lead.assigned_to ?? ''} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm">
                  <option value="">{t('ops.leadDetail.unassigned')}</option>
                  {(staffList ?? []).map((s) => (
                    <option key={s.id} value={s.id}>{s.full_name || s.id.slice(0, 8)}</option>
                  ))}
                </select>
              </div>
            </div>
            <textarea name="need" rows={4} defaultValue={lead.need ?? ''} placeholder={t('ops.leadDetail.need')} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />

            <div className="border-t border-zinc-100 pt-5">
              <h3 className="mb-3 font-semibold">{t('ops.leadDetail.partner')}</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <input name="partnerName" defaultValue={lead.partner_name ?? ''} placeholder={t('ops.leadDetail.partnerName')} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
                <input name="partnerCompany" defaultValue={lead.partner_company ?? ''} placeholder={t('ops.leadDetail.partnerCompany')} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
                <input name="partnerEmail" type="email" defaultValue={lead.partner_email ?? ''} placeholder={t('ops.leadDetail.partnerEmail')} className="md:col-span-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
              </div>
            </div>

            <div className="border-t border-zinc-100 pt-5">
              <h3 className="mb-3 font-semibold">{t('ops.leadDetail.endClient')}</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <input name="endClientName" defaultValue={lead.end_client_name ?? ''} placeholder={t('ops.leadDetail.endClientName')} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
                <input name="endClientCompany" defaultValue={lead.end_client_company ?? ''} placeholder={t('ops.leadDetail.endClientCompany')} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
              </div>
            </div>

            <button type="submit" className="rounded-lg bg-codiva-primary px-4 py-2 text-sm font-semibold text-white">
              {t('ops.leadDetail.save')}
            </button>
          </ToastForm>

          <div className="grid gap-6 md:grid-cols-2">
            <section className="rounded-xl border border-zinc-200 bg-white p-5">
              <h2 className="mb-4 font-semibold">{t('ops.leadDetail.commercial')}</h2>
              <dl className="space-y-2 text-sm">
                <div><dt className="text-zinc-500">{t('ops.leadDetail.budget')}</dt><dd>{formatCurrency(lead.budget)}</dd></div>
                <div><dt className="text-zinc-500">{t('ops.leadDetail.delivery')}</dt><dd>{formatDate(lead.delivery_date)}</dd></div>
                <div><dt className="text-zinc-500">{t('ops.leadDetail.reference')}</dt><dd>{lead.reference_site || EMPTY_LABEL}</dd></div>
              </dl>
            </section>
            <section className="rounded-xl border border-zinc-200 bg-white p-5">
              <h2 className="mb-4 font-semibold">{t('ops.leadDetail.requested')}</h2>
              {Array.isArray(lead.sections) && lead.sections.length > 0 && (
                <p className="text-sm"><span className="text-zinc-500">{t('ops.leadDetail.sections')}</span> {lead.sections.join(', ')}</p>
              )}
              {Array.isArray(lead.functionalities) && lead.functionalities.length > 0 && (
                <p className="mt-2 text-sm"><span className="text-zinc-500">{t('ops.leadDetail.functionalities')}</span> {lead.functionalities.join(', ')}</p>
              )}
              {!lead.sections?.length && !lead.functionalities?.length && (
                <p className="text-sm text-zinc-500">{t('ops.leadDetail.noStructured')}</p>
              )}
            </section>
          </div>
        </div>
      )}

      {activeTab === 'cotizaciones' && canQuotes && (
        <div className="space-y-6">
          <OpsQuoteForm
            title={t('ops.leadDetail.newQuote')}
            defaultTitle={t('ops.leadDetail.proposalTitle', { name: displayTitle })}
            action={async (formData) => {
              'use server';
              await createLeadQuote(id, formData);
            }}
          />
          {(quotes ?? []).map((q) => (
            <article key={q.id} className="rounded-xl border border-zinc-200 bg-white p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">{q.title} · v{q.version}</h3>
                <StatusBadge label={QUOTE_STATUS_LABELS[q.status]} tone={q.status === 'accepted' ? 'success' : 'info'} />
              </div>
              <p className="text-sm font-medium">{formatCurrency(q.total_amount, q.currency)}</p>
              {q.sent_at && <p className="mt-1 text-xs text-zinc-500">{t('ops.leadDetail.sentOn', { date: formatDate(q.sent_at) })}</p>}
              {publicLinks[q.id] && (
                <div className="mt-2">
                  <CopyableUrl href={publicLinks[q.id]} />
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={`/quotes/${q.id}`}
                  className="rounded-lg bg-codiva-primary px-3 py-1.5 text-sm font-medium text-white"
                >
                  {t('ops.leadDetail.editInOps')}
                </Link>
                <PreviewPopupLink
                  href={`/quotes/${q.id}/preview`}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-50"
                >
                  {t('ops.leadDetail.preview')}
                </PreviewPopupLink>
                {q.status === 'draft' && (
                  <ToastForm success={t('ops.leadDetail.quoteSent')} action={async () => { 'use server'; await sendLeadQuote(q.id, id); }}>
                    <button type="submit" className="rounded-lg bg-codiva-primary px-3 py-1.5 text-sm text-white">
                      {t('ops.leadDetail.sendQuote')}
                    </button>
                  </ToastForm>
                )}
              </div>
            </article>
          ))}
          {!quotes?.length && <p className="text-sm text-zinc-500">{t('ops.leadDetail.noQuotes')}</p>}
        </div>
      )}
    </div>
  );
}
