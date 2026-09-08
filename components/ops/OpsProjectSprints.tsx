import ToastForm from '@/components/ops/ToastForm';
import StatusBadge from '@/components/ops/StatusBadge';
import {
  createProjectSprint,
  createSprintItem,
  updateProjectSprint,
  updateSprintItem,
} from '@/lib/ops/actions';
import { labelsFor } from '@/lib/ops/labels';
import { getT } from '@/i18n/locale';
import { can, type PermissionSubject } from '@/lib/ops/permissions';

type StaffOption = { id: string; full_name: string; role: string };
type SprintRow = {
  id: string;
  name: string;
  goal: string;
  starts_on: string | null;
  ends_on: string | null;
  status: string;
};
type SprintItemRow = {
  id: string;
  sprint_id: string;
  title: string;
  details: string;
  status: string;
  assignee_id: string | null;
};

function sprintTone(status: string) {
  if (status === 'active') return 'success' as const;
  if (status === 'completed') return 'info' as const;
  return 'warning' as const;
}

function itemTone(status: string) {
  if (status === 'done') return 'success' as const;
  if (status === 'blocked') return 'danger' as const;
  if (status === 'in_progress') return 'info' as const;
  return 'warning' as const;
}

export default async function OpsProjectSprints({
  projectId,
  permissions,
  currentUserId,
  allStaff,
  sprints,
  items,
}: {
  projectId: string;
  permissions: PermissionSubject;
  currentUserId: string;
  allStaff: StaffOption[];
  sprints: SprintRow[];
  items: SprintItemRow[];
}) {
  const t = await getT();
  const { formatDate, SPRINT_ITEM_STATUS_LABELS, SPRINT_STATUS_LABELS } = labelsFor(t.locale);
  const canPlan = can(permissions, 'sprints_plan');
  const staffName = new Map(allStaff.map((s) => [s.id, s.full_name]));

  return (
    <div className="space-y-8">
      {canPlan && (
        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="mb-3 font-semibold">{t('ops.sprints.newTitle')}</h2>
          <ToastForm
            success={t('ops.sprints.created')}
            action={async (fd) => {
              'use server';
              await createProjectSprint(projectId, fd);
            }}
            className="grid gap-3 sm:grid-cols-2"
          >
            <input name="name" required placeholder={t('ops.sprints.namePlaceholder')} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
            <select name="status" defaultValue="planned" className="rounded-lg border border-zinc-300 px-3 py-2 text-sm">
              {Object.entries(SPRINT_STATUS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <input name="startsOn" type="date" className="rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
            <input name="endsOn" type="date" className="rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
            <textarea name="goal" placeholder={t('ops.sprints.goal')} rows={2} className="sm:col-span-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
            <button type="submit" className="w-fit rounded-lg bg-codiva-primary px-4 py-2 text-sm text-white">
              {t('ops.sprints.create')}
            </button>
          </ToastForm>
        </section>
      )}

      {(sprints ?? []).map((sprint) => {
        const sprintItems = items.filter((i) => i.sprint_id === sprint.id);
        const visibleItems = canPlan
          ? sprintItems
          : sprintItems.filter((i) => i.assignee_id === currentUserId);

        return (
          <section key={sprint.id} className="rounded-xl border border-zinc-200 bg-white p-5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold">{sprint.name}</h2>
                {sprint.goal && <p className="mt-1 text-sm text-zinc-600">{sprint.goal}</p>}
                <p className="mt-1 text-xs text-zinc-400">
                  {sprint.starts_on ? formatDate(sprint.starts_on) : '-'} →{' '}
                  {sprint.ends_on ? formatDate(sprint.ends_on) : '-'}
                </p>
              </div>
              <StatusBadge label={SPRINT_STATUS_LABELS[sprint.status] ?? sprint.status} tone={sprintTone(sprint.status)} />
            </div>

            {canPlan && (
              <ToastForm
                success={t('ops.sprints.updated')}
                action={async (fd) => {
                  'use server';
                  await updateProjectSprint(sprint.id, projectId, fd);
                }}
                className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
              >
                <input name="name" defaultValue={sprint.name} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
                <select name="status" defaultValue={sprint.status} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm">
                  {Object.entries(SPRINT_STATUS_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
                <input name="startsOn" type="date" defaultValue={sprint.starts_on ?? ''} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
                <input name="endsOn" type="date" defaultValue={sprint.ends_on ?? ''} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
                <textarea name="goal" defaultValue={sprint.goal} rows={2} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm sm:col-span-2 lg:col-span-4" />
                <button type="submit" className="rounded-lg border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-50">
                  {t('ops.sprints.save')}
                </button>
              </ToastForm>
            )}

            <ul className="space-y-3">
              {visibleItems.map((item) => (
                <li key={item.id} className="rounded-lg border border-zinc-100 p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-sm">{item.title}</p>
                    <StatusBadge
                      label={SPRINT_ITEM_STATUS_LABELS[item.status] ?? item.status}
                      tone={itemTone(item.status)}
                    />
                  </div>
                  {item.details && <p className="mb-2 text-sm text-zinc-600">{item.details}</p>}
                  <p className="mb-2 text-xs text-zinc-400">
                    {t('ops.sprints.assigned', {
                      name: item.assignee_id
                        ? staffName.get(item.assignee_id) || item.assignee_id.slice(0, 8)
                        : t('ops.sprints.unassigned'),
                    })}
                  </p>
                  <ToastForm
                    success={t('ops.sprints.itemUpdated')}
                    action={async (fd) => {
                      'use server';
                      await updateSprintItem(item.id, projectId, fd);
                    }}
                    className="flex flex-wrap gap-2"
                  >
                    {canPlan && (
                      <>
                        <input name="title" defaultValue={item.title} className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm" />
                        <select
                          name="assigneeId"
                          defaultValue={item.assignee_id ?? ''}
                          className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
                        >
                          <option value="">{t('ops.sprints.unassigned')}</option>
                          {allStaff.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.full_name || s.id.slice(0, 8)}
                            </option>
                          ))}
                        </select>
                      </>
                    )}
                    <select name="status" defaultValue={item.status} className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm">
                      {Object.entries(SPRINT_ITEM_STATUS_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50">
                      {t('ops.sprints.update')}
                    </button>
                  </ToastForm>
                </li>
              ))}
              {!visibleItems.length && (
                <p className="text-sm text-zinc-500">
                  {canPlan ? t('ops.sprints.emptyItems') : t('ops.sprints.emptyMine')}
                </p>
              )}
            </ul>

            {canPlan && (
              <ToastForm
                success={t('ops.sprints.itemCreated')}
                action={async (fd) => {
                  'use server';
                  await createSprintItem(sprint.id, projectId, fd);
                }}
                className="mt-4 grid gap-2 sm:grid-cols-2"
              >
                <input name="title" required placeholder={t('ops.sprints.newItem')} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
                <select name="assigneeId" className="rounded-lg border border-zinc-300 px-3 py-2 text-sm">
                  <option value="">{t('ops.sprints.unassigned')}</option>
                  {allStaff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name || s.id.slice(0, 8)}
                    </option>
                  ))}
                </select>
                <textarea name="details" placeholder={t('ops.sprints.details')} rows={2} className="sm:col-span-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
                <button type="submit" className="w-fit rounded-lg bg-codiva-primary px-3 py-2 text-sm text-white">
                  {t('ops.sprints.addItem')}
                </button>
              </ToastForm>
            )}
          </section>
        );
      })}

      {!(sprints ?? []).length && (
        <p className="rounded-xl border border-dashed border-zinc-300 bg-white px-4 py-8 text-center text-sm text-zinc-500">
          {t('ops.sprints.empty')}
        </p>
      )}
    </div>
  );
}
