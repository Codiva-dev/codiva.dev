'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireStaff, requireAdminStaff, requirePortalAccess, assertCapability, assertProjectAccessOrThrow } from '@/lib/ops/auth';
import { can, canAny, capabilitiesFromRole, parseCapabilities } from '@/lib/ops/permissions';
import { logActivity } from '@/lib/ops/activity';
import { DEFAULT_PROJECT_STATE } from '@/lib/ops/labels';
import { generateProjectSlug } from '@/lib/ops/slug';
import { documentRequestPresetByCode } from '@/lib/ops/document-request-presets';
import { isHttpUrl, normalizeRequestedUrl, optionalHttpUrl, resolveFileOrUrlInput } from '@/lib/ops/requested-url';
import { sendClientEmail, notifyStaff } from '@/lib/ops/email';
import { getT } from '@/i18n/locale';
import { throwDb } from '@/lib/ops/throw-db';
import {
  templateQuoteSent,
  templateLeadQuoteSent,
  templateStaffAlert,
  templateLegalReacceptance,
  templatePortalInviteExistingUser,
  templateStaffInviteNewUser,
  templateStaffInviteExistingUser,
} from '@/lib/ops/email-templates';
import { LEGAL_DOCS_VERSION } from '@/lib/ops/legal/version';
import { opsLoginUrl, portalLoginUrl, projectPortalUrl } from '@/lib/ops/host';
import { opsProjectPathById, opsProjectUrl } from '@/lib/ops/project-path';
import { deleteOpsFile, uploadOpsFile } from '@/lib/ops/storage';
import { scanUploadedBytes } from '@/lib/ops/malware-scan';
import {
  ingestProjectDocument,
  ingestOrgDocument,
  markOrganizationMutualNdaSigned,
  disposeExpiredDocuments,
} from '@/lib/ops/document-ingest';
import { getRequestAudit } from '@/lib/ops/request-audit';
import { parseLineItemsJson, parsePhasesJson } from '@/lib/ops/quote-document';
import { applyQuoteHourlyRate, inferredQuoteHourlyRate, parseHourlyRate } from '@/lib/ops/quote-rate';
import { isInboxLane } from '@/lib/ops/inbox-lane';
import { ensureQuoteAccessToken, publicQuoteUrl } from '@/lib/ops/quote-tokens';
import { invitePortalUserCore } from '@/lib/ops/portal-invite';
import { findUserIdByEmail } from '@/lib/ops/auth-users';
import {
  architectureStarterHtml,
  isCanvasKind,
  MAX_ARCHITECTURE_HTML_CHARS,
  readClientPackHtml,
} from '@/lib/ops/architecture';

function parseQuoteFormData(
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
  revalidatePath('/dashboard');
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
  revalidatePath('/dashboard');
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
  revalidatePath('/dashboard');
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
  revalidatePath('/dashboard');
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
  revalidatePath('/dashboard');
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
  revalidatePath('/dashboard');
}

export async function updateTicketStatus(ticketId: string, status: string) {
  const { supabase, user } = await assertCapability('tickets');
  const { error } = await supabase.from('tickets').update({ status }).eq('id', ticketId);
  if (error) throw await throwDb(error);
  await logActivity({
    entityType: 'ticket',
    entityId: ticketId,
    action: 'status_updated',
    metadata: { status },
    actorId: user.id,
  });
  revalidatePath('/tickets');
  revalidatePath(`/tickets/${ticketId}`);
  revalidatePath('/inbox');
  revalidatePath('/dashboard');
}

export async function updateTicketAssignment(ticketId: string, formData: FormData) {
  const { supabase, user } = await assertCapability('tickets');
  const status = String(formData.get('status') || '').trim();
  const assignedTo = String(formData.get('assignedTo') || '').trim() || null;

  if (!['new', 'in_progress', 'waiting_client', 'resolved', 'closed'].includes(status)) {
    throw new Error('Estado inválido');
  }

  const { error } = await supabase
    .from('tickets')
    .update({ status, assigned_to: assignedTo })
    .eq('id', ticketId);
  if (error) throw await throwDb(error);

  await logActivity({
    entityType: 'ticket',
    entityId: ticketId,
    action: 'updated',
    metadata: { status, assigned_to: assignedTo },
    actorId: user.id,
  });
  revalidatePath('/tickets');
  revalidatePath(`/tickets/${ticketId}`);
  revalidatePath('/workload');
  revalidatePath('/inbox');
  revalidatePath('/dashboard');
}

export async function convertLeadToProject(leadId: string) {
  const { supabase, user, staff } = await assertCapability('leads');
  const admin = createAdminClient();

  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single();
  if (leadError || !lead) throw new Error('Lead no encontrado');

  const { data: org, error: orgError } = await admin
    .from('organizations')
    .insert({
      name: lead.company || lead.name,
      contact_email: lead.email,
      contact_phone: lead.phone,
    })
    .select('id')
    .single();
  if (orgError || !org) throw await throwDb(orgError);

  const slug = generateProjectSlug(lead.company || lead.name);
  const { data: project, error: projectError } = await admin
    .from('projects')
    .insert({
      organization_id: org.id,
      lead_id: leadId,
      name: `${lead.company || lead.name} - Proyecto`,
      slug,
      status: 'quoting',
      description: lead.need || '',
      target_delivery_date: lead.delivery_date,
    })
    .select('id, slug')
    .single();
  if (projectError || !project) throw await throwDb(projectError);

  await admin
    .from('leads')
    .update({ status: 'converted', converted_project_id: project.id })
    .eq('id', leadId);

  await admin.from('quotes').update({ project_id: project.id, lead_id: null }).eq('lead_id', leadId);

  await admin.from('project_staff').upsert({
    project_id: project.id,
    staff_id: user.id,
    role_on_project: staff.role === 'dev' ? 'dev' : 'pm',
  });

  await logActivity({
    entityType: 'project',
    entityId: project.id,
    action: 'created_from_lead',
    metadata: { leadId },
    actorId: user.id,
  });

  revalidatePath('/leads');
  revalidatePath('/projects');
  revalidatePath('/inbox');
  revalidatePath('/dashboard');
  return { projectId: project.id, slug: project.slug };
}

export async function createProject(formData: FormData) {
  const { user, staff } = await assertCapability('projects_create');
  const admin = createAdminClient();

  const name = String(formData.get('name') || '').trim();
  const orgName = String(formData.get('organizationName') || name).trim();
  const email = String(formData.get('contactEmail') || '').trim();
  if (!name) throw new Error('Nombre requerido');

  const { data: org } = await admin
    .from('organizations')
    .insert({ name: orgName, contact_email: email || null })
    .select('id')
    .single();

  const slug = generateProjectSlug(name);
  const { data: project, error } = await admin
    .from('projects')
    .insert({
      organization_id: org!.id,
      name,
      slug,
      status: 'draft',
      description: String(formData.get('description') || ''),
      target_delivery_date: String(formData.get('targetDeliveryDate') || '') || null,
    })
    .select('id, slug')
    .single();

  if (error || !project) throw await throwDb(error);

  await admin.from('project_staff').upsert({
    project_id: project.id,
    staff_id: user.id,
    role_on_project: staff.role === 'dev' ? 'dev' : 'pm',
  });

  await logActivity({
    entityType: 'project',
    entityId: project.id,
    action: 'created',
    actorId: user.id,
  });

  revalidatePath('/projects');
  return { id: project.id, slug: project.slug };
}

export async function updateProject(projectId: string, formData: FormData) {
  const access = await requireStaff();
  await assertProjectAccessOrThrow(access, projectId);
  const { supabase, user } = access;

  const retentionRaw = parseInt(String(formData.get('documentRetentionDays') || ''), 10);
  const payload = {
    name: String(formData.get('name') || ''),
    status: String(formData.get('status') || 'draft'),
    description: String(formData.get('description') || ''),
    client_visible: formData.get('clientVisible') === 'on',
    portal_show_quote: formData.get('portalShowQuote') === 'on',
    portal_show_costs: formData.get('portalShowCosts') === 'on',
    progress_percent: parseInt(String(formData.get('progressPercent') || '0'), 10),
    start_date: String(formData.get('startDate') || '') || null,
    target_delivery_date: String(formData.get('targetDeliveryDate') || '') || null,
    document_retention_days:
      Number.isFinite(retentionRaw) && retentionRaw > 0 ? retentionRaw : 365,
  };

  const { error } = await supabase.from('projects').update(payload).eq('id', projectId);
  if (error) throw await throwDb(error);

  await logActivity({
    entityType: 'project',
    entityId: projectId,
    action: 'updated',
    actorId: user.id,
  });

  revalidatePath('/projects');
  revalidatePath(`/projects/${projectId}`);
}

