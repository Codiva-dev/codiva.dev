import { DEFAULT_LOCALE, dateLocale, type Locale } from '@/i18n/config';
import { tSync } from '@/i18n/translate';

function group(locale: Locale, name: string, keys: string[]): Record<string, string> {
  return Object.fromEntries(keys.map((key) => [key, tSync(locale, `ops.labels.${name}.${key}`)]));
}

export function labelsFor(locale: Locale = DEFAULT_LOCALE) {
  return {
    LEAD_STATUS_LABELS: group(locale, 'leadStatus', [
      'new',
      'contacted',
      'qualified',
      'converted',
      'discarded',
    ]),
    LEAD_SOURCE_LABELS: group(locale, 'leadSource', [
      'web_cotiza',
      'referral',
      'manual',
      'contact_form',
    ]),
    PROJECT_STATUS_LABELS: group(locale, 'projectStatus', [
      'draft',
      'quoting',
      'active',
      'paused',
      'delivered',
      'archived',
    ]),
    TICKET_STATUS_LABELS: group(locale, 'ticketStatus', [
      'new',
      'in_progress',
      'waiting_client',
      'resolved',
      'closed',
    ]),
    TICKET_PRIORITY_LABELS: group(locale, 'ticketPriority', ['alta', 'media', 'baja']),
    QUOTE_STATUS_LABELS: group(locale, 'quoteStatus', [
      'draft',
      'sent',
      'accepted',
      'rejected',
      'expired',
    ]),
    MILESTONE_STATUS_LABELS: group(locale, 'milestoneStatus', [
      'pending',
      'in_progress',
      'completed',
      'blocked',
    ]),
    SPRINT_STATUS_LABELS: group(locale, 'sprintStatus', ['planned', 'active', 'completed']),
    SPRINT_ITEM_STATUS_LABELS: group(locale, 'sprintItemStatus', [
      'todo',
      'in_progress',
      'done',
      'blocked',
    ]),
    DELIVERABLE_KIND_LABELS: group(locale, 'deliverableKind', [
      'architecture',
      'mvp',
      'proposal',
      'other',
    ]),
    DOCUMENT_TYPE_LABELS: group(locale, 'documentType', [
      'contract',
      'nda',
      'proposal_pdf',
      'other',
    ]),
    DOCUMENT_SOURCE_LABELS: group(locale, 'documentSource', ['staff', 'client']),
    DOCUMENT_REQUEST_STATUS_LABELS: group(locale, 'documentRequestStatus', [
      'open',
      'fulfilled',
      'waived',
      'cancelled',
    ]),
    DOCUMENT_REQUEST_INPUT_LABELS: group(locale, 'documentRequestInput', [
      'file',
      'text',
      'credentials',
      'url',
    ]),
    CHARGE_KIND_LABELS: group(locale, 'chargeKind', [
      'development',
      'hosting',
      'domain',
      'pass_through',
      'other',
    ]),
    CHARGE_STATUS_LABELS: group(locale, 'chargeStatus', ['pending', 'paid', 'overdue', 'waived']),
    SITE_ACCESS_KIND_LABELS: group(locale, 'siteAccessKind', [
      'preview',
      'production',
      'cms',
      'other',
    ]),
    INBOX_STATUS_LABELS: group(locale, 'inboxStatus', ['unread', 'read', 'replied', 'archived']),
    WORK_STATUS_LABELS: group(locale, 'workStatus', [
      'backlog',
      'discovery',
      'build',
      'review',
      'blocked',
      'done',
    ]),
    WORK_STREAM_LABELS: group(locale, 'workStream', [
      'internal',
      'commercial',
      'delivery',
      'production',
      'evolution',
      'people',
    ]),
    WORK_PROCESS_LABELS: group(locale, 'workProcess', [
      'none',
      'internal',
      'project',
      'lead',
      'quote',
      'ticket',
    ]),
    EMPTY_LABEL: tSync(locale, 'ops.labels.empty'),
    DEFAULT_PROJECT_STATE: tSync(locale, 'ops.labels.defaultProjectState'),
    formatDate: (date: string | null | undefined) => formatDate(date, locale),
    formatCurrency: (amount: number | null | undefined, currency?: string) =>
      formatCurrency(amount, currency, locale),
    formatChargeAmount: (amount: number | null | undefined, currency?: string) =>
      formatChargeAmount(amount, currency, locale),
  };
}

const es = labelsFor('es');

export const LEAD_STATUS_LABELS = es.LEAD_STATUS_LABELS;
export const LEAD_SOURCE_LABELS = es.LEAD_SOURCE_LABELS;
export const PROJECT_STATUS_LABELS = es.PROJECT_STATUS_LABELS;
export const TICKET_STATUS_LABELS = es.TICKET_STATUS_LABELS;
export const TICKET_PRIORITY_LABELS = es.TICKET_PRIORITY_LABELS;
export const QUOTE_STATUS_LABELS = es.QUOTE_STATUS_LABELS;
export const MILESTONE_STATUS_LABELS = es.MILESTONE_STATUS_LABELS;
export const SPRINT_STATUS_LABELS = es.SPRINT_STATUS_LABELS;
export const SPRINT_ITEM_STATUS_LABELS = es.SPRINT_ITEM_STATUS_LABELS;
export const DELIVERABLE_KIND_LABELS = es.DELIVERABLE_KIND_LABELS;
export const DOCUMENT_TYPE_LABELS = es.DOCUMENT_TYPE_LABELS;
export const DOCUMENT_SOURCE_LABELS = es.DOCUMENT_SOURCE_LABELS;
export const DOCUMENT_REQUEST_STATUS_LABELS = es.DOCUMENT_REQUEST_STATUS_LABELS;
export const DOCUMENT_REQUEST_INPUT_LABELS = es.DOCUMENT_REQUEST_INPUT_LABELS;
export const CHARGE_KIND_LABELS = es.CHARGE_KIND_LABELS;
export const CHARGE_STATUS_LABELS = es.CHARGE_STATUS_LABELS;
export const SITE_ACCESS_KIND_LABELS = es.SITE_ACCESS_KIND_LABELS;
export const INBOX_STATUS_LABELS = es.INBOX_STATUS_LABELS;
export const EMPTY_LABEL = es.EMPTY_LABEL;
export const DEFAULT_PROJECT_STATE = es.DEFAULT_PROJECT_STATE;

/** Hosting, dominio y pass-through siempre van a cargo del cliente cuando aplican. */
export const CLIENT_BORNE_CHARGE_KINDS = ['hosting', 'domain', 'pass_through'] as const;

export function isClientBorneChargeKind(kind: string): boolean {
  return (CLIENT_BORNE_CHARGE_KINDS as readonly string[]).includes(kind);
}

export function formatDate(date: string | null | undefined, locale: Locale = DEFAULT_LOCALE): string {
  if (!date) return tSync(locale, 'ops.labels.empty');
  return new Date(date).toLocaleDateString(dateLocale(locale), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatChargeAmount(
  amount: number | null | undefined,
  currency = 'MXN',
  locale: Locale = DEFAULT_LOCALE
): string {
  if (amount == null) return tSync(locale, 'ops.labels.amountPending');
  return formatCurrency(amount, currency, locale);
}

export function formatCurrency(
  amount: number | null | undefined,
  currency = 'USD',
  locale: Locale = DEFAULT_LOCALE
): string {
  if (amount == null) return tSync(locale, 'ops.labels.empty');
  return new Intl.NumberFormat(dateLocale(locale), { style: 'currency', currency }).format(amount);
}
