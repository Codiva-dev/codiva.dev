import { assessmentCatalogChoices } from '@/lib/careers/assessments/catalog';
import { JOB_HIRE_OPS_ROLES } from '@/lib/ops/career-disciplines';
import type { Translator } from '@/i18n/locale';

export default function JobPostingProcessFields({
  t,
  assessmentKey = '',
  asksDiscipline = false,
  requiresHunt = false,
  careersPipeline = false,
  hireOpsRole = 'dev',
}: {
  t: Translator;
  assessmentKey?: string | null;
  asksDiscipline?: boolean;
  requiresHunt?: boolean;
  careersPipeline?: boolean;
  hireOpsRole?: string | null;
}) {
  const catalogs = assessmentCatalogChoices();

  return (
    <fieldset className="space-y-3 sm:col-span-2">
      <legend className="text-sm font-semibold text-zinc-900">{t('ops.careers.processTitle')}</legend>
      <p className="text-xs text-zinc-500">{t('ops.careers.processHint')}</p>
      <label className="block text-sm text-zinc-600">
        {t('ops.careers.assessment')}
        <select
          name="assessmentKey"
          defaultValue={assessmentKey || ''}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        >
          <option value="">{t('ops.careers.assessmentNone')}</option>
          {catalogs.map((catalog) => (
            <option key={catalog.key} value={catalog.key}>
              {catalog.title}
            </option>
          ))}
        </select>
      </label>
      <p className="text-xs text-zinc-500">{t('ops.careers.assessmentHint')}</p>
      <label className="flex items-start gap-2 text-sm text-zinc-700">
        <input
          type="checkbox"
          name="asksDiscipline"
          value="1"
          defaultChecked={asksDiscipline}
          className="mt-1"
        />
        <span>
          {t('ops.careers.asksDiscipline')}
          <span className="mt-0.5 block text-xs text-zinc-500">{t('ops.careers.asksDisciplineHint')}</span>
        </span>
      </label>
      <label className="flex items-start gap-2 text-sm text-zinc-700">
        <input
          type="checkbox"
          name="requiresHunt"
          value="1"
          defaultChecked={requiresHunt}
          className="mt-1"
        />
        <span>
          {t('ops.careers.requiresHunt')}
          <span className="mt-0.5 block text-xs text-zinc-500">{t('ops.careers.requiresHuntHint')}</span>
        </span>
      </label>
      <label className="flex items-start gap-2 text-sm text-zinc-700">
        <input
          type="checkbox"
          name="careersPipeline"
          value="1"
          defaultChecked={careersPipeline}
          className="mt-1"
        />
        <span>
          {t('ops.careers.careersPipeline')}
          <span className="mt-0.5 block text-xs text-zinc-500">{t('ops.careers.careersPipelineHint')}</span>
        </span>
      </label>
      <label className="block text-sm text-zinc-600">
        {t('ops.careers.hireOpsRole')}
        <select
          name="hireOpsRole"
          defaultValue={hireOpsRole || 'dev'}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        >
          {JOB_HIRE_OPS_ROLES.map((role) => (
            <option key={role} value={role}>
              {t(`ops.roles.${role}`)}
            </option>
          ))}
        </select>
      </label>
    </fieldset>
  );
}