export async function createMilestone(projectId: string, formData: FormData) {
  const access = await assertCapability('milestones_write');
  await assertProjectAccessOrThrow(access, projectId);
  const { supabase, user } = access;

  const { data: last } = await supabase
    .from('milestones')
    .select('sort_order')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from('milestones').insert({
    project_id: projectId,
    title: String(formData.get('title') || ''),
    description: String(formData.get('description') || ''),
    status: String(formData.get('status') || 'pending'),
    due_date: String(formData.get('dueDate') || '') || null,
    visible_to_client: formData.get('visibleToClient') !== 'off',
    sort_order: (last?.sort_order ?? -1) + 1,
  });
  if (error) throw await throwDb(error);

  await logActivity({
    entityType: 'milestone',
    entityId: projectId,
    action: 'created',
    actorId: user.id,
  });

  revalidatePath(`/projects/${projectId}`);
}

export async function updateMilestone(milestoneId: string, projectId: string, formData: FormData) {
  const access = await assertCapability('milestones_write');
  await assertProjectAccessOrThrow(access, projectId);
  const { supabase, user } = access;

  const status = String(formData.get('status') || 'pending');
  const payload = {
    title: String(formData.get('title') || ''),
    description: String(formData.get('description') || ''),
    status,
    due_date: String(formData.get('dueDate') || '') || null,
    visible_to_client: formData.get('visibleToClient') === 'on',
    completed_at: status === 'completed' ? new Date().toISOString() : null,
  };

  const { error } = await supabase.from('milestones').update(payload).eq('id', milestoneId);
  if (error) throw await throwDb(error);

  await logActivity({
    entityType: 'milestone',
    entityId: milestoneId,
    action: 'updated',
    actorId: user.id,
  });

  revalidatePath(`/projects/${projectId}`);
}

export async function addMilestoneUpdate(milestoneId: string, projectId: string, body: string) {
  const access = await assertCapability('milestones_write');
  await assertProjectAccessOrThrow(access, projectId);
  const { supabase, user } = access;
  const { error } = await supabase.from('milestone_updates').insert({
    milestone_id: milestoneId,
    body,
    created_by: user.id,
  });
  if (error) throw await throwDb(error);
  revalidatePath(`/projects/${projectId}`);
}

