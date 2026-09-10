import { escapeHtml } from '@/utils/escapeHtml';
import { formatCurrency, formatDate, EMPTY_LABEL, DEFAULT_PROJECT_STATE } from '@/lib/ops/labels';
import { serviceTypeHeading } from '@/lib/ops/quote-document/catalog';
import { BRAND_EMAIL, CODIVA_BRAND, brandWordmarkHtml } from '@/lib/brand';
import { DEFAULT_LOCALE, dateLocale, type Locale } from '@/i18n/config';
import { tSync } from '@/i18n/translate';

export type QuoteLineItem = {
  title: string;
  detail?: string;
  hours?: number | null;
  rate?: number | null;
  rateLabel?: string;
  total?: number | null;
};

export type QuotePhase = {
  name?: string;
  weeks?: string;
  deliverable?: string;
};

export type QuoteDocumentData = {
  heading?: string;
  serviceType: string;
  clientLabel: string;
  projectName: string;
  clientName: string;
  issuedAt: string | Date;
  serviceDescription: string;
  projectState: string;
  scope: string;
  deliverables?: string;
  lineItems?: QuoteLineItem[];
  totalAmount?: number | null;
  currency?: string;
  validUntil?: string | null;
  considerations?: string;
  optionalExtras?: string;
  version?: number;
  partnerCompany?: string | null;
  endClientCompany?: string | null;
  phases?: QuotePhase[];
};

export type QuoteDocumentOptions = {
  /** Internal Ops only. Client documents never include hours or hourly rate. */
  showHourlyBreakdown?: boolean;
};

const BRAND = BRAND_EMAIL;

function formatIssuedDate(value: string | Date, locale: Locale = DEFAULT_LOCALE): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return d.toLocaleDateString(dateLocale(locale), { day: 'numeric', month: 'long', year: 'numeric' });
}

function paragraphs(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map(
      (block) =>
        `<p style="margin:0 0 14px;font-size:14px;line-height:1.7;color:${BRAND.text};">${escapeHtml(block).replace(/\n/g, '<br/>')}</p>`
    )
    .join('');
}

function bulletList(text: string): string {
  const items = text
    .split(/\n/)
    .map((l) => l.replace(/^[\s•\--]+/, '').trim())
    .filter(Boolean);
  if (!items.length) return '';
  return `<ul style="margin:0 0 16px;padding-left:20px;color:${BRAND.text};font-size:14px;line-height:1.7;">
    ${items.map((item) => `<li style="margin-bottom:6px;">${escapeHtml(item)}</li>`).join('')}
  </ul>`;
}

function section(title: string, body: string): string {
  if (!body.trim()) return '';
  const isBullets = body.includes('\n•') || body.includes('\n- ') || body.startsWith('•');
  return `
    <section style="margin-top:28px;">
      <h2 style="margin:0 0 12px;font-size:15px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:${BRAND.primary};">${escapeHtml(title)}</h2>
      ${isBullets ? bulletList(body) : paragraphs(body)}
    </section>`;
}

function phasesBlock(phases: QuotePhase[], locale: Locale): string {
  const items = phases.filter((phase) => phase.name || phase.deliverable);
  if (!items.length) return '';
  const rows = items
    .map((phase) => {
      const weeks = phase.weeks
        ? `<span style="margin-left:8px;font-size:12px;color:${BRAND.muted};">${escapeHtml(
            tSync(locale, 'quoteDoc.weeks', { weeks: phase.weeks })
          )}</span>`
        : '';
      const deliverable = phase.deliverable
        ? `<div style="margin-top:4px;font-size:13px;color:${BRAND.muted};">${escapeHtml(phase.deliverable)}</div>`
        : '';
      return `<li style="margin:0 0 10px;padding:12px 14px;border:1px solid ${BRAND.border};border-radius:10px;">
        <strong style="font-size:14px;color:${BRAND.text};">${escapeHtml(phase.name || '')}</strong>${weeks}
        ${deliverable}
      </li>`;
    })
    .join('');
  return `
    <section style="margin-top:28px;">
      <h2 style="margin:0 0 12px;font-size:15px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:${BRAND.primary};">${escapeHtml(tSync(locale, 'quoteDoc.plan'))}</h2>
      <ul style="margin:0;padding:0;list-style:none;">${rows}</ul>
    </section>`;
}

