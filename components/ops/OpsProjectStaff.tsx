import ToastForm from '@/components/ops/ToastForm';
import { assignProjectStaff, removeProjectStaff } from '@/lib/ops/actions';
import { EMPTY_LABEL } from '@/lib/ops/labels';
import { can, type PermissionSubject } from '@/lib/ops/permissions';
import { getT } from '@/i18n/locale';

type StaffOption = { id: string; full_name: string; role: string };
type ProjectStaffRow = {
  staff_id: string;
  role_on_project: string;
  staff_profiles: { full_name: string; role: string } | { full_name: string; role: string }[] | null;
};

function profileName(row: ProjectStaffRow) {
  const p = Array.isArray(row.staff_profiles) ? row.staff_profiles[0] : row.staff_profiles;
  return p?.full_name || EMPTY_LABEL;
}

export default async function OpsProjectStaff({
  projectId,
  permissions,
  projectStaff,
  allStaff,
}: {
  projectId: string;
  permissions: PermissionSubject;
  projectStaff: ProjectStaffRow[];
  allStaff: StaffOption[];
}) {
  const t = await getT();
  const canPlan = can(permissions, 'sprints_plan');
  const assignedIds = new Set(projectStaff.map((row) => row.staff_id));
  const available = allStaff.filter((s) => !assignedIds.has(s.id));

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5">
      <h2 className="mb-4 font-semibold">{t('ops.projectStaff.title')}</h2>
      <ul className="mb-4 space-y-2">
        {projectStaff.map((row) => (
          <li
            key={row.staff_id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-100 px-3 py-2 text-sm"
          >
            <span>
              {profileName(row)}{' '}
              <span className="text-zinc-500">· {row.role_on_project}</span>
            </span>
            {canPlan ? (
              <ToastForm
                success={t('ops.projectStaff.removed')}
                action={async () => {
                  'use server';
                  await removeProjectStaff(projectId, row.staff_id);
                }}
              >
                <button type="submit" className="text-xs text-zinc-500 hover:text-red-600">
                  {t('ops.projectStaff.remove')}
                </button>
              </ToastForm>
            ) : null}
          </li>
        ))}
        {!projectStaff.length && <p className="text-sm text-zinc-500">{t('ops.projectStaff.empty')}</p>}
      </ul>
      {canPlan && available.length > 0 ? (
        <ToastForm
          success={t('ops.projectStaff.assigned')}
          action={async (fd) => {
            'use server';
            await assignProjectStaff(projectId, fd);
          }}
          className="flex flex-wrap gap-2"
        >
          <select name="staffId" required className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm">
            <option value="">{t('ops.projectStaff.select')}</option>
            {available.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name || s.id.slice(0, 8)} ({s.role})
              </option>
            ))}
          </select>
          <select name="roleOnProject" defaultValue="pm" className="rounded-lg border border-zinc-300 px-3 py-2 text-sm">
            <option value="pm">{t('ops.roles.pm')}</option>
            <option value="dev">{t('ops.roles.dev')}</option>
            <option value="member">{t('ops.roles.member')}</option>
          </select>
          <button type="submit" className="rounded-lg bg-codiva-primary px-3 py-2 text-sm text-white">
            {t('ops.projectStaff.assign')}
          </button>
        </ToastForm>
      ) : null}
    </section>
  );
}