export async function createQuote(projectId: string, formData: FormData) {
  const access = await assertCapability('quotes');
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
  const access = await assertCapability('quotes');
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

export async function sendQuote(quoteId: string, projectId: string) {
  const access = await assertCapability('quotes');
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
  const { supabase, user } = await requireStaff();
  const now = new Date().toISOString();
  await supabase
    .from('quotes')
    .update({ status: 'accepted', accepted_at: now, accepted_by: user.id })
    .eq('id', quoteId);
  await supabase.from('projects').update({ status: 'active', client_visible: true }).eq('id', projectId);
  revalidatePath(`/projects/${projectId}`);
}

export async function invitePortalUser(formData: FormData) {
  const access = await assertCapability('portal_users');
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const role = String(formData.get('role') || 'viewer');
  const projectIds = formData
    .getAll('projectIds')
    .map((v) => String(v).trim())
    .filter(Boolean);

  for (const projectId of projectIds) {
    await assertProjectAccessOrThrow(access, projectId);
  }

  const result = await invitePortalUserCore({ email, role, projectIds });

  revalidatePath('/users');
  revalidatePath(`/users/${result.userId}`);
  for (const id of result.projectIds) {
    revalidatePath(`/projects/${id}`);
  }
  return result;
}

export async function inviteProjectMember(projectId: string, formData: FormData) {
  const access = await assertCapability('portal_users');
  await assertProjectAccessOrThrow(access, projectId);
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const role = String(formData.get('role') || 'viewer');
  const siblingIds = formData
    .getAll('siblingProjectIds')
    .map((v) => String(v).trim())
    .filter(Boolean);

  const projectIds = [...new Set([projectId, ...siblingIds])];
  for (const id of projectIds) {
    await assertProjectAccessOrThrow(access, id);
  }
  const result = await invitePortalUserCore({ email, role, projectIds });

  revalidatePath('/users');
  revalidatePath(`/users/${result.userId}`);
  for (const id of result.projectIds) {
    revalidatePath(`/projects/${id}`);
  }
}

export async function resendPortalInvite(userId: string) {
  await assertCapability('portal_users');
  const admin = createAdminClient();

  const { data: authUser, error: userError } = await admin.auth.admin.getUserById(userId);
  if (userError || !authUser.user?.email) throw new Error('Usuario no encontrado');

  const email = authUser.user.email.toLowerCase();
  const { data: memberships } = await admin
    .from('project_members')
    .select('project_id, projects(id, name)')
    .eq('user_id', userId);

  const names = (memberships ?? [])
    .map((m) => {
      const p = m.projects as { name?: string } | { name?: string }[] | null;
      if (Array.isArray(p)) return p[0]?.name;
      return p?.name;
    })
    .filter((n): n is string => Boolean(n));

  const label =
    names.length === 0
      ? 'portal'
      : names.length === 1
        ? names[0]
        : names.length === 2
          ? `${names[0]} y ${names[1]}`
          : `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;

  const mail = await sendClientEmail({
    to: email,
    subject: `Acceso a tu portal - ${label}`,
    html: templatePortalInviteExistingUser(label, portalLoginUrl()),
  });
  if (!mail.ok && !mail.skipped) {
    throw new Error(mail.error || 'No se pudo reenviar la invitación');
  }

  revalidatePath(`/users/${userId}`);
}

export async function addPortalUserProjects(userId: string, formData: FormData) {
  const access = await assertCapability('portal_users');
  const role = String(formData.get('role') || 'viewer');
  const projectIds = formData
    .getAll('projectIds')
    .map((v) => String(v).trim())
    .filter(Boolean);
  if (!projectIds.length) throw new Error('Selecciona al menos un proyecto');

  for (const projectId of projectIds) {
    await assertProjectAccessOrThrow(access, projectId);
  }

  const admin = createAdminClient();
  const { data: authUser } = await admin.auth.admin.getUserById(userId);
  if (!authUser.user?.email) throw new Error('Usuario no encontrado');

  await invitePortalUserCore({
    email: authUser.user.email,
    role,
    projectIds,
    sendEmail: formData.get('sendEmail') === 'on',
  });

  revalidatePath('/users');
  revalidatePath(`/users/${userId}`);
  for (const id of projectIds) revalidatePath(`/projects/${id}`);
}

export async function removePortalUserProject(userId: string, projectId: string) {
  const access = await assertCapability('portal_users');
  await assertProjectAccessOrThrow(access, projectId);
  const admin = createAdminClient();
  const { error } = await admin
    .from('project_members')
    .delete()
    .eq('user_id', userId)
    .eq('project_id', projectId);
  if (error) throw await throwDb(error);

  revalidatePath('/users');
  revalidatePath(`/users/${userId}`);
  revalidatePath(`/projects/${projectId}`);
}

const STAFF_ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  pm: 'Project Manager',
  dev: 'Desarrollador',
};

async function provisionStaffUser(input: {
  email: string;
  fullName: string;
  role: string;
  capabilities?: string[];
}): Promise<{ userId: string; isNew: boolean }> {
  const admin = createAdminClient();
  const email = input.email.trim().toLowerCase();
  const fullName = input.fullName.trim();
  const role = input.role;
  if (!email) throw new Error('Email requerido');
  if (!['admin', 'pm', 'dev'].includes(role)) throw new Error('Rol inválido');
  const capabilities = input.capabilities?.length
    ? parseCapabilities(input.capabilities)
    : capabilitiesFromRole(role);

  let userId = await findUserIdByEmail(email);
  let isNew = false;
  let tempPassword: string | undefined;

  if (!userId) {
    tempPassword = crypto.randomUUID();
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: fullName ? { full_name: fullName } : undefined,
    });
    if (error || !created?.user) throw await throwDb(error);
    userId = created.user.id;
    isNew = true;
  }

  const { error: profileError } = await admin.from('staff_profiles').upsert(
    {
      id: userId,
      full_name: fullName || email.split('@')[0],
      role,
      capabilities,
      active: true,
    },
    { onConflict: 'id' }
  );
  if (profileError) throw await throwDb(profileError);

  const roleLabel = STAFF_ROLE_LABELS[role] ?? role;
  const loginUrl = opsLoginUrl();
  const html = isNew
    ? templateStaffInviteNewUser(fullName || email, email, tempPassword!, loginUrl, roleLabel)
    : templateStaffInviteExistingUser(fullName || email, loginUrl, roleLabel);

  const mail = await sendClientEmail({
    to: email,
    subject: `Acceso a Codiva.dev - ${roleLabel}`,
    html,
  });
  if (!mail.ok && !mail.skipped) {
    throw new Error(mail.error || 'No se pudo enviar el correo');
  }

  return { userId, isNew };
}

export async function inviteStaff(formData: FormData) {
  await requireAdminStaff();
  const role = String(formData.get('role') || 'pm');
  const capabilityValues = formData.getAll('capabilities').map(String);
  await provisionStaffUser({
    email: String(formData.get('email') || ''),
    fullName: String(formData.get('fullName') || ''),
    role,
    capabilities: capabilityValues.length ? parseCapabilities(capabilityValues) : capabilitiesFromRole(role),
  });
  revalidatePath('/team');
  revalidatePath('/settings');
}

export async function convertPersonnelOfferToStaff(offerId: string, formData: FormData) {
  const { user, supabase } = await requireAdminStaff();
  const admin = createAdminClient();

  const { data: offer } = await supabase
    .from('ops_personnel_offers')
    .select('id, full_name, email, ops_role, staff_id, status')
    .eq('id', offerId)
    .maybeSingle();
  if (!offer) throw new Error('Oferta no encontrada');
  if (offer.staff_id) throw new Error('Esta oferta ya está vinculada a un integrante');

  const email =
    String(formData.get('email') || '').trim().toLowerCase() ||
    String(offer.email || '').trim().toLowerCase();
  if (!email) throw new Error('Email de acceso requerido');
  if (!email.endsWith('@codiva.dev')) {
    throw new Error('El acceso de staff debe ser un correo @codiva.dev');
  }

  const { userId } = await provisionStaffUser({
    email,
    fullName: offer.full_name,
    role: offer.ops_role || 'pm',
  });

  const { error } = await admin
    .from('ops_personnel_offers')
    .update({
      staff_id: userId,
      email,
      status: offer.status === 'draft' || offer.status === 'sent' ? 'accepted' : offer.status,
    })
    .eq('id', offerId);
  if (error) throw await throwDb(error);

  await logActivity({
    entityType: 'personnel_offer',
    entityId: offerId,
    action: 'converted_to_staff',
    actorId: user.id,
    metadata: { staff_id: userId, email, role: offer.ops_role },
  });

  revalidatePath('/team');
  revalidatePath(`/team/ofertas/${offerId}`);
  revalidatePath('/settings');
}

export async function uploadStaffContract(offerId: string, formData: FormData) {
  const { user, supabase } = await requireAdminStaff();
  const file = formData.get('file') as File | null;
  if (!file?.size) throw new Error('Archivo requerido');

  const { data: offer } = await supabase
    .from('ops_personnel_offers')
    .select('id, staff_id')
    .eq('id', offerId)
    .maybeSingle();
  if (!offer) throw new Error('Oferta no encontrada');
  if (!offer.staff_id) {
    throw new Error('Convierte la oferta a integrante antes de subir el contrato');
  }

  const signedAt = String(formData.get('signedAt') || '').trim() || new Date().toISOString().slice(0, 10);
  const uploaded = await uploadOpsFile(file, `staff/${offer.staff_id}/contracts`);
  const scan = await scanUploadedBytes(uploaded.buffer, uploaded.sha256, file.name);
  if (scan.status === 'infected') {
    await deleteOpsFile(uploaded.path);
    throw new Error(`Archivo rechazado: posible malware (${scan.provider ?? 'scan'}).`);
  }

  const admin = createAdminClient();
  const { error } = await admin.from('ops_staff_contracts').insert({
    staff_id: offer.staff_id,
    offer_id: offerId,
    file_path: uploaded.path,
    original_filename: file.name,
    signed_at: signedAt,
    uploaded_by: user.id,
  });
  if (error) {
    await deleteOpsFile(uploaded.path).catch(() => undefined);
    throw await throwDb(error);
  }

  await logActivity({
    entityType: 'personnel_offer',
    entityId: offerId,
    action: 'contract_uploaded',
    actorId: user.id,
    metadata: { staff_id: offer.staff_id, file_path: uploaded.path },
  });

  revalidatePath('/team');
  revalidatePath(`/team/ofertas/${offerId}`);
  revalidatePath('/settings');
}

export async function updateStaffProfile(staffId: string, formData: FormData) {
  const { user } = await requireAdminStaff();
  const admin = createAdminClient();

  const fullName = String(formData.get('fullName') || '').trim();
  const role = String(formData.get('role') || 'pm');
  const active = formData.get('active') === 'on';
  const capabilities = parseCapabilities(formData.getAll('capabilities'));

  if (!['admin', 'pm', 'dev'].includes(role)) throw new Error('Rol inválido');
  if (staffId === user.id && !active) {
    throw new Error('No puedes desactivar tu propia cuenta');
  }
  if (staffId === user.id && !capabilities.includes('team')) {
    throw new Error('No puedes quitarte el permiso de gestionar el equipo');
  }

  const { data: others } = await admin
    .from('staff_profiles')
    .select('id, role, active, capabilities')
    .eq('active', true)
    .neq('id', staffId);
  const otherHasTeam = (others ?? []).some((row) => {
    if (Array.isArray(row.capabilities) && row.capabilities.includes('team')) return true;
    return !row.capabilities?.length && row.role === 'admin';
  });
  const keepsTeam = active && capabilities.includes('team');
  if (!keepsTeam && !otherHasTeam) {
    throw new Error('Debe quedar al menos una persona con permiso para gestionar el equipo');
  }

  const { error } = await admin
    .from('staff_profiles')
    .update({
      full_name: fullName || undefined,
      role,
      capabilities,
      active,
    })
    .eq('id', staffId);
  if (error) throw await throwDb(error);

  revalidatePath('/team');
  revalidatePath('/settings');
}

export async function uploadDocument(projectId: string, formData: FormData) {
  const access = await assertCapability('documents');
  await assertProjectAccessOrThrow(access, projectId);
  const { user, supabase } = access;
  const file = formData.get('file') as File | null;
  if (!file?.size) throw new Error('Archivo requerido');

  const title = String(formData.get('title') || file.name);
  const type = String(formData.get('type') || 'other');
  const signed = formData.get('signed') === 'on';
  const visibleToClient = formData.get('visibleToClient') === 'on';
  const notes = String(formData.get('notes') || '');
  const audit = await getRequestAudit();

  const { data: project } = await supabase
    .from('projects')
    .select('organization_id')
    .eq('id', projectId)
    .maybeSingle();
  const organizationId = project?.organization_id ?? null;
  const isSignedNda = type === 'nda' && signed && Boolean(organizationId);

  const { doc, sha256, path, scan } = isSignedNda
    ? await ingestOrgDocument({
        organizationId: organizationId!,
        projectId,
        file,
        type,
        title,
        notes,
        signed: true,
        visibleToClient,
        source: 'staff',
        uploadedBy: user.id,
        folder: 'nda',
        audit,
      })
    : await ingestProjectDocument({
        projectId,
        file,
        type,
        title,
        notes,
        signed,
        visibleToClient,
        source: 'staff',
        uploadedBy: user.id,
        folder: 'documents',
        audit,
      });

  if (isSignedNda && organizationId) {
    await markOrganizationMutualNdaSigned({ organizationId, documentId: doc.id });
    revalidatePath('/p', 'layout');
  }

  await logActivity({
    entityType: 'document',
    entityId: doc.id,
    action: 'uploaded',
    actorId: user.id,
    metadata: {
      project_id: projectId,
      title,
      type,
      source: 'staff',
      file_path: path,
      content_sha256: sha256,
      scan_status: scan.status,
      scan_provider: scan.provider,
      ip: audit.ip,
      user_agent: audit.userAgent,
    },
  });

  revalidatePath(`/projects/${projectId}`);
}

export async function createDeliverable(projectId: string, formData: FormData) {
  const access = await assertCapability('deliverables');
  await assertProjectAccessOrThrow(access, projectId);
  const { supabase } = access;

  const file = formData.get('file') as File | null;
  let filePath: string | null = null;
  let fileUrl: string | null = null;

  if (file?.size) {
    const uploaded = await uploadOpsFile(file, `projects/${projectId}/deliverables`);
    filePath = uploaded.path;
    fileUrl = uploaded.url;
  }

  const kind = String(formData.get('kind') || 'other');
  const sortOrder = parseInt(String(formData.get('sortOrder') || '0'), 10) || 0;
  const title = String(formData.get('title') || '');

  const { data: deliverable, error } = await supabase
    .from('deliverables')
    .insert({
      project_id: projectId,
      title,
      description: String(formData.get('description') || ''),
      url: String(formData.get('url') || '') || null,
      file_path: filePath,
      file_url: fileUrl,
      visible_to_client: formData.get('visibleToClient') !== 'off',
      kind,
      sort_order: sortOrder,
    })
    .select('id')
    .single();
  if (error || !deliverable) throw await throwDb(error);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  await logActivity({
    entityType: 'deliverable',
    entityId: deliverable.id,
    action: 'created',
    actorId: user?.id,
    metadata: {
      project_id: projectId,
      title,
      kind,
      file_path: filePath,
    },
  });

  revalidatePath(`/projects/${projectId}`);
}

export async function createArchitectureCanvas(projectId: string, formData: FormData) {
  const access = await assertCapability('deliverables');
  await assertProjectAccessOrThrow(access, projectId);
  const { supabase } = access;

  const title = String(formData.get('title') || '').trim();
  if (!title) throw new Error('Título requerido');

  const kindRaw = String(formData.get('kind') || 'architecture');
  const kind = isCanvasKind(kindRaw) ? kindRaw : 'architecture';
  const sortOrder = parseInt(String(formData.get('sortOrder') || '0'), 10) || 0;
  const visibleToClient = formData.get('visibleToClient') === 'on';
  const bodyHtml = architectureStarterHtml(title);

  const { data: deliverable, error } = await supabase
    .from('deliverables')
    .insert({
      project_id: projectId,
      title,
      description: String(formData.get('description') || ''),
      url: null,
      body_html: bodyHtml,
      visible_to_client: visibleToClient,
      kind,
      sort_order: sortOrder,
    })
    .select('id')
    .single();
  if (error || !deliverable) throw await throwDb(error);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  await logActivity({
    entityType: 'deliverable',
    entityId: deliverable.id,
    action: 'created',
    actorId: user?.id,
    metadata: { project_id: projectId, title, kind, source: 'ops_architecture' },
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath('/p', 'layout');
  const t = await getT();
  const { redirectWithToast } = await import('@/lib/ops/toast');
  redirectWithToast(
    await opsProjectPathById(supabase, projectId, `/arquitectura/${deliverable.id}`),
    t('ops.architecture.created')
  );
}

export async function updateArchitectureCanvas(projectId: string, deliverableId: string, formData: FormData) {
  const access = await assertCapability('deliverables');
  await assertProjectAccessOrThrow(access, projectId);
  const { supabase } = access;

  const { data: existing } = await supabase
    .from('deliverables')
    .select('id, kind')
    .eq('id', deliverableId)
    .eq('project_id', projectId)
    .maybeSingle();
  if (!existing) throw new Error('Canvas no encontrado');

  const title = String(formData.get('title') || '').trim();
  if (!title) throw new Error('Título requerido');

  const kindRaw = String(formData.get('kind') || existing.kind || 'architecture');
  const kind = isCanvasKind(kindRaw) ? kindRaw : 'architecture';
  const sortOrder = parseInt(String(formData.get('sortOrder') || '0'), 10) || 0;
  const visibleToClient = formData.get('visibleToClient') === 'on';
  const bodyHtml = String(formData.get('bodyHtml') || '');
  if (bodyHtml.length > MAX_ARCHITECTURE_HTML_CHARS) {
    throw new Error('El HTML supera el tamaño máximo permitido');
  }

  const { error } = await supabase
    .from('deliverables')
    .update({
      title,
      description: String(formData.get('description') || ''),
      kind,
      sort_order: sortOrder,
      visible_to_client: visibleToClient,
      body_html: bodyHtml,
    })
    .eq('id', deliverableId)
    .eq('project_id', projectId);
  if (error) throw await throwDb(error);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  await logActivity({
    entityType: 'deliverable',
    entityId: deliverableId,
    action: 'updated',
    actorId: user?.id,
    metadata: { project_id: projectId, title, kind, visible_to_client: visibleToClient },
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/arquitectura/${deliverableId}`);
  revalidatePath('/p', 'layout');
}

