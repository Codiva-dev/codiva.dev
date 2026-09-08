import Link from 'next/link';
import OpsPageHeader from '@/components/ops/OpsPageHeader';
import StatusBadge, { ticketTone } from '@/components/ops/StatusBadge';
import { requireCapability } from '@/lib/ops/auth';
import { labelsFor } from '@/lib/ops/labels';
import { getT } from '@/i18n/locale';
import { opsProjectPath } from '@/lib/ops/project-path';

type StaffLoad = {
  id: string;
  name: string;
  role: string;
  sprintItems: {
    id: string;
    title: string;
    status: string;
    projectId: string;
    projectSlug: string;
    projectName: string;
    sprintName: string;
  }[];
  tickets: { id: string; title: string; status: string; priority: string }[];
  hoursThisWeek: number;
  projectCount: number;
};

export default async function WorkloadPage() {
  const { supabase } = await requireCapability('workload');
  const t = await getT();
  const { EMPTY_LABEL, SPRINT_ITEM_STATUS_LABELS, TICKET_STATUS_LABELS, formatDate } = labelsFor(
    t.locale
  );

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const weekStartStr = weekStart.toISOString().slice(0, 10);

  const [{ data: staff }, { data: projectStaff }, { data: items }, { data: tickets }, { data: entries }] =
    await Promise.all([
      supabase.from('staff_profiles').select('id, full_name, role').eq('active', true).order('full_name'),
      supabase.from('project_staff').select('staff_id, project_id'),
      supabase
        .from('sprint_items')
        .select(
          'id, title, status, assignee_id, project_sprints!inner(id, name, project_id, projects(id, name, slug))'
        )
        .not('assignee_id', 'is', null)
        .neq('status', 'done'),
      supabase
        .from('tickets')
        .select('id, title, status, priority, assigned_to')
        .not('assigned_to', 'is', null)
        .in('status', ['new', 'in_progress', 'waiting_client']),
      supabase
        .from('time_entries')
        .select('staff_id, hours, worked_on')
        .gte('worked_on', weekStartStr),
    ]);

  const projectsByStaff = new Map<string, Set<string>>();
  for (const row of projectStaff ?? []) {
    if (!projectsByStaff.has(row.staff_id)) projectsByStaff.set(row.staff_id, new Set());
    projectsByStaff.get(row.staff_id)!.add(row.project_id);
  }

  const hoursByStaff = new Map<string, number>();
  for (const e of entries ?? []) {
    hoursByStaff.set(e.staff_id, (hoursByStaff.get(e.staff_id) || 0) + Number(e.hours));
  }

  const loads: StaffLoad[] = (staff ?? []).map((s) => {
    const sprintItems = (items ?? [])
      .filter((i) => i.assignee_id === s.id)
      .map((i) => {
        const sprint = i.project_sprints as {
          name?: string;
          project_id?: string;
          projects?: { name?: string; slug?: string } | { name?: string; slug?: string }[] | null;
        } | null;
        const project = Array.isArray(sprint?.projects) ? sprint?.projects[0] : sprint?.projects;
        return {
          id: i.id,
          title: i.title,
          status: i.status,
          projectId: sprint?.project_id || '',
          projectSlug: project?.slug || sprint?.project_id || '',
          projectName: project?.name || EMPTY_LABEL,
          sprintName: sprint?.name || 'Sprint',
        };
      });

    return {
      id: s.id,
      name: s.full_name || s.id.slice(0, 8),
      role: s.role,
      sprintItems,
      tickets: (tickets ?? [])
        .filter((t) => t.assigned_to === s.id)
        .map((t) => ({ id: t.id, title: t.title, status: t.status, priority: t.priority })),
      hoursThisWeek: hoursByStaff.get(s.id) || 0,
      projectCount: projectsByStaff.get(s.id)?.size || 0,
    };
  });

  return (
    <div>
      <OpsPageHeader
        title={t('ops.pages.workload')}
        description={t('ops.pages.workloadDesc')}
      />

      <div className="space-y-6">
        {loads.map((person) => (
          <section key={person.id} className="rounded-xl border border-zinc-200 bg-white p-5">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <h2 className="font-semibold">{person.name}</h2>
                <p className="text-xs uppercase tracking-wide text-zinc-400">{person.role}</p>
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-zinc-600">
                <span>{t('ops.workloadPage.projectsCount', { count: person.projectCount })}</span>
                <span>{t('ops.workloadPage.openItems', { count: person.sprintItems.length })}</span>
                <span>{t('ops.workloadPage.ticketsCount', { count: person.tickets.length })}</span>
                <span className="font-medium text-codiva-primary">
                  {t('ops.workloadPage.hoursWeek', { hours: person.hoursThisWeek.toFixed(1) })}
                </span>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm font-medium text-zinc-700">{t('ops.workloadPage.sprint')}</h3>
                <ul className="space-y-2">
                  {person.sprintItems.map((item) => (
                    <li key={item.id} className="flex min-w-0 items-start justify-between gap-2 text-sm">
                      <div className="min-w-0">
                        <Link
                          href={opsProjectPath(item.projectSlug, '?tab=sprints')}
                          className="font-medium hover:text-codiva-primary"
                        >
                          {item.title}
                        </Link>
                        <p className="text-xs text-zinc-400">
                          {item.projectName} · {item.sprintName}
                        </p>
                      </div>
                      <StatusBadge
                        label={SPRINT_ITEM_STATUS_LABELS[item.status] ?? item.status}
                        tone={item.status === 'blocked' ? 'danger' : 'info'}
                      />
                    </li>
                  ))}
                  {!person.sprintItems.length && (
                    <p className="text-sm text-zinc-400">{t('ops.workloadPage.noOpenItems')}</p>
                  )}
                </ul>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-medium text-zinc-700">{t('ops.workloadPage.tickets')}</h3>
                <ul className="space-y-2">
                  {person.tickets.map((t) => (
                    <li key={t.id} className="flex min-w-0 items-start justify-between gap-2 text-sm">
                      <Link href={`/tickets/${t.id}`} className="min-w-0 break-words font-medium hover:text-codiva-primary">
                        {t.title}
                      </Link>
                      <StatusBadge label={TICKET_STATUS_LABELS[t.status] ?? t.status} tone={ticketTone(t.status)} />
                    </li>
                  ))}
                  {!person.tickets.length && <p className="text-sm text-zinc-400">{t('ops.workloadPage.noTickets')}</p>}
                </ul>
              </div>
            </div>
          </section>
        ))}
        {!loads.length && (
          <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-500">
            {t('ops.workloadPage.noStaff')}
          </p>
        )}
      </div>
      <p className="mt-4 text-xs text-zinc-400">{t('ops.workloadPage.weekFrom', { date: formatDate(weekStartStr) })}</p>
    </div>
  );
}
