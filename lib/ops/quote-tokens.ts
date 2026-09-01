import { createAdminClient } from '@/lib/supabase/admin';
import { throwDb } from '@/lib/ops/throw-db';
import { opsBaseUrl } from '@/lib/ops/host';

function randomToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function ensureQuoteAccessToken(quoteId: string): Promise<string> {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from('quote_access_tokens')
    .select('token')
    .eq('quote_id', quoteId)
    .is('revoked_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.token) return existing.token;

  const token = randomToken();
  const { error } = await admin.from('quote_access_tokens').insert({
    quote_id: quoteId,
    token,
  });
  if (error) await throwDb(error);
  return token;
}

export type PublicQuotePayload = {
  quote: {
    id: string;
    title: string;
    scope: string | null;
    service_type: string | null;
    project_state: string | null;
    deliverables: string | null;
    considerations: string | null;
    optional_extras: string | null;
    line_items: unknown;
    phases?: unknown;
    total_amount: number | null;
    hourly_rate?: number | null;
    currency: string | null;
    valid_until: string | null;
    version: number;
    status: string;
    created_at: string;
  };
  lead: {
    company: string;
    name: string;
    partner_company: string | null;
    partner_name: string | null;
    end_client_company: string | null;
    end_client_name: string | null;
  } | null;
  project: { name: string; slug: string } | null;
};

export async function getPublicQuoteByToken(token: string): Promise<PublicQuotePayload | null> {
  const admin = createAdminClient();

  const { data: access } = await admin
    .from('quote_access_tokens')
    .select('quote_id, expires_at, revoked_at')
    .eq('token', token)
    .maybeSingle();

  if (!access || access.revoked_at) return null;
  if (access.expires_at && new Date(access.expires_at) < new Date()) return null;

  const { data: quote } = await admin
    .from('quotes')
    .select(
      'id, title, scope, service_type, project_state, deliverables, considerations, optional_extras, line_items, phases, total_amount, hourly_rate, currency, valid_until, version, status, created_at, lead_id, project_id'
    )
    .eq('id', access.quote_id)
    .in('status', ['sent', 'accepted', 'rejected', 'expired'])
    .maybeSingle();

  if (!quote) return null;

  let lead: PublicQuotePayload['lead'] = null;
  if (quote.lead_id) {
    const { data } = await admin
      .from('leads')
      .select('company, name, partner_company, partner_name, end_client_company, end_client_name')
      .eq('id', quote.lead_id)
      .single();
    lead = data;
  }

  let project: PublicQuotePayload['project'] = null;
  if (quote.project_id) {
    const { data } = await admin.from('projects').select('name, slug').eq('id', quote.project_id).single();
    project = data;
  }

  return {
    quote: {
      id: quote.id,
      title: quote.title,
      scope: quote.scope,
      service_type: quote.service_type,
      project_state: quote.project_state,
      deliverables: quote.deliverables,
      considerations: quote.considerations,
      optional_extras: quote.optional_extras,
      line_items: quote.line_items,
      phases: quote.phases,
      total_amount: quote.total_amount,
      hourly_rate: quote.hourly_rate,
      currency: quote.currency,
      valid_until: quote.valid_until,
      version: quote.version,
      status: quote.status,
      created_at: quote.created_at,
    },
    lead,
    project,
  };
}

export function publicQuoteUrl(token: string): string {
  return `${opsBaseUrl()}/q/${token}`;
}