export async function hydrateArchitectureFromPacks(projectId: string): Promise<number> {
  const access = await requireStaff();
  await assertProjectAccessOrThrow(access, projectId);
  if (!can(access.staff, 'deliverables')) return 0;
  const { supabase } = access;

  const { data: rows, error } = await supabase
    .from('deliverables')
    .select('id, kind, url, body_html')
    .eq('project_id', projectId);
  if (error) throw await throwDb(error);

  let adopted = 0;
  for (const row of rows ?? []) {
    if (!isCanvasKind(row.kind)) continue;
    if (row.body_html?.trim()) continue;
    const html = await readClientPackHtml(row.url);
    if (!html) continue;
    const { error: updateError } = await supabase
      .from('deliverables')
      .update({ body_html: html })
      .eq('id', row.id)
      .eq('project_id', projectId);
    if (updateError) throw await throwDb(updateError);
    adopted += 1;
  }

  if (adopted > 0) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await logActivity({
      entityType: 'project',
      entityId: projectId,
      action: 'architecture_adopted',
      actorId: user?.id,
      metadata: { adopted },
    });
  }

  return adopted;
}

export async function adoptArchitecturePacks(projectId: string) {
  const access = await assertCapability('deliverables');
  const adopted = await hydrateArchitectureFromPacks(projectId);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath('/p', 'layout');
  const { redirectWithToast } = await import('@/lib/ops/toast');
  const t = await getT();
  redirectWithToast(
    await opsProjectPathById(access.supabase, projectId, '?tab=arquitectura'),
    adopted > 0
      ? t('ops.architecture.packsAdopted', { count: adopted })
      : t('ops.architecture.packsNone')
  );
}

export async function markDocumentSigned(documentId: string, projectId: string, signed = true) {
  await requireStaff();
  const admin = createAdminClient();
  const { error } = await admin
    .from('documents')
    .update({ signed })
    .eq('id', documentId)
    .eq('project_id', projectId);
  if (error) throw await throwDb(error);
  revalidatePath(`/projects/${projectId}`);
}

export async function setDeliverableVisibility(
  projectId: string,
  deliverableId: string,
  visibleToClient: boolean
) {
  const { supabase } = await requireStaff();
  const { error } = await supabase
    .from('deliverables')
    .update({ visible_to_client: visibleToClient })
    .eq('id', deliverableId)
    .eq('project_id', projectId);
  if (error) throw await throwDb(error);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath('/p', 'layout');
}

export async function setQuoteVisibility(
  projectId: string,
  quoteId: string,
  visibleToClient: boolean
) {
  const { supabase } = await requireStaff();
  const { error } = await supabase
    .from('quotes')
    .update({ visible_to_client: visibleToClient })
    .eq('id', quoteId)
    .eq('project_id', projectId);
  if (error) throw await throwDb(error);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath('/p', 'layout');
}

export async function acceptPortalLegalDocuments(slug: string, formData: FormData) {
  const access = await requirePortalAccess(slug);
  if (access.isStaffPreview) {
    throw new Error('La vista previa staff no registra aceptaciones');
  }

  const acceptTerms = formData.get('acceptTerms') === 'on';
  const acceptPrivacy = formData.get('acceptPrivacy') === 'on';
  const acceptNda = formData.get('acceptNda') === 'on';
  if (!acceptTerms || !acceptPrivacy || !acceptNda) {
    throw new Error('Debes aceptar Términos, Aviso de Privacidad y NDA');
  }

  const { LEGAL_DOCS_VERSION } = await import('@/lib/ops/legal/version');
  const now = new Date().toISOString();
  const admin = createAdminClient();

  const acceptancePatch = {
    terms_accepted_at: now,
    terms_version: LEGAL_DOCS_VERSION,
    privacy_accepted_at: now,
    privacy_version: LEGAL_DOCS_VERSION,
    nda_accepted_at: now,
    nda_version: LEGAL_DOCS_VERSION,
    accepted_at: now,
  };

  const { data: members, error } = await admin
    .from('project_members')
    .update(acceptancePatch)
    .eq('user_id', access.user.id)
    .select('id, project_id');

  if (error) throw await throwDb(error);
  if (!members?.length) throw new Error('Membresía no encontrada');

  const audit = await getRequestAudit();
  for (const member of members) {
    await logActivity({
      entityType: 'project_member',
      entityId: member.id,
      action: 'legal_accepted',
      actorId: access.user.id,
      metadata: {
        project_id: member.project_id,
        project_slug: slug,
        version: LEGAL_DOCS_VERSION,
        documents: ['terms', 'privacy', 'nda'],
        propagated: member.project_id !== access.project.id,
        ip: audit.ip,
        user_agent: audit.userAgent,
      },
    });
  }

  const { redirectWithToast } = await import('@/lib/ops/toast');
  const t = await getT();
  redirectWithToast(`/p/${slug}`, t('portal.legalAccept.accepted'));
}

