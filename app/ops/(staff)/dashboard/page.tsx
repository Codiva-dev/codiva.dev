import Link from 'next/link';
import DashboardFinance from '@/components/ops/DashboardFinance';
import OpsPageHeader from '@/components/ops/OpsPageHeader';
import PortalClientUrl from '@/components/ops/PortalClientUrl';
import StatusBadge, { leadTone, projectTone, ticketTone } from '@/components/ops/StatusBadge';
import Card, { CardHeader } from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import { listVisibleProjectIds, projectIdInFilter, requireStaff } from '@/lib/ops/auth';
import { buildFinanceSummary, type FinanceFilters } from '@/lib/ops/finance';
import { can } from '@/lib/ops/permissions';
import { labelsFor } from '@/lib/ops/labels';
import { loadInboundItems, type InboundKind } from '@/lib/ops/inbound';
import { getT } from '@/i18n/locale';
import { opsProjectPath } from '@/lib/ops/project-path';

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0] || undefined;
  return value || undefined;
}

function inboundKindLabel(kind: InboundKind, t: Awaited<ReturnType<typeof getT>>) {
  const keys: Record<InboundKind, string> = {
    contact: 'ops.inbox.kindContact',
    lead: 'ops.inbox.kindLead',
    ticket: 'ops.inbox.kindTicket',
    application: 'ops.inbox.kindApplication',
    hunt: 'ops.inbox.kindHunt',
  };
  return t(keys[kind]);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    org?: string | string[];
    chargeStatus?: string | string[];
    kind?: string | string[];
    projectStatus?: string | string[];
  }>;
}) {
  const access = await requireStaff();
  const { supabase, user, staff } = access;
  const params = await searchParams;
  const showCommercial = can(staff, 'leads');
  const showFinance = can(staff, 'dashboard_finance');
  const visibleIds = await listVisibleProjectIds(supabase, user.id, staff);
  const t = await getT();
  const {
    LEAD_STATUS_LABELS,
    PROJECT_STATUS_LABELS,
    SPRINT_ITEM_STATUS_LABELS,
    TICKET_STATUS_LABELS,
    formatDate,
  } = labelsFor(t.locale);

  const filters: FinanceFilters = {
    org: firstParam(params.org),
    chargeStatus: firstParam(params.chargeStatus),
    kind: firstParam(params.kind),
    projectStatus: firstParam(params.projectStatus),
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

  const projectFilter = projectIdInFilter(visibleIds);
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
    { data: leads },
    inbound,
    { data: tickets },
    { data: projects },
    { data: financeProjects },
    { data: charges },
    { data: quotes },
    { data: mySprintItems },
  ] = await Promise.all([
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

  const financeSummary = showFinance
    ? buildFinanceSummary(charges ?? [], quotes ?? [], financeProjects ?? [], filters)
    : null;

  return (
    <div>
      <OpsPageHeader
        title={t('ops.pages.dashboard')}
        description={
          showCommercial ? t('ops.pages.dashboardCommercial') : t('ops.pages.dashboardAssigned')
        }
      />

      {financeSummary && <DashboardFinance summary={financeSummary} filters={filters} />}

      <div className="grid gap-6 lg:grid-cols-2">
        {!showCommercial && (
          <Card as="section" className="lg:col-span-2">
            <CardHeader
              title={t('ops.pages.mySprintItems')}
              action={
                <Link href="/projects" className="text-sm text-codiva-primary hover:underline">
                  {t('ops.pages.viewProjects')}
                </Link>
              }
            />
            <ul className="space-y-3">
              {(mySprintItems ?? []).map((item) => {
                const sprint = item.project_sprints as {
                  name?: string;
                  project_id?: string;
                  projects?: { name?: string; slug?: string } | { name?: string; slug?: string }[] | null;
                } | null;
                const project = Array.isArray(sprint?.projects) ? sprint?.projects[0] : sprint?.projects;
                return (
                  <li key={item.id} className="flex min-w-0 items-center justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <Link
                        href={opsProjectPath(project?.slug || sprint?.project_id || '', '?tab=sprints')}
                        className="font-medium hover:text-codiva-primary"
                      >
                        {item.title}
                      </Link>
                      <p className="text-xs text-zinc-500">
                        {project?.name || t('ops.dashboard.project')} · {sprint?.name || t('ops.dashboard.sprint')}
                      </p>
                    </div>
                    <StatusBadge
                      label={SPRINT_ITEM_STATUS_LABELS[item.status] ?? item.status}
                      tone={item.status === 'blocked' ? 'danger' : 'info'}
                    />
                  </li>
                );
              })}
              {!(mySprintItems ?? []).length && (
                <EmptyState>{t('ops.dashboard.noSprintItems')}</EmptyState>
              )}
            </ul>
          </Card>
        )}

        {showCommercial && (
          <Card as="section">
            <CardHeader
              title={t('ops.dashboard.newLeads')}
              action={
                <Link href="/leads" className="text-sm text-codiva-primary hover:underline">
                  {t('ops.dashboard.viewAll')}
                </Link>
              }
            />
            <ul className="space-y-3">
              {(leads ?? []).map((l) => (
                <li key={l.id} className="flex min-w-0 items-center justify-between gap-3 text-sm">
                  <Link href={`/leads/${l.id}`} className="min-w-0 truncate font-medium hover:text-codiva-primary">
                    {l.company || l.name}
                  </Link>
                  <StatusBadge label={LEAD_STATUS_LABELS[l.status]} tone={leadTone(l.status)} />
                </li>
              ))}
              {!leads?.length && <EmptyState>{t('ops.dashboard.noNewLeads')}</EmptyState>}
            </ul>
          </Card>
        )}

        <Card as="section">
          <CardHeader
            title={t('ops.inbox.pending')}
            action={
              can(staff, 'inbox') ? (
                <Link href="/inbox" className="text-sm text-codiva-primary hover:underline">
                  {t('ops.inbox.viewInbox')}
                </Link>
              ) : null
            }
          />
          <ul className="space-y-3">
            {inbound.map((item) => (
              <li key={item.key} className="text-sm">
                <Link href={item.href} className="font-medium hover:text-codiva-primary">
                  {item.title}
                </Link>
                <p className="truncate text-zinc-500">
                  {inboundKindLabel(item.kind, t)} · {item.subtitle}
                </p>
              </li>
            ))}
            {!inbound.length && <EmptyState>{t('ops.inbox.caughtUp')}</EmptyState>}
          </ul>
        </Card>

        <Card as="section">
          <CardHeader
            title={t('ops.dashboard.openTickets')}
            action={
              <Link href="/tickets" className="text-sm text-codiva-primary hover:underline">
                {t('ops.dashboard.viewTickets')}
              </Link>
            }
          />
          <ul className="space-y-3">
            {(tickets ?? []).map((t) => (
              <li key={t.id} className="flex min-w-0 items-center justify-between gap-3 text-sm">
                <Link href={`/tickets/${t.id}`} className="min-w-0 truncate font-medium hover:text-codiva-primary">
                  {t.title}
                </Link>
                <StatusBadge label={TICKET_STATUS_LABELS[t.status]} tone={ticketTone(t.status)} />
              </li>
            ))}
            {!tickets?.length && <EmptyState>{t('ops.dashboard.noOpenTickets')}</EmptyState>}
          </ul>
        </Card>

        <Card as="section">
          <CardHeader
            title={t('ops.dashboard.activeProjects')}
            action={
              <Link href="/projects" className="text-sm text-codiva-primary hover:underline">
                {t('ops.pages.viewProjects')}
              </Link>
            }
          />
          <ul className="space-y-3">
            {(projects ?? []).map((p) => (
              <li key={p.id} className="text-sm">
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <Link href={opsProjectPath(p.slug)} className="min-w-0 truncate font-medium hover:text-codiva-primary">
                    {p.name}
                  </Link>
                  <StatusBadge label={PROJECT_STATUS_LABELS[p.status]} tone={projectTone(p.status)} />
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                  <span>{t('ops.dashboard.progressPct', { pct: p.progress_percent })}</span>
                  <span>{t('ops.dashboard.delivery', { date: formatDate(p.target_delivery_date) })}</span>
                  <Link href={opsProjectPath(p.slug, '?tab=sprints')} className="font-medium text-codiva-primary hover:underline">
                    {t('ops.dashboard.sprints')}
                  </Link>
                  <PortalClientUrl slug={p.slug} />
                </div>
              </li>
            ))}
            {!projects?.length && <EmptyState>{t('ops.dashboard.noActiveProjects')}</EmptyState>}
          </ul>
        </Card>
      </div>
    </div>
  );
}
