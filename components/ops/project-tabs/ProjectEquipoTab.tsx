import OpsProjectStaff from '@/components/ops/OpsProjectStaff';
import type { PermissionSubject } from '@/lib/ops/permissions';
import type { ProjectStaffRow, StaffOption } from './types';

export default function ProjectEquipoTab({
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
  return (
    <OpsProjectStaff
      projectId={projectId}
      permissions={permissions}
      projectStaff={projectStaff}
      allStaff={allStaff}
    />
  );
}