export async function createDocumentRequest(projectId: string, formData: FormData) {
  const { user, supabase } = await requireStaff();
  const title = String(formData.get('title') || '').trim();
  if (!title) throw new Error('Título requerido');

  const inputMode = String(formData.get('inputMode') || 'file');
  if (!['file', 'text', 'credentials', 'url'].includes(inputMode)) {
    throw new Error('Modo de respuesta inválido');
  }

  const { data, error } = await supabase
    .from('document_requests')
    .insert({
      project_id: projectId,
      code: String(formData.get('code') || '').trim() || null,
      title,
      description: String(formData.get('description') || '').trim(),
      instructions: String(formData.get('instructions') || '').trim(),
      expected_type: String(formData.get('expectedType') || 'other'),
      input_mode: inputMode,
      required: formData.get('required') === 'on',
      sort_order: parseInt(String(formData.get('sortOrder') || '0'), 10) || 0,
      due_date: String(formData.get('dueDate') || '') || null,
      created_by: user.id,
      visible_to_client: formData.get('visibleToClient') !== 'off',
      status: 'open',
    })
    .select('id')
    .single();
  if (error || !data) throw await throwDb(error);

  await logActivity({
    entityType: 'document_request',
    entityId: data.id,
    action: 'created',
    actorId: user.id,
    metadata: { project_id: projectId, title, input_mode: inputMode },
  });

  revalidatePath(`/projects/${projectId}`);
}

export async function createDocumentRequestFromPreset(projectId: string, presetCode: string) {
  const preset = documentRequestPresetByCode(presetCode);
  if (!preset) throw new Error('Plantilla desconocida');

  const access = await requireStaff();
  await assertProjectAccessOrThrow(access, projectId);
  const { supabase } = access;

  const { data: existing } = await supabase
    .from('document_requests')
    .select('id')
    .eq('project_id', projectId)
    .eq('code', preset.code)
    .maybeSingle();
  if (existing) throw new Error('Esa solicitud ya existe en este proyecto');

  const fd = new FormData();
  fd.set('code', preset.code);
  fd.set('title', preset.title);
  fd.set('description', preset.description);
  fd.set('instructions', preset.instructions);
  fd.set('expectedType', preset.expectedType);
  fd.set('inputMode', preset.inputMode);
  fd.set('sortOrder', String(preset.sortOrder));
  if (preset.required) fd.set('required', 'on');
  await createDocumentRequest(projectId, fd);
}

export async function updateDocumentRequestStatus(
  projectId: string,
  requestId: string,
  status: 'open' | 'waived' | 'cancelled'
) {
  const { user, supabase } = await requireStaff();
  const patch: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (status === 'open') {
    patch.fulfilled_at = null;
    patch.fulfilled_document_id = null;
  }

  const { error } = await supabase
    .from('document_requests')
    .update(patch)
    .eq('id', requestId)
    .eq('project_id', projectId);
  if (error) throw await throwDb(error);

  await logActivity({
    entityType: 'document_request',
    entityId: requestId,
    action: `status_${status}`,
    actorId: user.id,
    metadata: { project_id: projectId, status },
  });

  revalidatePath(`/projects/${projectId}`);
}

/** Cliente responde a una solicitud abierta (archivo, texto o accesos). */
export async function clientFulfillDocumentRequest(
  projectId: string,
  slug: string,
  formData: FormData
) {
  const access = await requirePortalAccess(slug);
  if (access.isStaffPreview) {
    throw new Error('Usa una cuenta de cliente para responder solicitudes');
  }
  const { user, project } = access;
  if (project.id !== projectId) throw new Error('Proyecto inválido');

  const requestId = String(formData.get('requestId') || '');
  if (!requestId) throw new Error('Solicitud requerida');

  const admin = createAdminClient();
  const { data: req } = await admin
    .from('document_requests')
    .select('*')
    .eq('id', requestId)
    .eq('project_id', projectId)
    .eq('visible_to_client', true)
    .maybeSingle();

  if (!req || req.status !== 'open') {
    throw new Error('Esta solicitud no está disponible');
  }

  const notes = String(formData.get('notes') || '').trim();
  const audit = await getRequestAudit();
  let documentId: string | null = null;
  let sha256 = '';
  let path = '';
  let scanStatus = 'n/a';
  let responseText: string | null = null;

  if (req.input_mode === 'file') {
    const resolved = resolveFileOrUrlInput(
      formData.get('file') as File | null,
      String(formData.get('responseText') || '')
    );
    const isSignedNda = req.expected_type === 'nda';
    const organizationId = project.organization_id;

    if (resolved.kind === 'url') {
      responseText = resolved.url;
    } else if (isSignedNda && organizationId) {
      const { doc, sha256: hash, path: storedPath, scan } = await ingestOrgDocument({
        organizationId,
        projectId,
        file: resolved.file,
        type: req.expected_type,
        title: req.title,
        notes,
        signed: true,
        visibleToClient: true,
        source: 'client',
        uploadedBy: user.id,
        folder: 'nda',
        requestId: req.id,
        audit,
      });
      documentId = doc.id;
      sha256 = hash;
      path = storedPath;
      scanStatus = scan.status;
      await markOrganizationMutualNdaSigned({ organizationId, documentId: doc.id });
    } else {
      const { doc, sha256: hash, path: storedPath, scan } = await ingestProjectDocument({
        projectId,
        file: resolved.file,
        type: req.expected_type,
        title: req.title,
        notes,
        signed: isSignedNda,
        visibleToClient: true,
        source: 'client',
        uploadedBy: user.id,
        folder: 'inbound',
        requestId: req.id,
        audit,
        organizationId,
      });
      documentId = doc.id;
      sha256 = hash;
      path = storedPath;
      scanStatus = scan.status;
    }
  } else if (req.input_mode === 'credentials') {
    const payload = {
      provider: String(formData.get('provider') || '').trim(),
      domain: String(formData.get('domain') || '').trim(),
      panelUrl: String(formData.get('panelUrl') || '').trim(),
      username: String(formData.get('username') || '').trim(),
      accessNotes: String(formData.get('accessNotes') || '').trim(),
      notes,
    };
    if (!payload.provider && !payload.domain && !payload.accessNotes) {
      throw new Error('Indica al menos proveedor, dominio o notas de acceso');
    }
    responseText = JSON.stringify(payload, null, 2);
  } else if (req.input_mode === 'url') {
    responseText = normalizeRequestedUrl(String(formData.get('responseText') || ''));
  } else {
    responseText = String(formData.get('responseText') || '').trim();
    if (!responseText) throw new Error('Escribe la información solicitada');
  }

  const { error: updateError } = await admin
    .from('document_requests')
    .update({
      status: 'fulfilled',
      fulfilled_document_id: documentId,
      fulfilled_at: new Date().toISOString(),
      response_text: responseText,
      updated_at: new Date().toISOString(),
    })
    .eq('id', req.id)
    .eq('status', 'open');
  if (updateError) throw await throwDb(updateError);

  await logActivity({
    entityType: 'document_request',
    entityId: req.id,
    action: 'fulfilled',
    actorId: user.id,
    metadata: {
      project_id: projectId,
      title: req.title,
      input_mode: req.input_mode,
      document_id: documentId,
      content_sha256: sha256 || undefined,
      file_path: path || undefined,
      scan_status: scanStatus,
      ip: audit.ip,
      user_agent: audit.userAgent,
    },
  });

  await notifyStaff({
    subject: `Respuesta del cliente - ${project.name}`,
    html: templateStaffAlert(
      `Solicitud respondida · ${project.name}`,
      [
        `Solicitud: ${req.title}`,
        `Modo: ${req.input_mode}`,
        sha256
          ? `SHA-256: ${sha256.slice(0, 16)}…`
          : isHttpUrl(responseText)
            ? `URL: ${responseText}`
            : `Respuesta: texto/accesos`,
        `Notas: ${notes || '-'}`,
      ],
      { ctaLabel: 'Ver documentos', ctaHref: opsProjectUrl(slug, '?tab=documentos') }
    ),
  }).catch(() => {});

  revalidatePath(`/p/${slug}/documentos`);
  revalidatePath(`/projects/${projectId}`);
}

/** @deprecated usar clientFulfillDocumentRequest con requestId */
export async function clientUploadDocument(projectId: string, slug: string, formData: FormData) {
  return clientFulfillDocumentRequest(projectId, slug, formData);
}

export async function runDocumentRetentionDisposal() {
  await requireStaff();
  const result = await disposeExpiredDocuments(200);
  await logActivity({
    entityType: 'system',
    entityId: '00000000-0000-4000-8000-000000000001',
    action: 'retention_disposal',
    metadata: { disposed: result.disposed },
  });
  return result;
}

export async function clientAcceptQuote(quoteId: string, projectId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const { error } = await supabase
    .from('quotes')
    .update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
      accepted_by: user.id,
    })
    .eq('id', quoteId)
    .eq('project_id', projectId);

  if (error) throw await throwDb(error);

  const admin = createAdminClient();
  await admin.from('projects').update({ status: 'active' }).eq('id', projectId);

  revalidatePath(`/p`);
}

