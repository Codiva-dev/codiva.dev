import OpsPageHeader from '@/components/ops/OpsPageHeader';
import PreviewPopupLink from '@/components/ops/PreviewPopupLink';
import ToastForm from '@/components/ops/ToastForm';
import OpsOfferCareerFile from '@/components/ops/OpsOfferCareerFile';
import { requireAdminStaff } from '@/lib/ops/auth';
import { convertPersonnelOfferToStaff, deletePersonnelOffer, updatePersonnelOffer, updatePersonnelOfferStatus, uploadStaffContract } from '@/lib/ops/actions';
import { loadOfferCareerFile, offerCareerEmails } from '@/lib/ops/offer-career-file';
import {
  offerLabelsFor,
  renderOfferLetterHtml,
  rowToOfferLetterData,
} from '@/lib/ops/offer-letter';
import { labelsFor } from '@/lib/ops/labels';
import { getT } from '@/i18n/locale';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import BrandedFileInput from '@/components/ops/BrandedFileInput';

export default async function TeamOfferDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireAdminStaff();

  const { data: offer } = await supabase
    .from('ops_personnel_offers')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (!offer) notFound();
  const t = await getT();
  const { OFFER_STATUS_LABELS, OPS_ROLE_LABELS, WORK_MODALITY_LABELS } = offerLabelsFor(t.locale);
  const { formatDate } = labelsFor(t.locale);
  const careerFile = await loadOfferCareerFile(offerCareerEmails(offer));

  const { data: contracts } = offer.staff_id
    ? await supabase
        .from('ops_staff_contracts')
        .select('id, original_filename, signed_at, created_at')
        .eq('offer_id', id)
        .order('created_at', { ascending: false })
    : { data: [] as { id: string; original_filename: string; signed_at: string; created_at: string }[] };

  const html = renderOfferLetterHtml(rowToOfferLetterData(offer));

  async function onUpdate(formData: FormData) {
    'use server';
    await updatePersonnelOffer(id, formData);
  }

  async function onStatus(formData: FormData) {
    'use server';
    await updatePersonnelOfferStatus(id, formData);
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col">
      <OpsPageHeader
        title={offer.full_name}
        description={`${offer.position_title} · ${OFFER_STATUS_LABELS[offer.status] ?? offer.status}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`/api/ops/alta-personal/${id}/carta?format=pdf`}
              className="rounded-lg bg-codiva-primary px-4 py-2 text-sm font-medium text-white hover:bg-codiva-primary-dark"
            >
              {t('ops.offer.downloadPdf')}
            </a>
            <PreviewPopupLink
              href={`/api/ops/alta-personal/${id}/carta`}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50"
            >
              {t('ops.offer.openHtml')}
            </PreviewPopupLink>
            <Link
              href="/team?tab=ofertas"
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50"
            >
              {t('ops.offer.backTeam')}
            </Link>
          </div>
        }
      />

      <div className="mb-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="space-y-4">
          <ToastForm
            success={t('ops.offer.updated')}
            action={onUpdate}
            className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5"
          >
            <h2 className="font-semibold">{t('ops.offer.dataTitle')}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                name="fullName"
                required
                defaultValue={offer.full_name}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm sm:col-span-2"
              />
              <input
                name="email"
                type="email"
                defaultValue={offer.email ?? ''}
                placeholder="correo@ejemplo.com"
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm sm:col-span-2"
              />
              <label className="text-sm text-zinc-600 sm:col-span-2">
                {t('ops.offer.careerEmail')}
                <input
                  name="careerEmail"
                  type="email"
                  defaultValue={offer.career_email ?? ''}
                  placeholder="correo@gmail.com"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
                <span className="mt-1 block text-xs text-zinc-400">{t('ops.offer.careerEmailHint')}</span>
              </label>
              <input
                name="positionTitle"
                required
                defaultValue={offer.position_title}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
              <select
                name="opsRole"
                defaultValue={offer.ops_role}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              >
                <option value="pm">{OPS_ROLE_LABELS.pm}</option>
                <option value="dev">{OPS_ROLE_LABELS.dev}</option>
                <option value="admin">{OPS_ROLE_LABELS.admin}</option>
              </select>
              <input
                name="monthlyCompensation"
                type="number"
                required
                min={1}
                step="0.01"
                defaultValue={Number(offer.monthly_compensation)}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
              <select
                name="currency"
                defaultValue={offer.currency || 'USD'}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              >
                <option value="USD">USD</option>
                <option value="MXN">MXN</option>
              </select>
              <select
                name="workModality"
                defaultValue={offer.work_modality}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              >
                {Object.entries(WORK_MODALITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                name="status"
                defaultValue={offer.status}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              >
                {Object.entries(OFFER_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <label className="text-sm text-zinc-600">
                {t('ops.offer.start')}
                <input
                  name="startDate"
                  type="date"
                  defaultValue={offer.start_date ?? ''}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm text-zinc-600">
                {t('ops.offer.validUntil')}
                <input
                  name="validUntil"
                  type="date"
                  defaultValue={offer.valid_until ?? ''}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm text-zinc-600 sm:col-span-2">
                {t('ops.offer.issued')}
                <input
                  name="issuedAt"
                  type="date"
                  defaultValue={offer.issued_at ?? ''}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm text-zinc-600 sm:col-span-2">
                {t('ops.offer.responsibilities')}
                <textarea
                  name="responsibilities"
                  rows={5}
                  defaultValue={offer.responsibilities ?? ''}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm text-zinc-600 sm:col-span-2">
                {t('ops.offer.terms')}
                <textarea
                  name="terms"
                  rows={4}
                  defaultValue={offer.terms ?? ''}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm text-zinc-600 sm:col-span-2">
                {t('ops.offer.notes')}
                <textarea
                  name="notesInternal"
                  rows={2}
                  defaultValue={offer.notes_internal ?? ''}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              </label>
            </div>
            <button type="submit" className="rounded-lg border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-50">
              {t('ops.offer.save')}
            </button>
          </ToastForm>

          <ToastForm
            success={t('ops.offer.statusUpdated')}
            action={onStatus}
            className="flex flex-wrap items-end gap-2 rounded-xl border border-zinc-200 bg-white p-4"
          >
            <label className="text-sm text-zinc-600">
              {t('ops.offer.quickStatus')}
              <select
                name="status"
                defaultValue={offer.status}
                className="mt-1 block rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              >
                {Object.entries(OFFER_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="rounded-lg bg-codiva-primary px-4 py-2 text-sm text-white">
              {t('ops.offer.updateStatus')}
            </button>
          </ToastForm>

          {offer.staff_id ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-sm text-emerald-900">
              {t('ops.offer.alreadyMember')}
            </div>
          ) : (
            <ToastForm
              success={t('ops.offer.convertSuccess')}
              loading={t('ops.toast.saving')}
              action={async (fd) => {
                'use server';
                await convertPersonnelOfferToStaff(id, fd);
              }}
              className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5"
            >
              <h2 className="font-semibold">{t('ops.offer.convertTitle')}</h2>
              <p className="text-sm text-zinc-500">{t('ops.offer.convertHint')}</p>
              <input
                name="email"
                type="email"
                required
                defaultValue={offer.email || ''}
                placeholder="nombre@codiva.dev"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
              <button type="submit" className="rounded-lg bg-codiva-primary px-4 py-2 text-sm text-white">
                {t('ops.offer.convertSubmit')}
              </button>
            </ToastForm>
          )}

          <ToastForm
            success={t('ops.offer.contractUploaded')}
            loading={t('ops.toast.saving')}
            action={async (fd) => {
              'use server';
              await uploadStaffContract(id, fd);
            }}
            className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5"
          >
            <h2 className="font-semibold">{t('ops.offer.contractTitle')}</h2>
            <p className="text-sm text-zinc-500">{t('ops.offer.contractHint')}</p>
            <label className="text-sm text-zinc-600">
              {t('ops.offer.contractSignedAt')}
              <input
                name="signedAt"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </label>
            <BrandedFileInput name="file" accept="application/pdf,.pdf" hint="PDF firmado" required />
            <button
              type="submit"
              disabled={!offer.staff_id}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('ops.offer.contractUpload')}
            </button>
            {(contracts ?? []).length ? (
              <ul className="space-y-2 text-sm">
                {(contracts ?? []).map((row) => (
                  <li key={row.id}>
                    <a
                      href={`/api/ops/staff/contract?id=${row.id}`}
                      className="text-codiva-primary hover:underline"
                    >
                      {row.original_filename || t('ops.offer.contractFile')} · {row.signed_at}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </ToastForm>
          <ToastForm
            success={t('ops.offer.deleted')}
            confirmTitle={t('ops.offer.deleteConfirmTitle')}
            confirmMessage={t('ops.offer.deleteConfirm')}
            confirmLabel={t('ops.offer.delete')}
            action={async () => {
              'use server';
              await deletePersonnelOffer(id);
              redirect('/team?tab=ofertas');
            }}
          >
            <button type="submit" className="text-sm text-red-700 hover:underline">
              {t('ops.offer.delete')}
            </button>
          </ToastForm>
        </div>

        <div className="space-y-4">
          <OpsOfferCareerFile
            offerId={id}
            file={careerFile}
            t={t}
            locale={t.locale === 'en' ? 'en' : 'es'}
            formatDate={formatDate}
          />
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
            <iframe title={t('ops.offer.previewTitle')} srcDoc={html} className="h-[min(80vh,900px)] w-full bg-white" />
          </div>
        </div>
      </div>
    </div>
  );
}
