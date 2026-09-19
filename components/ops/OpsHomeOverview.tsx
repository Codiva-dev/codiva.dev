import Link from 'next/link';
import DashboardFinance from '@/components/ops/DashboardFinance';
import PortalClientUrl from '@/components/ops/PortalClientUrl';
import StatusBadge, { leadTone, projectTone, ticketTone } from '@/components/ops/StatusBadge';
import Card, { CardHeader } from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import { getT } from '@/i18n/locale';
import { labelsFor } from '@/lib/ops/labels';
import type { FinanceFilters, FinanceSummary } from '@/lib/ops/finance';
import type { InboundItem, InboundKind } from '@/lib/ops/inbound';
import { OPS_HOME_PATH } from '@/lib/ops/home';
import { opsProjectPath } from '@/lib/ops/project-path';

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

function firstRelated<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

type SprintItemRow = {
  id: string;
  title: string;
  status: string;
  project_sprints?:
    | {
        name?: string;
        project_id?: string;
        projects?: { name?: string; slug?: string } | { name?: string; slug?: string }[] | null;
      }
    | {
        name?: string;
        project_id?: string;
        projects?: { name?: string; slug?: string } | { name?: string; slug?: string }[] | null;
      }[]
    | null;
};

type LeadRow = {
  id: string;
  name: string | null;
  company: string | null;
  status: string;
};

type TicketRow = {
  id: string;
  title: string;
  status: string;
};

type ProjectRow = {
  id: string;
  name: string;
  slug: string | null;
  status: string;
  target_delivery_date: string | null;
  progress_percent: number | null;
};

export default async function OpsHomeOverview({
  showCommercial,
  canInbox,
  financeSummary,
  filters,
  mySprintItems,
  leads,
  inbound,
  tickets,
  projects,
}: {
  showCommercial: boolean;
  canInbox: boolean;
  financeSummary: FinanceSummary | null;
  filters: FinanceFilters;
  mySprintItems: SprintItemRow[];
  leads: LeadRow[];
  inbound: InboundItem[];
  tickets: TicketRow[];
  projects: ProjectRow[];
}) {
  const t = await getT();
  const {
    LEAD_STATUS_LABELS,
    PROJECT_STATUS_LABELS,
    SPRINT_ITEM_STATUS_LABELS,
    TICKET_STATUS_LABELS,
    formatDate,
  } = labelsFor(t.locale);

  return (
    <section id="resumen" className="scroll-mt-24 border-t border-zinc-200 pt-10">
      <div className="mb-6">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900">{t('ops.pendientes.overviewTitle')}</h2>
        <p className="mt-1 text-sm text-zinc-600">
          {showCommercial ? t('ops.pages.dashboardCommercial') : t('ops.pages.dashboardAssigned')}
        </p>
      </div>

      {financeSummary ? <DashboardFinance summary={financeSummary} filters={filters} action={OPS_HOME_PATH} /> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {!showCommercial ? (
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
              {mySprintItems.map((item) => {
                const sprint = firstRelated(item.project_sprints);
                const project = firstRelated(sprint?.projects);
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
              {!mySprintItems.length ? <EmptyState>{t('ops.dashboard.noSprintItems')}</EmptyState> : null}
            </ul>
          </Card>
        ) : null}

        {showCommercial ? (
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
              {leads.map((lead) => (
                <li key={lead.id} className="flex min-w-0 items-center justify-between gap-3 text-sm">
                  <Link href={`/leads/${lead.id}`} className="min-w-0 truncate font-medium hover:text-codiva-primary">
                    {lead.company || lead.name}
                  </Link>
                  <StatusBadge label={LEAD_STATUS_LABELS[lead.status]} tone={leadTone(lead.status)} />
                </li>
              ))}
              {!leads.length ? <EmptyState>{t('ops.dashboard.noNewLeads')}</EmptyState> : null}
            </ul>
          </Card>
        ) : null}

        <Card as="section">
          <CardHeader
            title={t('ops.inbox.pending')}
            action={
              canInbox ? (
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
            {!inbound.length ? <EmptyState>{t('ops.inbox.caughtUp')}</EmptyState> : null}
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
            {tickets.map((ticket) => (
              <li key={ticket.id} className="flex min-w-0 items-center justify-between gap-3 text-sm">
                <Link href={`/tickets/${ticket.id}`} className="min-w-0 truncate font-medium hover:text-codiva-primary">
                  {ticket.title}
                </Link>
                <StatusBadge label={TICKET_STATUS_LABELS[ticket.status]} tone={ticketTone(ticket.status)} />
              </li>
            ))}
            {!tickets.length ? <EmptyState>{t('ops.dashboard.noOpenTickets')}</EmptyState> : null}
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
            {projects.map((project) => (
              <li key={project.id} className="text-sm">
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <Link href={opsProjectPath(project.slug || project.id)} className="min-w-0 truncate font-medium hover:text-codiva-primary">
                    {project.name}
                  </Link>
                  <StatusBadge label={PROJECT_STATUS_LABELS[project.status]} tone={projectTone(project.status)} />
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                  <span>{t('ops.dashboard.progressPct', { pct: project.progress_percent })}</span>
                  <span>{t('ops.dashboard.delivery', { date: formatDate(project.target_delivery_date) })}</span>
                  <Link href={opsProjectPath(project.slug || project.id, '?tab=sprints')} className="font-medium text-codiva-primary hover:underline">
                    {t('ops.dashboard.sprints')}
                  </Link>
                  {project.slug ? <PortalClientUrl slug={project.slug} /> : null}
                </div>
              </li>
            ))}
            {!projects.length ? <EmptyState>{t('ops.dashboard.noActiveProjects')}</EmptyState> : null}
          </ul>
        </Card>
      </div>
    </section>
  );
}
