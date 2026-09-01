import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/admin';
import CareerAssessment from '@/components/careers/CareerAssessment';
import { catalogForApplication, catalogForPosting } from '@/lib/careers/assessments/engine';
import {
  CAREER_DISCIPLINES,
  careerDisciplineLabels,
  isCareerDiscipline,
  localizedJobPostingCopy,
  postingAsksDiscipline,
  type CareerDiscipline,
} from '@/lib/ops/careers';
import { careerAppHref } from '@/lib/ops/host';
import { getT } from '@/i18n/locale';
import { headers } from 'next/headers';

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ discipline?: string }>;
};

export const dynamic = 'force-dynamic';

async function loadPublishedPosting(slug: string) {
  if (!isSupabaseConfigured()) return null;
  const { data } = await createAdminClient()
    .from('ops_job_postings')
    .select('id, slug, title, title_en, status, assessment_key, asks_discipline, requires_hunt')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const posting = await loadPublishedPosting(slug);
  const t = await getT();
  if (!posting) return { title: t('career.assessment_unavailable') };
  const copy = localizedJobPostingCopy(posting, t.locale);
  return {
    title: t('career.assessment_meta_title', { title: copy.title }),
    description: t('career.assessment_meta_description', { title: copy.title }),
    robots: { index: false, follow: false },
  };
}

export default async function EmpleoPruebaPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { discipline: disciplineRaw } = await searchParams;
  const posting = await loadPublishedPosting(slug);
  if (!posting) notFound();
  const t = await getT();
  const DISCIPLINE_LABELS = careerDisciplineLabels(t.locale);
  const copy = localizedJobPostingCopy(posting, t.locale);

  const asksDiscipline = postingAsksDiscipline(posting);
  const discipline: CareerDiscipline | null = isCareerDiscipline(disciplineRaw ?? '')
    ? (disciplineRaw as CareerDiscipline)
    : null;
  const host = (await headers()).get('host');
  const postingHref = careerAppHref(host, `/${posting.slug}`);
  const listHref = careerAppHref(host);
  const pruebaPath = careerAppHref(host, `/${posting.slug}/prueba`);

  if (asksDiscipline && !discipline) {
    return (
      <main className="mx-auto w-full max-w-2xl px-6 pb-24 pt-28 md:px-12">
        <Link
          href={postingHref}
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-codiva-primary hover:underline"
        >
          ← {copy.title}
        </Link>
        <header className="mb-6">
          <h1 className="font-display text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            {t('career.assessment_pick_title')}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600">
            {t('career.assessment_pick_body')}
          </p>
        </header>
        <ul className="space-y-2">
          {CAREER_DISCIPLINES.map((key) => (
            <li key={key}>
              <Link
                href={`${pruebaPath}?discipline=${key}`}
                className="block rounded-2xl border border-zinc-200 bg-white px-5 py-4 font-medium text-zinc-900 transition hover:border-codiva-primary/40"
              >
                {DISCIPLINE_LABELS[key]}
              </Link>
            </li>
          ))}
        </ul>
      </main>
    );
  }

  const catalog = asksDiscipline
    ? catalogForApplication(posting.assessment_key, posting.slug, discipline, true)
    : catalogForPosting(posting.assessment_key, posting.slug);
  if (!catalog) notFound();

  const applyHref = discipline ? `${postingHref}?discipline=${discipline}` : postingHref;
  const heading = discipline ? DISCIPLINE_LABELS[discipline] : copy.title;

  return (
    <main className="mx-auto w-full max-w-2xl px-6 pb-24 pt-28 md:px-12">
      <Link
        href={postingHref}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-codiva-primary hover:underline"
      >
        ← {copy.title}
      </Link>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
          {catalog.title}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600">{catalog.intro}</p>
      </header>
      <CareerAssessment
        jobPostingId={posting.id}
        jobSlug={posting.slug}
        jobTitle={heading}
        applyHref={applyHref}
        listHref={listHref}
        discipline={discipline || undefined}
        huntRequired={Boolean(posting.requires_hunt)}
      />
    </main>
  );
}
