'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  assertCapability,
  assertProjectAccessOrThrow,
} from '@/lib/ops/auth';
import { sendClientEmail } from '@/lib/ops/email';
import { throwDb } from '@/lib/ops/throw-db';
import { templatePortalInviteExistingUser } from '@/lib/ops/email-templates';
import { portalLoginUrl } from '@/lib/ops/host';
import { invitePortalUserCore } from '@/lib/ops/portal-invite';
import {
  syncHubUserPartnerProjects,
  upsertPortalHubProfile,
} from '@/lib/ops/portal-hub';

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

export async function setPortalUserHub(userId: string, formData: FormData) {
  await assertCapability('portal_users');
  const isHub = formData.get('isHub') === 'on';
  const displayName = String(formData.get('displayName') || '').trim() || null;
  await upsertPortalHubProfile(userId, { isHub, displayName });
  const ids = isHub ? await syncHubUserPartnerProjects(userId) : [];
  revalidatePath('/users');
  revalidatePath(`/users/${userId}`);
  for (const id of ids) revalidatePath(`/projects/${id}`);
}

export async function syncPortalHubProjects(userId: string) {
  await assertCapability('portal_users');
  const ids = await syncHubUserPartnerProjects(userId);
  revalidatePath('/users');
  revalidatePath(`/users/${userId}`);
  for (const id of ids) revalidatePath(`/projects/${id}`);
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