export async function clientRejectQuote(quoteId: string, projectId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const { error } = await supabase
    .from('quotes')
    .update({ status: 'rejected' })
    .eq('id', quoteId)
    .eq('project_id', projectId);

  if (error) throw await throwDb(error);
  revalidatePath(`/p`);
}

/**
 * Publica (o registra) la versión legal vigente en bitácora y notifica
 * a miembros de proyectos visibles cuya aceptación esté desactualizada.
 */
export async function publishLegalVersionAndNotify(formData: FormData) {
  const { user } = await assertCapability('legal_publish');
  const admin = createAdminClient();
  const versionCode = String(formData.get('versionCode') || LEGAL_DOCS_VERSION).trim();
  const changelog = String(formData.get('changelog') || '').trim();
  const sendEmails = formData.get('sendEmails') === 'on';

  const { error: versionError } = await admin.from('legal_document_versions').upsert(
    {
      kind: 'bundle',
      version_code: versionCode,
      changelog: changelog || `Bundle legal ${versionCode}`,
      published_at: new Date().toISOString(),
      published_by: user.id,
    },
    { onConflict: 'kind,version_code' }
  );
  if (versionError) throw await throwDb(versionError);

  if (!sendEmails) {
    revalidatePath('/settings');
    return { notified: 0, versionCode };
  }

  const { data: members } = await admin.from('project_members').select(
    'user_id, project_id, terms_version, privacy_version, nda_version, projects(id, name, slug, client_visible)'
  );

  let notified = 0;
  for (const member of members ?? []) {
    const projectRaw = member.projects as unknown as
      | { id: string; name: string; slug: string; client_visible: boolean }
      | { id: string; name: string; slug: string; client_visible: boolean }[]
      | null;
    const project = Array.isArray(projectRaw) ? projectRaw[0] : projectRaw;
    if (!project?.client_visible) continue;

    const outdated =
      member.terms_version !== versionCode ||
      member.privacy_version !== versionCode ||
      member.nda_version !== versionCode;
    if (!outdated) continue;

    const { data: already } = await admin
      .from('legal_reacceptance_notifications')
      .select('id')
      .eq('project_id', member.project_id)
      .eq('user_id', member.user_id)
      .eq('version_code', versionCode)
      .maybeSingle();
    if (already) continue;

    const { data: authUser } = await admin.auth.admin.getUserById(member.user_id);
    const email = authUser.user?.email;
    if (!email) continue;

    await sendClientEmail({
      to: email,
      subject: `Actualización legal - ${project.name}`,
      html: templateLegalReacceptance(
        project.name,
        projectPortalUrl(project.slug, '/aceptar'),
        versionCode
      ),
    });

    await admin.from('legal_reacceptance_notifications').insert({
      project_id: member.project_id,
      user_id: member.user_id,
      version_code: versionCode,
      channel: 'email',
    });
    notified += 1;
  }

  await logActivity({
    entityType: 'legal',
    entityId: versionCode,
    action: 'reacceptance_notified',
    actorId: user.id,
    metadata: { notified, versionCode },
  });

  revalidatePath('/settings');
  return { notified, versionCode };
}

function parseChargeAmount(raw: FormDataEntryValue | null): number | null {
  const text = String(raw ?? '').trim();
  if (!text) return null;
  const n = Number(text.replace(/,/g, ''));
  if (!Number.isFinite(n) || n < 0) throw new Error('Monto inválido');
  return n;
}

function parseNoticeDays(raw: FormDataEntryValue | null): number {
  const text = String(raw ?? '').trim();
  if (!text) return 30;
  const n = parseInt(text, 10);
  if (!Number.isFinite(n) || n < 0) throw new Error('Días de aviso inválidos');
  return n;
}

export async function createProjectCharge(projectId: string, formData: FormData) {
  const access = await assertCapability('charges');
  await assertProjectAccessOrThrow(access, projectId);
  const { supabase, user } = access;

  const status = String(formData.get('status') || 'pending');
  const kind = String(formData.get('kind') || 'development');
  const paidAt =
    status === 'paid'
      ? String(formData.get('paidAt') || '') || new Date().toISOString()
      : null;

  const { data: last } = await supabase
    .from('project_charges')
    .select('sort_order')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from('project_charges').insert({
    project_id: projectId,
    kind,
    title: String(formData.get('title') || '').trim() || 'Cargo',
    description: String(formData.get('description') || ''),
    amount: parseChargeAmount(formData.get('amount')),
    currency: String(formData.get('currency') || 'MXN'),
    status,
    due_date: String(formData.get('dueDate') || '') || null,
    paid_at: paidAt,
    period_label: String(formData.get('periodLabel') || '') || null,
    notice_days: parseNoticeDays(formData.get('noticeDays')),
    sort_order: (last?.sort_order ?? -1) + 1,
    visible_to_client: formData.get('visibleToClient') === 'on',
    staff_notes: String(formData.get('staffNotes') || ''),
  });
  if (error) throw await throwDb(error);

  await logActivity({
    entityType: 'project_charge',
    entityId: projectId,
    action: 'created',
    actorId: user.id,
    metadata: { project_id: projectId, kind, status },
  });

  revalidatePath(`/projects/${projectId}`);
}

export async function updateProjectCharge(
  chargeId: string,
  projectId: string,
  formData: FormData
) {
  const access = await assertCapability('charges');
  await assertProjectAccessOrThrow(access, projectId);
  const { supabase, user } = access;

  const status = String(formData.get('status') || 'pending');
  const existingPaidAt = String(formData.get('existingPaidAt') || '') || null;
  const paidAt =
    status === 'paid'
      ? String(formData.get('paidAt') || '') || existingPaidAt || new Date().toISOString()
      : null;

  const { error } = await supabase
    .from('project_charges')
    .update({
      kind: String(formData.get('kind') || 'development'),
      title: String(formData.get('title') || '').trim() || 'Cargo',
      description: String(formData.get('description') || ''),
      amount: parseChargeAmount(formData.get('amount')),
      currency: String(formData.get('currency') || 'MXN'),
      status,
      due_date: String(formData.get('dueDate') || '') || null,
      paid_at: paidAt,
      period_label: String(formData.get('periodLabel') || '') || null,
      notice_days: parseNoticeDays(formData.get('noticeDays')),
      visible_to_client: formData.get('visibleToClient') === 'on',
      staff_notes: String(formData.get('staffNotes') || ''),
      updated_at: new Date().toISOString(),
    })
    .eq('id', chargeId)
    .eq('project_id', projectId);
  if (error) throw await throwDb(error);

  await logActivity({
    entityType: 'project_charge',
    entityId: chargeId,
    action: 'updated',
    actorId: user.id,
    metadata: { project_id: projectId, status },
  });

  revalidatePath(`/projects/${projectId}`);
}

export async function deleteProjectCharge(chargeId: string, projectId: string) {
  const access = await assertCapability('charges');
  await assertProjectAccessOrThrow(access, projectId);
  const { supabase, user } = access;

  const { error } = await supabase
    .from('project_charges')
    .delete()
    .eq('id', chargeId)
    .eq('project_id', projectId);
  if (error) throw await throwDb(error);

  await logActivity({
    entityType: 'project_charge',
    entityId: chargeId,
    action: 'deleted',
    actorId: user.id,
    metadata: { project_id: projectId },
  });

  revalidatePath(`/projects/${projectId}`);
}

