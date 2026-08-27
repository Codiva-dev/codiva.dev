'use server';

import { revalidatePath } from 'next/cache';
import { assertCapability } from '@/lib/ops/auth';
import { can } from '@/lib/ops/permissions';
import { logActivity } from '@/lib/ops/activity';
import { throwDb } from '@/lib/ops/throw-db';
import { getT } from '@/i18n/locale';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendClientEmail } from '@/lib/ops/email';
import { templateStaffAlert } from '@/lib/ops/email-templates';
import { opsBaseUrl } from '@/lib/ops/host';
import {
  isWorkProcessKind,
  isWorkStatus,
  isWorkStream,
  mentionedStaffIds,
  mentionDisplayName,
  mentionPlainText,
  parentCannotMarkDoneWithOpenSubtasks,
  rollupProgressFromSubtasks,
  type WorkProcessKind,
  type WorkStatus,
  type WorkStream,
} from '@/lib/ops/work-board';

function revalidateBoard() {
  revalidatePath('/asignaciones');
  revalidatePath('/workload');
}

type AssignmentRow = {
  id: string;
  title: string;
  status: string;
  assignee_id: string | null;
};

async function assertAssignmentsAccess() {
  return assertCapability('assignments');
}

async function assertCanMutate(assignment: AssignmentRow, staffId: string, manage: boolean) {
  const t = await getT();
  if (manage) return;
  if (assignment.assignee_id === staffId) return;
  throw new Error(t('ops.asignaciones.forbiddenEdit'));
}

function parseProcess(formData: FormData): { process_kind: WorkProcessKind; process_id: string | null } {
  const kindRaw = String(formData.get('processKind') || 'none').trim();
  const kind = isWorkProcessKind(kindRaw) ? kindRaw : 'none';
  const id = String(formData.get('processId') || '').trim() || null;
  if (kind === 'none') return { process_kind: 'none', process_id: null };
  return { process_kind: kind, process_id: id };
}

async function recordStageChange({
  supabase,
  assignmentId,
  fromStatus,
  toStatus,
  actorId,
  source,
}: {
  supabase: Awaited<ReturnType<typeof assertCapability>>['supabase'];
  assignmentId: string;
  fromStatus: string | null;
  toStatus: string;
  actorId: string;
  source: 'create' | 'kanban' | 'detail';
}) {
  const now = new Date().toISOString();
  if (fromStatus) {
    await supabase
      .from('work_assignment_stage_events')
      .update({ left_at: now })
      .eq('assignment_id', assignmentId)
      .is('left_at', null);
  }
  const { error } = await supabase.from('work_assignment_stage_events').insert({
    assignment_id: assignmentId,
    from_status: fromStatus,
    to_status: toStatus,
    entered_at: now,
    actor_id: actorId,
    source,
  });
  if (error) throw await throwDb(error);
  return now;
}

async function syncProgress(
  supabase: Awaited<ReturnType<typeof assertCapability>>['supabase'],
  assignmentId: string
) {
  const { data: subs, error } = await supabase
    .from('work_assignment_subtasks')
    .select('status')
    .eq('assignment_id', assignmentId);
  if (error) throw await throwDb(error);
  const progress = rollupProgressFromSubtasks(subs ?? []);
  const { error: upd } = await supabase
    .from('work_assignments')
    .update({ progress_pct: progress })
    .eq('id', assignmentId);
  if (upd) throw await throwDb(upd);
  return progress;
}

export async function createWorkAssignment(formData: FormData) {
  const access = await assertCapability('assignments_manage');
  const t = await getT();

  const title = String(formData.get('title') || '').trim();
  if (!title) throw new Error(t('ops.asignaciones.titleRequired'));

  const streamRaw = String(formData.get('stream') || 'delivery').trim();
  const stream: WorkStream = isWorkStream(streamRaw) ? streamRaw : 'delivery';
  const assigneeId = String(formData.get('assigneeId') || '').trim() || null;
  const dueAt = String(formData.get('dueAt') || '').trim() || null;
  const description = String(formData.get('description') || '').trim();
  const { process_kind, process_id } = parseProcess(formData);
  if (process_kind !== 'none' && !process_id) {
    throw new Error(t('ops.asignaciones.processRequired'));
  }

  const subtaskLines = String(formData.get('subtasks') || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 40);

  const { data: row, error } = await access.supabase
    .from('work_assignments')
    .insert({
      title,
      description,
      stream,
      status: 'backlog',
      assignee_id: assigneeId,
      due_at: dueAt,
      process_kind,
      process_id,
      created_by: access.staff.id,
      progress_pct: 0,
    })
    .select('id, title')
    .single();
  if (error || !row) throw await throwDb(error);

  await recordStageChange({
    supabase: access.supabase,
    assignmentId: row.id,
    fromStatus: null,
    toStatus: 'backlog',
    actorId: access.staff.id,
    source: 'create',
  });

  if (subtaskLines.length) {
    const { error: subErr } = await access.supabase.from('work_assignment_subtasks').insert(
      subtaskLines.map((line, index) => ({
        assignment_id: row.id,
        title: line,
        sort_order: index,
      }))
    );
    if (subErr) throw await throwDb(subErr);
    await syncProgress(access.supabase, row.id);
  }

  await logActivity({
    entityType: 'work_assignment',
    entityId: row.id,
    action: 'created',
    metadata: { title, stream, process_kind },
    actorId: access.staff.id,
  });

  revalidateBoard();
}

