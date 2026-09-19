import OpsChangePasswordForm from '@/components/ops/OpsChangePasswordForm';
import OpsPageHeader from '@/components/ops/OpsPageHeader';
import ToastForm from '@/components/ops/ToastForm';
import { requireStaff } from '@/lib/ops/auth';
import { labelsFor } from '@/lib/ops/labels';
import { getT } from '@/i18n/locale';
import { publishLegalVersionAndNotify } from '@/lib/ops/actions';
import { LEGAL_DOCS_VERSION, LEGAL_UPDATED_LABEL } from '@/lib/ops/legal/version';
import { can } from '@/lib/ops/permissions';
import Link from 'next/link';
import { offerLabelsFor } from '@/lib/ops/offer-letter';

export default async function SettingsPage() {
  const { user, staff, supabase } = await requireStaff();
  const t = await getT();
  const { EMPTY_LABEL, formatDate } = labelsFor(t.locale);
  const ROLE_LABELS = { admin: t('ops.roles.admin'), pm: t('ops.roles.pm'), dev: t('ops.roles.dev') };
  const { OPS_ROLE_LABELS } = offerLabelsFor(t.locale);
  const canPublishLegal = can(staff, 'legal_publish');
  const canManageTeam = can(staff, 'team');

  const [{ data: versions }, { data: ownOffer }, { data: ownContract }] = await Promise.all([
    supabase
      .from('legal_document_versions')
      .select('kind, version_code, changelog, published_at')
      .eq('kind', 'bundle')
      .order('published_at', { ascending: false })
      .limit(5),
    supabase
      .from('ops_personnel_offers')
      .select('id, position_title, ops_role, status, issued_at')
      .eq('staff_id', user.id)
      .maybeSingle(),
    supabase
      .from('ops_staff_contracts')
      .select('id, original_filename, signed_at')
      .eq('staff_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  async function onPublish(formData: FormData) {
    'use server';
    await publishLegalVersionAndNotify(formData);
  }

  return (
    <div>
      <OpsPageHeader title={t('ops.settings.title')} description={t('ops.settings.description')} />
      <div className="max-w-2xl space-y-6">
        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="mb-3 font-semibold">{t('ops.settings.account')}</h2>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-zinc-500">{t('ops.settings.email')}</dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">{t('ops.settings.name')}</dt>
              <dd>{staff.full_name || EMPTY_LABEL}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">{t('ops.settings.role')}</dt>
              <dd>{ROLE_LABELS[staff.role as keyof typeof ROLE_LABELS] ?? staff.role}</dd>
            </div>
            {ownOffer ? (
              <div>
                <dt className="text-zinc-500">{t('ops.settings.position')}</dt>
                <dd>
                  {ownOffer.position_title}
                  {ownOffer.ops_role
                    ? ` · ${OPS_ROLE_LABELS[ownOffer.ops_role as keyof typeof OPS_ROLE_LABELS] ?? ownOffer.ops_role}`
                    : ''}
                </dd>
              </div>
            ) : null}
          </dl>
          {canManageTeam && (
            <p className="mt-4 text-sm">
              <Link href="/team" className="text-codiva-primary hover:underline">
                {t('ops.settings.manageTeam')}
              </Link>
            </p>
          )}
        </section>

        <section id="password" className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="mb-1 font-semibold">{t('ops.settings.passwordTitle')}</h2>
          <p className="mb-4 text-sm text-zinc-600">{t('ops.settings.passwordHint')}</p>
          <OpsChangePasswordForm />
        </section>

        {ownOffer ? (
          <section className="rounded-xl border border-zinc-200 bg-white p-5">
            <h2 className="mb-1 font-semibold">{t('ops.settings.offerTitle')}</h2>
            <p className="mb-4 text-sm text-zinc-600">{t('ops.settings.offerHint')}</p>
            <div className="flex flex-wrap gap-2">
              <a
                href={`/api/ops/alta-personal/${ownOffer.id}/carta`}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50"
              >
                {t('ops.settings.offerOpen')}
              </a>
              <a
                href={`/api/ops/alta-personal/${ownOffer.id}/carta?format=pdf`}
                className="rounded-lg bg-codiva-primary px-3 py-1.5 text-sm font-medium text-white"
              >
                {t('ops.settings.offerPdf')}
              </a>
            </div>
          </section>
        ) : null}

        {ownOffer || ownContract ? (
          <section className="rounded-xl border border-zinc-200 bg-white p-5">
            <h2 className="mb-1 font-semibold">{t('ops.settings.contractTitle')}</h2>
            {ownContract ? (
              <div className="mt-3 space-y-2">
                <p className="text-sm text-zinc-600">
                  {t('ops.settings.contractSigned', { date: formatDate(ownContract.signed_at) })}
                  {ownContract.original_filename ? ` · ${ownContract.original_filename}` : ''}
                </p>
                <a
                  href={`/api/ops/staff/contract?id=${ownContract.id}`}
                  className="inline-block rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50"
                >
                  {t('ops.settings.contractDownload')}
                </a>
              </div>
            ) : (
              <p className="mt-2 text-sm text-zinc-500">{t('ops.settings.contractPending')}</p>
            )}
          </section>
        ) : null}

        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="mb-1 font-semibold">{t('ops.settings.legalTitle')}</h2>
          <p className="mb-4 text-sm text-zinc-600">
            {t('ops.settings.codeVersion')} <strong>{LEGAL_DOCS_VERSION}</strong> ({LEGAL_UPDATED_LABEL}).
            {canPublishLegal ? t('ops.settings.publishNotifyHint') : t('ops.settings.adminOnlyHint')}
          </p>
          <p className="mb-4 text-sm">
            <Link href="/legal/terminos" className="text-codiva-primary hover:underline">
              TyC
            </Link>
            {' · '}
            <Link href="/legal/aviso-privacidad" className="text-codiva-primary hover:underline">
              Privacidad
            </Link>
            {' · '}
            <Link href="/legal/nda" className="text-codiva-primary hover:underline">
              NDA
            </Link>
          </p>

          {canPublishLegal && (
          <ToastForm success={t('ops.settings.published')} action={onPublish} className="space-y-3 rounded-lg bg-zinc-50 p-4">
            <input
              name="versionCode"
              defaultValue={LEGAL_DOCS_VERSION}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
              placeholder={t('ops.settings.versionPlaceholder')}
            />
            <textarea
              name="changelog"
              rows={2}
              placeholder={t('ops.settings.changelogPlaceholder')}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
            />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="sendEmails" />
              {t('ops.settings.sendEmails')}
            </label>
            <button type="submit" className="rounded-lg bg-codiva-primary px-4 py-2 text-sm font-semibold text-white">
              {t('ops.settings.publish')}
            </button>
          </ToastForm>
          )}

          <ul className="mt-4 space-y-2 text-sm">
            {(versions ?? []).map((v) => (
              <li key={`${v.version_code}-${v.published_at}`} className="rounded-lg border border-zinc-100 px-3 py-2">
                <p className="font-medium">{v.version_code}</p>
                <p className="text-zinc-500">{formatDate(v.published_at)}</p>
                {v.changelog && <p className="mt-1 text-zinc-600">{v.changelog}</p>}
              </li>
            ))}
            {!versions?.length && (
              <p className="text-zinc-500">{t('ops.settings.noVersions')}</p>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