export async function updateProjectSiteUrls(projectId: string, formData: FormData) {
  const access = await assertCapability('site_access');
  await assertProjectAccessOrThrow(access, projectId);
  const { supabase, user } = access;

  const preview = optionalHttpUrl(String(formData.get('sitePreviewUrl') || ''));
  const production = optionalHttpUrl(String(formData.get('siteProductionUrl') || ''));

  const { error } = await supabase
    .from('projects')
    .update({
      site_preview_url: preview,
      site_production_url: production,
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId);
  if (error) throw await throwDb(error);

  await logActivity({
    entityType: 'project',
    entityId: projectId,
    action: 'site_urls_updated',
    actorId: user.id,
    metadata: {
      project_id: projectId,
      has_preview: Boolean(preview),
      has_production: Boolean(production),
    },
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/p`);
}

export async function createSiteAccess(projectId: string, formData: FormData) {
  const access = await assertCapability('site_access');
  await assertProjectAccessOrThrow(access, projectId);
  const { supabase, user } = access;

  const { data: last } = await supabase
    .from('project_site_access')
    .select('sort_order')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const label = String(formData.get('label') || '').trim() || 'Acceso';
  const kind = String(formData.get('kind') || 'other');
  const hasSecret = Boolean(String(formData.get('secret') || '').trim());

  const { data: created, error } = await supabase
    .from('project_site_access')
    .insert({
      project_id: projectId,
      label,
      kind,
      url: optionalHttpUrl(String(formData.get('url') || '')),
      username: String(formData.get('username') || '').trim() || null,
      secret: String(formData.get('secret') || '').trim() || null,
      notes: String(formData.get('notes') || ''),
      visible_to_client: formData.get('visibleToClient') === 'on',
      sort_order: (last?.sort_order ?? -1) + 1,
    })
    .select('id')
    .single();
  if (error || !created) throw await throwDb(error);

  await logActivity({
    entityType: 'project_site_access',
    entityId: created.id,
    action: 'created',
    actorId: user.id,
    metadata: { project_id: projectId, kind, label, has_secret: hasSecret },
  });

  revalidatePath(`/projects/${projectId}`);
}

export async function updateSiteAccess(accessId: string, projectId: string, formData: FormData) {
  const access = await assertCapability('site_access');
  await assertProjectAccessOrThrow(access, projectId);
  const { supabase, user } = access;

  const label = String(formData.get('label') || '').trim() || 'Acceso';
  const kind = String(formData.get('kind') || 'other');
  const secretRaw = String(formData.get('secret') || '');
  const keepSecret = formData.get('keepSecret') === 'on';
  const hasSecretInput = Boolean(secretRaw.trim());

  const payload: Record<string, unknown> = {
    label,
    kind,
    url: optionalHttpUrl(String(formData.get('url') || '')),
    username: String(formData.get('username') || '').trim() || null,
    notes: String(formData.get('notes') || ''),
    visible_to_client: formData.get('visibleToClient') === 'on',
    updated_at: new Date().toISOString(),
  };
  if (hasSecretInput) {
    payload.secret = secretRaw.trim();
  } else if (!keepSecret) {
    payload.secret = null;
  }

  const { error } = await supabase
    .from('project_site_access')
    .update(payload)
    .eq('id', accessId)
    .eq('project_id', projectId);
  if (error) throw await throwDb(error);

  await logActivity({
    entityType: 'project_site_access',
    entityId: accessId,
    action: 'updated',
    actorId: user.id,
    metadata: {
      project_id: projectId,
      kind,
      label,
      secret_changed: hasSecretInput || !keepSecret,
    },
  });

  revalidatePath(`/projects/${projectId}`);
}

export async function deleteSiteAccess(accessId: string, projectId: string) {
  const access = await assertCapability('site_access');
  await assertProjectAccessOrThrow(access, projectId);
  const { supabase, user } = access;

  const { error } = await supabase
    .from('project_site_access')
    .delete()
    .eq('id', accessId)
    .eq('project_id', projectId);
  if (error) throw await throwDb(error);

  await logActivity({
    entityType: 'project_site_access',
    entityId: accessId,
    action: 'deleted',
    actorId: user.id,
    metadata: { project_id: projectId },
  });

  revalidatePath(`/projects/${projectId}`);
}

const PERSONNEL_OFFER_STATUSES = ['draft', 'sent', 'accepted', 'declined', 'withdrawn'] as const;
const PERSONNEL_MODALITIES = ['remote', 'hybrid', 'onsite'] as const;

function optionalDate(value: FormDataEntryValue | null): string | null {
  const raw = String(value || '').trim();
  return raw || null;
}

export async function createPersonnelOffer(formData: FormData) {
  const { user, supabase } = await requireAdminStaff();

  const fullName = String(formData.get('fullName') || '').trim();
  const email = String(formData.get('email') || '').trim().toLowerCase() || null;
  const careerEmail = String(formData.get('careerEmail') || '').trim().toLowerCase() || null;
  const positionTitle = String(formData.get('positionTitle') || '').trim();
  const opsRole = String(formData.get('opsRole') || 'pm');
  const monthlyCompensation = Number(formData.get('monthlyCompensation'));
  const currency = String(formData.get('currency') || 'USD').trim().toUpperCase() || 'USD';
  const workModality = String(formData.get('workModality') || 'remote');
  const startDate = optionalDate(formData.get('startDate'));
  const validUntil = optionalDate(formData.get('validUntil'));
  const issuedAt = optionalDate(formData.get('issuedAt')) || new Date().toISOString().slice(0, 10);
  const responsibilities = String(formData.get('responsibilities') || '').trim();
  const terms = String(formData.get('terms') || '').trim();
  const notesInternal = String(formData.get('notesInternal') || '').trim();
  const status = String(formData.get('status') || 'draft');

  if (!fullName) throw new Error('Nombre requerido');
  if (!positionTitle) throw new Error('Puesto requerido');
  if (!Number.isFinite(monthlyCompensation) || monthlyCompensation <= 0) {
    throw new Error('Compensación inválida');
  }
  if (!['admin', 'pm', 'dev'].includes(opsRole)) throw new Error('Rol Ops inválido');
  if (!PERSONNEL_MODALITIES.includes(workModality as (typeof PERSONNEL_MODALITIES)[number])) {
    throw new Error('Modalidad inválida');
  }
  if (!PERSONNEL_OFFER_STATUSES.includes(status as (typeof PERSONNEL_OFFER_STATUSES)[number])) {
    throw new Error('Estado inválido');
  }

  const { data, error } = await supabase
    .from('ops_personnel_offers')
    .insert({
      full_name: fullName,
      email,
      career_email: careerEmail,
      position_title: positionTitle,
      ops_role: opsRole,
      monthly_compensation: monthlyCompensation,
      currency,
      work_modality: workModality,
      start_date: startDate,
      valid_until: validUntil,
      issued_at: issuedAt,
      responsibilities,
      terms,
      notes_internal: notesInternal,
      status,
      created_by: user.id,
    })
    .select('id')
    .single();

  if (error || !data) throw await throwDb(error);

  revalidatePath('/team');
  revalidatePath(`/team/ofertas/${data.id}`);
  redirect(`/team/ofertas/${data.id}`);
}

export async function updatePersonnelOffer(offerId: string, formData: FormData) {
  const { supabase } = await requireAdminStaff();

  const fullName = String(formData.get('fullName') || '').trim();
  const email = String(formData.get('email') || '').trim().toLowerCase() || null;
  const careerEmail = String(formData.get('careerEmail') || '').trim().toLowerCase() || null;
  const positionTitle = String(formData.get('positionTitle') || '').trim();
  const opsRole = String(formData.get('opsRole') || 'pm');
  const monthlyCompensation = Number(formData.get('monthlyCompensation'));
  const currency = String(formData.get('currency') || 'USD').trim().toUpperCase() || 'USD';
  const workModality = String(formData.get('workModality') || 'remote');
  const startDate = optionalDate(formData.get('startDate'));
  const validUntil = optionalDate(formData.get('validUntil'));
  const issuedAt = optionalDate(formData.get('issuedAt'));
  const responsibilities = String(formData.get('responsibilities') || '').trim();
  const terms = String(formData.get('terms') || '').trim();
  const notesInternal = String(formData.get('notesInternal') || '').trim();
  const status = String(formData.get('status') || 'draft');

  if (!fullName) throw new Error('Nombre requerido');
  if (!positionTitle) throw new Error('Puesto requerido');
  if (!Number.isFinite(monthlyCompensation) || monthlyCompensation <= 0) {
    throw new Error('Compensación inválida');
  }
  if (!['admin', 'pm', 'dev'].includes(opsRole)) throw new Error('Rol Ops inválido');
  if (!PERSONNEL_MODALITIES.includes(workModality as (typeof PERSONNEL_MODALITIES)[number])) {
    throw new Error('Modalidad inválida');
  }
  if (!PERSONNEL_OFFER_STATUSES.includes(status as (typeof PERSONNEL_OFFER_STATUSES)[number])) {
    throw new Error('Estado inválido');
  }

  const { error } = await supabase
    .from('ops_personnel_offers')
    .update({
      full_name: fullName,
      email,
      career_email: careerEmail,
      position_title: positionTitle,
      ops_role: opsRole,
      monthly_compensation: monthlyCompensation,
      currency,
      work_modality: workModality,
      start_date: startDate,
      valid_until: validUntil,
      issued_at: issuedAt || undefined,
      responsibilities,
      terms,
      notes_internal: notesInternal,
      status,
    })
    .eq('id', offerId);

  if (error) throw await throwDb(error);

  revalidatePath('/team');
  revalidatePath(`/team/ofertas/${offerId}`);
}

export async function updatePersonnelOfferStatus(offerId: string, formData: FormData) {
  const { supabase } = await requireAdminStaff();
  const status = String(formData.get('status') || '').trim();
  if (!PERSONNEL_OFFER_STATUSES.includes(status as (typeof PERSONNEL_OFFER_STATUSES)[number])) {
    throw new Error('Estado inválido');
  }

  const { error } = await supabase
    .from('ops_personnel_offers')
    .update({ status })
    .eq('id', offerId);

  if (error) throw await throwDb(error);

  revalidatePath('/team');
  revalidatePath(`/team/ofertas/${offerId}`);
}

export async function assignProjectStaff(projectId: string, formData: FormData) {
  const access = await requireStaff();
  if (!canAny(access.staff, ['team', 'sprints_plan'])) {
    throw new Error('No tienes permiso');
  }
  if (!can(access.staff, 'projects_all') && !can(access.staff, 'team')) {
    await assertProjectAccessOrThrow(access, projectId);
  }

  const staffId = String(formData.get('staffId') || '').trim();
  const roleOnProject = String(formData.get('roleOnProject') || 'member');
  if (!staffId) throw new Error('Staff requerido');
  if (!['pm', 'dev', 'member'].includes(roleOnProject)) throw new Error('Rol de proyecto inválido');

  const { error } = await access.supabase.from('project_staff').upsert({
    project_id: projectId,
    staff_id: staffId,
    role_on_project: roleOnProject,
  });
  if (error) throw await throwDb(error);

  revalidatePath(`/projects/${projectId}`);
  revalidatePath('/projects');
  revalidatePath('/team');
}

export async function removeProjectStaff(projectId: string, staffId: string) {
  const access = await requireStaff();
  if (!canAny(access.staff, ['team', 'sprints_plan'])) {
    throw new Error('No tienes permiso');
  }
  if (!can(access.staff, 'projects_all') && !can(access.staff, 'team')) {
    await assertProjectAccessOrThrow(access, projectId);
  }

  const { error } = await access.supabase
    .from('project_staff')
    .delete()
    .eq('project_id', projectId)
    .eq('staff_id', staffId);
  if (error) throw await throwDb(error);

  revalidatePath(`/projects/${projectId}`);
  revalidatePath('/projects');
  revalidatePath('/team');
}

export async function createProjectSprint(projectId: string, formData: FormData) {
  const access = await assertCapability('sprints_plan');
  await assertProjectAccessOrThrow(access, projectId);

  const name = String(formData.get('name') || '').trim();
  if (!name) throw new Error('Nombre del sprint requerido');

  const { error } = await access.supabase.from('project_sprints').insert({
    project_id: projectId,
    name,
    goal: String(formData.get('goal') || '').trim(),
    starts_on: String(formData.get('startsOn') || '') || null,
    ends_on: String(formData.get('endsOn') || '') || null,
    status: String(formData.get('status') || 'planned'),
    created_by: access.user.id,
  });
  if (error) throw await throwDb(error);

  revalidatePath(`/projects/${projectId}`);
}

export async function updateProjectSprint(sprintId: string, projectId: string, formData: FormData) {
  const access = await assertCapability('sprints_plan');
  await assertProjectAccessOrThrow(access, projectId);

  const { error } = await access.supabase
    .from('project_sprints')
    .update({
      name: String(formData.get('name') || '').trim(),
      goal: String(formData.get('goal') || '').trim(),
      starts_on: String(formData.get('startsOn') || '') || null,
      ends_on: String(formData.get('endsOn') || '') || null,
      status: String(formData.get('status') || 'planned'),
    })
    .eq('id', sprintId)
    .eq('project_id', projectId);
  if (error) throw await throwDb(error);

  revalidatePath(`/projects/${projectId}`);
}

export async function createSprintItem(sprintId: string, projectId: string, formData: FormData) {
  const access = await assertCapability('sprints_plan');
  await assertProjectAccessOrThrow(access, projectId);

  const title = String(formData.get('title') || '').trim();
  if (!title) throw new Error('Título requerido');

  const assigneeId = String(formData.get('assigneeId') || '').trim() || null;

  const { error } = await access.supabase.from('sprint_items').insert({
    sprint_id: sprintId,
    title,
    details: String(formData.get('details') || '').trim(),
    status: String(formData.get('status') || 'todo'),
    assignee_id: assigneeId,
    sort_order: Number(formData.get('sortOrder') || 0) || 0,
  });
  if (error) throw await throwDb(error);

  revalidatePath(`/projects/${projectId}`);
}

export async function updateSprintItem(itemId: string, projectId: string, formData: FormData) {
  const access = await requireStaff();
  await assertProjectAccessOrThrow(access, projectId);

  const { data: item } = await access.supabase
    .from('sprint_items')
    .select('id, assignee_id, sprint_id')
    .eq('id', itemId)
    .maybeSingle();
  if (!item) throw new Error('Ítem no encontrado');

  const canPlan = can(access.staff, 'sprints_plan');
  const isAssignee = item.assignee_id === access.user.id;
  if (!canPlan && !(can(access.staff, 'sprints_update_own') && isAssignee)) {
    throw new Error('No tienes permiso para actualizar este ítem');
  }

  const status = String(formData.get('status') || '').trim();
  if (!['todo', 'in_progress', 'done', 'blocked'].includes(status)) {
    throw new Error('Estado inválido');
  }

  const payload: Record<string, unknown> = { status };

  if (canPlan) {
    const title = String(formData.get('title') || '').trim();
    if (title) payload.title = title;
    if (formData.has('details')) payload.details = String(formData.get('details') || '').trim();
    if (formData.has('assigneeId')) {
      payload.assignee_id = String(formData.get('assigneeId') || '').trim() || null;
    }
  }

  const { error } = await access.supabase.from('sprint_items').update(payload).eq('id', itemId);
  if (error) throw await throwDb(error);

  revalidatePath(`/projects/${projectId}`);
  revalidatePath('/workload');
}

export async function updateOrganization(orgId: string, formData: FormData) {
  const { supabase, user } = await assertCapability('organizations');

  const name = String(formData.get('name') || '').trim();
  if (!name) throw new Error('Nombre requerido');

  const { error } = await supabase
    .from('organizations')
    .update({
      name,
      contact_email: String(formData.get('contactEmail') || '').trim() || null,
      contact_phone: String(formData.get('contactPhone') || '').trim() || null,
      logo_url: String(formData.get('logoUrl') || '').trim() || null,
    })
    .eq('id', orgId);
  if (error) throw await throwDb(error);

  await logActivity({
    entityType: 'organization',
    entityId: orgId,
    action: 'updated',
    actorId: user.id,
  });

  revalidatePath('/organizations');
  revalidatePath(`/organizations/${orgId}`);
}

export async function createOrganization(formData: FormData) {
  const { supabase, user } = await assertCapability('organizations');

  const name = String(formData.get('name') || '').trim();
  if (!name) throw new Error('Nombre requerido');

  const { data, error } = await supabase
    .from('organizations')
    .insert({
      name,
      contact_email: String(formData.get('contactEmail') || '').trim() || null,
      contact_phone: String(formData.get('contactPhone') || '').trim() || null,
      logo_url: String(formData.get('logoUrl') || '').trim() || null,
    })
    .select('id')
    .single();
  if (error || !data) throw await throwDb(error);

  await logActivity({
    entityType: 'organization',
    entityId: data.id,
    action: 'created',
    actorId: user.id,
  });

  revalidatePath('/organizations');
  return data.id;
}

export async function createTimeEntry(projectId: string, formData: FormData) {
  const access = await assertCapability('time_entries');
  await assertProjectAccessOrThrow(access, projectId);

  const hours = Number(String(formData.get('hours') || '').replace(/,/g, ''));
  if (!Number.isFinite(hours) || hours <= 0 || hours > 24) {
    throw new Error('Horas inválidas (1-24)');
  }

  const staffId = can(access.staff, 'sprints_plan')
    ? String(formData.get('staffId') || '').trim() || access.user.id
    : access.user.id;

  const sprintItemId = String(formData.get('sprintItemId') || '').trim() || null;
  const workedOn = String(formData.get('workedOn') || '').trim() || new Date().toISOString().slice(0, 10);

  const { error } = await access.supabase.from('time_entries').insert({
    project_id: projectId,
    sprint_item_id: sprintItemId,
    staff_id: staffId,
    hours,
    worked_on: workedOn,
    notes: String(formData.get('notes') || '').trim(),
  });
  if (error) throw await throwDb(error);

  revalidatePath(`/projects/${projectId}`);
  revalidatePath('/workload');
}

export async function deleteTimeEntry(entryId: string, projectId: string) {
  const access = await assertCapability('time_entries');
  await assertProjectAccessOrThrow(access, projectId);

  let query = access.supabase.from('time_entries').delete().eq('id', entryId).eq('project_id', projectId);
  if (!can(access.staff, 'sprints_plan')) {
    query = query.eq('staff_id', access.user.id);
  }

  const { error } = await query;
  if (error) throw await throwDb(error);

  revalidatePath(`/projects/${projectId}`);
  revalidatePath('/workload');
}

