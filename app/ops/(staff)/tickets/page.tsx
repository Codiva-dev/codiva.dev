import OpsPageHeader from '@/components/ops/OpsPageHeader';
import OpsTicketsTable from '@/components/ops/search/OpsTicketsTable';
import { listVisibleProjectIds, projectIdInFilter, requireCapability } from '@/lib/ops/auth';
import { labelsFor } from '@/lib/ops/labels';
import { asProject } from '@/lib/ops/tickets';
import { getT } from '@/i18n/locale';

export default async function TicketsPage() {
  const { supabase, user, staff } = await requireCapability('tickets');
  const t = await getT();
  const { EMPTY_LABEL, TICKET_STATUS_LABELS, TICKET_PRIORITY_LABELS, formatDate } = labelsFor(t.locale);
  const visibleIds = projectIdInFilter(await listVisibleProjectIds(supabase, user.id, staff));
  let ticketsQuery = supabase
    .from('tickets')
    .select('id, title, priority, status, reporter_name, reporter_email, assigned_to, created_at, projects(name)')
    .order('created_at', { ascending: false });
  if (visibleIds) ticketsQuery = ticketsQuery.in('project_id', visibleIds);

  const [{ data: tickets }, { data: staffRows }] = await Promise.all([
    ticketsQuery,
    supabase.from('staff_profiles').select('id, full_name').eq('active', true),
  ]);

  const names = new Map((staffRows ?? []).map((s) => [s.id, s.full_name || s.id.slice(0, 8)]));

  return (
    <div>
      <OpsPageHeader title={t('ops.pages.tickets')} description={t('ops.pages.ticketsDesc')} />
      <OpsTicketsTable
        tickets={(tickets ?? []).map((ticket) => ({
          id: ticket.id,
          title: ticket.title,
          projectName: asProject(ticket.projects)?.name || EMPTY_LABEL,
          reporterName: ticket.reporter_name,
          reporterEmail: ticket.reporter_email,
          assigneeName: ticket.assigned_to ? names.get(ticket.assigned_to) || EMPTY_LABEL : EMPTY_LABEL,
          priority: ticket.priority,
          priorityLabel: TICKET_PRIORITY_LABELS[ticket.priority] ?? ticket.priority,
          status: ticket.status,
          statusLabel: TICKET_STATUS_LABELS[ticket.status] ?? ticket.status,
          createdAt: formatDate(ticket.created_at),
        }))}
      />
    </div>
  );
}
