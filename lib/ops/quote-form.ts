import { DEFAULT_PROJECT_STATE } from '@/lib/ops/labels';
import { parseLineItemsJson, parsePhasesJson } from '@/lib/ops/quote-document';
import { applyQuoteHourlyRate, inferredQuoteHourlyRate, parseHourlyRate } from '@/lib/ops/quote-rate';

export function parseQuoteFormData(
  formData: FormData,
  existing?: { hourly_rate?: number | string | null; line_items?: unknown }
) {
  const lineItemsRaw = String(formData.get('lineItems') || '[]');
  let parsedLineItems: unknown = [];
  try {
    parsedLineItems = JSON.parse(lineItemsRaw);
  } catch {
    parsedLineItems = [];
  }
  const phasesRaw = String(formData.get('phases') || '[]');
  let parsedPhases: unknown = [];
  try {
    parsedPhases = JSON.parse(phasesRaw);
  } catch {
    parsedPhases = [];
  }

  const lineItems = parseLineItemsJson(parsedLineItems);
  const phases = parsePhasesJson(parsedPhases);
  const hourlyRate = parseHourlyRate(formData.get('hourlyRate'));
  const previousRate =
    parseHourlyRate(existing?.hourly_rate) ?? inferredQuoteHourlyRate(lineItems);
  const priced = applyQuoteHourlyRate({
    items: lineItems,
    phases,
    rate: hourlyRate,
    previousRate,
    fallbackTotal: parseFloat(String(formData.get('totalAmount') || '0')) || null,
  });

  return {
    title: String(formData.get('title') || 'Propuesta comercial'),
    serviceType: String(formData.get('serviceType') || 'Web'),
    projectState: String(formData.get('projectState') || DEFAULT_PROJECT_STATE),
    scope: String(formData.get('scope') || ''),
    deliverables: String(formData.get('deliverables') || ''),
    considerations: String(formData.get('considerations') || ''),
    optionalExtras: String(formData.get('optionalExtras') || ''),
    hourlyRate,
    lineItems: priced.items,
    phases: priced.phases,
    totalAmount: priced.total,
    currency: String(formData.get('currency') || 'MXN'),
    validUntil: String(formData.get('validUntil') || '') || null,
  };
}

