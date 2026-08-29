import type { Metadata } from 'next';
import Link from 'next/link';
import HuntReportForm from '@/components/careers/HuntReportForm';
import { careerAppHref, careerBaseUrl } from '@/lib/ops/host';
import { getT } from '@/i18n/locale';
import { headers } from 'next/headers';
import { isCareerDiscipline } from '@/lib/ops/career-disciplines';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams: Promise<{ discipline?: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t('career.hunt_doc_title'),
    description: t('career.hunt_meta'),
    robots: { index: false, follow: true },
  };
}

export default async function HuntPage({ searchParams }: PageProps) {
  const t = await getT();
  const host = (await headers()).get('host');
  const { discipline: disciplineRaw } = await searchParams;
  const discipline = isCareerDiscipline(disciplineRaw ?? '') ? disciplineRaw : undefined;
  const craftHintKey = discipline
    ? `career.hunt_craft_hint_${discipline.replaceAll('-', '_')}`
    : null;

  return (
    <main id="contendido" className="mx-auto w-full min-w-0 max-w-3xl px-4 pb-24 pt-28 sm:px-6 md:px-12">
      <Link
        href={careerAppHref(host)}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-codiva-primary hover:underline"
      >
        ← {t('career.back_to_list')}
      </Link>
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-codiva-primary">
          {t('career.hunt_eyebrow')}
        </p>
        <h1 className="mt-2 text-balance font-display text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
          {t('career.hunt_title')}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600 sm:text-base">{t('career.hunt_intro')}</p>
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-zinc-600">
          <li>{t('career.hunt_rule_1')}</li>
          <li>{t('career.hunt_rule_2')}</li>
          <li>{t('career.hunt_rule_3')}</li>
          <li>{t('career.hunt_rule_4')}</li>
          <li>{t('career.hunt_rule_5')}</li>
        </ul>
        {craftHintKey ? (
          <p className="mt-4 text-sm leading-relaxed text-zinc-700">{t(craftHintKey)}</p>
        ) : null}
      </header>
      <HuntReportForm defaultUrl={careerBaseUrl()} discipline={discipline} />
    </main>
  );
}
