'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  assertCapabilityWrite,
  assertProjectAccessOrThrow,
} from '@/lib/ops/auth';
import { logActivity } from '@/lib/ops/activity';
import { sendClientEmail } from '@/lib/ops/email';
import { getT } from '@/i18n/locale';
import { throwDb } from '@/lib/ops/throw-db';
import { templateQuoteSent } from '@/lib/ops/email-templates';
import { projectPortalUrl } from '@/lib/ops/host';
import { opsProjectPathById } from '@/lib/ops/project-path';
import { parseQuoteFormData } from '@/lib/ops/quote-form';

export async function createQuote(projectId: string, formData: FormData) {
  const access = await assertCapabilityWrite('quotes');
  await assertProjectAccessOrThrow(access, projectId);
  const { supabase, user } = access;
  const parsed = parseQuoteFormData(formData);

  const { data: last } = await supabase
    .from('quotes')
    .select('version')
    .eq('project_id', projectId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: quote, error } = await supabase
    .from('quotes')
    .insert({
      project_id: projectId,
      version: (last?.version ?? 0) + 1,
      status: 'draft',
      title: parsed.title,
      service_type: parsed.serviceType,
      project_state: parsed.projectState,
      scope: parsed.scope,
      deliverables: parsed.deliverables,
      considerations: parsed.considerations,
      optional_extras: parsed.optionalExtras,
      hourly_rate: parsed.hourlyRate,
      line_items: parsed.lineItems,
      phases: parsed.phases,
      total_amount: parsed.totalAmount,
      currency: parsed.currency,
      valid_until: parsed.validUntil,
      created_by: user.id,
    })
    .select('id')
    .single();
  if (error || !quote) throw await throwDb(error);
  revalidatePath(`/projects/${projectId}`);
  const t = await getT();
  const { redirectWithToast } = await import('@/lib/ops/toast');
  redirectWithToast(`/quotes/${quote.id}`, t('ops.quoteForm.draftCreated'));
}

export async function updateQuote(quoteId: string, formData: FormData) {
  const access = await assertCapabilityWrite('quotes');
  const { supabase } = access;

  const { data: existing } = await supabase
    .from('quotes')
    .select('id, project_id, lead_id, hourly_rate, line_items')
    .eq('id', quoteId)
    .maybeSingle();
  if (!existing) throw new Error('Cotización no encontrada');
  if (existing.project_id) {
    await assertProjectAccessOrThrow(access, existing.project_id);
  }

  const parsed = parseQuoteFormData(formData, existing);

  const { error } = await supabase
    .from('quotes')
    .update({
      title: parsed.title,
      service_type: parsed.serviceType,
      project_state: parsed.projectState,
      scope: parsed.scope,
      deliverables: parsed.deliverables,
      considerations: parsed.considerations,
      optional_extras: parsed.optionalExtras,
      hourly_rate: parsed.hourlyRate,
      line_items: parsed.lineItems,
      phases: parsed.phases,
      total_amount: parsed.totalAmount,
      currency: parsed.currency,
      valid_until: parsed.validUntil,
    })
    .eq('id', quoteId);
  if (error) throw await throwDb(error);

  if (existing.project_id) revalidatePath(`/projects/${existing.project_id}`);
  if (existing.lead_id) revalidatePath(`/leads/${existing.lead_id}`);
  revalidatePath(`/quotes/${quoteId}`);
  revalidatePath('/p', 'layout');
}

export async function deleteDraftQuote(quoteId: string) {
  const access = await assertCapabilityWrite('quotes');
  const { supabase, user } = access;
  const t = await getT();

  const { data: existing } = await supabase
    .from('quotes')
    .select('id, status, project_id, lead_id, title, version')
    .eq('id', quoteId)
    .maybeSingle();
  if (!existing) throw new Error(t('ops.quoteEditor.notFound'));
  if (existing.project_id) {
    await assertProjectAccessOrThrow(access, existing.project_id);
  }
  if (existing.status !== 'draft') throw new Error(t('ops.quoteEditor.deleteOnlyDraft'));

  const { error } = await supabase.from('quotes').delete().eq('id', quoteId).eq('status', 'draft');
  if (error) throw await throwDb(error);

  await logActivity({
    entityType: 'quote',
    entityId: quoteId,
    action: 'deleted',
    metadata: { title: existing.title, version: existing.version },
    actorId: user.id,
  });

  if (existing.project_id) {
    revalidatePath(`/projects/${existing.project_id}`);
    revalidatePath('/p', 'layout');
  }
  if (existing.lead_id) revalidatePath(`/leads/${existing.lead_id}`);
  revalidatePath('/leads');

  const { redirectWithToast } = await import('@/lib/ops/toast');
  if (existing.project_id) {
    const dest = await opsProjectPathById(supabase, existing.project_id, '?tab=cotizaciones');
    redirectWithToast(dest, t('ops.quoteEditor.deleted'));
  }
  if (existing.lead_id) {
    redirectWithToast(`/leads/${existing.lead_id}?tab=cotizaciones`, t('ops.quoteEditor.deleted'));
  }
  redirectWithToast('/leads', t('ops.quoteEditor.deleted'));
}

export async function sendQuote(quoteId: string, projectId: string) {
  const access = await assertCapabilityWrite('quotes');
  await assertProjectAccessOrThrow(access, projectId);
  const { supabase, user } = access;
  const admin = createAdminClient();

  const { error } = await supabase
    .from('quotes')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', quoteId);
  if (error) throw await throwDb(error);

  await supabase.from('projects').update({ status: 'quoting' }).eq('id', projectId);

  const { data: project } = await admin
    .from('projects')
    .select(
      'slug, name, organizations(contact_email), leads!lead_id(partner_name, end_client_company, end_client_name)'
    )
    .eq('id', projectId)
    .single();

  const email = (project as { organizations?: { contact_email?: string } })?.organizations
    ?.contact_email;
  const lead = (
    project as {
      leads?: {
        partner_name?: string | null;
        end_client_company?: string | null;
        end_client_name?: string | null;
      } | null;
    }
  )?.leads;
  if (email) {
    await sendClientEmail({
      to: email,
      subject: `Nueva cotización: ${project?.name}`,
      html: templateQuoteSent(
        project?.name ?? 'Tu proyecto',
        projectPortalUrl(project?.slug ?? '', '/cotizacion'),
        {
          partnerName: lead?.partner_name || undefined,
          endClientLabel: lead?.end_client_company || lead?.end_client_name || undefined,
        }
      ),
    });
  }

  await logActivity({
    entityType: 'quote',
    entityId: quoteId,
    action: 'sent',
    actorId: user.id,
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath('/p', 'layout');
}

export async function acceptQuote(quoteId: string, projectId: string) {
  const access = await assertCapabilityWrite('quotes');
  await assertProjectAccessOrThrow(access, projectId);
  const { supabase, user } = access;
  const now = new Date().toISOString();
  await supabase
    .from('quotes')
    .update({ status: 'accepted', accepted_at: now, accepted_by: user.id })
    .eq('id', quoteId);
  await supabase.from('projects').update({ status: 'active', client_visible: true }).eq('id', projectId);
  revalidatePath(`/projects/${projectId}`);
}
