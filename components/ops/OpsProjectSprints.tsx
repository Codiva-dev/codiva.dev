import OpsProjectSprintsBoard from '@/components/ops/OpsProjectSprintsBoard';
import {
  createProjectSprint,
  createSprintItem,
  updateProjectSprint,
  updateSprintItem,
} from '@/lib/ops/actions';
import { getT } from '@/i18n/locale';
import { can, type PermissionSubject } from '@/lib/ops/permissions';
import {
  parseSprintStatusFilter,
  resolveSelectedSprintId,
  type SprintItemRow,
  type SprintRow,
} from '@/lib/ops/project-sprints';

type StaffOption = { id: string; full_name: string; role: string };

export default async function OpsProjectSprints({
  projectId,
  projectSlug,
  permissions,
  currentUserId,
  allStaff,
  sprints,
  items,
  selectedSprintId,
  sprintStatus,
  searchQuery,
}: {
  projectId: string;
  projectSlug: string;
  permissions: PermissionSubject;
  currentUserId: string;
  allStaff: StaffOption[];
  sprints: SprintRow[];
  items: SprintItemRow[];
  selectedSprintId?: string;
  sprintStatus?: string;
  searchQuery?: string;
}) {
  const t = await getT();
  const statusFilter = parseSprintStatusFilter(sprintStatus);
  const selectedId = resolveSelectedSprintId(sprints, selectedSprintId, statusFilter);

  async function onCreateSprint(formData: FormData) {
    'use server';
    await createProjectSprint(projectId, formData);
  }

  async function onUpdateSprint(formData: FormData) {
    'use server';
    await updateProjectSprint(String(formData.get('sprintId') || ''), projectId, formData);
  }

  async function onCreateItem(formData: FormData) {
    'use server';
    await createSprintItem(String(formData.get('sprintId') || ''), projectId, formData);
  }

  async function onUpdateItem(formData: FormData) {
    'use server';
    await updateSprintItem(String(formData.get('itemId') || ''), projectId, formData);
  }

  return (
    <OpsProjectSprintsBoard
      key={`${selectedId}:${statusFilter}:${searchQuery || ''}`}
      projectSlug={projectSlug}
      locale={t.locale}
      canPlan={can(permissions, 'sprints_plan')}
      currentUserId={currentUserId}
      allStaff={allStaff}
      sprints={sprints}
      items={items}
      selectedSprintId={selectedId}
      sprintStatus={statusFilter}
      searchQuery={searchQuery || ''}
      onCreateSprint={onCreateSprint}
      onUpdateSprint={onUpdateSprint}
      onCreateItem={onCreateItem}
      onUpdateItem={onUpdateItem}
    />
  );
}
