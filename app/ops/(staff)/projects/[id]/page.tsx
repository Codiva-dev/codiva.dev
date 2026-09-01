import Link from 'next/link';
import { redirect } from 'next/navigation';
import BrandedFileInput from '@/components/ops/BrandedFileInput';
import PreviewPopupLink from '@/components/ops/PreviewPopupLink';
import OpsPageHeader from '@/components/ops/OpsPageHeader';
import PortalClientUrl from '@/components/ops/PortalClientUrl';
import StatusBadge, { chargeTone, projectTone } from '@/components/ops/StatusBadge';
import { assertProjectAccess, requireStaff } from '@/lib/ops/auth';
import {
  updateProject,
  createMilestone,
  updateMilestone,
  addMilestoneUpdate,
  createQuote,
  sendQuote,
  inviteProjectMember,
  uploadDocument,
  createDeliverable,
  markDocumentSigned,
  runDocumentRetentionDisposal,
  createDocumentRequest,
  createDocumentRequestFromPreset,
  updateDocumentRequestStatus,
  setDeliverableVisibility,
  setQuoteVisibility,
  createProjectCharge,
  updateProjectCharge,
  deleteProjectCharge,
} from '@/lib/ops/actions';
import OpsProjectSiteAccess from '@/components/ops/OpsProjectSiteAccess';
import OpsProjectReleases from '@/components/ops/OpsProjectReleases';
import OpsProjectSprints from '@/components/ops/OpsProjectSprints';
import OpsProjectStaff from '@/components/ops/OpsProjectStaff';
import OpsProjectHours from '@/components/ops/OpsProjectHours';
import ToastForm from '@/components/ops/ToastForm';
import { can } from '@/lib/ops/permissions';
import { labelsFor, isClientBorneChargeKind } from '@/lib/ops/labels';
import { getT } from '@/i18n/locale';
import { projectPortalUrl, staffPortalPreviewPath } from '@/lib/ops/host';
import { opsProjectPath, resolveOpsProject } from '@/lib/ops/project-path';
import OpsQuoteForm from '@/components/ops/OpsQuoteForm';
import OpsProjectArchitecture from '@/components/ops/OpsProjectArchitecture';
import { isCanvasKind } from '@/lib/ops/architecture';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAcceptanceStatus } from '@/lib/ops/legal/acceptances';
import { LEGAL_DOCS_VERSION } from '@/lib/ops/legal/version';
import { isLegacyNdaDraftDocument, opsFileHref } from '@/lib/ops/storage';
import { isLegacyQuotePackDocument } from '@/lib/ops/quotes';
import { DOCUMENT_REQUEST_PRESETS } from '@/lib/ops/document-request-presets';
import { isHttpUrl } from '@/lib/ops/requested-url';

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id: idOrSlug } = await params;
  const search = await searchParams;
  const tab = search.tab ?? 'resumen';
  const access = await requireStaff();
  const { supabase, user, staff } = access;
  const resolved = await resolveOpsProject(supabase, idOrSlug);
  if (!resolved) redirect('/projects');
  if (idOrSlug !== resolved.slug) {
    redirect(opsProjectPath(resolved.slug, search.tab ? `?tab=${encodeURIComponent(search.tab)}` : ''));
  }
  await assertProjectAccess(access, resolved.id);
  const id = resolved.id;
  const projectSlug = resolved.slug;
  const t = await getT();
  const {
    PROJECT_STATUS_LABELS,
    QUOTE_STATUS_LABELS,
    MILESTONE_STATUS_LABELS,
    DELIVERABLE_KIND_LABELS,
    DOCUMENT_TYPE_LABELS,
    DOCUMENT_SOURCE_LABELS,
    DOCUMENT_REQUEST_STATUS_LABELS,
    DOCUMENT_REQUEST_INPUT_LABELS,
    CHARGE_KIND_LABELS,
    CHARGE_STATUS_LABELS,
    formatDate,
    formatCurrency,
    formatChargeAmount,
  } = labelsFor(t.locale);

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
      .order('created_at', { ascending: false }),
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

  async function onUpdateProject(formData: FormData) {
    'use server';
    await updateProject(id, formData);
  }

  const existingRequestCodes = new Set(
    (docRequests ?? []).map((r) => r.code).filter((code): code is string => Boolean(code))
  );
  const availableRequestPresets = DOCUMENT_REQUEST_PRESETS.filter(
    (preset) => !existingRequestCodes.has(preset.code)
  );

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
            <a
              href={staffPortalPreviewPath(project.slug)}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50"
              title={t('ops.project.previewTitle')}
            >
              {t('ops.project.preview')}
            </a>
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

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <StatusBadge label={PROJECT_STATUS_LABELS[project.status]} tone={projectTone(project.status)} />
        <PortalClientUrl slug={project.slug} />
      </div>

      <nav className="mb-8 flex flex-wrap gap-2 border-b border-zinc-200 pb-3">
        {tabs.map((tabItem) => (
          <Link
            key={tabItem.key}
            href={opsProjectPath(projectSlug, `?tab=${tabItem.key}`)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              tab === tabItem.key ? 'bg-codiva-primary text-white' : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            {t(tabItem.labelKey)}
          </Link>
        ))}
      </nav>

      {tab === 'resumen' && (
        <ToastForm success={t('ops.project.updated')} action={onUpdateProject} className="max-w-2xl space-y-4 rounded-xl border border-zinc-200 bg-white p-5">
          <div>
            <label className="mb-1 block text-sm font-medium">{t('ops.project.name')}</label>
            <input name="name" defaultValue={project.name} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">{t('ops.project.status')}</label>
              <select name="status" defaultValue={project.status} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm">
                {Object.entries(PROJECT_STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t('ops.project.progress')}</label>
              <input name="progressPercent" type="number" min={0} max={100} defaultValue={project.progress_percent} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t('ops.project.start')}</label>
              <input name="startDate" type="date" defaultValue={project.start_date ?? ''} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t('ops.project.delivery')}</label>
              <input name="targetDeliveryDate" type="date" defaultValue={project.target_delivery_date ?? ''} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t('ops.project.retention')}</label>
              <input
                name="documentRetentionDays"
                type="number"
                min={30}
                max={3650}
                defaultValue={project.document_retention_days ?? 365}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-zinc-500">{t('ops.project.retentionHint')}</p>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{t('ops.project.description')}</label>
            <textarea name="description" rows={4} defaultValue={project.description ?? ''} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
          </div>
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 space-y-3">
            <p className="text-sm font-medium text-zinc-900">{t('ops.project.portalVisibility')}</p>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="clientVisible" defaultChecked={project.client_visible} />
              {t('ops.project.portalVisible')}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="portalShowQuote"
                defaultChecked={project.portal_show_quote !== false}
              />
              {t('ops.project.showQuote')}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="portalShowCosts"
                defaultChecked={project.portal_show_costs !== false}
              />
              {t('ops.project.showCosts')}
            </label>
          </div>
          <button type="submit" className="rounded-lg bg-codiva-primary px-4 py-2 text-sm font-semibold text-white">
            {t('ops.project.saveChanges')}
          </button>
        </ToastForm>
      )}

      {tab === 'equipo' && (
        <OpsProjectStaff
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
        <OpsProjectSprints
          projectId={id}
          permissions={staff}
          currentUserId={user.id}
          allStaff={(allStaffRows ?? []).map((s) => ({
            id: s.id,
            full_name: s.full_name || '',
            role: s.role,
          }))}
          sprints={sprints ?? []}
          items={sprintItems ?? []}
        />
      )}

      {tab === 'horas' && can(staff, 'time_entries') && (
        <OpsProjectHours
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
        <div className="space-y-6">
          {can(staff, 'milestones_write') && (
            <MilestoneForm projectId={id} createMilestone={createMilestone} />
          )}
          {(milestones ?? []).map((m) =>
            can(staff, 'milestones_write') ? (
              <MilestoneCard
                key={m.id}
                milestone={m}
                projectId={id}
                updateMilestone={updateMilestone}
                addMilestoneUpdate={addMilestoneUpdate}
              />
            ) : (
              <div key={m.id} className="rounded-xl border border-zinc-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{m.title}</p>
                  <StatusBadge
                    label={MILESTONE_STATUS_LABELS[m.status] ?? m.status}
                    tone={m.status === 'completed' ? 'success' : m.status === 'blocked' ? 'danger' : 'info'}
                  />
                </div>
                {m.description && <p className="mt-2 text-sm text-zinc-600">{m.description}</p>}
                <p className="mt-2 text-xs text-zinc-400">
                  {t('ops.project.deliveryDate', { date: formatDate(m.due_date) })}
                </p>
              </div>
            )
          )}
          {!milestones?.length && <p className="text-sm text-zinc-500">{t('ops.project.noMilestones')}</p>}
        </div>
      )}

      {tab === 'arquitectura' && (
        <OpsProjectArchitecture
          projectId={id}
          slug={project.slug}
          kindLabels={DELIVERABLE_KIND_LABELS}
          canEdit={can(staff, 'deliverables')}
        />
      )}

      {tab === 'cotizaciones' && can(staff, 'quotes') && (
        <div className="space-y-6">
          <OpsQuoteForm
            title={t('ops.project.newQuote')}
            defaultTitle={t('ops.project.proposalTitle', { name: project.name })}
            action={async (formData) => {
              'use server';
              await createQuote(id, formData);
            }}
          />
          {(quotes ?? []).map((q) => (
            <article key={q.id} className="rounded-xl border border-zinc-200 bg-white p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">{q.title} · v{q.version}</h3>
                <StatusBadge label={QUOTE_STATUS_LABELS[q.status]} tone={q.status === 'accepted' ? 'success' : 'info'} />
              </div>
              <p className="text-sm text-zinc-600 whitespace-pre-wrap">{q.scope}</p>
              <p className="mt-2 text-sm font-medium">{formatCurrency(q.total_amount, q.currency)}</p>
              <p className="mt-2 text-xs text-zinc-500">
                {t('ops.project.portal')}{' '}
                {q.visible_to_client !== false ? t('ops.project.visibleClient') : t('ops.project.hiddenClient')}
                {!project.portal_show_quote ? t('ops.project.quoteModuleOff') : ''}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={`/quotes/${q.id}`}
                  className="rounded-lg bg-codiva-primary px-3 py-1.5 text-sm font-medium text-white"
                >
                  {t('ops.project.editInOps')}
                </Link>
                <PreviewPopupLink
                  href={`/quotes/${q.id}/preview`}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-50"
                >
                  {t('ops.project.preview')}
                </PreviewPopupLink>
                {q.status === 'draft' && (
                  <ToastForm success={t('ops.project.quoteSent')} action={async () => { 'use server'; await sendQuote(q.id, id); }}>
                    <button type="submit" className="rounded-lg bg-codiva-primary px-3 py-1.5 text-sm text-white">
                      {t('ops.project.sendQuote')}
                    </button>
                  </ToastForm>
                )}
                <ToastForm success={t('ops.project.visibilityUpdated')}
                  action={async () => {
                    'use server';
                    await setQuoteVisibility(id, q.id, q.visible_to_client === false);
                  }}
                >
                  <button type="submit" className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50">
                    {q.visible_to_client === false ? t('ops.project.showInPortal') : t('ops.project.hideInPortal')}
                  </button>
                </ToastForm>
              </div>
            </article>
          ))}
        </div>
      )}

      {tab === 'pagos' && can(staff, 'charges') && (
        <div className="space-y-6">
          <section className="rounded-xl border border-zinc-200 bg-white p-5">
            <h3 className="font-semibold">{t('ops.project.newCharge')}</h3>
            <p className="mt-1 text-sm text-zinc-500">
              {t('ops.project.chargeHint')}
            </p>
            <ToastForm success={t('ops.project.chargeCreated')}
              action={async (fd) => {
                'use server';
                await createProjectCharge(id, fd);
              }}
              className="mt-4 grid gap-3 md:grid-cols-2"
            >
              <input
                name="title"
                required
                placeholder={t('ops.project.concept')}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
              <select name="kind" className="rounded-lg border border-zinc-300 px-3 py-2 text-sm" defaultValue="development">
                {Object.entries(CHARGE_KIND_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <input
                name="amount"
                type="number"
                min="0"
                step="0.01"
                placeholder={t('ops.project.amountOptional')}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
              <select name="status" className="rounded-lg border border-zinc-300 px-3 py-2 text-sm" defaultValue="pending">
                {Object.entries(CHARGE_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <input name="periodLabel" placeholder={t('ops.project.period')} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
              <input name="dueDate" type="date" className="rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
              <input
                name="noticeDays"
                type="number"
                min="0"
                defaultValue={30}
                placeholder={t('ops.project.noticeDays')}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
              <p className="text-xs text-zinc-500 md:col-span-1">
                {t('ops.project.noticeHint')}
              </p>
              <textarea
                name="description"
                rows={2}
                placeholder={t('ops.project.descClient')}
                className="md:col-span-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
              <textarea
                name="staffNotes"
                rows={2}
                placeholder={t('ops.project.staffNotes')}
                className="md:col-span-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
              <label className="flex items-center gap-2 text-sm text-zinc-700 md:col-span-2">
                <input type="checkbox" name="visibleToClient" value="on" defaultChecked />
                {t('ops.project.visiblePortalCosts')}
              </label>
              <button type="submit" className="w-fit rounded-lg bg-codiva-primary px-4 py-2 text-sm font-semibold text-white">
                {t('ops.project.addCharge')}
              </button>
            </ToastForm>
          </section>

          {(charges ?? []).map((c) => (
            <article key={c.id} className="rounded-xl border border-zinc-200 bg-white p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge label={CHARGE_STATUS_LABELS[c.status]} tone={chargeTone(c.status)} />
                  <span className="text-xs uppercase tracking-wide text-zinc-500">
                    {CHARGE_KIND_LABELS[c.kind] ?? c.kind}
                  </span>
                  {isClientBorneChargeKind(c.kind) && (
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600">
                      {t('ops.project.clientBorne')}
                    </span>
                  )}
                </div>
                <p className="font-semibold text-codiva-primary">
                  {formatChargeAmount(c.amount, c.currency)}
                </p>
              </div>
              <ToastForm success={t('ops.project.chargeUpdated')}
                action={async (fd) => {
                  'use server';
                  await updateProjectCharge(c.id, id, fd);
                }}
                className="grid gap-3 md:grid-cols-2"
              >
                <input type="hidden" name="existingPaidAt" value={c.paid_at ?? ''} />
                <input
                  name="title"
                  required
                  defaultValue={c.title}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
                <select name="kind" defaultValue={c.kind} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm">
                  {Object.entries(CHARGE_KIND_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <input
                  name="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={c.amount ?? ''}
                  placeholder={t('ops.project.amountTbd')}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
                <select name="status" defaultValue={c.status} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm">
                  {Object.entries(CHARGE_STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <input
                  name="periodLabel"
                  defaultValue={c.period_label ?? ''}
                  placeholder={t('ops.project.periodShort')}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
                <input
                  name="dueDate"
                  type="date"
                  defaultValue={c.due_date ?? ''}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
                <input
                  name="noticeDays"
                  type="number"
                  min="0"
                  defaultValue={c.notice_days ?? 30}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  title={t('ops.project.noticeTitle')}
                />
                <textarea
                  name="description"
                  rows={2}
                  defaultValue={c.description ?? ''}
                  className="md:col-span-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
                <textarea
                  name="staffNotes"
                  rows={2}
                  defaultValue={c.staff_notes ?? ''}
                  placeholder={t('ops.project.staffNotesShort')}
                  className="md:col-span-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
                <label className="flex items-center gap-2 text-sm text-zinc-700">
                  <input type="checkbox" name="visibleToClient" defaultChecked={c.visible_to_client !== false} />
                  {t('ops.project.visiblePortal')}
                </label>
                <p className="text-xs text-zinc-500">
                  {c.status === 'paid' ? t('ops.project.paidOn', { date: formatDate(c.paid_at) }) : c.due_date ? t('ops.project.dueOn', { date: formatDate(c.due_date) }) : t('ops.project.noDue')}
                </p>
                <div className="flex flex-wrap items-center gap-2 md:col-span-2">
                  <button type="submit" className="rounded-lg bg-codiva-primary px-3 py-1.5 text-sm text-white">
                    {t('ops.project.save')}
                  </button>
                  <p className="text-xs text-zinc-500">
                    {t('ops.project.chargeDeleteHint')}
                  </p>
                </div>
              </ToastForm>
              <ToastForm success={t('ops.project.deleted')}
                action={async () => {
                  'use server';
                  await deleteProjectCharge(c.id, id);
                }}
                className="mt-3 border-t border-zinc-100 pt-3"
              >
                <button
                  type="submit"
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
                >
                  {t('ops.project.deleteCharge')}
                </button>
              </ToastForm>
            </article>
          ))}
          {!charges?.length && <p className="text-sm text-zinc-500">{t('ops.project.noCharges')}</p>}
        </div>
      )}

      {tab === 'documentos' && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <ToastForm success={t('ops.project.retentionRun')} action={async () => { 'use server'; await runDocumentRetentionDisposal(); }}>
              <button type="submit" className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50">
                {t('ops.project.runRetention')}
              </button>
            </ToastForm>
            <a
              href={`/api/ops/projects/${id}/compliance-export`}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50"
            >
              {t('ops.project.downloadExport')}
            </a>
          </div>

          <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5">
            <div>
              <h3 className="font-semibold">{t('ops.project.clientRequests')}</h3>
              <p className="mt-1 text-sm text-zinc-500">
                {t('ops.project.clientRequestsHint')}
              </p>
            </div>
            {availableRequestPresets.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {availableRequestPresets.map((preset) => (
                  <ToastForm
                    key={preset.code}
                    success={t('ops.project.requestCreated')}
                    action={async () => {
                      'use server';
                      await createDocumentRequestFromPreset(id, preset.code);
                    }}
                  >
                    <button
                      type="submit"
                      className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50"
                    >
                      + {preset.title}
                    </button>
                  </ToastForm>
                ))}
              </div>
            ) : null}
            <ToastForm success={t('ops.project.requestCreated')}
              action={async (fd) => {
                'use server';
                await createDocumentRequest(id, fd);
              }}
              className="grid gap-3 rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-4 sm:grid-cols-2"
            >
              <input
                name="title"
                required
                placeholder={t('ops.project.requestTitle')}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm sm:col-span-2"
              />
              <input
                name="code"
                placeholder={t('ops.project.requestCode')}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
              />
              <select name="inputMode" className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm">
                {Object.entries(DOCUMENT_REQUEST_INPUT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <select name="expectedType" className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm">
                {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <input
                name="sortOrder"
                type="number"
                defaultValue={((docRequests ?? []).length + 1) * 10}
                placeholder={t('ops.project.requestOrder')}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
              />
              <textarea
                name="description"
                rows={2}
                placeholder={t('ops.project.requestDesc')}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm sm:col-span-2"
              />
              <textarea
                name="instructions"
                rows={2}
                placeholder={t('ops.project.requestInstructions')}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm sm:col-span-2"
              />
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input type="checkbox" name="required" defaultChecked />
                {t('ops.project.required')}
              </label>
              <button type="submit" className="rounded-lg bg-codiva-primary px-4 py-2 text-sm font-semibold text-white sm:col-span-2 sm:w-fit">
                {t('ops.project.createRequest')}
              </button>
            </ToastForm>

            <ul className="space-y-2">
              {(docRequests ?? []).map((r) => (
                <li
                  key={r.id}
                  className="rounded-lg border border-zinc-200 px-4 py-3 text-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        {r.title}
                        {r.code ? (
                          <span className="ml-2 font-mono text-xs text-zinc-400">{r.code}</span>
                        ) : null}
                      </p>
                      <p className="text-zinc-500">
                        {DOCUMENT_REQUEST_STATUS_LABELS[r.status] ?? r.status}
                        {' · '}
                        {DOCUMENT_REQUEST_INPUT_LABELS[r.input_mode] ?? r.input_mode}
                        {r.required ? t('ops.project.requiredSuffix') : ''}
                      </p>
                      {r.description && <p className="mt-1 text-zinc-600">{r.description}</p>}
                      {r.response_text &&
                        (isHttpUrl(r.response_text) ? (
                          <a
                            href={r.response_text}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-block break-all text-sm text-codiva-primary hover:underline"
                          >
                            {r.response_text}
                          </a>
                        ) : (
                          <pre className="mt-2 max-h-36 overflow-auto whitespace-pre-wrap rounded bg-zinc-50 p-2 text-xs text-zinc-700">
                            {r.response_text}
                          </pre>
                        ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {r.status !== 'open' && (
                        <ToastForm success={t('ops.project.requestReopened')}
                          action={async () => {
                            'use server';
                            await updateDocumentRequestStatus(id, r.id, 'open');
                          }}
                        >
                          <button type="submit" className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50">
                            {t('ops.project.reopen')}
                          </button>
                        </ToastForm>
                      )}
                      {r.status === 'open' && (
                        <>
                          <ToastForm success={t('ops.project.requestWaived')}
                            action={async () => {
                              'use server';
                              await updateDocumentRequestStatus(id, r.id, 'waived');
                            }}
                          >
                            <button type="submit" className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50">
                              {t('ops.project.waive')}
                            </button>
                          </ToastForm>
                          <ToastForm success={t('ops.project.requestCancelled')}
                            action={async () => {
                              'use server';
                              await updateDocumentRequestStatus(id, r.id, 'cancelled');
                            }}
                          >
                            <button type="submit" className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50">
                              {t('ops.project.cancel')}
                            </button>
                          </ToastForm>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              ))}
              {!docRequests?.length && (
                <p className="text-sm text-zinc-500">{t('ops.project.noRequests')}</p>
              )}
            </ul>
          </section>

          <ToastForm success={t('ops.project.docUploaded')} action={async (fd) => { 'use server'; await uploadDocument(id, fd); }} className="rounded-xl border border-zinc-200 bg-white p-5 space-y-3">
            <h3 className="font-semibold">{t('ops.project.uploadDoc')}</h3>
            <p className="text-sm text-zinc-500">
              {t('ops.project.uploadDocHint')}
            </p>
            <input name="title" placeholder={t('ops.project.title')} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
            <select name="type" className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm">
              <option value="contract">{DOCUMENT_TYPE_LABELS.contract}</option>
              <option value="nda">{DOCUMENT_TYPE_LABELS.nda}</option>
              <option value="other">{DOCUMENT_TYPE_LABELS.other}</option>
            </select>
            <textarea name="notes" placeholder={t('ops.project.notesClient')} rows={2} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
            <BrandedFileInput required hint={t('ops.project.fileHint')} />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="visibleToClient" defaultChecked /> {t('ops.project.visibleClientCheck')}</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="signed" /> {t('ops.project.signed')}</label>
            <button type="submit" className="rounded-lg bg-codiva-primary px-4 py-2 text-sm text-white">{t('ops.project.upload')}</button>
          </ToastForm>
          <ul className="space-y-2">
            {staffDocuments.map((d) => {
              const href = (() => {
                const base = opsFileHref(d.file_path, d.file_url);
                if (!base) return null;
                if (base.startsWith('/api/ops/file')) return `${base}&documentId=${encodeURIComponent(d.id)}`;
                return base;
              })();
              return (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm">
                <div>
                  <p className="font-medium">
                    {d.title} {d.signed ? '✓' : ''}
                    {d.disposed_at ? t('ops.project.disposed') : ''}
                  </p>
                  <p className="text-zinc-500">
                    {DOCUMENT_TYPE_LABELS[d.type] ?? d.type}
                    {' · '}
                    {DOCUMENT_SOURCE_LABELS[d.source] ?? d.source ?? 'staff'}
                    {' · '}
                    {formatDate(d.uploaded_at)}
                    {d.scan_status ? ` · scan:${d.scan_status}` : ''}
                    {d.retain_until ? t('ops.project.retainUntil', { date: formatDate(d.retain_until) }) : ''}
                    {isLegacyQuotePackDocument(d) ? t('ops.project.legacyQuotePack') : ''}
                    {isLegacyNdaDraftDocument(d) ? t('ops.project.legacyNda') : ''}
                  </p>
                  {d.content_sha256 && (
                    <p className="mt-1 font-mono text-xs text-zinc-400" title={d.content_sha256}>
                      SHA-256: {d.content_sha256.slice(0, 20)}…
                    </p>
                  )}
                  {d.notes && <p className="mt-1 text-zinc-600">{d.notes}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {href && (
                    <a href={href} target="_blank" rel="noreferrer" className="text-codiva-primary hover:underline">
                      {t('ops.project.view')}
                    </a>
                  )}
                  {!d.signed && (
                    <ToastForm success={t('ops.project.markedSigned')} action={async () => { 'use server'; await markDocumentSigned(d.id, id, true); }}>
                      <button type="submit" className="rounded-lg border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50">
                        {t('ops.project.markSigned')}
                      </button>
                    </ToastForm>
                  )}
                </div>
              </li>
              );
            })}
          </ul>

          <section className="rounded-xl border border-zinc-200 bg-white p-5">
            <h3 className="mb-1 font-semibold">{t('ops.project.auditTitle')}</h3>
            <p className="mb-3 text-sm text-zinc-500">{t('ops.project.auditHint')}</p>
            <ul className="space-y-2 text-sm">
              {(fileAccess ?? []).slice(0, 10).map((a) => (
                <li key={a.id} className="rounded-lg border border-zinc-100 px-3 py-2">
                  <span className="font-medium">{t('ops.project.download')}</span>
                  {' · '}
                  {memberEmails.get(a.actor_id ?? '') ?? a.actor_id?.slice(0, 8) ?? t('ops.project.system')}
                  {' · '}
                  <span className="text-zinc-500">{formatDate(a.created_at)}</span>
                  {a.ip && <span className="text-zinc-400"> · {a.ip}</span>}
                  <p className="truncate text-xs text-zinc-400">{a.file_path}</p>
                </li>
              ))}
              {(recentActivity ?? [])
                .filter((a) => a.action === 'uploaded' || a.action === 'legal_accepted')
                .slice(0, 10)
                .map((a) => (
                  <li key={a.id} className="rounded-lg border border-zinc-100 px-3 py-2">
                    <span className="font-medium">
                      {a.action === 'legal_accepted' ? t('ops.project.legalAccepted') : t('ops.project.docUploadedEvent')}
                    </span>
                    {' · '}
                    {memberEmails.get(a.actor_id ?? '') ?? a.actor_id?.slice(0, 8) ?? t('ops.project.system')}
                    {' · '}
                    <span className="text-zinc-500">{formatDate(a.created_at)}</span>
                  </li>
                ))}
              {!fileAccess?.length &&
                !(recentActivity ?? []).some((a) => a.action === 'uploaded' || a.action === 'legal_accepted') && (
                  <p className="text-zinc-500">{t('ops.project.noAudit')}</p>
                )}
            </ul>
          </section>
        </div>
      )}

      {tab === 'entregables' && (
        <div className="space-y-6">
          <p className="text-sm text-zinc-600">
            {t('ops.project.deliverablesHintPrefix')}{' '}
            <Link href={opsProjectPath(projectSlug, '?tab=arquitectura')} className="text-codiva-primary hover:underline">
              {t('ops.project.tabArquitectura')}
            </Link>
            .
          </p>
          <ToastForm success={t('ops.project.deliverableCreated')} action={async (fd) => { 'use server'; await createDeliverable(id, fd); }} className="rounded-xl border border-zinc-200 bg-white p-5 space-y-3">
            <h3 className="font-semibold">{t('ops.project.newDeliverable')}</h3>
            <input name="title" required placeholder={t('ops.project.title')} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
            <input type="hidden" name="kind" value="other" />
            <input name="sortOrder" type="number" defaultValue={0} placeholder={t('ops.project.requestOrder')} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
            <input name="url" placeholder={t('ops.project.urlPlaceholder')} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
            <textarea name="description" placeholder={t('ops.project.description')} rows={2} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
            <BrandedFileInput hint={t('ops.project.fileHintOptional')} />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="visibleToClient" defaultChecked /> {t('ops.project.visibleClientCheck')}</label>
            <button type="submit" className="rounded-lg bg-codiva-primary px-4 py-2 text-sm text-white">{t('ops.project.save')}</button>
          </ToastForm>
          <ul className="space-y-2">
            {(deliverables ?? []).filter((d) => !isCanvasKind(d.kind)).map((d) => {
              const fileHref = opsFileHref(d.file_path, d.file_url);
              return (
              <li key={d.id} className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{d.title}</p>
                    <p className="text-zinc-500">
                      {DELIVERABLE_KIND_LABELS[d.kind] ?? d.kind ?? t('ops.project.other')}
                      {' · '}
                      {d.visible_to_client ? t('ops.project.visibleClient') : t('ops.project.hiddenClient')}
                    </p>
                    {d.url && <a href={d.url} className="text-codiva-primary hover:underline">{d.url}</a>}
                    {fileHref && (
                      <a href={fileHref} className="block text-codiva-primary hover:underline">
                        {t('ops.project.downloadFile')}
                      </a>
                    )}
                  </div>
                  <ToastForm success={t('ops.project.visibilityUpdated')}
                    action={async () => {
                      'use server';
                      await setDeliverableVisibility(id, d.id, !d.visible_to_client);
                    }}
                  >
                    <button type="submit" className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50">
                      {d.visible_to_client ? t('ops.project.hide') : t('ops.project.show')}
                    </button>
                  </ToastForm>
                </div>
              </li>
              );
            })}
            {!(deliverables ?? []).some((d) => !isCanvasKind(d.kind)) && (
              <p className="text-sm text-zinc-500">{t('ops.project.noDeliverables')}</p>
            )}
          </ul>
        </div>
      )}

      {tab === 'accesos' && (
        <div className="max-w-4xl space-y-8">
          <nav className="flex flex-wrap gap-2">
            <a href="#releases" className="rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white">
              {t('ops.project.jumpReleases')}
            </a>
            <a href="#sitio" className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-200">
              {t('ops.project.jumpSite')}
            </a>
            <a href="#portal" className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-200">
              {t('ops.project.jumpPortal')}
            </a>
          </nav>

          <div id="releases" className="scroll-mt-6">
            <OpsProjectReleases
              projectId={id}
              sitePreviewUrl={project.site_preview_url}
              siteProductionUrl={project.site_production_url}
              settings={releaseSettings}
              requests={releaseRequests ?? []}
            />
          </div>

          <div id="sitio" className="scroll-mt-6">
            <OpsProjectSiteAccess
              projectId={id}
              sitePreviewUrl={project.site_preview_url}
              siteProductionUrl={project.site_production_url}
              items={siteAccess ?? []}
            />
          </div>

          <section id="portal" className="scroll-mt-6 space-y-6">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">{t('ops.project.portalCodiva')}</h3>
              <p className="mt-1 text-sm text-zinc-600">{t('ops.project.portalInviteHint')}</p>
            </div>
            <ToastForm success={t('ops.project.inviteSent')} action={async (fd) => { 'use server'; await inviteProjectMember(id, fd); }} className="rounded-xl border border-zinc-200 bg-white p-5 space-y-3">
              <h3 className="font-semibold">{t('ops.project.inviteUser')}</h3>
              <p className="text-sm text-zinc-600">
                {t('ops.project.inviteBodyPrefix', { version: LEGAL_DOCS_VERSION })}{' '}
                <Link href="/users" className="text-codiva-primary hover:underline">
                  {t('ops.pages.users')}
                </Link>
                .
              </p>
              <input name="email" type="email" required placeholder={t('ops.project.inviteEmail')} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
              <select name="role" className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm">
                <option value="viewer">{t('ops.project.roleViewer')}</option>
                <option value="approver">{t('ops.project.roleApprover')}</option>
              </select>
              {(siblingProjects ?? []).length > 0 && (
                <fieldset className="space-y-2 rounded-lg border border-zinc-200 p-3">
                  <legend className="px-1 text-sm font-medium text-zinc-700">
                    {t('ops.project.alsoInSiblings')}
                  </legend>
                  {(siblingProjects ?? []).map((p) => (
                    <label key={p.id} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="siblingProjectIds" value={p.id} defaultChecked />
                      {p.name}
                    </label>
                  ))}
                </fieldset>
              )}
              <button type="submit" className="rounded-lg bg-codiva-primary px-4 py-2 text-sm text-white">{t('ops.project.sendAccess')}</button>
            </ToastForm>
            <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-500">
              <span className="inline-flex flex-wrap items-center gap-2">
                {t('ops.project.clientLogin')}
                <PortalClientUrl slug={project.slug} path="/login" />
              </span>
              <Link href={staffPortalPreviewPath(project.slug)} className="text-codiva-primary hover:underline">
                {t('ops.project.previewOps')}
              </Link>
            </div>
            <ul className="space-y-2 text-sm">
              {(members ?? []).map((m) => {
                const acceptance = getAcceptanceStatus(m);
                return (
                  <li key={m.id} className="rounded-lg border border-zinc-200 bg-white px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">{memberEmails.get(m.user_id) ?? m.user_id.slice(0, 8)}</p>
                        <p className="text-zinc-500">
                          {m.role} · {t('ops.project.invitedOn', { date: formatDate(m.invited_at) })}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          acceptance.complete
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-800'
                        }`}
                      >
                        {acceptance.complete ? t('ops.project.legalOk') : t('ops.project.legalPending')}
                      </span>
                    </div>
                    {!acceptance.complete && (
                      <p className="mt-2 text-xs text-zinc-500">
                        {t('ops.project.missing')}{' '}
                        {[
                          !acceptance.terms ? t('ops.project.legalTerms') : null,
                          !acceptance.privacy ? t('ops.project.legalPrivacy') : null,
                          !acceptance.nda ? t('ops.project.legalNda') : null,
                        ]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    )}
                  </li>
                );
              })}
              {!members?.length && (
                <p className="text-sm text-zinc-500">{t('ops.project.noMembers')}</p>
              )}
            </ul>
          </section>
        </div>
      )}

      {tab === 'tickets' && (
        <ul className="space-y-2">
          {(tickets ?? []).map((ticket) => (
            <li key={ticket.id}>
              <Link href={`/tickets/${ticket.id}`} className="block rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm hover:border-codiva-primary/30">
                {ticket.title}
              </Link>
            </li>
          ))}
          {!tickets?.length && <p className="text-sm text-zinc-500">{t('ops.project.noTickets')}</p>}
        </ul>
      )}
    </div>
  );
}

async function MilestoneForm({
  projectId,
  createMilestone,
}: {
  projectId: string;
  createMilestone: typeof import('@/lib/ops/actions').createMilestone;
}) {
  const t = await getT();
  const { MILESTONE_STATUS_LABELS } = labelsFor(t.locale);
  async function action(formData: FormData) {
    'use server';
    await createMilestone(projectId, formData);
  }

  return (
    <ToastForm success={t('ops.project.milestoneAdded')} action={action} className="rounded-xl border border-zinc-200 bg-white p-5 grid gap-3 md:grid-cols-2">
      <h3 className="md:col-span-2 font-semibold">{t('ops.project.newMilestone')}</h3>
      <input name="title" required placeholder={t('ops.project.milestoneTitle')} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
      <input name="dueDate" type="date" className="rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
      <select name="status" className="rounded-lg border border-zinc-300 px-3 py-2 text-sm">
        {Object.entries(MILESTONE_STATUS_LABELS).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </select>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="visibleToClient" defaultChecked /> {t('ops.project.visibleClientCheck')}</label>
      <textarea name="description" placeholder={t('ops.project.description')} rows={2} className="md:col-span-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
      <button type="submit" className="w-fit rounded-lg bg-codiva-primary px-4 py-2 text-sm text-white">{t('ops.project.addMilestone')}</button>
    </ToastForm>
  );
}

async function MilestoneCard({
  milestone,
  projectId,
  updateMilestone,
  addMilestoneUpdate,
}: {
  milestone: {
    id: string;
    title: string;
    description: string;
    status: string;
    due_date: string | null;
    visible_to_client: boolean;
    milestone_updates?: { id: string; body: string; created_at: string }[];
  };
  projectId: string;
  updateMilestone: typeof import('@/lib/ops/actions').updateMilestone;
  addMilestoneUpdate: typeof import('@/lib/ops/actions').addMilestoneUpdate;
}) {
  const t = await getT();
  const { MILESTONE_STATUS_LABELS, formatDate } = labelsFor(t.locale);
  async function onUpdate(formData: FormData) {
    'use server';
    await updateMilestone(milestone.id, projectId, formData);
  }

  async function onAddUpdate(formData: FormData) {
    'use server';
    const body = String(formData.get('body') || '');
    if (body.trim()) await addMilestoneUpdate(milestone.id, projectId, body);
  }

  return (
    <article className="rounded-xl border border-zinc-200 bg-white p-5">
      <ToastForm success={t('ops.project.saved')} action={onUpdate} className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <input name="title" defaultValue={milestone.title} className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium" />
          <select name="status" defaultValue={milestone.status} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm">
            {Object.entries(MILESTONE_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <textarea name="description" defaultValue={milestone.description ?? ''} rows={2} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
        <div className="flex flex-wrap gap-3 items-center">
          <input name="dueDate" type="date" defaultValue={milestone.due_date ?? ''} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="visibleToClient" defaultChecked={milestone.visible_to_client} /> {t('ops.project.visibleClientShort')}
          </label>
          <button type="submit" className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50">{t('ops.project.save')}</button>
        </div>
      </ToastForm>
      {milestone.milestone_updates && milestone.milestone_updates.length > 0 && (
        <ul className="mt-4 space-y-2 border-t border-zinc-100 pt-4 text-sm">
          {milestone.milestone_updates.map((u) => (
            <li key={u.id} className="text-zinc-600">
              <span className="text-xs text-zinc-400">{formatDate(u.created_at)}</span>
              <p>{u.body}</p>
            </li>
          ))}
        </ul>
      )}
      <ToastForm success={t('ops.project.updatePublished')} action={onAddUpdate} className="mt-3 flex gap-2">
        <input name="body" placeholder={t('ops.project.updatePlaceholder')} className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
        <button type="submit" className="rounded-lg bg-zinc-800 px-3 py-2 text-sm text-white">{t('ops.project.publish')}</button>
      </ToastForm>
    </article>
  );
}
