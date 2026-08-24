import Link from 'next/link';
import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/admin';
import { jobEmploymentLabel, localizedJobPostingCopy, postingAsksDiscipline, publicCareerListUrl } from '@/lib/ops/careers';
import { catalogForPosting } from '@/lib/careers/assessments/engine';
import { careerAppHref } from '@/lib/ops/host';
import { getT } from '@/i18n/locale';
import CodivaBrandText from '@/components/CodivaBrandText';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const t = await getT();
  return {
    title: t('career.doc_title_list'),
    description: t('career.meta_description_list'),
    alternates: { canonical: publicCareerListUrl() },
  };
}

function MetaChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-codiva-primary/15 bg-white/80 px-3 py-1 text-xs font-medium text-zinc-700">
      {children}
    </span>
  );
}

export default async function EmpleosPage() {
  const t = await getT();
  const locale = t.locale;
  const host = (await headers()).get('host');
  const huntHref = careerAppHref(host, '/hallazgos');
  const postings = isSupabaseConfigured()
    ? (
        await createAdminClient()
          .from('ops_job_postings')
          .select('id, slug, title, title_en, location, location_en, employment_type, published_at, assessment_key')
          .eq('status', 'published')
          .order('sort_order', { ascending: true })
          .order('published_at', { ascending: false })
      ).data
    : [];

  const rows = postings ?? [];

  return (
    <main className="mx-auto w-full max-w-3xl px-6 pb-24 pt-28 md:px-12">
      <header className="mb-8 overflow-hidden rounded-2xl border border-codiva-primary/15 bg-gradient-to-br from-codiva-primary/5 via-white to-zinc-50 px-6 py-8 text-center sm:px-10">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-codiva-primary">
          {t('career.eyebrow')}
        </p>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
          {t('career.list_title')}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-zinc-600 sm:text-base">
          {t('career.list_intro')}
        </p>
        <p className="mx-auto mt-3 max-w-xl text-sm text-zinc-600">
          <Link href={huntHref} className="font-medium text-codiva-primary hover:underline">
            {t('career.hunt_cta')}
          </Link>
        </p>
        {rows.length ? (
          <p className="mt-4 text-sm font-medium text-zinc-500">
            {rows.length === 1 ? t('career.open_one') : t('career.open_many', { count: rows.length })}
          </p>
        ) : null}
      </header>

      {!rows.length ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center">
          <h2 className="font-semibold text-zinc-900">{t('career.empty_title')}</h2>
          <p className="mt-2 text-sm text-zinc-500">
            <CodivaBrandText>{t('career.empty_body')}</CodivaBrandText>
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => {
            const copy = localizedJobPostingCopy(row, locale);
            const employment = jobEmploymentLabel(row.employment_type, locale);
            return (
              <li key={row.id}>
                <Link
                  href={careerAppHref(host, `/${row.slug}`)}
                  className="group block rounded-2xl border border-zinc-200 bg-white px-5 py-5 shadow-sm transition hover:border-codiva-primary/40 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-semibold text-zinc-900 transition group-hover:text-codiva-primary">
                        {copy.title}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {employment ? <MetaChip>{employment}</MetaChip> : null}
                        {copy.location ? <MetaChip>{copy.location}</MetaChip> : null}
                        {postingAsksDiscipline(row.slug) ? (
                          <MetaChip>{t('career.assessment_chip_two_parts')}</MetaChip>
                        ) : catalogForPosting(row.assessment_key, row.slug) ? (
                          <MetaChip>{t('career.assessment_chip')}</MetaChip>
                        ) : null}
                      </div>
                    </div>
                    <span className="mt-0.5 text-sm font-medium text-codiva-primary opacity-0 transition group-hover:opacity-100">
                      {t('career.view_role')}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
