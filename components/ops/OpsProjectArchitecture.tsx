import Link from 'next/link';
import PreviewPopupLink from '@/components/ops/PreviewPopupLink';
import ToastForm from '@/components/ops/ToastForm';
import {
  createArchitectureCanvas,
  setDeliverableVisibility,
  hydrateArchitectureFromPacks,
} from '@/lib/ops/actions';
import { isCanvasKind, portalCanvasPath, portalCanvasPdfPath } from '@/lib/ops/architecture';
import { staffPortalPreviewPath } from '@/lib/ops/host';
import { opsProjectPath } from '@/lib/ops/project-path';
import { requireStaff } from '@/lib/ops/auth';
import { getT } from '@/i18n/locale';

export default async function OpsProjectArchitecture({
  projectId,
  slug,
  kindLabels,
  canEdit,
}: {
  projectId: string;
  slug: string;
  kindLabels: Record<string, string>;
  canEdit: boolean;
}) {
  if (canEdit) {
    await hydrateArchitectureFromPacks(projectId);
  }

  const { supabase } = await requireStaff();
  const t = await getT();
  const { data: canvases } = await supabase
    .from('deliverables')
    .select('id, title, description, kind, url, body_html, visible_to_client, sort_order')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true });

  const items = (canvases ?? []).filter((row) => isCanvasKind(row.kind));

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <h3 className="font-semibold">{t('ops.architecture.title')}</h3>
        <Link
          href={staffPortalPreviewPath(slug, '/propuesta')}
          className="mt-3 inline-block text-sm font-medium text-codiva-primary hover:underline"
        >
          {t('ops.architecture.viewClient')}
        </Link>
      </div>

      {canEdit && (
        <ToastForm
          success={t('ops.architecture.created')}
          action={async (formData) => {
            'use server';
            await createArchitectureCanvas(projectId, formData);
          }}
          className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5"
        >
          <h3 className="font-semibold">{t('ops.architecture.newCanvas')}</h3>
          <input
            name="title"
            required
            placeholder={t('ops.architecture.titlePlaceholder')}
            defaultValue={t('ops.architecture.defaultTitle')}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <select name="kind" defaultValue="architecture" className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm">
            <option value="architecture">{t('ops.architecture.kindArchitecture')}</option>
            <option value="mvp">{t('ops.architecture.kindMvp')}</option>
            <option value="proposal">{t('ops.architecture.kindProposal')}</option>
          </select>
          <input
            name="sortOrder"
            type="number"
            defaultValue={items.length + 1}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <textarea
            name="description"
            placeholder={t('ops.architecture.desc')}
            rows={2}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="visibleToClient" defaultChecked />
            {t('ops.architecture.visibleClient')}
          </label>
          <button type="submit" className="rounded-lg bg-codiva-primary px-4 py-2 text-sm text-white">
            {t('ops.architecture.createEdit')}
          </button>
        </ToastForm>
      )}

      <ul className="space-y-2">
        {items.map((item) => {
          const source = item.body_html?.trim()
            ? t('ops.architecture.sourceOps')
            : item.url
              ? t('ops.architecture.sourcePack')
              : t('ops.architecture.sourceDraft');
          return (
            <li key={item.id} className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-zinc-500">
                    {kindLabels[item.kind ?? ''] ?? item.kind}
                    {' · '}
                    {item.visible_to_client ? t('ops.architecture.visible') : t('ops.architecture.opsOnly')}
                    {' · '}
                    {source}
                  </p>
                  {item.description && <p className="mt-1 text-zinc-600">{item.description}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={opsProjectPath(slug, `/arquitectura/${item.id}`)}
                    className="rounded-lg bg-codiva-primary px-3 py-1.5 text-sm font-medium text-white"
                  >
                    {t('ops.architecture.editInOps')}
                  </Link>
                  <PreviewPopupLink
                    href={portalCanvasPath(slug, item.id)}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-50"
                  >
                    {t('ops.architecture.openCanvas')}
                  </PreviewPopupLink>
                  <Link
                    href={portalCanvasPdfPath(slug, item.id)}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-50"
                  >
                    {t('ops.architecture.downloadPdf')}
                  </Link>
                  {canEdit && (
                    <ToastForm
                      success={t('ops.architecture.visibilityUpdated')}
                      action={async () => {
                        'use server';
                        await setDeliverableVisibility(projectId, item.id, !item.visible_to_client);
                      }}
                    >
                      <button
                        type="submit"
                        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50"
                      >
                        {item.visible_to_client ? t('ops.architecture.hide') : t('ops.architecture.show')}
                      </button>
                    </ToastForm>
                  )}
                </div>
              </div>
            </li>
          );
        })}
        {!items.length && (
          <p className="text-sm text-zinc-500">{t('ops.architecture.empty')}</p>
        )}
      </ul>
    </div>
  );
}
