import OpsProjectArchitecture from '@/components/ops/OpsProjectArchitecture';
import { getT } from '@/i18n/locale';
import { labelsFor } from '@/lib/ops/labels';
import { can, type PermissionSubject } from '@/lib/ops/permissions';

export default async function ProjectArquitecturaTab({
  projectId,
  slug,
  permissions,
}: {
  projectId: string;
  slug: string;
  permissions: PermissionSubject;
}) {
  const t = await getT();
  const { DELIVERABLE_KIND_LABELS } = labelsFor(t.locale);
  return (
    <OpsProjectArchitecture
      projectId={projectId}
      slug={slug}
      kindLabels={DELIVERABLE_KIND_LABELS}
      canEdit={can(permissions, 'deliverables')}
    />
  );
}
