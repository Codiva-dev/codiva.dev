'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  requireStaffWrite,
  assertCapabilityWrite,
  assertProjectAccessOrThrow,
} from '@/lib/ops/auth';
import { logActivity } from '@/lib/ops/activity';
import { generateProjectSlug } from '@/lib/ops/slug';
import { throwDb } from '@/lib/ops/throw-db';
import { associatePartnerPortalUsers } from '@/lib/ops/portal-hub';

export async function convertLeadToProject(leadId: string) {
  const { supabase, user, staff } = await assertCapabilityWrite('leads');
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

  await associatePartnerPortalUsers({ projectId: project.id, lead });

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
  revalidatePath('/pendientes');
  return { projectId: project.id, slug: project.slug };
}

export async function createProject(formData: FormData) {
  const { user, staff } = await assertCapabilityWrite('projects_create');
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
  const access = await requireStaffWrite();
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
  const access = await assertCapabilityWrite('milestones_write');
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
  const access = await assertCapabilityWrite('milestones_write');
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
  const access = await assertCapabilityWrite('milestones_write');
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
