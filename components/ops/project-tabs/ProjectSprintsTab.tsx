import OpsProjectSprints from '@/components/ops/OpsProjectSprints';
import type { PermissionSubject } from '@/lib/ops/permissions';
import { sortSprintsBySchedule, type SprintItemRow, type SprintRow } from '@/lib/ops/project-sprints';
import type { StaffOption } from './types';

export default function ProjectSprintsTab({
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
  return (
    <OpsProjectSprints
      projectId={projectId}
      projectSlug={projectSlug}
      permissions={permissions}
      currentUserId={currentUserId}
      allStaff={allStaff}
      sprints={sortSprintsBySchedule(sprints)}
      items={items}
      selectedSprintId={selectedSprintId}
      sprintStatus={sprintStatus}
      searchQuery={searchQuery}
    />
  );
}
