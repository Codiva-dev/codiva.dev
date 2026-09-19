import OpsProjectHours from '@/components/ops/OpsProjectHours';
import type { PermissionSubject } from '@/lib/ops/permissions';
import type { StaffOption, TimeEntryRow } from './types';

export default function ProjectHorasTab({
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
  entries: TimeEntryRow[];
  sprintItems: { id: string; title: string }[];
  staffOptions: Pick<StaffOption, 'id' | 'full_name'>[];
}) {
  return (
    <OpsProjectHours
      projectId={projectId}
      permissions={permissions}
      currentUserId={currentUserId}
      entries={entries}
      sprintItems={sprintItems}
      staffOptions={staffOptions}
    />
  );
}
