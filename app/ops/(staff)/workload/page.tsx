import OpsPageHeader from '@/components/ops/OpsPageHeader';
import OpsWorkloadList, { type OpsWorkloadPerson } from '@/components/ops/search/OpsWorkloadList';
import { requireCapability } from '@/lib/ops/auth';
import { labelsFor } from '@/lib/ops/labels';
import { getT } from '@/i18n/locale';

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

  const people: OpsWorkloadPerson[] = (staff ?? []).map((s) => {
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
          statusLabel: SPRINT_ITEM_STATUS_LABELS[i.status] ?? i.status,
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
        .filter((row) => row.assigned_to === s.id)
        .map((row) => ({
          id: row.id,
          title: row.title,
          status: row.status,
          statusLabel: TICKET_STATUS_LABELS[row.status] ?? row.status,
        })),
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
      <OpsWorkloadList people={people} />
      <p className="mt-4 text-xs text-zinc-400">{t('ops.workloadPage.weekFrom', { date: formatDate(weekStartStr) })}</p>
    </div>
  );
}
