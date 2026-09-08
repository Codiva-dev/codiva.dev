import ToastForm from '@/components/ops/ToastForm';
import { createTimeEntry, deleteTimeEntry } from '@/lib/ops/actions';
import { labelsFor } from '@/lib/ops/labels';
import { getT } from '@/i18n/locale';
import { can, type PermissionSubject } from '@/lib/ops/permissions';

type Entry = {
  id: string;
  hours: number | string;
  worked_on: string;
  notes: string;
  staff_id: string;
  sprint_item_id: string | null;
};

type SprintItemOpt = { id: string; title: string };
type StaffOpt = { id: string; full_name: string };

export default async function OpsProjectHours({
  projectId,
  permissions,
  currentUserId,
  entries,
  sprintItems,
  staffOptions,
}: {
  projectId: string;
  permissions: PermissionSubject;
  currentUserId: string;
  entries: Entry[];
  sprintItems: SprintItemOpt[];
  staffOptions: StaffOpt[];
}) {
  const t = await getT();
  const { EMPTY_LABEL, formatDate } = labelsFor(t.locale);
  const canPlan = can(permissions, 'sprints_plan');
  const names = new Map(staffOptions.map((s) => [s.id, s.full_name || s.id.slice(0, 8)]));
  const itemTitles = new Map(sprintItems.map((i) => [i.id, i.title]));

  const total = entries.reduce((sum, e) => sum + Number(e.hours), 0);

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">{t('ops.hours.title')}</h2>
          <p className="text-sm text-zinc-500">{t('ops.hours.totalListed', { hours: total.toFixed(1) })}</p>
        </div>
        <ToastForm
          success={t('ops.hours.logged')}
          action={async (fd) => {
            'use server';
            await createTimeEntry(projectId, fd);
          }}
          className="grid gap-3 sm:grid-cols-2"
        >
          <input
            name="hours"
            type="number"
            required
            min={0.25}
            max={24}
            step={0.25}
            placeholder={t('ops.hours.hoursPlaceholder')}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <input
            name="workedOn"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <select name="sprintItemId" className="rounded-lg border border-zinc-300 px-3 py-2 text-sm">
            <option value="">{t('ops.hours.noSprintItem')}</option>
            {sprintItems.map((i) => (
              <option key={i.id} value={i.id}>
                {i.title}
              </option>
            ))}
          </select>
          {canPlan ? (
            <select name="staffId" defaultValue={currentUserId} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm">
              {staffOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name || s.id.slice(0, 8)}
                </option>
              ))}
            </select>
          ) : null}
          <textarea
            name="notes"
            placeholder={t('ops.hours.notes')}
            rows={2}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm sm:col-span-2"
          />
          <button type="submit" className="w-fit rounded-lg bg-codiva-primary px-4 py-2 text-sm text-white">
            {t('ops.hours.save')}
          </button>
        </ToastForm>
      </section>

      <section className="max-w-full overflow-x-auto overscroll-x-contain rounded-xl border border-zinc-200 bg-white">
        <table className="w-full min-w-[44rem] text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-600">
            <tr>
              <th className="whitespace-nowrap px-4 py-3 font-medium">{t('ops.hours.colDate')}</th>
              <th className="whitespace-nowrap px-4 py-3 font-medium">{t('ops.hours.colWho')}</th>
              <th className="whitespace-nowrap px-4 py-3 font-medium">{t('ops.hours.colHours')}</th>
              <th className="whitespace-nowrap px-4 py-3 font-medium">{t('ops.hours.colItem')}</th>
              <th className="whitespace-nowrap px-4 py-3 font-medium">{t('ops.hours.colNotes')}</th>
              <th className="whitespace-nowrap px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-t border-zinc-100">
                <td className="px-4 py-3">{formatDate(e.worked_on)}</td>
                <td className="px-4 py-3">{names.get(e.staff_id) || EMPTY_LABEL}</td>
                <td className="px-4 py-3 font-medium">{Number(e.hours).toFixed(2)}</td>
                <td className="px-4 py-3 text-zinc-500">
                  {e.sprint_item_id ? itemTitles.get(e.sprint_item_id) || t('ops.hours.itemFallback') : EMPTY_LABEL}
                </td>
                <td className="px-4 py-3 text-zinc-500">{e.notes || EMPTY_LABEL}</td>
                <td className="px-4 py-3 text-right">
                  {(canPlan || e.staff_id === currentUserId) && (
                    <ToastForm
                      success={t('ops.hours.deleted')}
                      action={async () => {
                        'use server';
                        await deleteTimeEntry(e.id, projectId);
                      }}
                    >
                      <button type="submit" className="text-xs text-zinc-400 hover:text-red-600">
                        {t('ops.hours.delete')}
                      </button>
                    </ToastForm>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!entries.length && <p className="p-6 text-sm text-zinc-500">{t('ops.hours.empty')}</p>}
      </section>
    </div>
  );
}
