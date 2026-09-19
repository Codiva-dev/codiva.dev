import type { createClient } from '@/lib/supabase/server';
import { getT } from '@/i18n/locale';
import { can, type PermissionSubject } from '@/lib/ops/permissions';
import { opsProjectPath } from '@/lib/ops/project-path';
import { projectIdInFilter } from '@/lib/ops/auth';
import { opsCalendarDate, sprintCoversDate } from '@/lib/ops/project-sprints';
import {
  ATTENTION_RANK,
  attentionItemKey,
  filterAttentionItems,
  isStaleSince,
  isStuckAssignment,
  isUnscheduledInterviewAttention,
  weekStartYmd,
  type AttentionItem,
} from '@/lib/ops/attention';
import {
  DEFAULT_RELEASE_ATTENTION_COPY,
  RELEASE_ATTENTION_FETCH_MS,
  RELEASE_ATTENTION_SETTINGS_LIMIT,
  RELEASE_REQUEST_OCCUPIED_STATUSES,
  filterIncomingForReleaseAttention,
  listIncomingPreviewsForAttention,
  occupiedLooksByProject,
  releaseAttentionFromIncoming,
  releaseAttentionFromRequest,
  staffCanSeeReleaseAttention,
} from '@/lib/ops/release-attention';

type StaffDb = Awaited<ReturnType<typeof createClient>>;

function joinName(value: { name?: string | null; slug?: string | null } | { name?: string | null; slug?: string | null }[] | null | undefined) {
  const row = Array.isArray(value) ? value[0] : value;
  return { name: row?.name || null, slug: row?.slug || null };
}

