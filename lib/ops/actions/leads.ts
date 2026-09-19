'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { assertCapability } from '@/lib/ops/auth';
import { logActivity } from '@/lib/ops/activity';
import {
  sendClientEmail,
  notifyStaff,
} from '@/lib/ops/email';
import { getT } from '@/i18n/locale';
import { throwDb } from '@/lib/ops/throw-db';
import {
  templateLeadQuoteSent,
  templateStaffAlert,
} from '@/lib/ops/email-templates';
import { isInboxLane } from '@/lib/ops/inbox-lane';
import {
  ensureQuoteAccessToken,
  publicQuoteUrl,
} from '@/lib/ops/quote-tokens';
import { parseQuoteFormData } from '@/lib/ops/quote-form';

export async function createLead(formData: FormData) {
  const { supabase, user } = await assertCapability('leads');

  const name = String(formData.get('name') || '').trim();
  const email = String(formData.get('email') || '').trim();
  if (!name) throw new Error('Nombre requerido');
  if (!email) throw new Error('Email requerido');

  const source = String(formData.get('source') || 'manual');
  const budgetRaw = String(formData.get('budget') || '').trim();
  const company = String(formData.get('company') || '').trim();
  const partnerCompany = String(formData.get('partnerCompany') || '').trim() || null;

  const { data: lead, error } = await supabase
    .from('leads')
    .insert({
      status: 'new',
      source,
      name,
      company,
      email,
      phone: String(formData.get('phone') || '').trim(),
      need: String(formData.get('need') || ''),
      delivery_date: String(formData.get('deliveryDate') || '') || null,
      budget: budgetRaw ? parseFloat(budgetRaw) : null,
      reference_site: String(formData.get('referenceSite') || '').trim() || null,
      partner_name: String(formData.get('partnerName') || '').trim() || null,
      partner_email: String(formData.get('partnerEmail') || '').trim() || null,
      partner_company: partnerCompany,
      end_client_name: String(formData.get('endClientName') || '').trim() || null,
      end_client_company: String(formData.get('endClientCompany') || '').trim() || null,
    })
    .select('id')
    .single();

  if (error || !lead) throw await throwDb(error);

  await logActivity({
    entityType: 'lead',
    entityId: lead.id,
    action: 'created',
    metadata: { source },
    actorId: user.id,
  });

  await notifyStaff({
    subject: `[Lead] ${company || name}`,
    html: templateStaffAlert(`Lead creado en Ops - ${company || name}`, [
      `Origen: ${source}`,
      `Nombre: ${name}`,
      `Email: ${email}`,
      company ? `Empresa: ${company}` : null,
      partnerCompany ? `Intermediario: ${partnerCompany}` : null,
    ].filter((line): line is string => Boolean(line))),
  }).catch(() => {});

  revalidatePath('/leads');
  revalidatePath('/inbox');
  revalidatePath('/pendientes');
  return lead.id;
}

export async function convertInboxToLead(messageId: string) {
  const { supabase, user } = await assertCapability('inbox');

  const { data: message, error: msgError } = await supabase
    .from('inbox_messages')
    .select('*')
    .eq('id', messageId)
    .single();
  if (msgError || !message) throw new Error('Mensaje no encontrado');

  if (message.lane && message.lane !== 'real') {
    throw new Error('Solo se convierte a lead un contacto real');
  }

  if (message.lead_id) {
    return { leadId: message.lead_id };
  }

  const { data: lead, error } = await supabase
    .from('leads')
    .insert({
      status: 'new',
      source: 'contact_form',
      name: message.name,
      email: message.email,
      need: message.message,
    })
    .select('id')
    .single();
  if (error || !lead) throw await throwDb(error);

  await supabase
    .from('inbox_messages')
    .update({ lead_id: lead.id, status: 'read' })
    .eq('id', messageId);

  await logActivity({
    entityType: 'lead',
    entityId: lead.id,
    action: 'created_from_inbox',
    metadata: { inboxMessageId: messageId },
    actorId: user.id,
  });

  revalidatePath('/inbox');
  revalidatePath('/leads');
  revalidatePath('/pendientes');
  return { leadId: lead.id };
}

export async function updateLeadStatus(leadId: string, status: string) {
  const { supabase, user } = await assertCapability('leads');
  const { error } = await supabase.from('leads').update({ status }).eq('id', leadId);
  if (error) throw await throwDb(error);
  await logActivity({
    entityType: 'lead',
    entityId: leadId,
    action: 'status_updated',
    metadata: { status },
    actorId: user.id,
  });
  revalidatePath('/leads');
  revalidatePath(`/leads/${leadId}`);
  revalidatePath('/inbox');
  revalidatePath('/pendientes');
}

