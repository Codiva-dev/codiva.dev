import Link from 'next/link';
import OpsProjectReleases from '@/components/ops/OpsProjectReleases';
import OpsProjectSiteAccess from '@/components/ops/OpsProjectSiteAccess';
import PortalClientUrl from '@/components/ops/PortalClientUrl';
import PreviewPopupLink from '@/components/ops/PreviewPopupLink';
import ToastForm from '@/components/ops/ToastForm';
import { getT } from '@/i18n/locale';
import { inviteProjectMember } from '@/lib/ops/actions';
import { staffPortalPreviewPath } from '@/lib/ops/host';
import { labelsFor } from '@/lib/ops/labels';
import { getAcceptanceStatus } from '@/lib/ops/legal/acceptances';
import { LEGAL_DOCS_VERSION } from '@/lib/ops/legal/version';
import type { ReleaseRequestRow, ReleaseSettingsRow } from '@/lib/ops/releases/actions';
import type { MemberRow, SiblingProject, SiteAccessRow } from './types';

export default async function ProjectAccesosTab({
  projectId,
  slug,
  sitePreviewUrl,
  siteProductionUrl,
  releaseSettings,
  releaseRequests,
  siteAccess,
  siblingProjects,
  members,
  memberEmails,
}: {
  projectId: string;
  slug: string;
  sitePreviewUrl: string | null;
  siteProductionUrl: string | null;
  releaseSettings: ReleaseSettingsRow | null;
  releaseRequests: ReleaseRequestRow[];
  siteAccess: SiteAccessRow[];
  siblingProjects: SiblingProject[];
  members: MemberRow[];
  memberEmails: Map<string, string>;
}) {
  const t = await getT();
  const { formatDate } = labelsFor(t.locale);
  const project = { slug, site_preview_url: sitePreviewUrl, site_production_url: siteProductionUrl };

  return (
<div className="max-w-4xl space-y-8">
  <nav className="flex flex-wrap gap-2">
    <a href="#releases" className="rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white">
      {t('ops.project.jumpReleases')}
    </a>
    <a href="#sitio" className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-200">
      {t('ops.project.jumpSite')}
    </a>
    <a href="#portal" className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-200">
      {t('ops.project.jumpPortal')}
    </a>
  </nav>

  <div id="releases" className="scroll-mt-6">
    <OpsProjectReleases
      projectId={projectId}
      sitePreviewUrl={project.site_preview_url}
      siteProductionUrl={project.site_production_url}
      settings={releaseSettings}
      requests={releaseRequests ?? []}
    />
  </div>

  <div id="sitio" className="scroll-mt-6">
    <OpsProjectSiteAccess
      projectId={projectId}
      sitePreviewUrl={project.site_preview_url}
      siteProductionUrl={project.site_production_url}
      items={siteAccess ?? []}
    />
  </div>

  <section id="portal" className="scroll-mt-6 space-y-6">
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">{t('ops.project.portalCodiva')}</h3>
      <p className="mt-1 text-sm text-zinc-600">{t('ops.project.portalInviteHint')}</p>
    </div>
    <ToastForm success={t('ops.project.inviteSent')} action={async (fd) => { 'use server'; await inviteProjectMember(projectId, fd); }} className="rounded-xl border border-zinc-200 bg-white p-5 space-y-3">
      <h3 className="font-semibold">{t('ops.project.inviteUser')}</h3>
      <p className="text-sm text-zinc-600">
        {t('ops.project.inviteBodyPrefix', { version: LEGAL_DOCS_VERSION })}{' '}
        <Link href="/users" className="text-codiva-primary hover:underline">
          {t('ops.pages.users')}
        </Link>
        .
      </p>
      <input name="email" type="email" required placeholder={t('ops.project.inviteEmail')} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
      <select name="role" className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm">
        <option value="viewer">{t('ops.project.roleViewer')}</option>
        <option value="approver">{t('ops.project.roleApprover')}</option>
      </select>
      {(siblingProjects ?? []).length > 0 && (
        <fieldset className="space-y-2 rounded-lg border border-zinc-200 p-3">
          <legend className="px-1 text-sm font-medium text-zinc-700">
            {t('ops.project.alsoInSiblings')}
          </legend>
          {(siblingProjects ?? []).map((p) => (
            <label key={p.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="siblingProjectIds" value={p.id} defaultChecked />
              {p.name}
            </label>
          ))}
        </fieldset>
      )}
      <button type="submit" className="rounded-lg bg-codiva-primary px-4 py-2 text-sm text-white">{t('ops.project.sendAccess')}</button>
    </ToastForm>
    <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-500">
      <span className="inline-flex flex-wrap items-center gap-2">
        {t('ops.project.clientLogin')}
        <PortalClientUrl slug={project.slug} path="/login" />
      </span>
      <PreviewPopupLink href={staffPortalPreviewPath(project.slug)} className="text-codiva-primary hover:underline">
        {t('ops.project.previewOps')}
      </PreviewPopupLink>
    </div>
    <ul className="space-y-2 text-sm">
      {(members ?? []).map((m) => {
        const acceptance = getAcceptanceStatus(m);
        return (
          <li key={m.id} className="rounded-lg border border-zinc-200 bg-white px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium">{memberEmails.get(m.user_id) ?? m.user_id.slice(0, 8)}</p>
                <p className="text-zinc-500">
                  {m.role} · {t('ops.project.invitedOn', { date: formatDate(m.invited_at) })}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  acceptance.complete
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-amber-50 text-amber-800'
                }`}
              >
                {acceptance.complete ? t('ops.project.legalOk') : t('ops.project.legalPending')}
              </span>
            </div>
            {!acceptance.complete && (
              <p className="mt-2 text-xs text-zinc-500">
                {t('ops.project.missing')}{' '}
                {[
                  !acceptance.terms ? t('ops.project.legalTerms') : null,
                  !acceptance.privacy ? t('ops.project.legalPrivacy') : null,
                  !acceptance.nda ? t('ops.project.legalNda') : null,
                ]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            )}
          </li>
        );
      })}
      {!members?.length && (
        <p className="text-sm text-zinc-500">{t('ops.project.noMembers')}</p>
      )}
    </ul>
  </section>
</div>
  );
}
