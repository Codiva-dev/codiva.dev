import OpsPageHeader from '@/components/ops/OpsPageHeader';
import CopyableUrl from '@/components/ops/CopyableUrl';
import ToastForm from '@/components/ops/ToastForm';
import JobPostingProcessFields from '@/components/ops/JobPostingProcessFields';
import { requireAdminStaff } from '@/lib/ops/auth';
import { updateJobPosting, deleteJobPosting } from '@/lib/ops/career-actions';
import {
  JOB_EMPLOYMENT_TYPES,
  careerOpsLabels,
  publicCareerUrl,
} from '@/lib/ops/careers';
import { careerBaseUrl, usageUrlLabel } from '@/lib/ops/host';
import { getT } from '@/i18n/locale';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';

export default async function VacanteEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireAdminStaff();
  const { data: posting } = await supabase
    .from('ops_job_postings')
    .select(
      'id, slug, title, title_en, description, description_en, requirements, requirements_en, location, location_en, employment_type, status, sort_order, assessment_key, asks_discipline, requires_hunt, careers_pipeline, hire_ops_role, interview_plan, hire_monthly_compensation, hire_currency, hire_work_modality'
    )
    .eq('id', id)
    .maybeSingle();

  if (!posting) notFound();
  const t = await getT();
  const { JOB_EMPLOYMENT_LABELS, JOB_POSTING_STATUS_LABELS } = careerOpsLabels(t.locale);

  async function onSave(formData: FormData) {
    'use server';
    await updateJobPosting(id, formData);
  }

  return (
    <div className="max-w-2xl">
      <OpsPageHeader
        title={posting.title}
        description={t('ops.careers.editHint', { host: usageUrlLabel(careerBaseUrl()) })}
      />
      <p className="mb-6 text-sm">
        <Link href="/team?tab=bolsa" className="text-codiva-primary hover:underline">
          {t('ops.careers.backJobs')}
        </Link>
        {posting.status === 'published' ? (
          <>
            {' · '}
            <CopyableUrl href={publicCareerUrl(posting.slug)} />
          </>
        ) : null}
      </p>

      <ToastForm
        success={t('ops.careers.updatedToast')}
        action={onSave}
        className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5"
      >
        <label className="block text-sm text-zinc-600">
          {t('ops.careers.title')}
          <input
            name="title"
            required
            defaultValue={posting.title}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm text-zinc-600">
          {t('ops.careers.titleEn')}
          <input
            name="titleEn"
            defaultValue={posting.title_en ?? ''}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm text-zinc-600">
          {t('ops.careers.slug')}
          <input
            name="slug"
            required
            defaultValue={posting.slug}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
        <p className="text-xs text-zinc-500">{t('ops.careers.enHint')}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm text-zinc-600">
            {t('ops.careers.location')}
            <input
              name="location"
              defaultValue={posting.location ?? ''}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm text-zinc-600">
            {t('ops.careers.locationEn')}
            <input
              name="locationEn"
              defaultValue={posting.location_en ?? ''}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm text-zinc-600">
            {t('ops.careers.employmentType')}
            <select
              name="employmentType"
              defaultValue={posting.employment_type ?? 'full_time'}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            >
              {JOB_EMPLOYMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {JOB_EMPLOYMENT_LABELS[type]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-zinc-600">
            {t('ops.careers.status')}
            <select
              name="status"
              defaultValue={posting.status}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            >
              {Object.entries(JOB_POSTING_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-zinc-600">
            {t('ops.careers.sort')}
            <input
              name="sortOrder"
              type="number"
              defaultValue={posting.sort_order ?? 0}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <label className="block text-sm text-zinc-600">
          {t('ops.careers.description')}
          <textarea
            name="description"
            rows={8}
            defaultValue={posting.description ?? ''}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm text-zinc-600">
          {t('ops.careers.descriptionEn')}
          <textarea
            name="descriptionEn"
            rows={8}
            defaultValue={posting.description_en ?? ''}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm text-zinc-600">
          {t('ops.careers.requirements')}
          <textarea
            name="requirements"
            rows={6}
            defaultValue={posting.requirements ?? ''}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm text-zinc-600">
          {t('ops.careers.requirementsEn')}
          <textarea
            name="requirementsEn"
            rows={6}
            defaultValue={posting.requirements_en ?? ''}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
        <JobPostingProcessFields
          t={t}
          assessmentKey={posting.assessment_key}
          asksDiscipline={Boolean(posting.asks_discipline)}
          requiresHunt={Boolean(posting.requires_hunt)}
          careersPipeline={Boolean(posting.careers_pipeline)}
          hireOpsRole={posting.hire_ops_role}
          interviewPlan={posting.interview_plan}
          hireMonthlyCompensation={posting.hire_monthly_compensation}
          hireCurrency={posting.hire_currency}
          hireWorkModality={posting.hire_work_modality}
        />
        <button type="submit" className="rounded-lg bg-codiva-primary px-4 py-2 text-sm text-white">
          {t('ops.careers.save')}
        </button>
      </ToastForm>
      <ToastForm
        success={t('ops.careers.deleted')}
        confirmTitle={t('ops.careers.deleteConfirmTitle')}
        confirmMessage={t('ops.careers.deleteConfirm')}
        confirmLabel={t('ops.careers.delete')}
        action={async () => {
          'use server';
          await deleteJobPosting(id);
          redirect('/team?tab=bolsa');
        }}
        className="mt-4"
      >
        <button type="submit" className="text-sm text-red-700 hover:underline">
          {t('ops.careers.delete')}
        </button>
      </ToastForm>
    </div>
  );
}
