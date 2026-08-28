import type { createClient } from '@/lib/supabase/server';
import { mentionPlainText, WORK_STATUSES } from '@/lib/ops/work-board';

type Db = Awaited<ReturnType<typeof createClient>>;

export type PendingAssignment = {
  id: string;
  title: string;
  status: string;
  stream: string;
  progress_pct: number;
  due_at: string | null;
};

export type PendingMention = {
  id: string;
  assignment_id: string;
  assignment_title: string;
  author_name: string;
  preview: string;
  created_at: string;
};

export type PendingEditRequest = {
  id: string;
  assignment_id: string;
  assignment_title: string;
  requested_by_name: string;
  payload: string;
  created_at: string;
};

const OPEN_STATUSES = WORK_STATUSES.filter((status) => status !== 'done');

export async function countWorkPending(
  supabase: Db,
  staffId: string,
  canManage = false
): Promise<number> {
  const [{ count: assignments }, { count: mentions }, requests] = await Promise.all([
    supabase
      .from('work_assignments')
      .select('id', { count: 'exact', head: true })
      .eq('assignee_id', staffId)
      .in('status', [...OPEN_STATUSES]),
    supabase
      .from('work_assignment_mentions')
      .select('id', { count: 'exact', head: true })
      .eq('mentioned_staff_id', staffId)
      .is('read_at', null),
    canManage
      ? supabase
          .from('work_assignment_edit_requests')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'open')
      : Promise.resolve({ count: 0 }),
  ]);
  return (assignments ?? 0) + (mentions ?? 0) + (requests.count ?? 0);
}

export async function listWorkPending(
  supabase: Db,
  staffId: string,
  canManage = false
): Promise<{
  assignments: PendingAssignment[];
  mentions: PendingMention[];
  editRequests: PendingEditRequest[];
}> {
  const [{ data: assignmentRows }, { data: mentionRows }, { data: staffRows }, { data: requestRows }] =
    await Promise.all([
      supabase
        .from('work_assignments')
        .select('id, title, status, stream, progress_pct, due_at')
        .eq('assignee_id', staffId)
        .in('status', [...OPEN_STATUSES])
        .order('status_entered_at', { ascending: false }),
      supabase
        .from('work_assignment_mentions')
        .select('id, assignment_id, comment_id, created_at')
        .eq('mentioned_staff_id', staffId)
        .is('read_at', null)
        .order('created_at', { ascending: false }),
      supabase.from('staff_profiles').select('id, full_name').eq('active', true),
      canManage
        ? supabase
            .from('work_assignment_edit_requests')
            .select('id, assignment_id, requested_by, payload, created_at')
            .eq('status', 'open')
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [] as { id: string; assignment_id: string; requested_by: string | null; payload: string; created_at: string }[] }),
    ]);

  const mentionsRaw = mentionRows ?? [];
  const commentIds = [...new Set(mentionsRaw.map((row) => row.comment_id).filter(Boolean))];
  const mentionAssignmentIds = [...new Set(mentionsRaw.map((row) => row.assignment_id).filter(Boolean))];
  const requestAssignmentIds = [...new Set((requestRows ?? []).map((row) => row.assignment_id).filter(Boolean))];
  const assignmentIds = [...new Set([...mentionAssignmentIds, ...requestAssignmentIds])];

  const [{ data: commentRows }, { data: titleRows }] = await Promise.all([
    commentIds.length
      ? supabase.from('work_assignment_comments').select('id, body, author_id').in('id', commentIds)
      : Promise.resolve({ data: [] as { id: string; body: string; author_id: string | null }[] }),
    assignmentIds.length
      ? supabase.from('work_assignments').select('id, title').in('id', assignmentIds)
      : Promise.resolve({ data: [] as { id: string; title: string }[] }),
  ]);

  const names = new Map((staffRows ?? []).map((row) => [row.id, row.full_name || 'Staff']));
  const bodies = new Map((commentRows ?? []).map((row) => [row.id, row]));
  const titles = new Map((titleRows ?? []).map((row) => [row.id, row.title]));

  const mentions: PendingMention[] = mentionsRaw.map((row) => {
    const comment = bodies.get(row.comment_id);
    return {
      id: row.id,
      assignment_id: row.assignment_id,
      assignment_title: titles.get(row.assignment_id) || '',
      author_name: (comment?.author_id && names.get(comment.author_id)) || 'Staff',
      preview: mentionPlainText(comment?.body || '').slice(0, 220),
      created_at: row.created_at,
    };
  });

  const editRequests: PendingEditRequest[] = (requestRows ?? []).map((row) => ({
    id: row.id,
    assignment_id: row.assignment_id,
    assignment_title: titles.get(row.assignment_id) || '',
    requested_by_name: (row.requested_by && names.get(row.requested_by)) || 'Staff',
    payload: row.payload || '',
    created_at: row.created_at,
  }));

  return {
    assignments: (assignmentRows ?? []) as PendingAssignment[],
    mentions,
    editRequests,
  };
}
