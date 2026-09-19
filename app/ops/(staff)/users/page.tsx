import OpsPageHeader from '@/components/ops/OpsPageHeader';
import ToastForm from '@/components/ops/ToastForm';
import Button from '@/components/ui/Button';
import Card, { SectionTitle } from '@/components/ui/Card';
import Input, { Select } from '@/components/ui/Input';
import OpsPortalUsersList from '@/components/ops/search/OpsPortalUsersList';
import { listVisibleProjectIds, projectIdInFilter, requireCapability } from '@/lib/ops/auth';
import { invitePortalUser } from '@/lib/ops/actions';
import { getAcceptanceStatus } from '@/lib/ops/legal/acceptances';
import { createAdminClient } from '@/lib/supabase/admin';
import { getT } from '@/i18n/locale';

type MemberRow = {
  user_id: string;
  role: string;
  terms_accepted_at: string | null;
  terms_version: string | null;
  privacy_accepted_at: string | null;
  privacy_version: string | null;
  nda_accepted_at: string | null;
  nda_version: string | null;
  projects: { id: string; name: string; organization_id: string | null } | null;
};

export default async function PortalUsersPage() {
  const { supabase, user, staff } = await requireCapability('portal_users');
  const t = await getT();
  const admin = createAdminClient();
  const visibleIds = projectIdInFilter(await listVisibleProjectIds(supabase, user.id, staff));

  let membersQuery = supabase
    .from('project_members')
    .select(
      'user_id, role, terms_accepted_at, terms_version, privacy_accepted_at, privacy_version, nda_accepted_at, nda_version, projects(id, name, organization_id)'
    )
    .order('invited_at', { ascending: false });
  let projectsQuery = supabase.from('projects').select('id, name, status, organizations(name)').order('name');
  if (visibleIds) {
    membersQuery = membersQuery.in('project_id', visibleIds);
    projectsQuery = projectsQuery.in('id', visibleIds);
  }

  const [{ data: members }, { data: projects }] = await Promise.all([membersQuery, projectsQuery]);

  const byUser = new Map<
    string,
    {
      roles: Set<string>;
      projects: { id: string; name: string }[];
      allComplete: boolean;
    }
  >();

  for (const row of (members ?? []) as unknown as MemberRow[]) {
    const project = row.projects;
    const entry = byUser.get(row.user_id) ?? {
      roles: new Set<string>(),
      projects: [],
      allComplete: true,
    };
    entry.roles.add(row.role);
    if (project && !entry.projects.some((p) => p.id === project.id)) {
      entry.projects.push({ id: project.id, name: project.name });
    }
    if (!getAcceptanceStatus(row).complete) entry.allComplete = false;
    byUser.set(row.user_id, entry);
  }

  const emails = new Map<string, string>();
  await Promise.all(
    [...byUser.keys()].map(async (userId) => {
      const { data } = await admin.auth.admin.getUserById(userId);
      if (data.user?.email) emails.set(userId, data.user.email);
    })
  );

  const { data: hubProfiles } = await admin
    .from('portal_user_profiles')
    .select('user_id, is_hub')
    .eq('is_hub', true);
  const hubIds = new Set((hubProfiles ?? []).map((row) => row.user_id));

  async function onInvite(formData: FormData) {
    'use server';
    await invitePortalUser(formData);
  }

  return (
    <div>
      <OpsPageHeader
        title={t('ops.pages.users')}
        description={t('ops.pages.usersDesc')}
      />

      <div className="max-w-3xl space-y-8">
        <ToastForm success={t('ops.portalUsers.inviteSent')} action={onInvite} className="space-y-3">
          <Card className="space-y-3">
            <SectionTitle>{t('ops.portalUsers.inviteTitle')}</SectionTitle>
          <Input
            name="email"
            type="email"
            required
            placeholder={t('ops.portalUsers.emailPlaceholder')}
            size="sm"
          />
          <Select name="role" size="sm">
            <option value="viewer">{t('ops.portalUsers.roleViewer')}</option>
            <option value="approver">{t('ops.portalUsers.roleApprover')}</option>
          </Select>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-zinc-700">{t('ops.portalUsers.projects')}</legend>
            <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-zinc-200 p-3">
              {(projects ?? []).map((p) => {
                const org = p.organizations as { name?: string } | { name?: string }[] | null;
                const orgName = Array.isArray(org) ? org[0]?.name : org?.name;
                return (
                  <label key={p.id} className="flex items-start gap-2 text-sm">
                    <input type="checkbox" name="projectIds" value={p.id} className="mt-1" />
                    <span>
                      {p.name}
                      {orgName ? <span className="text-zinc-500"> · {orgName}</span> : null}
                    </span>
                  </label>
                );
              })}
              {!projects?.length && (
                <p className="text-sm text-zinc-500">{t('ops.portalUsers.noProjectsYet')}</p>
              )}
            </div>
          </fieldset>
          <Button type="submit" size="sm">
            {t('ops.portalUsers.sendAccess')}
          </Button>
          </Card>
        </ToastForm>

        <section className="space-y-3">
          <SectionTitle>{t('ops.portalUsers.listTitle')}</SectionTitle>
          <OpsPortalUsersList
            users={[...byUser.entries()].map(([userId, info]) => ({
              userId,
              email: emails.get(userId) ?? userId.slice(0, 8),
              projectNames: info.projects.map((p) => p.name).join(' · '),
              roles: [...info.roles].join(', '),
              hub: hubIds.has(userId),
              legalComplete: info.allComplete,
            }))}
          />
        </section>
      </div>
    </div>
  );
}
