import OpsPendientesHome from '@/components/ops/search/OpsPendientesHome';
import { listVisibleProjectIds, requireStaff } from '@/lib/ops/auth';
import { can } from '@/lib/ops/permissions';
import { getT } from '@/i18n/locale';
import { labelsFor } from '@/lib/ops/labels';
import { ATTENTION_FULL_LIMIT } from '@/lib/ops/attention';
import { loadAttentionQueue } from '@/lib/ops/attention-query';
import { opsGreetingPeriod, staffFirstName } from '@/lib/ops/home';
import { buildPendingMonitor } from '@/lib/ops/pending-monitor';
import { listWorkPending } from '@/lib/ops/work-pending';

export default async function PendientesPage() {
  const { supabase, user, staff } = await requireStaff();
  const t = await getT();
  const { WORK_STATUS_LABELS, WORK_STREAM_LABELS, formatDate } = labelsFor(t.locale);
  const canAssignments = can(staff, 'assignments');
  const canManage = can(staff, 'assignments_manage');
  const visibleIds = await listVisibleProjectIds(supabase, user.id, staff);

  const [{ assignments, mentions, editRequests }, attention] = await Promise.all([
    canAssignments
      ? listWorkPending(supabase, staff.id, canManage)
      : Promise.resolve({ assignments: [], mentions: [], editRequests: [] }),
    loadAttentionQueue({
      supabase,
      staff,
      visibleProjectIds: visibleIds,
      limit: ATTENTION_FULL_LIMIT,
    }),
  ]);

  const monitor = buildPendingMonitor({
    attention,
    assignments: assignments.map((row) => ({
      id: row.id,
      title: row.title,
      subtitle: [
        WORK_STREAM_LABELS[row.stream] ?? row.stream,
        WORK_STATUS_LABELS[row.status] ?? row.status,
        row.due_at ? formatDate(row.due_at) : '',
        `${row.progress_pct}%`,
      ]
        .filter(Boolean)
        .join(' · '),
      dueAt: row.due_at,
    })),
    mentions: mentions.map((row) => ({
      id: row.id,
      assignmentId: row.assignment_id,
      title: row.assignment_title,
      subtitle: [t('ops.pendientes.mentionedBy', { name: row.author_name }), row.preview].filter(Boolean).join(' — '),
      at: row.created_at,
    })),
    editRequests: editRequests.map((row) => ({
      id: row.id,
      assignmentId: row.assignment_id,
      title: row.assignment_title,
      subtitle: [t('ops.pendientes.editRequestedBy', { name: row.requested_by_name }), row.payload]
        .filter(Boolean)
        .join(' — '),
      at: row.created_at,
    })),
  });

  return (
    <OpsPendientesHome
      firstName={staffFirstName(staff.full_name)}
      greetingPeriod={opsGreetingPeriod()}
      actions={monitor.actions}
      timeline={monitor.timeline}
    />
  );
}