export async function updateWorkAssignment(assignmentId: string, formData: FormData) {
  const access = await assertAssignmentsAccess();
  const t = await getT();
  const manage = can(access.staff, 'assignments_manage');

  const { data: current, error: loadErr } = await access.supabase
    .from('work_assignments')
    .select('id, title, status, assignee_id')
    .eq('id', assignmentId)
    .single();
  if (loadErr || !current) throw await throwDb(loadErr, t('ops.asignaciones.notFound'));
  await assertCanMutate(current, access.staff.id, manage);

  const title = String(formData.get('title') || '').trim();
  if (!title) throw new Error(t('ops.asignaciones.titleRequired'));
  const streamRaw = String(formData.get('stream') || 'delivery').trim();
  const stream: WorkStream = isWorkStream(streamRaw) ? streamRaw : 'delivery';
  const description = String(formData.get('description') || '').trim();
  const dueAt = String(formData.get('dueAt') || '').trim() || null;
  const { process_kind, process_id } = parseProcess(formData);
  if (process_kind !== 'none' && !process_id) {
    throw new Error(t('ops.asignaciones.processRequired'));
  }

  const patch: Record<string, unknown> = {
    title,
    description,
    stream,
    due_at: dueAt,
    process_kind,
    process_id,
  };
  if (manage) {
    patch.assignee_id = String(formData.get('assigneeId') || '').trim() || null;
  }

  const { error } = await access.supabase.from('work_assignments').update(patch).eq('id', assignmentId);
  if (error) throw await throwDb(error);

  await logActivity({
    entityType: 'work_assignment',
    entityId: assignmentId,
    action: 'updated',
    metadata: { title },
    actorId: access.staff.id,
  });
  revalidateBoard();
}

export async function updateWorkAssignmentStatus(
  assignmentId: string,
  nextStatus: string,
  source: 'kanban' | 'detail' = 'kanban'
) {
  const access = await assertAssignmentsAccess();
  const t = await getT();
  const manage = can(access.staff, 'assignments_manage');
  if (!isWorkStatus(nextStatus)) throw new Error(t('ops.asignaciones.statusFailed'));

  const { data: current, error: loadErr } = await access.supabase
    .from('work_assignments')
    .select('id, title, status, assignee_id')
    .eq('id', assignmentId)
    .single();
  if (loadErr || !current) throw await throwDb(loadErr, t('ops.asignaciones.notFound'));
  await assertCanMutate(current, access.staff.id, manage);
  if (current.status === nextStatus) return;

  if (nextStatus === 'done') {
    const { data: subs, error: subErr } = await access.supabase
      .from('work_assignment_subtasks')
      .select('status')
      .eq('assignment_id', assignmentId);
    if (subErr) throw await throwDb(subErr);
    if (parentCannotMarkDoneWithOpenSubtasks(subs ?? [])) {
      throw new Error(t('ops.asignaciones.openSubtasks'));
    }
  }

  const enteredAt = await recordStageChange({
    supabase: access.supabase,
    assignmentId,
    fromStatus: current.status,
    toStatus: nextStatus,
    actorId: access.staff.id,
    source,
  });

  const { error } = await access.supabase
    .from('work_assignments')
    .update({ status: nextStatus, status_entered_at: enteredAt })
    .eq('id', assignmentId);
  if (error) throw await throwDb(error);

  await logActivity({
    entityType: 'work_assignment',
    entityId: assignmentId,
    action: 'status',
    metadata: { from: current.status, to: nextStatus, source },
    actorId: access.staff.id,
  });
  revalidateBoard();
}

