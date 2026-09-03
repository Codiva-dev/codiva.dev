import type { createClient } from '@/lib/supabase/server';
import { keepPendingMentions, mentionPlainText, OPEN_WORK_STATUSES } from '@/lib/ops/work-board';

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

type MentionRow = {
  id: string;
  assignment_id: string;
  comment_id: string;
  created_at: string;
};

async function assignmentMetaById(supabase: Db, ids: string[]) {
  if (!ids.length) return new Map<string, { title: string; status: string }>();
  const { data } = await supabase
    .from('work_assignments')
    .select('id, title, status')
    .in('id', ids);
  return new Map((data ?? []).map((row) => [row.id, { title: row.title, status: row.status }]));
}

async function unreadMentionRows(supabase: Db, staffId: string) {
  const { data } = await supabase
    .from('work_assignment_mentions')
    .select('id, assignment_id, comment_id, created_at')
    .eq('mentioned_staff_id', staffId)
    .is('read_at', null)
    .order('created_at', { ascending: false });
  return (data ?? []) as MentionRow[];
}

export async function countWorkPending(
  supabase: Db,
  staffId: string,
  canManage = false
): Promise<number> {
  const [{ count: assignments }, mentionRows, requests] = await Promise.all([
    supabase
      .from('work_assignments')
      .select('id', { count: 'exact', head: true })
      .eq('assignee_id', staffId)
      .in('status', [...OPEN_WORK_STATUSES]),
    unreadMentionRows(supabase, staffId),
    canManage
      ? supabase
          .from('work_assignment_edit_requests')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'open')
      : Promise.resolve({ count: 0 }),
  ]);
  const mentionMeta = await assignmentMetaById(
    supabase,
    [...new Set(mentionRows.map((row) => row.assignment_id).filter(Boolean))]
  );
  const mentionStatuses = new Map(
    [...mentionMeta.entries()].map(([id, row]) => [id, row.status])
  );
  return (
    (assignments ?? 0) +
    keepPendingMentions(mentionRows, mentionStatuses).length +
    (requests.count ?? 0)
  );
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
  const [{ data: assignmentRows }, mentionsRaw, { data: staffRows }, { data: requestRows }] =
    await Promise.all([
      supabase
        .from('work_assignments')
        .select('id, title, status, stream, progress_pct, due_at')
        .eq('assignee_id', staffId)
        .in('status', [...OPEN_WORK_STATUSES])
        .order('status_entered_at', { ascending: false }),
      unreadMentionRows(supabase, staffId),
      supabase.from('staff_profiles').select('id, full_name').eq('active', true),
      canManage
        ? supabase
            .from('work_assignment_edit_requests')
            .select('id, assignment_id, requested_by, payload, created_at')
            .eq('status', 'open')
            .order('created_at', { ascending: false })
        : Promise.resolve({
            data: [] as {
              id: string;
              assignment_id: string;
              requested_by: string | null;
              payload: string;
              created_at: string;
            }[],
          }),
    ]);

  const requestAssignmentIds = [...new Set((requestRows ?? []).map((row) => row.assignment_id).filter(Boolean))];
  const mentionAssignmentIds = [...new Set(mentionsRaw.map((row) => row.assignment_id).filter(Boolean))];
  const assignmentIds = [...new Set([...mentionAssignmentIds, ...requestAssignmentIds])];
  const commentIds = [...new Set(mentionsRaw.map((row) => row.comment_id).filter(Boolean))];

  const [{ data: commentRows }, assignmentMeta] = await Promise.all([
    commentIds.length
      ? supabase.from('work_assignment_comments').select('id, body, author_id').in('id', commentIds)
      : Promise.resolve({ data: [] as { id: string; body: string; author_id: string | null }[] }),
    assignmentMetaById(supabase, assignmentIds),
  ]);

  const names = new Map((staffRows ?? []).map((row) => [row.id, row.full_name || 'Staff']));
  const bodies = new Map((commentRows ?? []).map((row) => [row.id, row]));
  const mentionStatuses = new Map(
    [...assignmentMeta.entries()].map(([id, row]) => [id, row.status])
  );

  const mentions: PendingMention[] = keepPendingMentions(mentionsRaw, mentionStatuses).map((row) => {
    const comment = bodies.get(row.comment_id);
    return {
      id: row.id,
      assignment_id: row.assignment_id,
      assignment_title: assignmentMeta.get(row.assignment_id)?.title || '',
      author_name: (comment?.author_id && names.get(comment.author_id)) || 'Staff',
      preview: mentionPlainText(comment?.body || '').slice(0, 220),
      created_at: row.created_at,
    };
  });

  const editRequests: PendingEditRequest[] = (requestRows ?? []).map((row) => ({
    id: row.id,
    assignment_id: row.assignment_id,
    assignment_title: assignmentMeta.get(row.assignment_id)?.title || '',
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
