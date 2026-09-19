import Link from 'next/link';
import BrandedFileInput from '@/components/ops/BrandedFileInput';
import ToastForm from '@/components/ops/ToastForm';
import { getT } from '@/i18n/locale';
import { createDeliverable, setDeliverableVisibility } from '@/lib/ops/actions';
import { isCanvasKind } from '@/lib/ops/architecture';
import { labelsFor } from '@/lib/ops/labels';
import { opsProjectPath } from '@/lib/ops/project-path';
import { opsFileHref } from '@/lib/ops/storage';
import type { DeliverableRow } from './types';

export default async function ProjectEntregablesTab({
  projectId,
  projectSlug,
  deliverables,
}: {
  projectId: string;
  projectSlug: string;
  deliverables: DeliverableRow[];
}) {
  const t = await getT();
  const { DELIVERABLE_KIND_LABELS } = labelsFor(t.locale);

  return (
<div className="space-y-6">
  <p className="text-sm text-zinc-600">
    {t('ops.project.deliverablesHintPrefix')}{' '}
    <Link href={opsProjectPath(projectSlug, '?tab=arquitectura')} className="text-codiva-primary hover:underline">
      {t('ops.project.tabArquitectura')}
    </Link>
    .
  </p>
  <ToastForm success={t('ops.project.deliverableCreated')} action={async (fd) => { 'use server'; await createDeliverable(projectId, fd); }} className="rounded-xl border border-zinc-200 bg-white p-5 space-y-3">
    <h3 className="font-semibold">{t('ops.project.newDeliverable')}</h3>
    <input name="title" placeholder={t('ops.project.title')} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
    <p className="text-xs text-zinc-500">{t('ops.project.deliverableTitleHint')}</p>
    <input type="hidden" name="kind" value="other" />
    <input name="sortOrder" type="number" defaultValue={0} placeholder={t('ops.project.requestOrder')} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
    <input name="url" placeholder={t('ops.project.urlPlaceholder')} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
    <textarea name="description" placeholder={t('ops.project.description')} rows={2} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
    <BrandedFileInput multiple hint={t('ops.project.fileHintOptional')} />
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="visibleToClient" defaultChecked /> {t('ops.project.visibleClientCheck')}</label>
    <button type="submit" className="rounded-lg bg-codiva-primary px-4 py-2 text-sm text-white">{t('ops.project.save')}</button>
  </ToastForm>
  <ul className="space-y-2">
    {(deliverables ?? []).filter((d) => !isCanvasKind(d.kind)).map((d) => {
      const fileHref = opsFileHref(d.file_path, d.file_url);
      return (
      <li key={d.id} className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-medium">{d.title}</p>
            <p className="text-zinc-500">
              {d.kind ? DELIVERABLE_KIND_LABELS[d.kind] ?? d.kind : t('ops.project.other')}
              {' · '}
              {d.visible_to_client ? t('ops.project.visibleClient') : t('ops.project.hiddenClient')}
            </p>
            {d.url && <a href={d.url} className="text-codiva-primary hover:underline">{d.url}</a>}
            {fileHref && (
              <a href={fileHref} className="block text-codiva-primary hover:underline">
                {t('ops.project.downloadFile')}
              </a>
            )}
          </div>
          <ToastForm success={t('ops.project.visibilityUpdated')}
            action={async () => {
              'use server';
              await setDeliverableVisibility(projectId, d.id, !d.visible_to_client);
            }}
          >
            <button type="submit" className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50">
              {d.visible_to_client ? t('ops.project.hide') : t('ops.project.show')}
            </button>
          </ToastForm>
        </div>
      </li>
      );
    })}
    {!(deliverables ?? []).some((d) => !isCanvasKind(d.kind)) && (
      <p className="text-sm text-zinc-500">{t('ops.project.noDeliverables')}</p>
    )}
  </ul>
</div>
  );
}
