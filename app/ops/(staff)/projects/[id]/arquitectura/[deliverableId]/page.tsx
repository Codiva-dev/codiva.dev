import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import OpsPageHeader from '@/components/ops/OpsPageHeader';
import PreviewPopupLink from '@/components/ops/PreviewPopupLink';
import OpsArchitectureEditor from '@/components/ops/OpsArchitectureEditor';
import { assertProjectAccess, requireStaff } from '@/lib/ops/auth';
import { updateArchitectureCanvas, hydrateArchitectureFromPacks } from '@/lib/ops/actions';
import { can } from '@/lib/ops/permissions';
import { resolveArchitectureHtml, portalCanvasPath, portalCanvasPdfPath } from '@/lib/ops/architecture';
import { staffPortalPreviewPath } from '@/lib/ops/host';
import { opsProjectPath, resolveOpsProject } from '@/lib/ops/project-path';
import { getT } from '@/i18n/locale';

export default async function ArchitectureEditorPage({
  params,
}: {
  params: Promise<{ id: string; deliverableId: string }>;
}) {
  const { id: idOrSlug, deliverableId } = await params;
  const access = await requireStaff();
  const { supabase, staff } = access;
  const resolved = await resolveOpsProject(supabase, idOrSlug);
  if (!resolved) notFound();
  if (idOrSlug !== resolved.slug) {
    redirect(opsProjectPath(resolved.slug, `/arquitectura/${deliverableId}`));
  }
  await assertProjectAccess(access, resolved.id);
  const id = resolved.id;

  if (!can(staff, 'deliverables')) {
    redirect(opsProjectPath(resolved.slug, '?tab=arquitectura'));
  }

  await hydrateArchitectureFromPacks(id);

  const [{ data: project }, { data: deliverable }] = await Promise.all([
    supabase.from('projects').select('id, name, slug').eq('id', id).single(),
    supabase
      .from('deliverables')
      .select('id, title, description, kind, url, body_html, visible_to_client, sort_order')
      .eq('id', deliverableId)
      .eq('project_id', id)
      .maybeSingle(),
  ]);

  if (!project || !deliverable) notFound();

  const { html, source } = await resolveArchitectureHtml(deliverable);
  const t = await getT();

  return (
    <div>
      <OpsPageHeader
        title={deliverable.title}
        description={t('ops.architecture.pageDesc', { project: project.name })}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href={opsProjectPath(project.slug, '?tab=arquitectura')}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50"
            >
              {t('ops.architecture.back')}
            </Link>
            <PreviewPopupLink
              href={portalCanvasPath(project.slug, deliverable.id)}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50"
            >
              {t('ops.architecture.openCanvas')}
            </PreviewPopupLink>
            <Link
              href={staffPortalPreviewPath(project.slug, '/propuesta')}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50"
            >
              {t('ops.architecture.viewProposal')}
            </Link>
            <Link
              href={portalCanvasPdfPath(project.slug, deliverable.id)}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50"
            >
              {t('ops.architecture.downloadPdf')}
            </Link>
          </div>
        }
      />
      <OpsArchitectureEditor
        values={{
          title: deliverable.title,
          description: deliverable.description ?? '',
          kind: deliverable.kind ?? 'architecture',
          sortOrder: deliverable.sort_order ?? 0,
          visibleToClient: deliverable.visible_to_client,
          initialHtml: html,
          source,
        }}
        action={async (formData) => {
          'use server';
          await updateArchitectureCanvas(id, deliverableId, formData);
        }}
      />
    </div>
  );
}
