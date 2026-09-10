import { createAdminClient } from '@/lib/supabase/admin';
import { throwDb, throwPublic } from '@/lib/ops/throw-db';
import { sendClientEmail } from '@/lib/ops/email';
import {
  templatePortalInviteExistingUser,
  templatePortalInviteNewUser,
} from '@/lib/ops/email-templates';
import { portalLoginUrl } from '@/lib/ops/host';
import { findUserIdByEmail } from '@/lib/ops/auth-users';

export type PortalInviteResult = {
  userId: string;
  projectIds: string[];
  projectNames: string[];
  isNewUser: boolean;
};

function formatProjectLabel(names: string[]): string {
  if (names.length === 0) return 'portal';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} y ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
}

/** Crea/encuentra usuario, upsert membresías y envía un solo correo. */
export async function invitePortalUserCore(opts: {
  email: string;
  role: string;
  projectIds: string[];
  sendEmail?: boolean;
}): Promise<PortalInviteResult> {
  const email = opts.email.trim().toLowerCase();
  const role = opts.role || 'viewer';
  const projectIds = [...new Set(opts.projectIds.filter(Boolean))];
  if (!email) throw new Error('Email requerido');
  if (!projectIds.length) throw new Error('Selecciona al menos un proyecto');
  if (!['viewer', 'approver'].includes(role)) throw new Error('Rol inválido');

  const admin = createAdminClient();
  const { data: projects, error: projectsError } = await admin
    .from('projects')
    .select(
      'id, slug, name, client_visible, organization_id, leads!lead_id(partner_name, end_client_company, end_client_name)'
    )
    .in('id', projectIds);

  if (projectsError) throw await throwDb(projectsError);
  if (!projects?.length || projects.length !== projectIds.length) {
    throw new Error('Uno o más proyectos no existen');
  }

  const firstLead = (
    projects[0] as {
      leads?: {
        partner_name?: string | null;
        end_client_company?: string | null;
        end_client_name?: string | null;
      } | null;
    }
  )?.leads;

  const inviteContext = {
    partnerName: firstLead?.partner_name || undefined,
    endClientLabel: firstLead?.end_client_company || firstLead?.end_client_name || undefined,
  };

  const projectNames = projects.map((p) => p.name);
  const projectLabel = formatProjectLabel(projectNames);
  const loginUrl = portalLoginUrl();

  let userId: string;
  let isNewUser = false;
  let tempPassword: string | undefined;

  const existingId = await findUserIdByEmail(email);
  if (existingId) {
    userId = existingId;
  } else {
    tempPassword = crypto.randomUUID();
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    });
    if (error || !created?.user) throw await throwDb(error);
    userId = created.user.id;
    isNewUser = true;
  }

  const { data: existingMembers } = await admin
    .from('project_members')
    .select('project_id')
    .eq('user_id', userId)
    .in('project_id', projectIds);
  const existingIds = new Set((existingMembers ?? []).map((row) => row.project_id));

  const now = new Date().toISOString();
  for (const project of projects) {
    if (!existingIds.has(project.id)) {
      const { error: memberError } = await admin.from('project_members').insert({
        project_id: project.id,
        user_id: userId,
        role,
        accepted_at: now,
      });
      if (memberError) throw await throwDb(memberError);
    }

    if (!project.client_visible) {
      await admin.from('projects').update({ client_visible: true }).eq('id', project.id);
    }
  }

  if (opts.sendEmail !== false) {
    const html = isNewUser
      ? templatePortalInviteNewUser(projectLabel, email, tempPassword!, loginUrl, inviteContext)
      : templatePortalInviteExistingUser(projectLabel, loginUrl, inviteContext);

    const mail = await sendClientEmail({
      to: email,
      subject: `Acceso a tu portal - ${projectLabel}`,
      html,
    });
    if (!mail.ok && !mail.skipped) {
      console.error('[ops invite mail]', mail.error);
      await throwPublic('auth.sendFailed');
    }
  }

  return {
    userId,
    projectIds: projects.map((p) => p.id),
    projectNames,
    isNewUser,
  };
}