function lineItemsBlock(
  items: QuoteLineItem[],
  currency: string,
  totalAmount: number | null | undefined,
  locale: Locale,
  showHourlyBreakdown: boolean
): string {
  if (!items.length) return '';

  const hourHeader = showHourlyBreakdown
    ? `<th style="padding:12px;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:${BRAND.muted};">${escapeHtml(tSync(locale, 'quoteDoc.hours'))}</th>`
    : '';
  const rateHeader = showHourlyBreakdown
    ? `<th style="padding:12px;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:${BRAND.muted};">${escapeHtml(tSync(locale, 'quoteDoc.rate'))}</th>`
    : '';

  const rows = items
    .map((item, index) => {
      const detail = item.detail
        ? `<div style="margin-top:4px;font-size:13px;color:${BRAND.muted};">${escapeHtml(item.detail)}</div>`
        : '';
      const hours = item.hours != null ? `${item.hours} h` : EMPTY_LABEL;
      const rate =
        item.rate != null
          ? `${formatCurrency(item.rate, currency)}${item.rateLabel ? ` ${escapeHtml(item.rateLabel)}` : ''}`
          : EMPTY_LABEL;
      const total = item.total != null ? formatCurrency(item.total, currency) : EMPTY_LABEL;
      const hourCell = showHourlyBreakdown
        ? `<td style="padding:14px 12px;vertical-align:top;font-size:13px;color:${BRAND.muted};white-space:nowrap;">${hours}</td>`
        : '';
      const rateCell = showHourlyBreakdown
        ? `<td style="padding:14px 12px;vertical-align:top;font-size:13px;color:${BRAND.muted};white-space:nowrap;">${rate}</td>`
        : '';

      return `
        <tr style="border-top:1px solid ${BRAND.border};">
          <td style="padding:14px 12px;vertical-align:top;font-size:14px;color:${BRAND.text};">
            <strong>${index + 1}. ${escapeHtml(item.title)}</strong>${detail}
          </td>
          ${hourCell}
          ${rateCell}
          <td style="padding:14px 12px;vertical-align:top;font-size:14px;font-weight:600;color:${BRAND.text};white-space:nowrap;">${total}</td>
        </tr>`;
    })
    .join('');

  const summary =
    totalAmount != null
      ? `<div style="margin-top:16px;padding:16px 18px;border-radius:10px;background:${BRAND.background};border:1px solid ${BRAND.border};">
          <p style="margin:0;font-size:13px;color:${BRAND.muted};">${escapeHtml(tSync(locale, 'quoteDoc.estimatedTotal'))}</p>
          <p style="margin:6px 0 0;font-size:24px;font-weight:700;color:${BRAND.primary};">${formatCurrency(totalAmount, currency)}</p>
        </div>`
      : '';

  return `
    <section style="margin-top:28px;">
      <h2 style="margin:0 0 12px;font-size:15px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:${BRAND.primary};">${escapeHtml(tSync(locale, 'quoteDoc.estimate'))}</h2>
      <div style="overflow-x:auto;border:1px solid ${BRAND.border};border-radius:10px;">
        <table style="width:100%;border-collapse:collapse;min-width:${showHourlyBreakdown ? '520px' : '360px'};">
          <thead>
            <tr style="background:${BRAND.background};">
              <th style="padding:12px;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:${BRAND.muted};">${escapeHtml(tSync(locale, 'quoteDoc.module'))}</th>
              ${hourHeader}
              ${rateHeader}
              <th style="padding:12px;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:${BRAND.muted};">${escapeHtml(tSync(locale, 'quoteDoc.total'))}</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      ${summary}
    </section>`;
}