export async function createWorkSubtask(assignmentId: string, title: string) {
  const access = await assertAssignmentsAccess();
  const t = await getT();
  const manage = can(access.staff, 'assignments_manage');
  const trimmed = title.trim();
  if (!trimmed) throw new Error(t('ops.asignaciones.subtaskRequired'));

  const { data: current, error: loadErr } = await access.supabase
    .from('work_assignments')
    .select('id, title, status, assignee_id')
    .eq('id', assignmentId)
    .single();
  if (loadErr || !current) throw await throwDb(loadErr, t('ops.asignaciones.notFound'));
  await assertCanMutate(current, access.staff.id, manage);

  const { data: last } = await access.supabase
    .from('work_assignment_subtasks')
    .select('sort_order')
    .eq('assignment_id', assignmentId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await access.supabase.from('work_assignment_subtasks').insert({
    assignment_id: assignmentId,
    title: trimmed,
    sort_order: (last?.sort_order ?? -1) + 1,
  });
  if (error) throw await throwDb(error);
  await syncProgress(access.supabase, assignmentId);
  revalidateBoard();
}

export async function toggleWorkSubtask(subtaskId: string) {
  const access = await assertAssignmentsAccess();
  const t = await getT();
  const manage = can(access.staff, 'assignments_manage');

  const { data: sub, error: loadErr } = await access.supabase
    .from('work_assignment_subtasks')
    .select('id, assignment_id, status')
    .eq('id', subtaskId)
    .single();
  if (loadErr || !sub) throw await throwDb(loadErr, t('ops.asignaciones.notFound'));

  const { data: current, error: asgErr } = await access.supabase
    .from('work_assignments')
    .select('id, title, status, assignee_id')
    .eq('id', sub.assignment_id)
    .single();
  if (asgErr || !current) throw await throwDb(asgErr, t('ops.asignaciones.notFound'));
  await assertCanMutate(current, access.staff.id, manage);

  const next = sub.status === 'done' ? 'open' : 'done';
  const { error } = await access.supabase
    .from('work_assignment_subtasks')
    .update({ status: next })
    .eq('id', subtaskId);
  if (error) throw await throwDb(error);
  await syncProgress(access.supabase, sub.assignment_id);
  revalidateBoard();
}

export async function addWorkAssignmentComment(assignmentId: string, body: string) {
  const access = await assertAssignmentsAccess();
  const t = await getT();
  const trimmed = body.trim();
  if (!trimmed) throw new Error(t('ops.asignaciones.commentRequired'));

  const { data: current, error: loadErr } = await access.supabase
    .from('work_assignments')
    .select('id, title, status, assignee_id')
    .eq('id', assignmentId)
    .single();
  if (loadErr || !current) throw await throwDb(loadErr, t('ops.asignaciones.notFound'));

  const { data: comment, error } = await access.supabase
    .from('work_assignment_comments')
    .insert({
      assignment_id: assignmentId,
      author_id: access.staff.id,
      body: trimmed,
    })
    .select('id')
    .single();
  if (error || !comment) throw await throwDb(error);

  const mentioned = mentionedStaffIds(trimmed).filter((id) => id !== access.staff.id);
  if (mentioned.length) {
    const { error: menErr } = await access.supabase.from('work_assignment_mentions').insert(
      mentioned.map((staffId) => ({
        comment_id: comment.id,
        assignment_id: assignmentId,
        mentioned_staff_id: staffId,
      }))
    );
    if (menErr) throw await throwDb(menErr);
    void notifyMentionedStaff({
      mentionedIds: mentioned,
      actorName: access.staff.full_name || 'Staff',
      assignmentId,
      title: current.title,
      body: trimmed,
    });
  }

  await logActivity({
    entityType: 'work_assignment',
    entityId: assignmentId,
    action: 'comment',
    metadata: { mentions: mentioned.length },
    actorId: access.staff.id,
  });
  revalidateBoard();
}

async function notifyMentionedStaff({
  mentionedIds,
  actorName,
  assignmentId,
  title,
  body,
}: {
  mentionedIds: string[];
  actorName: string;
  assignmentId: string;
  title: string;
  body: string;
}) {
  try {
    const admin = createAdminClient();
    const href = `${opsBaseUrl()}/asignaciones?id=${assignmentId}`;
    const preview = mentionPlainText(body).slice(0, 280);
    for (const staffId of mentionedIds) {
      const [{ data: profile }, { data: authUser }] = await Promise.all([
        admin.from('staff_profiles').select('id, full_name, active').eq('id', staffId).maybeSingle(),
        admin.auth.admin.getUserById(staffId),
      ]);
      const email = authUser.user?.email;
      if (!profile?.active || !email) continue;
      const name = mentionDisplayName(profile);
      await sendClientEmail({
        to: email,
        from: 'ops',
        subject: `${actorName} te mencionó en ${title}`,
        html: templateStaffAlert(`${actorName} te mencionó`, [
          `Hola ${name},`,
          `${actorName} te etiquetó en la asignación «${title}».`,
          preview,
        ], {
          ctaLabel: 'Abrir tablero',
          ctaHref: href,
        }),
      });
    }
  } catch (err) {
    console.error('work assignment mention notify:', err);
  }
}