export async function loadAttentionQueue(opts: {
  supabase: StaffDb;
  staff: PermissionSubject & { id: string };
  visibleProjectIds: string[] | null;
  now?: Date;
  limit?: number;
}): Promise<AttentionItem[]> {
  const now = opts.now ?? new Date();
  const today = opsCalendarDate(now);
  const weekStart = weekStartYmd(now);
  const projectFilter = projectIdInFilter(opts.visibleProjectIds);
  const items: AttentionItem[] = [];

  const ticketsQuery = () => {
    let query = opts.supabase
      .from('tickets')
      .select('id, title, status, created_at, updated_at, project_id, projects(name, slug)')
      .in('status', ['new', 'in_progress'])
      .order('created_at', { ascending: true })
      .limit(40);
    if (projectFilter) query = query.in('project_id', projectFilter);
    return query;
  };

  const chargesQuery = () => {
    let query = opts.supabase
      .from('project_charges')
      .select('id, title, status, due_date, project_id, projects(name, slug)')
      .in('status', ['pending', 'overdue'])
      .order('due_date', { ascending: true })
      .limit(40);
    if (projectFilter) query = query.in('project_id', projectFilter);
    return query;
  };

  const canReleaseAttention = staffCanSeeReleaseAttention(opts.staff);

  const releasesQuery = () => {
    if (!canReleaseAttention) return Promise.resolve({ data: [] as never[] });
    let query = opts.supabase
      .from('project_release_requests')
      .select('id, status, preview_url, commit_sha, project_id, created_at, projects(name, slug)')
      .in('status', [...RELEASE_REQUEST_OCCUPIED_STATUSES])
      .order('created_at', { ascending: false })
      .limit(80);
    if (projectFilter) query = query.in('project_id', projectFilter);
    return query;
  };

  const settingsQuery = () => {
    if (!canReleaseAttention) return Promise.resolve({ data: [] as never[] });
    let query = opts.supabase
      .from('project_release_settings')
      .select(
        'project_id, vercel_project_id, vercel_team_id, github_owner, github_repo, projects(name, slug)'
      )
      .eq('enabled', true)
      .limit(RELEASE_ATTENTION_SETTINGS_LIMIT);
    if (projectFilter) query = query.in('project_id', projectFilter);
    return query;
  };

  const [
    { data: snoozes },
    { data: tickets },
    { data: charges },
    { data: leads },
    { data: rounds },
    { data: assignments },
    { data: sprints },
    { data: hours },
    { data: releases },
    { data: releaseSettings },
  ] = await Promise.all([
    opts.supabase
      .from('ops_attention_snoozes')
      .select('item_key, until')
      .eq('staff_id', opts.staff.id)
      .gt('until', now.toISOString()),
    can(opts.staff, 'tickets') ? ticketsQuery() : Promise.resolve({ data: [] as never[] }),
    can(opts.staff, 'dashboard_finance') ? chargesQuery() : Promise.resolve({ data: [] as never[] }),
    can(opts.staff, 'leads')
      ? opts.supabase
          .from('leads')
          .select('id, name, company, created_at, status')
          .eq('status', 'new')
          .order('created_at', { ascending: true })
          .limit(40)
      : Promise.resolve({ data: [] as never[] }),
    can(opts.staff, 'careers_review')
      ? opts.supabase
          .from('ops_job_interview_rounds')
          .select('id, title, status, application_id, created_at, ops_job_applications(full_name, status)')
          .eq('status', 'planned')
          .is('scheduled_at', null)
          .order('created_at', { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] as never[] }),
    can(opts.staff, 'assignments')
      ? opts.supabase
          .from('work_assignments')
          .select('id, title, status, urgency, status_entered_at, progress_pct')
          .in('status', ['backlog', 'discovery', 'build', 'review'])
          .order('status_entered_at', { ascending: true })
          .limit(80)
      : Promise.resolve({ data: [] as never[] }),
    opts.supabase
      .from('project_sprints')
      .select('id, name, status, starts_on, ends_on, project_id, projects(name, slug)')
      .eq('status', 'active')
      .limit(40),
    opts.supabase.from('time_entries').select('project_id').gte('worked_on', weekStart).limit(400),
    releasesQuery(),
    settingsQuery(),
  ]);

  for (const row of tickets ?? []) {
    if (!isStaleSince(row.updated_at || row.created_at, 48, now)) continue;
    const project = joinName(row.projects);
    items.push({
      key: attentionItemKey('ticket_stale', row.id),
      kind: 'ticket_stale',
      title: row.title,
      subtitle: project.name || 'Ticket',
      href: `/tickets/${row.id}`,
      rank: ATTENTION_RANK.ticket_stale,
      at: row.updated_at || row.created_at,
    });
  }

  for (const row of charges ?? []) {
    const overdue = row.status === 'overdue' || (row.due_date && row.due_date < today);
    if (!overdue) continue;
    const project = joinName(row.projects);
    items.push({
      key: attentionItemKey('charge_overdue', row.id),
      kind: 'charge_overdue',
      title: row.title,
      subtitle: project.name || 'Cargo',
      href: project.slug ? opsProjectPath(project.slug, '?tab=pagos') : '/projects',
      rank: ATTENTION_RANK.charge_overdue,
      at: row.due_date ? `${row.due_date}T12:00:00.000Z` : now.toISOString(),
    });
  }

  for (const row of leads ?? []) {
    if (!isStaleSince(row.created_at, 5 * 24, now)) continue;
    items.push({
      key: attentionItemKey('lead_stale', row.id),
      kind: 'lead_stale',
      title: row.company || row.name,
      subtitle: row.name,
      href: `/leads/${row.id}`,
      rank: ATTENTION_RANK.lead_stale,
      at: row.created_at,
    });
  }

  for (const row of rounds ?? []) {
    const app = Array.isArray(row.ops_job_applications) ? row.ops_job_applications[0] : row.ops_job_applications;
    if (
      !isUnscheduledInterviewAttention({
        roundStatus: row.status,
        scheduledAt: null,
        applicationStatus: app?.status,
      })
    ) {
      continue;
    }
    items.push({
      key: attentionItemKey('interview_unscheduled', row.id),
      kind: 'interview_unscheduled',
      title: row.title,
      subtitle: app?.full_name || 'Entrevista',
      href: `/team?tab=bolsa&app=${row.application_id}`,
      rank: ATTENTION_RANK.interview_unscheduled,
      at: row.created_at,
    });
  }

  for (const row of assignments ?? []) {
    if (
      !isStuckAssignment({
        status: row.status,
        urgency: row.urgency,
        statusEnteredAt: row.status_entered_at,
        progressPct: row.progress_pct,
        now,
      })
    ) {
      continue;
    }
    items.push({
      key: attentionItemKey('assignment_stuck', row.id),
      kind: 'assignment_stuck',
      title: row.title,
      subtitle: 'Urgente sin movimiento',
      href: `/asignaciones?id=${row.id}`,
      rank: ATTENTION_RANK.assignment_stuck,
      at: row.status_entered_at,
    });
  }

  const billedProjects = new Set((hours ?? []).map((row) => row.project_id).filter(Boolean));
  for (const row of sprints ?? []) {
    if (projectFilter && !projectFilter.includes(row.project_id)) continue;
    if (billedProjects.has(row.project_id)) continue;
    if (!sprintCoversDate(row, today)) continue;
    const project = joinName(row.projects);
    items.push({
      key: attentionItemKey('sprint_no_hours', row.id),
      kind: 'sprint_no_hours',
      title: row.name,
      subtitle: project.name || 'Sprint activo sin horas',
      href: project.slug ? opsProjectPath(project.slug, '?tab=sprints') : '/projects',
      rank: ATTENTION_RANK.sprint_no_hours,
      at: `${today}T12:00:00.000Z`,
    });
  }

  if (canReleaseAttention) {
    const t = await getT();
    const copy = {
      incoming: t('ops.dashboard.attentionRelease.incoming'),
      pendingApproval: t('ops.dashboard.attentionRelease.pendingApproval'),
      failed: t('ops.dashboard.attentionRelease.failed'),
      fallbackTitle: DEFAULT_RELEASE_ATTENTION_COPY.fallbackTitle,
    };
    const occupiedByProject = occupiedLooksByProject(releases ?? []);

    for (const row of releases ?? []) {
      if (projectFilter && !projectFilter.includes(row.project_id)) continue;
      const project = joinName(row.projects);
      const item = releaseAttentionFromRequest({
        id: row.id,
        status: row.status,
        projectName: project.name,
        projectSlug: project.slug,
        createdAt: row.created_at,
        copy,
      });
      if (item) items.push(item);
    }

    const settings = (releaseSettings ?? []).filter(
      (row) => !projectFilter || projectFilter.includes(row.project_id)
    );
    if (settings.length) {
      const incomingResults = await Promise.allSettled(
        settings.map((row) =>
          listIncomingPreviewsForAttention(row, AbortSignal.timeout(RELEASE_ATTENTION_FETCH_MS))
        )
      );
      incomingResults.forEach((result, index) => {
        if (result.status !== 'fulfilled' || result.value.error) return;
        const row = settings[index];
        if (!row) return;
        const project = joinName(row.projects);
        const incoming = filterIncomingForReleaseAttention(
          result.value.items,
          occupiedByProject.get(row.project_id) ?? []
        );
        for (const preview of incoming) {
          const item = releaseAttentionFromIncoming({
            projectName: project.name,
            projectSlug: project.slug,
            preview,
            copy,
          });
          if (item) items.push(item);
        }
      });
    }
  }

  return filterAttentionItems(items, snoozes ?? [], now, opts.limit);
}
