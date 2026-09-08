import Link from 'next/link';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import PortalProjectsSignOut from '@/components/ops/PortalProjectsSignOut';
import CodivaWordmarkMark from '@/components/CodivaWordmarkMark';
import ToastForm from '@/components/ops/ToastForm';
import { getT } from '@/i18n/locale';
import { stopInterviewPartnerViewAs } from '@/lib/ops/interview-actions';
import { interviewsHref } from '@/lib/ops/interview-view-as';

export default async function InterviewsChrome({
  children,
  isStaffPreview,
  orgName,
  viewAsName,
}: {
  children: React.ReactNode;
  isStaffPreview?: boolean;
  orgName?: string | null;
  viewAsName?: string | null;
}) {
  const t = await getT();
  const homeHref = await interviewsHref('/');
  const accountHref = await interviewsHref('/cuenta');
  const viewingAs = Boolean(isStaffPreview && viewAsName);

  return (
    <div className="min-h-screen bg-codiva-background">
      {isStaffPreview ? (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-950">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2">
            <p>
              <span className="font-semibold">{t('ops.preview.staff')}</span>
              {' · '}
              {viewingAs
                ? t('interviews.previewAsBanner', { name: viewAsName, org: orgName || t('interviews.eyebrow') })
                : t('interviews.previewBanner')}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              {viewingAs ? (
                <ToastForm action={stopInterviewPartnerViewAs}>
                  <button type="submit" className="font-medium underline underline-offset-2">
                    {t('interviews.previewStop')}
                  </button>
                </ToastForm>
              ) : null}
              <Link href="/team?tab=entrevistadores" className="font-medium underline underline-offset-2">
                {t('interviews.previewBack')}
              </Link>
            </div>
          </div>
        </div>
      ) : null}
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-6">
          <div className="min-w-0">
            <CodivaWordmarkMark size="sm" />
            <p className="text-xs font-medium text-zinc-500">{orgName || t('interviews.eyebrow')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <Link href={homeHref} className="text-sm text-zinc-500 hover:text-zinc-800">
              {t('interviews.title')}
            </Link>
            <Link href={accountHref} className="text-sm text-zinc-500 hover:text-zinc-800">
              {t('interviews.account')}
            </Link>
            <LanguageSwitcher />
            {!isStaffPreview ? <PortalProjectsSignOut /> : null}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
