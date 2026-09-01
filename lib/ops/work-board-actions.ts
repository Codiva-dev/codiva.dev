'use server';

import { revalidatePath } from 'next/cache';
import { assertCapability } from '@/lib/ops/auth';
import { can } from '@/lib/ops/permissions';
import { logActivity } from '@/lib/ops/activity';
import { throwDb, throwPublic } from '@/lib/ops/throw-db';
import { getT } from '@/i18n/locale';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendClientEmail } from '@/lib/ops/email';
import { templateStaffAlert } from '@/lib/ops/email-templates';
import { opsBaseUrl } from '@/lib/ops/host';
import { scanUploadedBytes } from '@/lib/ops/malware-scan';
import { deleteOpsFile, uploadOpsFile } from '@/lib/ops/storage';
import {
  canMutateWorkAssignment,
  canRequestWorkSubtaskEdit,
  isWorkProcessKind,
  isWorkStatus,
  isWorkStream,
  mentionedStaffIds,
  mentionDisplayName,
  mentionPlainText,
  parentCannotMarkDoneWithOpenSubtasks,
  parseSubtaskLines,
  planWorkSubtaskRewrite,
  rollupProgressFromSubtasks,
  WORK_FILE_MAX_BYTES,
  WORK_FILE_MAX_COUNT,
  isWorkFormFile,
  workFileKind,
  type WorkProcessKind,
  type WorkStatus,
  type WorkStream,
} from '@/lib/ops/work-board';

function revalidateBoard() {
  revalidatePath('/asignaciones');
  revalidatePath('/pendientes');
  revalidatePath('/workload');
  revalidatePath('/', 'layout');
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
  if (canMutateWorkAssignment(staffId, assignment.assignee_id, manage)) return;
  const t = await getT();
  throw new Error(t('ops.asignaciones.forbiddenEdit'));
}

async function rewriteSubtaskLines(
  supabase: Awaited<ReturnType<typeof assertCapability>>['supabase'],
  assignmentId: string,
  text: string
) {
  const { data: current, error } = await supabase
    .from('work_assignment_subtasks')
    .select('id, title, sort_order')
    .eq('assignment_id', assignmentId)
    .order('sort_order');
  if (error) throw await throwDb(error);
  const plan = planWorkSubtaskRewrite(current ?? [], parseSubtaskLines(text));
  for (const row of plan.updates) {
    const { error: upd } = await supabase
      .from('work_assignment_subtasks')
      .update({ title: row.title, sort_order: row.sort_order })
      .eq('id', row.id);
    if (upd) throw await throwDb(upd);
  }
  if (plan.inserts.length) {
    const { error: ins } = await supabase.from('work_assignment_subtasks').insert(
      plan.inserts.map((row) => ({
        assignment_id: assignmentId,
        title: row.title,
        sort_order: row.sort_order,
      }))
    );
    if (ins) throw await throwDb(ins);
  }
  if (plan.deleteIds.length) {
    const { error: del } = await supabase.from('work_assignment_subtasks').delete().in('id', plan.deleteIds);
    if (del) throw await throwDb(del);
  }
  await syncProgress(supabase, assignmentId);
}

async function closeOpenEditRequest(
  supabase: Awaited<ReturnType<typeof assertCapability>>['supabase'],
  assignmentId: string,
  staffId: string,
  status: 'applied' | 'dismissed'
) {
  const { error } = await supabase
    .from('work_assignment_edit_requests')
    .update({
      status,
      resolved_at: new Date().toISOString(),
      resolved_by: staffId,
    })
    .eq('assignment_id', assignmentId)
    .eq('status', 'open');
  if (error) throw await throwDb(error);
}

function filesFromForm(formData: FormData) {
  return formData.getAll('files').filter(isWorkFormFile);
}

