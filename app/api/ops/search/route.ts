import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getT } from '@/i18n/locale';
import { can } from '@/lib/ops/permissions';
import { listVisibleProjectIds, projectIdInFilter } from '@/lib/ops/auth';
import { opsProjectPath } from '@/lib/ops/project-path';
import { asProject } from '@/lib/ops/tickets';
import {
  canSeeSearchNav,
  filterSearchHits,
  OPS_SEARCH_NAV,
  type OpsSearchHit,
} from '@/lib/ops/global-search';

export const runtime = 'nodejs';

const LIMIT = 150;

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'unauth' }, { status: 401 });

  const { data: staff } = await supabase
    .from('staff_profiles')
    .select('id, role, capabilities, active')
    .eq('id', user.id)
    .eq('active', true)
    .maybeSingle();
  if (!staff) return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });

  const t = await getT();
  const query = new URL(request.url).searchParams.get('q') || '';
  const hits: OpsSearchHit[] = [];

  for (const item of OPS_SEARCH_NAV) {
    if (!canSeeSearchNav(staff, item)) continue;
    hits.push({
      id: item.href,
      group: 'page',
      title: t(item.labelKey),
      subtitle: t('ops.commandPalette.groups.page'),
      href: item.href,
    });
  }

  const visibleIds = projectIdInFilter(await listVisibleProjectIds(supabase, staff.id, staff));

  let projectsQuery = supabase
    .from('projects')
    .select('id, name, slug, status, organizations(name)')
    .order('updated_at', { ascending: false })
    .limit(LIMIT);
  if (visibleIds) projectsQuery = projectsQuery.in('id', visibleIds);

  const [assignments, leads, projects, tickets] = await Promise.all([
    can(staff, 'assignments')
      ? supabase
          .from('work_assignments')
          .select('id, title, description, status, assignee_id')
          .neq('status', 'archived')
          .order('status_entered_at', { ascending: false })
          .limit(LIMIT)
      : Promise.resolve({ data: [] }),
    can(staff, 'leads')
      ? supabase
          .from('leads')
          .select('id, name, company, email, status')
          .order('created_at', { ascending: false })
          .limit(LIMIT)
      : Promise.resolve({ data: [] }),
    projectsQuery,
    can(staff, 'tickets')
      ? (() => {
          let ticketsQuery = supabase
            .from('tickets')
            .select('id, title, status, projects(name, slug)')
            .order('created_at', { ascending: false })
            .limit(LIMIT);
          if (visibleIds) ticketsQuery = ticketsQuery.in('project_id', visibleIds);
          return ticketsQuery;
        })()
      : Promise.resolve({ data: [] }),
  ]);

  for (const row of assignments.data ?? []) {
    hits.push({
      id: row.id,
      group: 'assignment',
      title: row.title,
      subtitle: row.status,
      href: `/asignaciones?id=${encodeURIComponent(row.id)}`,
      searchText: row.description || '',
    });
  }
  for (const row of leads.data ?? []) {
    hits.push({
      id: row.id,
      group: 'lead',
      title: row.company || row.name,
      subtitle: [row.name, row.email].filter(Boolean).join(' · '),
      href: `/leads/${row.id}`,
      searchText: [row.company, row.name, row.email, row.status].filter(Boolean).join(' '),
    });
  }
  for (const row of projects.data ?? []) {
    const org = row.organizations as { name?: string } | { name?: string }[] | null;
    const orgName = Array.isArray(org) ? org[0]?.name : org?.name;
    hits.push({
      id: row.id,
      group: 'project',
      title: row.name,
      subtitle: orgName || row.status,
      href: opsProjectPath(row.slug),
    });
  }
  for (const row of tickets.data ?? []) {
    const project = asProject(row.projects);
    hits.push({
      id: row.id,
      group: 'ticket',
      title: row.title,
      subtitle: project?.name || row.status,
      href: `/tickets/${row.id}`,
    });
  }

  return NextResponse.json({ ok: true, hits: filterSearchHits(hits, query) });
}
