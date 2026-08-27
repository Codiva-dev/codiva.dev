import OpsPageHeader from '@/components/ops/OpsPageHeader';
import OpsWorkBoard, { type ProcessOption } from '@/components/ops/work-board/OpsWorkBoard';
import { requireCapability } from '@/lib/ops/auth';
import { can } from '@/lib/ops/permissions';
import { getT } from '@/i18n/locale';
import { throwDb } from '@/lib/ops/throw-db';
import { opsProjectPath } from '@/lib/ops/project-path';
import {
  isWorkProcessKind,
  isWorkStatus,
  isWorkStream,
  processHref,
  type WorkAssignment,
  type WorkComment,
  type WorkProcessKind,
  type WorkStageEvent,
  type WorkStatus,
  type WorkStream,
  type WorkSubtask,
} from '@/lib/ops/work-board';

type StaffRow = { id: string; full_name: string };
type ProcessMeta = { label: string; href: string | null };

function asStream(value: string): WorkStream {
  return isWorkStream(value) ? value : 'delivery';
}

function asStatus(value: string): WorkStatus {
  return isWorkStatus(value) ? value : 'backlog';
}

function asKind(value: string): WorkProcessKind {
  return isWorkProcessKind(value) ? value : 'none';
}

export default async function AsignacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { supabase, staff } = await requireCapability('assignments');
  const t = await getT();
  const { id: initialAssignmentId } = await searchParams;
  const canManage = can(staff, 'assignments_manage');

  const [
    assignmentsRes,
    { data: subtaskRows },
    { data: eventRows },
    { data: commentRows },
    { data: staffRows },
    { data: projectRows },
    { data: leadRows },
    { data: quoteRows },
    { data: ticketRows },
  ] = await Promise.all([
    supabase
      .from('work_assignments')
      .select(
        'id, title, description, stream, status, assignee_id, due_at, progress_pct, process_kind, process_id, status_entered_at, created_at, created_by'
      )
      .order('status_entered_at', { ascending: false }),
    supabase
      .from('work_assignment_subtasks')
      .select('id, assignment_id, title, status, sort_order, due_at')
      .order('sort_order'),
    supabase
      .from('work_assignment_stage_events')
      .select('id, assignment_id, from_status, to_status, entered_at, left_at, actor_id, source')
      .order('entered_at'),
    supabase
      .from('work_assignment_comments')
      .select('id, assignment_id, author_id, body, created_at')
      .order('created_at'),
    supabase.from('staff_profiles').select('id, full_name').eq('active', true).order('full_name'),
    supabase.from('projects').select('id, name, slug, status').order('name'),
    supabase.from('leads').select('id, name, company, status').neq('status', 'discarded').order('created_at', { ascending: false }).limit(80),
    supabase.from('quotes').select('id, title, status, project_id, projects(name, slug)').order('created_at', { ascending: false }).limit(80),
    supabase.from('tickets').select('id, title, status').order('created_at', { ascending: false }).limit(80),
  ]);

  if (assignmentsRes.error) throw await throwDb(assignmentsRes.error);
  const assignmentRows = assignmentsRes.data;

  const staffName = new Map((staffRows ?? []).map((row) => [row.id, row.full_name || 'Staff']));
  const processMeta = new Map<string, ProcessMeta>();

  for (const row of projectRows ?? []) {
    processMeta.set(`project:${row.id}`, {
      label: row.name,
      href: opsProjectPath(row.slug),
    });
  }
  for (const row of leadRows ?? []) {
    processMeta.set(`lead:${row.id}`, {
      label: row.company ? `${row.name} · ${row.company}` : row.name,
      href: `/leads/${row.id}`,
    });
  }
  for (const row of quoteRows ?? []) {
    const project = Array.isArray(row.projects) ? row.projects[0] : row.projects;
    const projectName = project && typeof project === 'object' && 'name' in project ? String(project.name) : '';
    processMeta.set(`quote:${row.id}`, {
      label: projectName ? `${row.title} · ${projectName}` : row.title,
      href: `/quotes/${row.id}`,
    });
  }
  for (const row of ticketRows ?? []) {
    processMeta.set(`ticket:${row.id}`, {
      label: row.title,
      href: `/tickets/${row.id}`,
    });
  }

  const subtasksByAssignment = new Map<string, WorkSubtask[]>();
  for (const row of subtaskRows ?? []) {
    const list = subtasksByAssignment.get(row.assignment_id) ?? [];
    list.push({
      id: row.id,
      assignment_id: row.assignment_id,
      title: row.title,
      status: row.status === 'done' ? 'done' : 'open',
      sort_order: row.sort_order,
      due_at: row.due_at,
    });
    subtasksByAssignment.set(row.assignment_id, list);
  }

  const eventsByAssignment = new Map<string, WorkStageEvent[]>();
  for (const row of eventRows ?? []) {
    const list = eventsByAssignment.get(row.assignment_id) ?? [];
    list.push(row as WorkStageEvent);
    eventsByAssignment.set(row.assignment_id, list);
  }

  const commentsByAssignment = new Map<string, WorkComment[]>();
  for (const row of commentRows ?? []) {
    const list = commentsByAssignment.get(row.assignment_id) ?? [];
    list.push({
      id: row.id,
      assignment_id: row.assignment_id,
      author_id: row.author_id,
      author_name: (row.author_id && staffName.get(row.author_id)) || 'Staff',
      body: row.body,
      created_at: row.created_at,
    });
    commentsByAssignment.set(row.assignment_id, list);
  }

  const assignments: WorkAssignment[] = (assignmentRows ?? []).map((row) => {
    const kind = asKind(row.process_kind);
    const meta = kind !== 'none' && row.process_id ? processMeta.get(`${kind}:${row.process_id}`) : null;
    return {
      id: row.id,
      title: row.title,
      description: row.description || '',
      stream: asStream(row.stream),
      status: asStatus(row.status),
      assignee_id: row.assignee_id,
      assignee_name: (row.assignee_id && staffName.get(row.assignee_id)) || '',
      due_at: row.due_at,
      progress_pct: row.progress_pct ?? 0,
      process_kind: kind,
      process_id: row.process_id,
      process_label: meta?.label || '',
      process_href: meta?.href || processHref(kind, row.process_id),
      status_entered_at: row.status_entered_at,
      created_at: row.created_at,
      created_by: row.created_by,
      subtasks: subtasksByAssignment.get(row.id) ?? [],
      stage_events: eventsByAssignment.get(row.id) ?? [],
      comments: commentsByAssignment.get(row.id) ?? [],
    };
  });

  const processOptions: ProcessOption[] = [
    ...(leadRows ?? []).map((row) => ({
      id: row.id,
      kind: 'lead' as const,
      label: processMeta.get(`lead:${row.id}`)?.label || row.name,
    })),
    ...(projectRows ?? []).map((row) => ({
      id: row.id,
      kind: 'project' as const,
      label: row.name,
    })),
    ...(quoteRows ?? []).map((row) => ({
      id: row.id,
      kind: 'quote' as const,
      label: processMeta.get(`quote:${row.id}`)?.label || row.title,
    })),
    ...(ticketRows ?? []).map((row) => ({
      id: row.id,
      kind: 'ticket' as const,
      label: row.title,
    })),
  ];

  const staffOptions: StaffRow[] = (staffRows ?? []).map((row) => ({
    id: row.id,
    full_name: row.full_name || 'Staff',
  }));

  return (
    <div>
      <OpsPageHeader
        title={t('ops.asignaciones.title')}
        description={t('ops.asignaciones.description')}
      />
      <OpsWorkBoard
        assignments={assignments}
        staff={staffOptions}
        processOptions={processOptions}
        canManage={canManage}
        currentUserId={staff.id}
        locale={t.locale === 'en' ? 'en' : 'es'}
        initialAssignmentId={initialAssignmentId}
      />
    </div>
  );
}