async function saveWorkFiles({
  supabase,
  assignmentId,
  files,
  staffId,
  existingCount,
}: {
  supabase: Awaited<ReturnType<typeof assertCapability>>['supabase'];
  assignmentId: string;
  files: File[];
  staffId: string;
  existingCount: number;
}) {
  if (!files.length) return;
  const t = await getT();
  if (existingCount + files.length > WORK_FILE_MAX_COUNT) {
    throw new Error(t('ops.asignaciones.tooManyFiles'));
  }
  for (const file of files) {
    if (file.size > WORK_FILE_MAX_BYTES) throw new Error(t('ops.asignaciones.fileTooBig'));
    const kind = workFileKind(file.type, file.name);
    if (!kind) throw new Error(t('ops.asignaciones.fileTypeRejected'));
    const uploaded = await uploadOpsFile(file, `assignments/${assignmentId}`);
    const scan = await scanUploadedBytes(uploaded.buffer, uploaded.sha256, file.name);
    if (scan.status === 'infected') {
      await deleteOpsFile(uploaded.path);
      await throwPublic('common.status.fileRejected');
    }
    const { error } = await supabase.from('work_assignment_files').insert({
      assignment_id: assignmentId,
      uploaded_by: staffId,
      file_name: file.name.slice(0, 240),
      file_path: uploaded.path,
      content_type: file.type || 'application/octet-stream',
      byte_size: file.size,
      kind,
    });
    if (error) {
      await deleteOpsFile(uploaded.path).catch(() => undefined);
      throw await throwDb(error);
    }
  }
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

  const subtaskLines = parseSubtaskLines(String(formData.get('subtasks') || ''));

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

  await saveWorkFiles({
    supabase: access.supabase,
    assignmentId: row.id,
    files: filesFromForm(formData),
    staffId: access.staff.id,
    existingCount: 0,
  });

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
  const access = await assertCapability('assignments_manage');
  const t = await getT();

  const { data: current, error: loadErr } = await access.supabase
    .from('work_assignments')
    .select('id, title, status, assignee_id')
    .eq('id', assignmentId)
    .single();
  if (loadErr || !current) throw await throwDb(loadErr, t('ops.asignaciones.notFound'));

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
    assignee_id: String(formData.get('assigneeId') || '').trim() || null,
  };

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

