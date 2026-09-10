import { createAdminClient } from '@/lib/supabase/admin';
import { findUserIdByEmail } from '@/lib/ops/auth-users';
import { invitePortalUserCore } from '@/lib/ops/portal-invite';

export function isPlaceholderPortalEmail(email: string | null | undefined): boolean {
  const value = (email || '').trim().toLowerCase();
  if (!value) return true;
  return /portal-pendiente@codiva\.dev$/i.test(value);
}

export function normalizePersonName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function namesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const left = normalizePersonName(a || '');
  const right = normalizePersonName(b || '');
  if (!left || !right) return false;
  return left === right;
}

export type PartnerHubUser = {
  email: string;
  displayName: string | null;
  isHub: boolean;
};

export function emailsForPartnerPortalAccess(input: {
  leadEmail?: string | null;
  partnerEmail?: string | null;
  partnerName?: string | null;
  hubUsers: PartnerHubUser[];
}): string[] {
  const emails = new Set<string>();
  const add = (raw: string | null | undefined) => {
    const email = (raw || '').trim().toLowerCase();
    if (!email || isPlaceholderPortalEmail(email)) return;
    emails.add(email);
  };

  add(input.partnerEmail);
  add(input.leadEmail);

  for (const hub of input.hubUsers) {
    if (!hub.isHub) continue;
    if (
      namesMatch(input.partnerName, hub.displayName) ||
      namesMatch(input.partnerEmail, hub.email)
    ) {
      add(hub.email);
    }
  }

  return [...emails];
}

type LeadLike = {
  email?: string | null;
  partner_email?: string | null;
  partner_name?: string | null;
};

async function loadHubUsers(): Promise<PartnerHubUser[]> {
  const admin = createAdminClient();
  const { data: profiles } = await admin
    .from('portal_user_profiles')
    .select('user_id, is_hub, display_name')
    .eq('is_hub', true);
  const users: PartnerHubUser[] = [];
  for (const row of profiles ?? []) {
    const { data } = await admin.auth.admin.getUserById(row.user_id);
    const email = data.user?.email?.toLowerCase();
    if (!email) continue;
    users.push({
      email,
      displayName: row.display_name,
      isHub: row.is_hub,
    });
  }
  return users;
}

async function copyCompletedLegalToProject(userId: string, projectId: string) {
  const admin = createAdminClient();
  const { data: source } = await admin
    .from('project_members')
    .select('terms_accepted_at, terms_version, privacy_accepted_at, privacy_version, nda_accepted_at, nda_version')
    .eq('user_id', userId)
    .not('nda_accepted_at', 'is', null)
    .not('terms_accepted_at', 'is', null)
    .not('privacy_accepted_at', 'is', null)
    .neq('project_id', projectId)
    .limit(1)
    .maybeSingle();
  if (!source?.nda_accepted_at) return;
  await admin
    .from('project_members')
    .update({
      terms_accepted_at: source.terms_accepted_at,
      terms_version: source.terms_version,
      privacy_accepted_at: source.privacy_accepted_at,
      privacy_version: source.privacy_version,
      nda_accepted_at: source.nda_accepted_at,
      nda_version: source.nda_version,
    })
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .is('nda_accepted_at', null);
}

export async function associatePartnerPortalUsers(opts: {
  projectId: string;
  lead?: LeadLike | null;
  sendEmail?: boolean;
  role?: string;
}): Promise<string[]> {
  const hubUsers = await loadHubUsers();
  const emails = emailsForPartnerPortalAccess({
    leadEmail: opts.lead?.email,
    partnerEmail: opts.lead?.partner_email,
    partnerName: opts.lead?.partner_name,
    hubUsers,
  });
  const invited: string[] = [];
  for (const email of emails) {
    const existingId = await findUserIdByEmail(email);
    if (!existingId && opts.sendEmail !== true) continue;
    const result = await invitePortalUserCore({
      email,
      role: opts.role || 'approver',
      projectIds: [opts.projectId],
      sendEmail: opts.sendEmail === true,
    });
    await copyCompletedLegalToProject(result.userId, opts.projectId);
    invited.push(email);
  }
  return invited;
}

export async function syncHubUserPartnerProjects(userId: string): Promise<string[]> {
  const admin = createAdminClient();
  const { data: authUser } = await admin.auth.admin.getUserById(userId);
  const email = authUser.user?.email?.toLowerCase();
  if (!email) return [];

  const { data: profile } = await admin
    .from('portal_user_profiles')
    .select('is_hub, display_name')
    .eq('user_id', userId)
    .maybeSingle();
  if (!profile?.is_hub) return [];

  const { data: projects } = await admin
    .from('projects')
    .select('id, leads!lead_id(email, partner_email, partner_name)');

  const ids: string[] = [];
  for (const project of projects ?? []) {
    const raw = project.leads as LeadLike | LeadLike[] | null;
    const lead = Array.isArray(raw) ? raw[0] : raw;
    const emails = emailsForPartnerPortalAccess({
      leadEmail: lead?.email,
      partnerEmail: lead?.partner_email,
      partnerName: lead?.partner_name,
      hubUsers: [{ email, displayName: profile.display_name, isHub: true }],
    });
    if (!emails.includes(email)) continue;
    ids.push(project.id);
  }
  if (!ids.length) return [];

  await invitePortalUserCore({
    email,
    role: 'approver',
    projectIds: ids,
    sendEmail: false,
  });
  for (const projectId of ids) {
    await copyCompletedLegalToProject(userId, projectId);
  }
  return ids;
}

export async function upsertPortalHubProfile(
  userId: string,
  input: { isHub: boolean; displayName?: string | null }
) {
  const admin = createAdminClient();
  const { error } = await admin.from('portal_user_profiles').upsert({
    user_id: userId,
    is_hub: input.isHub,
    display_name: input.displayName?.trim() || null,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}
