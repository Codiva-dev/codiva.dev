'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdminStaff } from '@/lib/ops/auth';
import {
  capabilitiesFromRole,
  parseCapabilities,
} from '@/lib/ops/permissions';
import { logActivity } from '@/lib/ops/activity';
import { sendClientEmail } from '@/lib/ops/email';
import { getT } from '@/i18n/locale';
import { throwDb } from '@/lib/ops/throw-db';
import {
  templateStaffInviteNewUser,
  templateStaffInviteExistingUser,
} from '@/lib/ops/email-templates';
import { opsLoginUrl } from '@/lib/ops/host';
import {
  deleteOpsFile,
  uploadOpsFile,
} from '@/lib/ops/storage';
import { scanUploadedBytes } from '@/lib/ops/malware-scan';
import { findUserIdByEmail } from '@/lib/ops/auth-users';

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

export async function deleteStaffMember(staffId: string) {
  const { user } = await requireAdminStaff();
  const t = await getT();
  const admin = createAdminClient();

  if (staffId === user.id) {
    throw new Error(t('ops.team.cannotDeleteSelf'));
  }

  const { data: current } = await admin
    .from('staff_profiles')
    .select('id, full_name, role, active, capabilities')
    .eq('id', staffId)
    .maybeSingle();
  if (!current) throw new Error(t('ops.team.memberNotFound'));

  const { data: others } = await admin
    .from('staff_profiles')
    .select('id, role, active, capabilities')
    .eq('active', true)
    .neq('id', staffId);
  const otherHasTeam = (others ?? []).some((row) => {
    if (Array.isArray(row.capabilities) && row.capabilities.includes('team')) return true;
    return !row.capabilities?.length && row.role === 'admin';
  });
  if (!otherHasTeam) {
    throw new Error(t('ops.team.lastTeamManager'));
  }

  await admin.from('project_staff').delete().eq('staff_id', staffId);
  const { error } = await admin.from('staff_profiles').delete().eq('id', staffId);
  if (error) throw await throwDb(error);
  await admin.auth.admin.deleteUser(staffId).catch(() => undefined);

  await logActivity({
    entityType: 'staff_profile',
    entityId: staffId,
    action: 'deleted',
    metadata: { name: current.full_name },
    actorId: user.id,
  });

  revalidatePath('/team');
  revalidatePath('/settings');
}
