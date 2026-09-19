import OpsPageHeader from '@/components/ops/OpsPageHeader';
import OpsPendientesLists from '@/components/ops/search/OpsPendientesLists';
import { requireCapability } from '@/lib/ops/auth';
import { can } from '@/lib/ops/permissions';
import { getT } from '@/i18n/locale';
import { labelsFor } from '@/lib/ops/labels';
import { listWorkPending } from '@/lib/ops/work-pending';

export default async function PendientesPage() {
  const { supabase, staff } = await requireCapability('assignments');
  const t = await getT();
  const { WORK_STATUS_LABELS, WORK_STREAM_LABELS, formatDate } = labelsFor(t.locale);
  const canManage = can(staff, 'assignments_manage');
  const { assignments, mentions, editRequests } = await listWorkPending(supabase, staff.id, canManage);

  return (
    <div>
      <OpsPageHeader
        title={t('ops.pendientes.title')}
        description={t('ops.pendientes.description')}
      />
      <OpsPendientesLists
        canManage={canManage}
        streamLabels={WORK_STREAM_LABELS}
        statusLabels={WORK_STATUS_LABELS}
        assignments={assignments.map((row) => ({
          id: row.id,
          title: row.title,
          stream: row.stream,
          status: row.status,
          dueLabel: row.due_at ? formatDate(row.due_at) : '',
          progress_pct: row.progress_pct,
        }))}
        mentions={mentions.map((row) => ({
          id: row.id,
          assignment_id: row.assignment_id,
          assignment_title: row.assignment_title,
          author_name: row.author_name,
          preview: row.preview,
        }))}
        editRequests={editRequests.map((row) => ({
          id: row.id,
          assignment_id: row.assignment_id,
          assignment_title: row.assignment_title,
          requested_by_name: row.requested_by_name,
          payload: row.payload,
        }))}
      />
    </div>
  );
}
