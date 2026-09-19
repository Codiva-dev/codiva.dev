import ToastForm from '@/components/ops/ToastForm';
import { getT } from '@/i18n/locale';
import { updateProject } from '@/lib/ops/actions';
import { labelsFor } from '@/lib/ops/labels';
import type { ProjectDetail } from './types';

export default async function ProjectResumenTab({ project }: { project: ProjectDetail }) {
  const t = await getT();
  const { PROJECT_STATUS_LABELS } = labelsFor(t.locale);
  const projectId = project.id;

  async function onUpdateProject(formData: FormData) {
    'use server';
    await updateProject(projectId, formData);
  }

  return (
    <ToastForm success={t('ops.project.updated')} action={onUpdateProject} className="max-w-2xl space-y-4 rounded-xl border border-zinc-200 bg-white p-5">
      <div>
        <label className="mb-1 block text-sm font-medium">{t('ops.project.name')}</label>
        <input name="name" defaultValue={project.name} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">{t('ops.project.status')}</label>
          <select name="status" defaultValue={project.status} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm">
            {Object.entries(PROJECT_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{t('ops.project.progress')}</label>
          <input name="progressPercent" type="number" min={0} max={100} defaultValue={project.progress_percent ?? 0} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{t('ops.project.start')}</label>
          <input name="startDate" type="date" defaultValue={project.start_date ?? ''} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{t('ops.project.delivery')}</label>
          <input name="targetDeliveryDate" type="date" defaultValue={project.target_delivery_date ?? ''} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{t('ops.project.retention')}</label>
          <input
            name="documentRetentionDays"
            type="number"
            min={30}
            max={3650}
            defaultValue={project.document_retention_days ?? 365}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-zinc-500">{t('ops.project.retentionHint')}</p>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">{t('ops.project.description')}</label>
        <textarea name="description" rows={4} defaultValue={project.description ?? ''} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
      </div>
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 space-y-3">
        <p className="text-sm font-medium text-zinc-900">{t('ops.project.portalVisibility')}</p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="clientVisible" defaultChecked={project.client_visible} />
          {t('ops.project.portalVisible')}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="portalShowQuote"
            defaultChecked={project.portal_show_quote !== false}
          />
          {t('ops.project.showQuote')}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="portalShowCosts"
            defaultChecked={project.portal_show_costs !== false}
          />
          {t('ops.project.showCosts')}
        </label>
      </div>
      <button type="submit" className="rounded-lg bg-codiva-primary px-4 py-2 text-sm font-semibold text-white">
        {t('ops.project.saveChanges')}
      </button>
    </ToastForm>
  );
}
