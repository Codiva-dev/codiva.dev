import Link from 'next/link';
import DashboardFinance from '@/components/ops/DashboardFinance';
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
    <section id="resumen" className="scroll-mt-24 space-y-3">
      <h2 className="text-sm font-semibold tracking-tight text-zinc-900">{t('ops.pendientes.overviewTitle')}</h2>

      {financeSummary ? <DashboardFinance summary={financeSummary} filters={filters} action={OPS_HOME_PATH} /> : null}

      {!showCommercial ? (
        <Card as="section" padding="sm">
          <CardHeader
            title={t('ops.pages.mySprintItems')}
            action={
              <Link href="/projects" className="text-xs text-codiva-primary hover:underline">
                {t('ops.pages.viewProjects')}
              </Link>
            }
          />
          <ul className="space-y-2">
            {mySprintItems.map((item) => {
              const sprint = firstRelated(item.project_sprints);
              const project = firstRelated(sprint?.projects);
              return (
                <li key={item.id} className="flex min-w-0 items-center justify-between gap-2 text-sm">
                  <Link
                    href={opsProjectPath(project?.slug || sprint?.project_id || '', '?tab=sprints')}
                    className="min-w-0 truncate font-medium hover:text-codiva-primary"
                  >
                    {item.title}
                  </Link>
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
        <Card as="section" padding="sm">
          <CardHeader
            title={t('ops.dashboard.newLeads')}
            action={
              <Link href="/leads" className="text-xs text-codiva-primary hover:underline">
                {t('ops.dashboard.viewAll')}
              </Link>
            }
          />
          <ul className="space-y-2">
            {leads.map((lead) => (
              <li key={lead.id} className="flex min-w-0 items-center justify-between gap-2 text-sm">
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

      <Card as="section" padding="sm">
        <CardHeader
          title={t('ops.inbox.pending')}
          action={
            canInbox ? (
              <Link href="/inbox" className="text-xs text-codiva-primary hover:underline">
                {t('ops.inbox.viewInbox')}
              </Link>
            ) : null
          }
        />
        <ul className="space-y-2">
          {inbound.map((item) => (
            <li key={item.key} className="min-w-0 text-sm">
              <Link href={item.href} className="block truncate font-medium hover:text-codiva-primary">
                {item.title}
              </Link>
              <p className="truncate text-xs text-zinc-500">
                {inboundKindLabel(item.kind, t)} · {item.subtitle}
              </p>
            </li>
          ))}
          {!inbound.length ? <EmptyState>{t('ops.inbox.caughtUp')}</EmptyState> : null}
        </ul>
      </Card>

      <Card as="section" padding="sm">
        <CardHeader
          title={t('ops.dashboard.openTickets')}
          action={
            <Link href="/tickets" className="text-xs text-codiva-primary hover:underline">
              {t('ops.dashboard.viewTickets')}
            </Link>
          }
        />
        <ul className="space-y-2">
          {tickets.map((ticket) => (
            <li key={ticket.id} className="flex min-w-0 items-center justify-between gap-2 text-sm">
              <Link href={`/tickets/${ticket.id}`} className="min-w-0 truncate font-medium hover:text-codiva-primary">
                {ticket.title}
              </Link>
              <StatusBadge label={TICKET_STATUS_LABELS[ticket.status]} tone={ticketTone(ticket.status)} />
            </li>
          ))}
          {!tickets.length ? <EmptyState>{t('ops.dashboard.noOpenTickets')}</EmptyState> : null}
        </ul>
      </Card>

      <Card as="section" padding="sm">
        <CardHeader
          title={t('ops.dashboard.activeProjects')}
          action={
            <Link href="/projects" className="text-xs text-codiva-primary hover:underline">
              {t('ops.pages.viewProjects')}
            </Link>
          }
        />
        <ul className="space-y-2">
          {projects.map((project) => (
            <li key={project.id} className="min-w-0 text-sm">
              <div className="flex min-w-0 items-center justify-between gap-2">
                <Link
                  href={opsProjectPath(project.slug || project.id)}
                  className="min-w-0 truncate font-medium hover:text-codiva-primary"
                >
                  {project.name}
                </Link>
                <StatusBadge label={PROJECT_STATUS_LABELS[project.status]} tone={projectTone(project.status)} />
              </div>
              <p className="mt-0.5 truncate text-xs text-zinc-500">
                {t('ops.dashboard.progressPct', { pct: project.progress_percent })}
                <span aria-hidden> · </span>
                {t('ops.dashboard.delivery', { date: formatDate(project.target_delivery_date) })}
              </p>
            </li>
          ))}
          {!projects.length ? <EmptyState>{t('ops.dashboard.noActiveProjects')}</EmptyState> : null}
        </ul>
      </Card>
    </section>
  );
}
