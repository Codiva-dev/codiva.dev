import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/admin';
import CareerApplyForm from '@/components/careers/CareerApplyForm';
import CareerPostingBody from '@/components/careers/CareerPostingBody';
import {
  CAREER_DISCIPLINES,
  careerDisciplineLabels,
  isCareerDiscipline,
  jobEmploymentLabel,
  localizedJobPostingCopy,
  parseCareerPostingSections,
  postingAsksDiscipline,
  publicCareerUrl,
} from '@/lib/ops/careers';
import { catalogForPosting } from '@/lib/careers/assessments/engine';
import { careerAppHref, marketingBaseUrl } from '@/lib/ops/host';
import { getT } from '@/i18n/locale';
import { headers } from 'next/headers';

type PageProps = { params: Promise<{ slug: string }>; searchParams: Promise<{ discipline?: string }> };

export const dynamic = 'force-dynamic';

async function loadPublishedPosting(slug: string) {
  if (!isSupabaseConfigured()) return null;
  const { data } = await createAdminClient()
    .from('ops_job_postings')
    .select('id, slug, title, title_en, description, description_en, requirements, requirements_en, location, location_en, employment_type, published_at, assessment_key')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const posting = await loadPublishedPosting(slug);
  const t = await getT();
  if (!posting) {
    return { title: t('career.unavailable') };
  }
  const copy = localizedJobPostingCopy(posting, t.locale);
  return {
    title: copy.title,
    description: t('career.meta_description_detail', { title: copy.title }),
    openGraph: {
      title: `${copy.title} · Codiva.dev`,
      url: publicCareerUrl(posting.slug),
    },
    alternates: { canonical: publicCareerUrl(posting.slug) },
  };
}

function MetaChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-codiva-primary/15 bg-white/80 px-3 py-1 text-xs font-medium text-zinc-700">
      {children}
    </span>
  );
}

export default async function EmpleoDetailPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { discipline: disciplineRaw } = await searchParams;
  const posting = await loadPublishedPosting(slug);
  if (!posting) notFound();
  const t = await getT();
  const copy = localizedJobPostingCopy(posting, t.locale);

  const employment = jobEmploymentLabel(posting.employment_type, t.locale);
  const DISCIPLINE_LABELS = careerDisciplineLabels(t.locale);
  const asksDiscipline = postingAsksDiscipline(posting.slug);
  const initialDiscipline = isCareerDiscipline(disciplineRaw ?? '')
    ? (disciplineRaw as typeof CAREER_DISCIPLINES[number])
    : undefined;

  const host = (await headers()).get('host');
  const catalog = catalogForPosting(posting.assessment_key, posting.slug);
  const assessmentHref = asksDiscipline || catalog ? careerAppHref(host, `/${posting.slug}/prueba`) : undefined;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: copy.title,
    description: [copy.description, copy.requirements].filter(Boolean).join('\n\n'),
    datePosted: posting.published_at,
    hiringOrganization: {
      '@type': 'Organization',
      name: 'Codiva.dev',
      sameAs: marketingBaseUrl(),
    },
    employmentType: posting.employment_type
      ? posting.employment_type.toUpperCase()
      : undefined,
    jobLocationType: /remoto|remote/i.test(copy.location || posting.location || '')
      ? 'TELECOMMUTE'
      : undefined,
    url: publicCareerUrl(posting.slug),
  };

  return (
    <main className="mx-auto w-full min-w-0 max-w-5xl px-4 pb-24 pt-28 sm:px-6 md:px-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Link
        href={careerAppHref(host)}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-codiva-primary hover:underline"
      >
        ← {t('career.back_to_list')}
      </Link>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(300px,360px)] lg:items-start lg:gap-8">
        <article className="min-w-0">
          <header className="mb-6 rounded-2xl border border-codiva-primary/15 bg-gradient-to-br from-codiva-primary/5 via-white to-white px-5 py-6 shadow-sm sm:px-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-codiva-primary">
              {t('career.eyebrow')}
            </p>
            <h1 className="mt-2 break-words font-display text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
              {copy.title}
            </h1>
            <div className="mt-4 flex flex-wrap gap-2">
              {employment ? <MetaChip>{employment}</MetaChip> : null}
              {copy.location ? <MetaChip>{copy.location}</MetaChip> : null}
              {asksDiscipline
                ? CAREER_DISCIPLINES.map((key) => (
                    <MetaChip key={key}>{DISCIPLINE_LABELS[key]}</MetaChip>
                  ))
                : null}
            </div>
            {asksDiscipline ? (
              <p className="mt-4 text-sm leading-relaxed text-zinc-600">{t('career.two_parts_note')}</p>
            ) : null}
          </header>

          <div className="space-y-4">
            {copy.description ? (
              <CareerPostingBody
                sections={parseCareerPostingSections(copy.description)}
                fallbackTitle={t('career.about_role')}
                locale={t.locale}
              />
            ) : null}
            {copy.requirements ? (
              <CareerPostingBody
                sections={parseCareerPostingSections(copy.requirements)}
                fallbackTitle={t('career.requirements')}
                locale={t.locale}
              />
            ) : null}
          </div>
        </article>

        <aside className="mt-8 lg:sticky lg:top-28 lg:mt-0">
          <CareerApplyForm
            jobPostingId={posting.id}
            asksDiscipline={asksDiscipline}
            assessmentRequired={Boolean(catalog) && !asksDiscipline}
            assessmentHref={assessmentHref}
            initialDiscipline={initialDiscipline}
          />
        </aside>
      </div>
    </main>
  );
}
