import Link from 'next/link';
import { redirect } from 'next/navigation';
import PreviewPopupLink from '@/components/ops/PreviewPopupLink';
import OpsPageHeader from '@/components/ops/OpsPageHeader';
import PortalClientUrl from '@/components/ops/PortalClientUrl';
import StatusBadge, { projectTone } from '@/components/ops/StatusBadge';
import ProjectAccesosTab from '@/components/ops/project-tabs/ProjectAccesosTab';
import ProjectArquitecturaTab from '@/components/ops/project-tabs/ProjectArquitecturaTab';
import ProjectCotizacionesTab from '@/components/ops/project-tabs/ProjectCotizacionesTab';
import ProjectDocumentosTab from '@/components/ops/project-tabs/ProjectDocumentosTab';
import ProjectEntregablesTab from '@/components/ops/project-tabs/ProjectEntregablesTab';
import ProjectEquipoTab from '@/components/ops/project-tabs/ProjectEquipoTab';
import ProjectHorasTab from '@/components/ops/project-tabs/ProjectHorasTab';
import ProjectPagosTab from '@/components/ops/project-tabs/ProjectPagosTab';
import ProjectResumenTab from '@/components/ops/project-tabs/ProjectResumenTab';
import ProjectSprintsTab from '@/components/ops/project-tabs/ProjectSprintsTab';
import ProjectTicketsTab from '@/components/ops/project-tabs/ProjectTicketsTab';
import ProjectTimelineTab from '@/components/ops/project-tabs/ProjectTimelineTab';
import { assertProjectAccess, requireStaff } from '@/lib/ops/auth';
import { can } from '@/lib/ops/permissions';
import { labelsFor } from '@/lib/ops/labels';
import { getT } from '@/i18n/locale';
import { projectPortalUrl, staffPortalPreviewPath } from '@/lib/ops/host';
import { opsProjectPath, resolveOpsProject } from '@/lib/ops/project-path';
import { querySuffix } from '@/lib/ops/project-sprints';
import { createAdminClient } from '@/lib/supabase/admin';

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; sprint?: string; sprintStatus?: string; q?: string }>;
}) {
  const { id: idOrSlug } = await params;
  const search = await searchParams;
  const tab = search.tab ?? 'resumen';
  const access = await requireStaff();
  const { supabase, user, staff } = access;
  const resolved = await resolveOpsProject(supabase, idOrSlug);
  if (!resolved) redirect('/projects');
  if (idOrSlug !== resolved.slug) {
    redirect(
      opsProjectPath(
        resolved.slug,
        querySuffix({
          tab: search.tab,
          sprint: search.sprint,
          sprintStatus: search.sprintStatus,
          q: search.q,
        })
      )
    );
  }
  await assertProjectAccess(access, resolved.id);
  const id = resolved.id;
  const projectSlug = resolved.slug;
  const t = await getT();
  const { PROJECT_STATUS_LABELS } = labelsFor(t.locale);

  const { data: project } = await supabase
    .from('projects')
    .select('*, organizations(*)')
    .eq('id', id)
    .single();

  if (!project) redirect('/projects');

  const [
    { data: milestones },
    { data: quotes },
    { data: documents },
    { data: deliverables },
    { data: members },
    { data: tickets },
    { data: docRequests },
    { data: charges },
    { data: siteAccess },
    { data: releaseSettings },
    { data: releaseRequests },
    { data: siblingProjects },
    { data: projectStaffRows },
    { data: sprints },
    { data: allStaffRows },
    { data: timeEntries },
  ] = await Promise.all([
    supabase.from('milestones').select('*, milestone_updates(*)').eq('project_id', id).order('sort_order'),
    supabase.from('quotes').select('*').eq('project_id', id).order('version', { ascending: false }),
    supabase.from('documents').select('*').eq('project_id', id).order('uploaded_at', { ascending: false }),
    supabase.from('deliverables').select('*').eq('project_id', id).order('sort_order', { ascending: true }),
    supabase
      .from('project_members')
      .select(
        'id, role, invited_at, user_id, terms_accepted_at, terms_version, privacy_accepted_at, privacy_version, nda_accepted_at, nda_version'
      )
      .eq('project_id', id),
    supabase.from('tickets').select('id, title, status, priority, created_at').eq('project_id', id).order('created_at', { ascending: false }).limit(10),
    supabase
      .from('document_requests')
      .select('*')
      .eq('project_id', id)
      .order('sort_order', { ascending: true }),
    supabase
      .from('project_charges')
      .select('*')
      .eq('project_id', id)
      .order('sort_order', { ascending: true }),
    supabase
      .from('project_site_access')
      .select('id, label, kind, url, username, secret, notes, visible_to_client, sort_order')
      .eq('project_id', id)
      .order('sort_order', { ascending: true }),
    supabase.from('project_release_settings').select('*').eq('project_id', id).maybeSingle(),
    supabase
      .from('project_release_requests')
      .select(
        'id, project_id, status, preview_url, production_url, notes, commit_sha, commit_message, vercel_deployment_id, error_message, github_run_url, requested_by_kind, created_at, updated_at, completed_at'
      )
      .eq('project_id', id)
      .order('created_at', { ascending: false })
      .limit(20),
    project.organization_id
      ? supabase
          .from('projects')
          .select('id, name')
          .eq('organization_id', project.organization_id)
          .neq('id', id)
          .order('name')
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    supabase
      .from('project_staff')
      .select('staff_id, role_on_project, staff_profiles(full_name, role)')
      .eq('project_id', id),
    supabase
      .from('project_sprints')
      .select('id, name, goal, starts_on, ends_on, status')
      .eq('project_id', id)
      .order('starts_on', { ascending: true, nullsFirst: false }),
    supabase
      .from('staff_profiles')
      .select('id, full_name, role')
      .eq('active', true)
      .order('full_name'),
    supabase
      .from('time_entries')
      .select('id, hours, worked_on, notes, staff_id, sprint_item_id')
      .eq('project_id', id)
      .order('worked_on', { ascending: false })
      .limit(100),
  ]);

  const sprintIds = (sprints ?? []).map((s) => s.id);
  const { data: sprintItems } = sprintIds.length
    ? await supabase
        .from('sprint_items')
        .select('id, sprint_id, title, details, status, assignee_id')
        .in('sprint_id', sprintIds)
        .order('sort_order', { ascending: true })
    : { data: [] as never[] };

  const { data: orgNdaDocs } = project.organization_id
    ? await supabase
        .from('documents')
        .select('*')
        .eq('organization_id', project.organization_id)
        .eq('type', 'nda')
        .eq('signed', true)
        .is('disposed_at', null)
        .order('uploaded_at', { ascending: false })
    : { data: [] as never[] };

  const staffDocuments = [
    ...(documents ?? []),
    ...(orgNdaDocs ?? []).filter((d) => !(documents ?? []).some((p) => p.id === d.id)),
  ];

  const admin = createAdminClient();
  const [{ data: fileAccess }, { data: recentActivity }] = await Promise.all([
    admin
      .from('file_access_log')
      .select('id, file_path, action, actor_id, created_at, document_id, ip, user_agent')
      .eq('project_id', id)
      .order('created_at', { ascending: false })
      .limit(20),
    admin
      .from('activity_log')
      .select('id, entity_type, action, actor_id, metadata, created_at')
      .contains('metadata', { project_id: id })
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  const memberEmails = new Map<string, string>();
  const actorIds = new Set<string>();
  (members ?? []).forEach((m) => actorIds.add(m.user_id));
  (fileAccess ?? []).forEach((a) => {
    if (a.actor_id) actorIds.add(a.actor_id);
  });
  (recentActivity ?? []).forEach((a) => {
    if (a.actor_id) actorIds.add(a.actor_id);
  });
  await Promise.all(
    [...actorIds].map(async (userId) => {
      const { data } = await admin.auth.admin.getUserById(userId);
      if (data.user?.email) memberEmails.set(userId, data.user.email);
    })
  );

  const tabs = [
    { key: 'resumen', labelKey: 'ops.project.tabResumen' },
    { key: 'equipo', labelKey: 'ops.project.tabEquipo' },
    { key: 'sprints', labelKey: 'ops.project.tabSprints' },
    { key: 'horas', labelKey: 'ops.project.tabHoras', capability: 'time_entries' as const },
    { key: 'timeline', labelKey: 'ops.project.tabTimeline' },
    { key: 'arquitectura', labelKey: 'ops.project.tabArquitectura' },
    { key: 'cotizaciones', labelKey: 'ops.project.tabCotizaciones', capability: 'quotes' as const },
    { key: 'pagos', labelKey: 'ops.project.tabPagos', capability: 'charges' as const },
    { key: 'documentos', labelKey: 'ops.project.tabDocumentos' },
    { key: 'entregables', labelKey: 'ops.project.tabEntregables' },
    { key: 'accesos', labelKey: 'ops.project.tabAccesos' },
    { key: 'tickets', labelKey: 'ops.project.tabTickets' },
  ].filter((tabDef) => !('capability' in tabDef && tabDef.capability) || can(staff, tabDef.capability!));

  return (
    <div>
      <OpsPageHeader
        title={project.name}
        description={(project.organizations as { name?: string })?.name}
        actions={
          <div className="flex flex-wrap gap-2">
            <a
              href={`/api/ops/projects/${id}/compliance-export`}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50"
            >
              {t('ops.project.exportCompliance')}
            </a>
            <PreviewPopupLink
              href={staffPortalPreviewPath(project.slug)}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50"
              title={t('ops.project.previewTitle')}
            >
              {t('ops.project.preview')}
            </PreviewPopupLink>
            <a
              href={projectPortalUrl(project.slug)}
              className="rounded-lg bg-codiva-primary px-4 py-2 text-sm font-medium text-white hover:bg-codiva-primary-dark"
              title={t('ops.project.clientUrlTitle')}
            >
              {t('ops.project.clientUrl')}
            </a>
          </div>
        }
      />

      <div className="mb-6 flex min-w-0 flex-wrap items-center gap-3">
        <StatusBadge label={PROJECT_STATUS_LABELS[project.status]} tone={projectTone(project.status)} />
        <PortalClientUrl slug={project.slug} />
      </div>

      <nav className="-mx-4 mb-8 overflow-x-auto overflow-y-hidden overscroll-x-contain border-b border-zinc-200 px-4 pb-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex w-max gap-2">
          {tabs.map((tabItem) => (
            <Link
              key={tabItem.key}
              href={opsProjectPath(projectSlug, `?tab=${tabItem.key}`)}
              className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium ${
                tab === tabItem.key ? 'bg-codiva-primary text-white' : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              {t(tabItem.labelKey)}
            </Link>
          ))}
        </div>
      </nav>


      {tab === 'resumen' && <ProjectResumenTab project={project} />}

      {tab === 'equipo' && (
        <ProjectEquipoTab
          projectId={id}
          permissions={staff}
          projectStaff={(projectStaffRows ?? []) as never[]}
          allStaff={(allStaffRows ?? []).map((s) => ({
            id: s.id,
            full_name: s.full_name || '',
            role: s.role,
          }))}
        />
      )}

      {tab === 'sprints' && (
        <ProjectSprintsTab
          projectId={id}
          projectSlug={projectSlug}
          permissions={staff}
          currentUserId={user.id}
          allStaff={(allStaffRows ?? []).map((s) => ({
            id: s.id,
            full_name: s.full_name || '',
            role: s.role,
          }))}
          sprints={sprints ?? []}
          items={sprintItems ?? []}
          selectedSprintId={search.sprint}
          sprintStatus={search.sprintStatus}
          searchQuery={search.q}
        />
      )}

      {tab === 'horas' && can(staff, 'time_entries') && (
        <ProjectHorasTab
          projectId={id}
          permissions={staff}
          currentUserId={user.id}
          entries={(timeEntries ?? []) as never[]}
          sprintItems={(sprintItems ?? []).map((i) => ({ id: i.id, title: i.title }))}
          staffOptions={(allStaffRows ?? []).map((s) => ({
            id: s.id,
            full_name: s.full_name || '',
          }))}
        />
      )}

      {tab === 'timeline' && (
        <ProjectTimelineTab
          projectId={id}
          permissions={staff}
          milestones={(milestones ?? []) as never[]}
        />
      )}

      {tab === 'arquitectura' && (
        <ProjectArquitecturaTab projectId={id} slug={project.slug} permissions={staff} />
      )}

      {tab === 'cotizaciones' && can(staff, 'quotes') && (
        <ProjectCotizacionesTab
          projectId={id}
          projectName={project.name}
          portalShowQuote={project.portal_show_quote !== false}
          quotes={(quotes ?? []) as never[]}
        />
      )}

      {tab === 'pagos' && can(staff, 'charges') && (
        <ProjectPagosTab projectId={id} charges={(charges ?? []) as never[]} />
      )}

      {tab === 'documentos' && (
        <ProjectDocumentosTab
          projectId={id}
          documents={staffDocuments as never[]}
          docRequests={(docRequests ?? []) as never[]}
          fileAccess={(fileAccess ?? []) as never[]}
          recentActivity={(recentActivity ?? []) as never[]}
          memberEmails={memberEmails}
        />
      )}

      {tab === 'entregables' && (
        <ProjectEntregablesTab
          projectId={id}
          projectSlug={projectSlug}
          deliverables={(deliverables ?? []) as never[]}
        />
      )}

      {tab === 'accesos' && (
        <ProjectAccesosTab
          projectId={id}
          slug={project.slug}
          sitePreviewUrl={project.site_preview_url}
          siteProductionUrl={project.site_production_url}
          releaseSettings={(releaseSettings ?? null) as never}
          releaseRequests={(releaseRequests ?? []) as never[]}
          siteAccess={(siteAccess ?? []) as never[]}
          siblingProjects={siblingProjects ?? []}
          members={(members ?? []) as never[]}
          memberEmails={memberEmails}
        />
      )}

      {tab === 'tickets' && <ProjectTicketsTab tickets={tickets ?? []} />}
    </div>
  );
}