export async function deleteWorkAssignment(assignmentId: string) {
  const access = await assertCapability('assignments_manage');
  const t = await getT();

  const { data: current, error: loadErr } = await access.supabase
    .from('work_assignments')
    .select('id, title, status, assignee_id')
    .eq('id', assignmentId)
    .single();
  if (loadErr || !current) throw await throwDb(loadErr, t('ops.asignaciones.notFound'));

  const { data: files } = await access.supabase
    .from('work_assignment_files')
    .select('file_path')
    .eq('assignment_id', assignmentId);
  for (const file of files ?? []) {
    if (file.file_path) await deleteOpsFile(file.file_path).catch(() => undefined);
  }

  const { error } = await access.supabase.from('work_assignments').delete().eq('id', assignmentId);
  if (error) throw await throwDb(error);

  await logActivity({
    entityType: 'work_assignment',
    entityId: assignmentId,
    action: 'deleted',
    metadata: { title: current.title },
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
  const access = await assertCapability('assignments_manage');
  const t = await getT();
  const trimmed = title.trim();
  if (!trimmed) throw new Error(t('ops.asignaciones.subtaskRequired'));

  const { data: current, error: loadErr } = await access.supabase
    .from('work_assignments')
    .select('id, title, status, assignee_id')
    .eq('id', assignmentId)
    .single();
  if (loadErr || !current) throw await throwDb(loadErr, t('ops.asignaciones.notFound'));

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

export async function replaceWorkSubtasks(assignmentId: string, text: string) {
  const access = await assertCapability('assignments_manage');
  const t = await getT();
  if (String(text || '').length > 8000) throw new Error(t('ops.asignaciones.subtasksTooLong'));

  const { data: current, error: loadErr } = await access.supabase
    .from('work_assignments')
    .select('id, title, status, assignee_id')
    .eq('id', assignmentId)
    .single();
  if (loadErr || !current) throw await throwDb(loadErr, t('ops.asignaciones.notFound'));

  await rewriteSubtaskLines(access.supabase, assignmentId, text);
  await closeOpenEditRequest(access.supabase, assignmentId, access.staff.id, 'dismissed');
  await logActivity({
    entityType: 'work_assignment',
    entityId: assignmentId,
    action: 'subtasks_replaced',
    metadata: { lines: parseSubtaskLines(text).length },
    actorId: access.staff.id,
  });
  revalidateBoard();
}

export async function requestWorkSubtaskEdit(assignmentId: string, text: string) {
  const access = await assertAssignmentsAccess();
  const t = await getT();
  const manage = can(access.staff, 'assignments_manage');
  const payload = String(text || '');
  if (payload.length > 8000) throw new Error(t('ops.asignaciones.subtasksTooLong'));

  const { data: current, error: loadErr } = await access.supabase
    .from('work_assignments')
    .select('id, title, status, assignee_id')
    .eq('id', assignmentId)
    .single();
  if (loadErr || !current) throw await throwDb(loadErr, t('ops.asignaciones.notFound'));
  if (!canRequestWorkSubtaskEdit(access.staff.id, current.assignee_id, manage)) {
    throw new Error(t('ops.asignaciones.forbiddenManage'));
  }

  const { data: existing, error: existingErr } = await access.supabase
    .from('work_assignment_edit_requests')
    .select('id')
    .eq('assignment_id', assignmentId)
    .eq('status', 'open')
    .maybeSingle();
  if (existingErr) throw await throwDb(existingErr);

  if (existing) {
    const { error } = await access.supabase
      .from('work_assignment_edit_requests')
      .update({ payload })
      .eq('id', existing.id);
    if (error) throw await throwDb(error);
  } else {
    const { error } = await access.supabase.from('work_assignment_edit_requests').insert({
      assignment_id: assignmentId,
      requested_by: access.staff.id,
      payload,
      status: 'open',
    });
    if (error) throw await throwDb(error);
    void notifyWorkEditRequest({
      requesterId: access.staff.id,
      requesterName: access.staff.full_name || 'Staff',
      assignmentId,
      title: current.title,
      payload,
    });
  }

  await logActivity({
    entityType: 'work_assignment',
    entityId: assignmentId,
    action: 'subtask_edit_requested',
    metadata: { lines: parseSubtaskLines(payload).length },
    actorId: access.staff.id,
  });
  revalidateBoard();
}

export async function applyWorkSubtaskEditRequest(requestId: string) {
  const access = await assertCapability('assignments_manage');
  const t = await getT();

  const { data: request, error: loadErr } = await access.supabase
    .from('work_assignment_edit_requests')
    .select('id, assignment_id, payload, status')
    .eq('id', requestId)
    .single();
  if (loadErr || !request) throw await throwDb(loadErr, t('ops.asignaciones.notFound'));
  if (request.status !== 'open') throw new Error(t('ops.asignaciones.requestClosed'));

  await rewriteSubtaskLines(access.supabase, request.assignment_id, request.payload);
  const { error } = await access.supabase
    .from('work_assignment_edit_requests')
    .update({
      status: 'applied',
      resolved_at: new Date().toISOString(),
      resolved_by: access.staff.id,
    })
    .eq('id', request.id)
    .eq('status', 'open');
  if (error) throw await throwDb(error);

  await logActivity({
    entityType: 'work_assignment',
    entityId: request.assignment_id,
    action: 'subtask_edit_applied',
    metadata: { requestId: request.id },
    actorId: access.staff.id,
  });
  revalidateBoard();
}

export async function dismissWorkSubtaskEditRequest(requestId: string) {
  const access = await assertCapability('assignments_manage');
  const t = await getT();

  const { data: request, error: loadErr } = await access.supabase
    .from('work_assignment_edit_requests')
    .select('id, assignment_id, status')
    .eq('id', requestId)
    .single();
  if (loadErr || !request) throw await throwDb(loadErr, t('ops.asignaciones.notFound'));
  if (request.status !== 'open') throw new Error(t('ops.asignaciones.requestClosed'));

  const { error } = await access.supabase
    .from('work_assignment_edit_requests')
    .update({
      status: 'dismissed',
      resolved_at: new Date().toISOString(),
      resolved_by: access.staff.id,
    })
    .eq('id', request.id)
    .eq('status', 'open');
  if (error) throw await throwDb(error);

  await logActivity({
    entityType: 'work_assignment',
    entityId: request.assignment_id,
    action: 'subtask_edit_dismissed',
    metadata: { requestId: request.id },
    actorId: access.staff.id,
  });
  revalidateBoard();
}

export async function toggleWorkSubtask(subtaskId: string, nextStatus: 'open' | 'done') {
  const access = await assertAssignmentsAccess();
  const manage = can(access.staff, 'assignments_manage');
  if (nextStatus !== 'open' && nextStatus !== 'done') {
    const t = await getT();
    throw new Error(t('ops.asignaciones.notFound'));
  }

  const { data: sub, error: loadErr } = await access.supabase
    .from('work_assignment_subtasks')
    .select('id, assignment_id, status')
    .eq('id', subtaskId)
    .single();
  if (loadErr || !sub) {
    const t = await getT();
    throw await throwDb(loadErr, t('ops.asignaciones.notFound'));
  }

  const { data: current, error: asgErr } = await access.supabase
    .from('work_assignments')
    .select('id, title, status, assignee_id')
    .eq('id', sub.assignment_id)
    .single();
  if (asgErr || !current) {
    const t = await getT();
    throw await throwDb(asgErr, t('ops.asignaciones.notFound'));
  }
  await assertCanMutate(current, access.staff.id, manage);

  if (sub.status !== nextStatus) {
    const { error } = await access.supabase
      .from('work_assignment_subtasks')
      .update({ status: nextStatus })
      .eq('id', subtaskId);
    if (error) throw await throwDb(error);
    await syncProgress(access.supabase, sub.assignment_id);
  }
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

async function notifyWorkEditRequest({
  requesterId,
  requesterName,
  assignmentId,
  title,
  payload,
}: {
  requesterId: string;
  requesterName: string;
  assignmentId: string;
  title: string;
  payload: string;
}) {
  try {
    const admin = createAdminClient();
    const href = `${opsBaseUrl()}/asignaciones?id=${assignmentId}`;
    const preview = parseSubtaskLines(payload).slice(0, 8).join('\n');
    const { data: managers } = await admin
      .from('staff_profiles')
      .select('id, full_name, role, capabilities, active')
      .eq('active', true);
    for (const profile of managers ?? []) {
      if (profile.id === requesterId) continue;
      if (!can(profile, 'assignments_manage')) continue;
      const { data: authUser } = await admin.auth.admin.getUserById(profile.id);
      const email = authUser.user?.email;
      if (!email) continue;
      const name = mentionDisplayName(profile);
      await sendClientEmail({
        to: email,
        from: 'ops',
        subject: `${requesterName} pide cambiar subtareas en ${title}`,
        html: templateStaffAlert(`${requesterName} pide un cambio`, [
          `Hola ${name},`,
          `${requesterName} pidió editar las subtareas de «${title}».`,
          preview || '(lista vacía)',
        ], {
          ctaLabel: 'Abrir tablero',
          ctaHref: href,
        }),
      });
    }
  } catch (err) {
    console.error('work assignment edit request notify:', err);
  }
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

export async function markWorkMentionRead(mentionId: string) {
  const access = await assertAssignmentsAccess();
  const { error } = await access.supabase
    .from('work_assignment_mentions')
    .update({ read_at: new Date().toISOString() })
    .eq('id', mentionId)
    .eq('mentioned_staff_id', access.staff.id)
    .is('read_at', null);
  if (error) throw await throwDb(error);
  revalidateBoard();
}

export async function markWorkMentionsReadForAssignment(assignmentId: string) {
  const access = await assertAssignmentsAccess();
  const { error } = await access.supabase
    .from('work_assignment_mentions')
    .update({ read_at: new Date().toISOString() })
    .eq('assignment_id', assignmentId)
    .eq('mentioned_staff_id', access.staff.id)
    .is('read_at', null);
  if (error) throw await throwDb(error);
  revalidateBoard();
}

export async function addWorkAssignmentFiles(assignmentId: string, formData: FormData) {
  const access = await assertAssignmentsAccess();
  const t = await getT();
  const manage = can(access.staff, 'assignments_manage');
  const files = filesFromForm(formData);
  if (!files.length) throw new Error(t('ops.asignaciones.fileRequired'));

  const { data: current, error: loadErr } = await access.supabase
    .from('work_assignments')
    .select('id, title, status, assignee_id')
    .eq('id', assignmentId)
    .single();
  if (loadErr || !current) throw await throwDb(loadErr, t('ops.asignaciones.notFound'));
  await assertCanMutate(current, access.staff.id, manage);

  const { count } = await access.supabase
    .from('work_assignment_files')
    .select('id', { count: 'exact', head: true })
    .eq('assignment_id', assignmentId);

  await saveWorkFiles({
    supabase: access.supabase,
    assignmentId,
    files,
    staffId: access.staff.id,
    existingCount: count ?? 0,
  });
  revalidateBoard();
}

export async function deleteWorkAssignmentFile(fileId: string) {
  const access = await assertAssignmentsAccess();
  const t = await getT();
  const manage = can(access.staff, 'assignments_manage');

  const { data: file, error: loadErr } = await access.supabase
    .from('work_assignment_files')
    .select('id, assignment_id, file_path')
    .eq('id', fileId)
    .single();
  if (loadErr || !file) throw await throwDb(loadErr, t('ops.asignaciones.notFound'));

  const { data: current, error: asgErr } = await access.supabase
    .from('work_assignments')
    .select('id, title, status, assignee_id')
    .eq('id', file.assignment_id)
    .single();
  if (asgErr || !current) throw await throwDb(asgErr, t('ops.asignaciones.notFound'));
  await assertCanMutate(current, access.staff.id, manage);

  await deleteOpsFile(file.file_path).catch(() => undefined);
  const { error } = await access.supabase.from('work_assignment_files').delete().eq('id', fileId);
  if (error) throw await throwDb(error);
  revalidateBoard();
}
