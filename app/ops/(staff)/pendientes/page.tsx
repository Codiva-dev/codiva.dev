import OpsHomeOverview from '@/components/ops/OpsHomeOverview';
import OpsPendientesHome from '@/components/ops/search/OpsPendientesHome';
import { listVisibleProjectIds, projectIdInFilter, requireStaff } from '@/lib/ops/auth';
import { can } from '@/lib/ops/permissions';
import { getT } from '@/i18n/locale';
import { labelsFor } from '@/lib/ops/labels';
import { ATTENTION_FULL_LIMIT } from '@/lib/ops/attention';
import { loadAttentionQueue } from '@/lib/ops/attention-query';
import { firstSearchParam, opsGreetingPeriod, staffFirstName } from '@/lib/ops/home';
import { buildFinanceSummary, type FinanceFilters } from '@/lib/ops/finance';
import { loadInboundItems } from '@/lib/ops/inbound';
import { buildPendingMonitor } from '@/lib/ops/pending-monitor';
import { listWorkPending } from '@/lib/ops/work-pending';

export default async function PendientesPage({
  searchParams,
}: {
  searchParams: Promise<{
    org?: string | string[];
    chargeStatus?: string | string[];
    kind?: string | string[];
    projectStatus?: string | string[];
  }>;
}) {
  const { supabase, user, staff } = await requireStaff();
  const t = await getT();
  const params = await searchParams;
  const { WORK_STATUS_LABELS, WORK_STREAM_LABELS, formatDate } = labelsFor(t.locale);
  const canAssignments = can(staff, 'assignments');
  const canManage = can(staff, 'assignments_manage');
  const showCommercial = can(staff, 'leads');
  const showFinance = can(staff, 'dashboard_finance');
  const visibleIds = await listVisibleProjectIds(supabase, user.id, staff);
  const projectFilter = projectIdInFilter(visibleIds);
  const filters: FinanceFilters = {
    org: firstSearchParam(params.org),
    chargeStatus: firstSearchParam(params.chargeStatus),
    kind: firstSearchParam(params.kind),
    projectStatus: firstSearchParam(params.projectStatus),
  };

  let projectsQuery = supabase
    .from('projects')
    .select('id, name, slug, status, target_delivery_date, progress_percent, client_visible')
    .in('status', ['active', 'quoting', 'draft'])
    .order('updated_at', { ascending: false })
    .limit(8);

  let financeProjectsQuery = supabase
    .from('projects')
    .select('id, name, slug, status, organization_id, organizations(id, name)')
    .order('name', { ascending: true });

  if (projectFilter) {
    projectsQuery = projectsQuery.in('id', projectFilter);
    financeProjectsQuery = financeProjectsQuery.in('id', projectFilter);
  }

  let ticketsQuery = supabase
    .from('tickets')
    .select('id, title, priority, status, created_at')
    .in('status', ['new', 'in_progress'])
    .order('created_at', { ascending: false })
    .limit(5);
  if (projectFilter) ticketsQuery = ticketsQuery.in('project_id', projectFilter);

  const [
    { assignments, mentions, editRequests },
    attention,
    { data: leads },
    inbound,
    { data: tickets },
    { data: projects },
    { data: financeProjects },
    { data: charges },
    { data: quotes },
    { data: mySprintItems },
  ] = await Promise.all([
    canAssignments
      ? listWorkPending(supabase, staff.id, canManage)
      : Promise.resolve({ assignments: [], mentions: [], editRequests: [] }),
    loadAttentionQueue({
      supabase,
      staff,
      visibleProjectIds: visibleIds,
      limit: ATTENTION_FULL_LIMIT,
    }),
    showCommercial
      ? supabase
          .from('leads')
          .select('id, name, company, status, created_at')
          .eq('status', 'new')
          .order('created_at', { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [] as never[] }),
    loadInboundItems({
      supabase,
      permissions: staff,
      visibleProjectIds: visibleIds,
      maxItems: 5,
    }),
    ticketsQuery,
    projectsQuery,
    showFinance ? financeProjectsQuery : Promise.resolve({ data: [] as never[] }),
    showFinance
      ? supabase
          .from('project_charges')
          .select(
            'id, kind, title, amount, currency, status, due_date, project_id, projects(id, name, slug, status, organization_id, organizations(id, name))'
          )
          .order('due_date', { ascending: true })
      : Promise.resolve({ data: [] as never[] }),
    showFinance
      ? supabase
          .from('quotes')
          .select('id, project_id, status, total_amount, currency, version')
          .not('project_id', 'is', null)
          .order('version', { ascending: false })
      : Promise.resolve({ data: [] as never[] }),
    supabase
      .from('sprint_items')
      .select(
        'id, title, status, sprint_id, project_sprints!inner(id, name, project_id, status, projects(id, name, slug))'
      )
      .eq('assignee_id', user.id)
      .neq('status', 'done')
      .order('updated_at', { ascending: false })
      .limit(8),
  ]);

  const monitor = buildPendingMonitor({
    attention,
    assignments: assignments.map((row) => ({
      id: row.id,
      title: row.title,
      subtitle: [
        WORK_STREAM_LABELS[row.stream] ?? row.stream,
        WORK_STATUS_LABELS[row.status] ?? row.status,
        row.due_at ? formatDate(row.due_at) : '',
        `${row.progress_pct}%`,
      ]
        .filter(Boolean)
        .join(' · '),
      dueAt: row.due_at,
    })),
    mentions: mentions.map((row) => ({
      id: row.id,
      assignmentId: row.assignment_id,
      title: row.assignment_title,
      subtitle: [t('ops.pendientes.mentionedBy', { name: row.author_name }), row.preview].filter(Boolean).join(' — '),
      at: row.created_at,
    })),
    editRequests: editRequests.map((row) => ({
      id: row.id,
      assignmentId: row.assignment_id,
      title: row.assignment_title,
      subtitle: [t('ops.pendientes.editRequestedBy', { name: row.requested_by_name }), row.payload]
        .filter(Boolean)
        .join(' — '),
      at: row.created_at,
    })),
  });

  return (
    <div className="mx-auto w-full max-w-5xl">
      <OpsPendientesHome
        firstName={staffFirstName(staff.full_name)}
        greetingPeriod={opsGreetingPeriod()}
        actions={monitor.actions}
        timeline={monitor.timeline}
      />
      <OpsHomeOverview
        showCommercial={showCommercial}
        canInbox={can(staff, 'inbox')}
        financeSummary={
          showFinance ? buildFinanceSummary(charges ?? [], quotes ?? [], financeProjects ?? [], filters) : null
        }
        filters={filters}
        mySprintItems={mySprintItems ?? []}
        leads={leads ?? []}
        inbound={inbound}
        tickets={tickets ?? []}
        projects={projects ?? []}
      />
    </div>
  );
}