export async function updateLeadDetails(leadId: string, formData: FormData) {
  const { supabase, user } = await assertCapability('leads');

  const assignedTo = String(formData.get('assignedTo') || '').trim();

  const payload = {
    name: String(formData.get('name') || '').trim(),
    company: String(formData.get('company') || '').trim(),
    email: String(formData.get('email') || '').trim(),
    phone: String(formData.get('phone') || '').trim(),
    need: String(formData.get('need') || ''),
    partner_name: String(formData.get('partnerName') || '').trim() || null,
    partner_email: String(formData.get('partnerEmail') || '').trim() || null,
    partner_company: String(formData.get('partnerCompany') || '').trim() || null,
    end_client_name: String(formData.get('endClientName') || '').trim() || null,
    end_client_company: String(formData.get('endClientCompany') || '').trim() || null,
    assigned_to: assignedTo || null,
  };

  const { error } = await supabase.from('leads').update(payload).eq('id', leadId);
  if (error) throw await throwDb(error);

  await logActivity({
    entityType: 'lead',
    entityId: leadId,
    action: 'updated',
    actorId: user.id,
  });

  revalidatePath('/leads');
  revalidatePath(`/leads/${leadId}`);
}

export async function createLeadQuote(leadId: string, formData: FormData) {
  const { supabase, user } = await assertCapability('quotes');
  const parsed = parseQuoteFormData(formData);

  const { data: last } = await supabase
    .from('quotes')
    .select('version')
    .eq('lead_id', leadId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: quote, error } = await supabase
    .from('quotes')
    .insert({
      lead_id: leadId,
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
  revalidatePath(`/leads/${leadId}`);
  const t = await getT();
  const { redirectWithToast } = await import('@/lib/ops/toast');
  redirectWithToast(`/quotes/${quote.id}`, t('ops.quoteForm.draftCreated'));
}

export async function sendLeadQuote(quoteId: string, leadId: string) {
  const { supabase, user } = await assertCapability('quotes');
  const admin = createAdminClient();

  const { error } = await supabase
    .from('quotes')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', quoteId)
    .eq('lead_id', leadId);
  if (error) throw await throwDb(error);

  const { data: lead } = await admin.from('leads').select('*').eq('id', leadId).single();
  if (!lead) throw new Error('Lead no encontrado');

  const token = await ensureQuoteAccessToken(quoteId);
  const quoteUrl = publicQuoteUrl(token);
  const recipient = lead.partner_email || lead.email;
  const subjectLabel =
    lead.end_client_company || lead.end_client_name || lead.company || lead.name || 'Oportunidad comercial';

  if (recipient) {
    await sendClientEmail({
      to: recipient,
      subject: `Propuesta comercial: ${subjectLabel}`,
      html: templateLeadQuoteSent(subjectLabel, quoteUrl, {
        partnerName: lead.partner_name || undefined,
        endClientLabel: lead.end_client_company || lead.end_client_name || undefined,
      }),
    });
  }

  await logActivity({
    entityType: 'quote',
    entityId: quoteId,
    action: 'sent',
    metadata: { leadId, recipient },
    actorId: user.id,
  });

  revalidatePath(`/leads/${leadId}`);
}

export async function updateInboxStatus(messageId: string, status: string) {
  const { supabase } = await assertCapability('inbox');
  const { error } = await supabase.from('inbox_messages').update({ status }).eq('id', messageId);
  if (error) throw await throwDb(error);
  revalidatePath('/inbox');
  revalidatePath('/pendientes');
}

export async function updateInboxLane(messageId: string, lane: string) {
  const { supabase, user } = await assertCapability('inbox');
  if (!isInboxLane(lane)) throw new Error('Carril inválido');
  const { error } = await supabase
    .from('inbox_messages')
    .update({ lane, lane_reason: 'manual' })
    .eq('id', messageId);
  if (error) throw await throwDb(error);
  await logActivity({
    entityType: 'inbox',
    entityId: messageId,
    action: 'lane_updated',
    metadata: { lane },
    actorId: user.id,
  });
  revalidatePath('/inbox');
  revalidatePath('/pendientes');
}

export async function deleteInboxMessage(messageId: string) {
  const { supabase, user } = await assertCapability('inbox');

  const { data: message, error: fetchError } = await supabase
    .from('inbox_messages')
    .select('id, name, email')
    .eq('id', messageId)
    .single();
  if (fetchError || !message) throw new Error('Mensaje no encontrado');

  const { error } = await supabase.from('inbox_messages').delete().eq('id', messageId);
  if (error) throw await throwDb(error);

  await logActivity({
    entityType: 'inbox',
    entityId: messageId,
    action: 'deleted',
    metadata: { name: message.name, email: message.email },
    actorId: user.id,
  });

  revalidatePath('/inbox');
  revalidatePath('/pendientes');
}
