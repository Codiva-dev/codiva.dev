import { assessmentCatalogChoices } from '@/lib/careers/assessments/catalog';
import { JOB_HIRE_OPS_ROLES } from '@/lib/ops/career-disciplines';
import {
  JOB_HIRE_WORK_MODALITIES,
  JOB_INTERVIEW_KINDS,
  isJobInterviewKind,
} from '@/lib/ops/careers';
import type { Translator } from '@/i18n/locale';

export default function JobPostingProcessFields({
  t,
  assessmentKey = '',
  asksDiscipline = false,
  requiresHunt = false,
  careersPipeline = false,
  hireOpsRole = 'dev',
  interviewPlan = [],
  hireMonthlyCompensation = '',
  hireCurrency = 'USD',
  hireWorkModality = 'remote',
}: {
  t: Translator;
  assessmentKey?: string | null;
  asksDiscipline?: boolean;
  requiresHunt?: boolean;
  careersPipeline?: boolean;
  hireOpsRole?: string | null;
  interviewPlan?: string[] | null;
  hireMonthlyCompensation?: number | string | null;
  hireCurrency?: string | null;
  hireWorkModality?: string | null;
}) {
  const catalogs = assessmentCatalogChoices();
  const selectedPlan = new Set((interviewPlan ?? []).filter(isJobInterviewKind));
  const compensation =
    hireMonthlyCompensation == null || hireMonthlyCompensation === ''
      ? ''
      : String(hireMonthlyCompensation);

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
      <fieldset className="space-y-2">
        <legend className="text-sm text-zinc-600">{t('ops.careers.interviewPlan')}</legend>
        <p className="text-xs text-zinc-500">{t('ops.careers.interviewPlanHint')}</p>
        <div className="flex flex-wrap gap-2">
          {JOB_INTERVIEW_KINDS.map((kind) => (
            <label
              key={kind}
              className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-700"
            >
              <input type="checkbox" name="interviewPlan" value={kind} defaultChecked={selectedPlan.has(kind)} />
              {t(`ops.careers.interviewKind.${kind}`)}
            </label>
          ))}
        </div>
      </fieldset>
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
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block text-sm text-zinc-600">
          {t('ops.careers.hireCompensation')}
          <input
            name="hireMonthlyCompensation"
            type="number"
            min={1}
            step="0.01"
            defaultValue={compensation}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm text-zinc-600">
          {t('ops.careers.hireCurrency')}
          <input
            name="hireCurrency"
            defaultValue={hireCurrency || 'USD'}
            maxLength={8}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm text-zinc-600">
          {t('ops.careers.hireModality')}
          <select
            name="hireWorkModality"
            defaultValue={hireWorkModality || 'remote'}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          >
            {JOB_HIRE_WORK_MODALITIES.map((modality) => (
              <option key={modality} value={modality}>
                {t(`ops.modality.${modality}`)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="text-xs text-zinc-500">{t('ops.careers.hireCompensationHint')}</p>
    </fieldset>
  );
}
