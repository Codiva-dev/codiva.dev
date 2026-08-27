import PortalNav from '@/components/ops/PortalNav';
import StaffPortalPreviewBanner from '@/components/ops/StaffPortalPreviewBanner';
import { requirePortalMemberWithAcceptances } from '@/lib/ops/auth';
import { getPortalVisibility, withQuoteNav } from '@/lib/ops/portal-visibility';
import Link from 'next/link';
import { getT } from '@/i18n/locale';

export default async function PortalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const access = await requirePortalMemberWithAcceptances(slug);
  const { project, isStaffPreview, supabase } = access;
  const baseVisibility = getPortalVisibility(project);
  const { count: quoteCanvasCount } = baseVisibility.showCosts
    ? await supabase
        .from('deliverables')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', project.id)
        .eq('visible_to_client', true)
        .eq('kind', 'mvp')
    : { count: 0 };
  const visibility = withQuoteNav(baseVisibility, (quoteCanvasCount ?? 0) > 0);
  const t = await getT();

  return (
    <div className="min-h-screen bg-codiva-background">
      {isStaffPreview && (
        <StaffPortalPreviewBanner projectName={project.name} slug={slug} />
      )}
      <PortalNav
        slug={slug}
        projectName={project.name}
        visibility={visibility}
        showProjectsLink={!isStaffPreview}
      />
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
      <footer className="border-t border-zinc-200 py-6 text-center text-xs text-zinc-500">
        <p>{t('portal.powered')}</p>
        <p className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <Link href={`/p/${slug}/cuenta`} className="hover:text-codiva-primary hover:underline">
            {t('portal.account.nav')}
          </Link>
          <Link href="/legal/terminos" className="hover:text-codiva-primary hover:underline">
            {t('footer.terms')}
          </Link>
          <Link href="/legal/aviso-privacidad" className="hover:text-codiva-primary hover:underline">
            {t('footer.privacy')}
          </Link>
          <Link href="/legal/nda" className="hover:text-codiva-primary hover:underline">
            {t('legal.ndaTitle')}
          </Link>
        </p>
      </footer>
    </div>
  );
}
