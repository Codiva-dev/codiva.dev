'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { createClient } from '@/lib/supabase/client';
import type { PortalVisibility } from '@/lib/ops/portal-visibility';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import CodivaWordmarkMark from '@/components/CodivaWordmarkMark';

function linkDefs(slug: string) {
  return [
    { href: `/p/${slug}`, key: 'home' as const },
    { href: `/p/${slug}/propuesta`, key: 'proposal' as const },
    { href: `/p/${slug}/cotizacion`, key: 'quote' as const },
    { href: `/p/${slug}/pagos`, key: 'payments' as const },
    { href: `/p/${slug}/sitio`, key: 'site' as const },
    { href: `/p/${slug}/documentos`, key: 'docs' as const },
    { href: `/p/${slug}/timeline`, key: 'timeline' as const },
    { href: `/p/${slug}/entregables`, key: 'deliverables' as const },
    { href: `/p/${slug}/tickets`, key: 'tickets' as const },
  ];
}

export default function PortalNav({
  slug,
  projectName,
  visibility,
  showProjectsLink = false,
}: {
  slug: string;
  projectName: string;
  visibility: PortalVisibility;
  showProjectsLink?: boolean;
}) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const normalized = pathname.replace(/^\/ops/, '');

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push(showProjectsLink ? '/login' : `/p/${slug}/login`);
    router.refresh();
  }

  const items = linkDefs(slug).filter((l) => {
    if (l.key === 'quote') return visibility.showQuoteNav ?? visibility.showQuote;
    if (l.key === 'payments') return visibility.showCosts;
    return true;
  });

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 sm:items-center">
          <Link href={`/p/${slug}`} className="mt-0.5 flex shrink-0 items-center gap-2 sm:mt-0">
            <Image src="/logo.svg" alt="Codiva" width={32} height={32} />
            <CodivaWordmarkMark size="sm" />
          </Link>
          <div>
            <p className="text-xs font-medium text-zinc-500">
              {t('portal.projectPortal')}
            </p>
            <h1 className="text-xl font-bold text-zinc-900">{projectName}</h1>
            {showProjectsLink ? (
              <Link
                href="/proyectos"
                className="mt-1 inline-block text-xs font-medium text-codiva-primary hover:underline"
              >
                ← {t('portal.myProjects')}
              </Link>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <Link
            href={`/p/${slug}/cuenta`}
            className={`text-sm hover:text-zinc-800 ${
              normalized === `/p/${slug}/cuenta` ? 'font-medium text-zinc-900' : 'text-zinc-500'
            }`}
          >
            {t('portal.account.nav')}
          </Link>
          <button type="button" onClick={signOut} className="text-sm text-zinc-500 hover:text-zinc-800">
            {t('portal.signOut')}
          </button>
        </div>
      </div>
      <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-6 pb-3">
        {items.map((l) => {
          const active =
            l.href === `/p/${slug}`
              ? normalized === l.href
              : normalized === l.href || normalized.startsWith(`${l.href}/`);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium ${
                active ? 'bg-codiva-primary text-white' : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              {t(`portal.nav.${l.key}`)}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