function metaRow(label: string, value: string, valueHtml?: string): string {
  return `
    <div style="display:flex;gap:8px;padding:8px 0;border-bottom:1px solid ${BRAND.border};">
      <span style="min-width:150px;font-size:13px;font-weight:600;color:${BRAND.muted};">${escapeHtml(label)}</span>
      <span style="font-size:13px;color:${BRAND.text};">${valueHtml ?? escapeHtml(value)}</span>
    </div>`;
}

export function renderQuoteDocumentHtml(
  data: QuoteDocumentData,
  locale: Locale = DEFAULT_LOCALE,
  options: QuoteDocumentOptions = {}
): string {
  const currency = data.currency || 'MXN';
  const heading = serviceTypeHeading(data.serviceType, data.heading);
  const lineItems = Array.isArray(data.lineItems) ? data.lineItems : [];
  const showHourlyBreakdown = options.showHourlyBreakdown === true;
  const validUntilBlock = data.validUntil
    ? metaRow(tSync(locale, 'quoteDoc.validUntil'), formatDate(data.validUntil, locale))
    : '';
  const partnerBlock = data.partnerCompany
    ? metaRow(tSync(locale, 'quoteDoc.intermediary'), data.partnerCompany)
    : '';

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${escapeHtml(data.projectName)} - ${escapeHtml(tSync(locale, 'quoteDoc.titleSuffix'))}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Plus+Jakarta+Sans:wght@500;600;700&display=swap" rel="stylesheet"/>
  <style>@media print { body { background:#fff!important; } .page { box-shadow:none!important; margin:0!important; } }</style>
</head>
<body style="margin:0;padding:32px 16px;background:${BRAND.background};font-family:Inter,Segoe UI,Arial,sans-serif;">
  <article class="page" style="max-width:820px;margin:0 auto;background:#fff;border:1px solid ${BRAND.border};border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.06);">
    <header style="background:${BRAND.primary};padding:28px 32px;color:#fff;">
      ${brandWordmarkHtml({ sizePx: 18, as: 'p', onDark: true })}
      <p style="margin:10px 0 0;font-size:13px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;opacity:0.95;">${escapeHtml(heading)}</p>
      <h1 style="margin:14px 0 0;font-size:28px;line-height:1.2;font-weight:700;">${escapeHtml(data.clientLabel)}</h1>
      ${data.version ? `<p style="margin:8px 0 0;font-size:12px;opacity:0.85;">${escapeHtml(tSync(locale, 'quoteDoc.version', { version: data.version }))}</p>` : ''}
    </header>
    <div style="padding:28px 32px;">
      <div style="margin-bottom:24px;">
        ${metaRow(tSync(locale, 'quoteDoc.project'), data.projectName)}
        ${metaRow(tSync(locale, 'quoteDoc.client'), data.clientName)}
        ${partnerBlock}
        ${data.endClientCompany ? metaRow(tSync(locale, 'quoteDoc.endClient'), data.endClientCompany) : ''}
        ${metaRow(tSync(locale, 'quoteDoc.developer'), 'Codiva.dev', brandWordmarkHtml({ sizePx: 13 }))}
        ${metaRow(tSync(locale, 'quoteDoc.issued'), formatIssuedDate(data.issuedAt, locale))}
        ${metaRow(tSync(locale, 'quoteDoc.service'), data.serviceDescription)}
        ${metaRow(tSync(locale, 'quoteDoc.projectState'), data.projectState)}
        ${validUntilBlock}
      </div>
      <p style="margin:0;font-size:13px;color:${BRAND.muted};">${escapeHtml(CODIVA_BRAND.tagline)}</p>
      <p style="margin:4px 0 0;font-size:13px;"><a href="mailto:${CODIVA_BRAND.urls.email}" style="color:${BRAND.primary};text-decoration:none;">${CODIVA_BRAND.urls.email}</a></p>
      ${section(tSync(locale, 'quoteDoc.scope'), data.scope)}
      ${data.deliverables ? section(tSync(locale, 'quoteDoc.deliverables'), data.deliverables) : ''}
      ${lineItemsBlock(lineItems, currency, data.totalAmount, locale, showHourlyBreakdown)}
      ${phasesBlock(data.phases ?? [], locale)}
      ${data.considerations ? section(tSync(locale, 'quoteDoc.considerations'), data.considerations) : ''}
      ${data.optionalExtras ? section(tSync(locale, 'quoteDoc.extras'), data.optionalExtras) : ''}
      <footer style="margin-top:36px;padding-top:20px;border-top:1px solid ${BRAND.border};">
        <p style="margin:0;font-size:14px;color:${BRAND.text};">${escapeHtml(tSync(locale, 'quoteDoc.sincerely'))}</p>
        <p style="margin:8px 0 0;font-size:14px;font-weight:600;color:${BRAND.text};">Jean Claude Martell</p>
        <p style="margin:2px 0 0;font-size:13px;color:${BRAND.muted};">${brandWordmarkHtml({ sizePx: 13 })} · j.martell@codiva.dev</p>
      </footer>
    </div>
  </article>
</body>
</html>`;
}

export function parseLineItemsJson(raw: unknown): QuoteLineItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const o = item as Record<string, unknown>;
      const title = String(o.title || '').trim();
      if (!title) return null;
      return {
        title,
        detail: o.detail != null ? String(o.detail) : undefined,
        hours: o.hours != null ? Number(o.hours) : null,
        rate: o.rate != null ? Number(o.rate) : null,
        rateLabel: o.rateLabel != null ? String(o.rateLabel) : undefined,
        total: o.total != null ? Number(o.total) : null,
      } satisfies QuoteLineItem;
    })
    .filter(Boolean) as QuoteLineItem[];
}

export function parsePhasesJson(raw: unknown): QuotePhase[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const o = item as Record<string, unknown>;
      const name = o.name != null ? String(o.name).trim() : '';
      const weeks = o.weeks != null ? String(o.weeks).trim() : '';
      const deliverable = o.deliverable != null ? String(o.deliverable).trim() : '';
      if (!name && !deliverable) return null;
      return { name, weeks, deliverable } satisfies QuotePhase;
    })
    .filter(Boolean) as QuotePhase[];
}

export function quoteRowToDocumentData(
  quote: {
    title: string;
    scope: string | null;
    service_type?: string | null;
    project_state?: string | null;
    deliverables?: string | null;
    considerations?: string | null;
    optional_extras?: string | null;
    line_items?: unknown;
    phases?: unknown;
    total_amount?: number | null;
    currency?: string | null;
    valid_until?: string | null;
    version?: number;
    created_at?: string;
  },
  context: {
    clientLabel: string;
    projectName: string;
    clientName: string;
    partnerCompany?: string | null;
    endClientCompany?: string | null;
    serviceDescription?: string;
  }
): QuoteDocumentData {
  return {
    serviceType: quote.service_type || 'Web',
    clientLabel: context.clientLabel,
    projectName: context.projectName,
    clientName: context.clientName,
    issuedAt: quote.created_at || new Date().toISOString(),
    serviceDescription: context.serviceDescription || quote.title,
    projectState: quote.project_state || DEFAULT_PROJECT_STATE,
    scope: quote.scope || '',
    deliverables: quote.deliverables || '',
    lineItems: parseLineItemsJson(quote.line_items),
    totalAmount: quote.total_amount,
    currency: quote.currency || 'MXN',
    validUntil: quote.valid_until,
    considerations: quote.considerations || '',
    optionalExtras: quote.optional_extras || '',
    version: quote.version,
    partnerCompany: context.partnerCompany,
    endClientCompany: context.endClientCompany,
    phases: parsePhasesJson(quote.phases),
  };
}
