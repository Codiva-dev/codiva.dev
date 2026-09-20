'use server';

import { revalidatePath } from 'next/cache';
import {
  requireStaffWrite,
  assertCapabilityWrite,
  assertProjectAccessOrThrow,
} from '@/lib/ops/auth';
import { can } from '@/lib/ops/permissions';
import { logActivity } from '@/lib/ops/activity';
import { throwDb } from '@/lib/ops/throw-db';

export async function createProjectSprint(projectId: string, formData: FormData) {
  const access = await assertCapabilityWrite('sprints_plan');
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
  const access = await assertCapabilityWrite('sprints_plan');
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
  const access = await assertCapabilityWrite('sprints_plan');
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
  const access = await requireStaffWrite();
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
  const { supabase, user } = await assertCapabilityWrite('organizations');

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
  const { supabase, user } = await assertCapabilityWrite('organizations');

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
  const access = await assertCapabilityWrite('time_entries');
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
  const access = await assertCapabilityWrite('time_entries');
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
