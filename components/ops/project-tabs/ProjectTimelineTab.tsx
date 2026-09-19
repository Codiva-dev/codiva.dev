import StatusBadge from '@/components/ops/StatusBadge';
import ToastForm from '@/components/ops/ToastForm';
import { getT } from '@/i18n/locale';
import { addMilestoneUpdate, createMilestone, updateMilestone } from '@/lib/ops/actions';
import { labelsFor } from '@/lib/ops/labels';
import { can, type PermissionSubject } from '@/lib/ops/permissions';
import type { MilestoneRow } from './types';

export default async function ProjectTimelineTab({
  projectId,
  permissions,
  milestones,
}: {
  projectId: string;
  permissions: PermissionSubject;
  milestones: MilestoneRow[];
}) {
  const t = await getT();
  const { MILESTONE_STATUS_LABELS, formatDate } = labelsFor(t.locale);
  const canWrite = can(permissions, 'milestones_write');

  return (
    <div className="space-y-6">
      {canWrite && <MilestoneForm projectId={projectId} />}
      {milestones.map((m) =>
        canWrite ? (
          <MilestoneCard key={m.id} milestone={m} projectId={projectId} />
        ) : (
          <div key={m.id} className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">{m.title}</p>
              <StatusBadge
                label={MILESTONE_STATUS_LABELS[m.status] ?? m.status}
                tone={m.status === 'completed' ? 'success' : m.status === 'blocked' ? 'danger' : 'info'}
              />
            </div>
            {m.description && <p className="mt-2 text-sm text-zinc-600">{m.description}</p>}
            <p className="mt-2 text-xs text-zinc-400">
              {t('ops.project.deliveryDate', { date: formatDate(m.due_date) })}
            </p>
          </div>
        )
      )}
      {!milestones.length && <p className="text-sm text-zinc-500">{t('ops.project.noMilestones')}</p>}
    </div>
  );
}

async function MilestoneForm({ projectId }: { projectId: string }) {
  const t = await getT();
  const { MILESTONE_STATUS_LABELS } = labelsFor(t.locale);
  async function action(formData: FormData) {
    'use server';
    await createMilestone(projectId, formData);
  }

  return (
    <ToastForm success={t('ops.project.milestoneAdded')} action={action} className="rounded-xl border border-zinc-200 bg-white p-5 grid gap-3 md:grid-cols-2">
      <h3 className="md:col-span-2 font-semibold">{t('ops.project.newMilestone')}</h3>
      <input name="title" required placeholder={t('ops.project.milestoneTitle')} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
      <input name="dueDate" type="date" className="rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
      <select name="status" className="rounded-lg border border-zinc-300 px-3 py-2 text-sm">
        {Object.entries(MILESTONE_STATUS_LABELS).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </select>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="visibleToClient" defaultChecked /> {t('ops.project.visibleClientCheck')}</label>
      <textarea name="description" placeholder={t('ops.project.description')} rows={2} className="md:col-span-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
      <button type="submit" className="w-fit rounded-lg bg-codiva-primary px-4 py-2 text-sm text-white">{t('ops.project.addMilestone')}</button>
    </ToastForm>
  );
}

async function MilestoneCard({
  milestone,
  projectId,
}: {
  milestone: MilestoneRow;
  projectId: string;
}) {
  const t = await getT();
  const { MILESTONE_STATUS_LABELS, formatDate } = labelsFor(t.locale);
  const milestoneId = milestone.id;
  async function onUpdate(formData: FormData) {
    'use server';
    await updateMilestone(milestoneId, projectId, formData);
  }

  async function onAddUpdate(formData: FormData) {
    'use server';
    const body = String(formData.get('body') || '');
    if (body.trim()) await addMilestoneUpdate(milestoneId, projectId, body);
  }

  return (
    <article className="rounded-xl border border-zinc-200 bg-white p-5">
      <ToastForm success={t('ops.project.saved')} action={onUpdate} className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <input name="title" defaultValue={milestone.title} className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium" />
          <select name="status" defaultValue={milestone.status} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm">
            {Object.entries(MILESTONE_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <textarea name="description" defaultValue={milestone.description ?? ''} rows={2} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
        <div className="flex flex-wrap gap-3 items-center">
          <input name="dueDate" type="date" defaultValue={milestone.due_date ?? ''} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="visibleToClient" defaultChecked={milestone.visible_to_client} /> {t('ops.project.visibleClientShort')}
          </label>
          <button type="submit" className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50">{t('ops.project.save')}</button>
        </div>
      </ToastForm>
      {milestone.milestone_updates && milestone.milestone_updates.length > 0 && (
        <ul className="mt-4 space-y-2 border-t border-zinc-100 pt-4 text-sm">
          {milestone.milestone_updates.map((u) => (
            <li key={u.id} className="text-zinc-600">
              <span className="text-xs text-zinc-400">{formatDate(u.created_at)}</span>
              <p>{u.body}</p>
            </li>
          ))}
        </ul>
      )}
      <ToastForm success={t('ops.project.updatePublished')} action={onAddUpdate} className="mt-3 flex gap-2">
        <input name="body" placeholder={t('ops.project.updatePlaceholder')} className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
        <button type="submit" className="rounded-lg bg-zinc-800 px-3 py-2 text-sm text-white">{t('ops.project.publish')}</button>
      </ToastForm>
    </article>
  );
}
