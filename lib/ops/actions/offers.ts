'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  requireStaff,
  requireAdminStaff,
  assertProjectAccessOrThrow,
} from '@/lib/ops/auth';
import {
  can,
  canAny,
} from '@/lib/ops/permissions';
import { logActivity } from '@/lib/ops/activity';
import { getT } from '@/i18n/locale';
import { throwDb } from '@/lib/ops/throw-db';

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

export async function deletePersonnelOffer(offerId: string) {
  const { user, supabase } = await requireAdminStaff();
  const t = await getT();

  const { data: current } = await supabase
    .from('ops_personnel_offers')
    .select('id, full_name, staff_id')
    .eq('id', offerId)
    .maybeSingle();
  if (!current) throw new Error(t('ops.offer.notFound'));

  const { error } = await supabase.from('ops_personnel_offers').delete().eq('id', offerId);
  if (error) throw await throwDb(error);

  await logActivity({
    entityType: 'personnel_offer',
    entityId: offerId,
    action: 'deleted',
    metadata: { name: current.full_name },
    actorId: user.id,
  });

  revalidatePath('/team');
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

  const admin = createAdminClient();
  const { error } = await admin.from('project_staff').upsert({
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

  const { error } = await createAdminClient()
    .from('project_staff')
    .delete()
    .eq('project_id', projectId)
    .eq('staff_id', staffId);
  if (error) throw await throwDb(error);

  revalidatePath(`/projects/${projectId}`);
  revalidatePath('/projects');
  revalidatePath('/team');
}
