import Link from 'next/link';
import OpsPageHeader from '@/components/ops/OpsPageHeader';
import EmptyState from '@/components/ui/EmptyState';
import MarkMentionReadButton from '@/components/ops/work-board/MarkMentionReadButton';
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

      <section className="mb-10">
        <h2 className="mb-3 text-sm font-semibold text-zinc-900">{t('ops.pendientes.mine')}</h2>
        {assignments.length ? (
          <ul className="space-y-2">
            {assignments.map((row) => (
              <li key={row.id}>
                <Link
                  href={`/asignaciones?id=${row.id}`}
                  className="block rounded-xl border border-zinc-200 bg-white px-4 py-3 no-underline hover:border-codiva-primary/40 hover:bg-zinc-50"
                >
                  <p className="font-medium text-zinc-900">{row.title}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {WORK_STREAM_LABELS[row.stream] ?? row.stream}
                    {' · '}
                    {WORK_STATUS_LABELS[row.status] ?? row.status}
                    {row.due_at ? ` · ${formatDate(row.due_at)}` : ''}
                    {` · ${row.progress_pct}%`}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState>{t('ops.pendientes.mineEmpty')}</EmptyState>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-zinc-900">{t('ops.pendientes.mentions')}</h2>
        {mentions.length ? (
          <ul className="space-y-2">
            {mentions.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3"
              >
                <Link href={`/asignaciones?id=${row.assignment_id}`} className="min-w-0 flex-1 no-underline">
                  <p className="font-medium text-zinc-900">{row.assignment_title}</p>
                  <p className="mt-1 text-sm text-zinc-600">
                    {t('ops.pendientes.mentionedBy', { name: row.author_name })}
                  </p>
                  {row.preview ? (
                    <p className="mt-1 line-clamp-2 text-sm text-zinc-500">{row.preview}</p>
                  ) : null}
                </Link>
                <MarkMentionReadButton
                  mentionId={row.id}
                  label={t('ops.pendientes.markRead')}
                  success={t('ops.pendientes.mentionRead')}
                />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState>{t('ops.pendientes.mentionsEmpty')}</EmptyState>
        )}
      </section>

      {canManage ? (
        <section className="mt-10">
          <h2 className="mb-3 text-sm font-semibold text-zinc-900">{t('ops.pendientes.editRequests')}</h2>
          {editRequests.length ? (
            <ul className="space-y-2">
              {editRequests.map((row) => (
                <li key={row.id}>
                  <Link
                    href={`/asignaciones?id=${row.assignment_id}`}
                    className="block rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 no-underline hover:border-codiva-primary/40"
                  >
                    <p className="font-medium text-zinc-900">{row.assignment_title}</p>
                    <p className="mt-1 text-sm text-zinc-600">
                      {t('ops.pendientes.editRequestedBy', { name: row.requested_by_name })}
                    </p>
                    {row.payload ? (
                      <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-zinc-500">{row.payload}</p>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState>{t('ops.pendientes.editRequestsEmpty')}</EmptyState>
          )}
        </section>
      ) : null}
    </div>
  );
}
