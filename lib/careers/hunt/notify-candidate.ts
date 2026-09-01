import { sendClientEmail } from '@/lib/ops/email';
import {
  templateCareerHuntPartTwo,
  templateCareerApplyReady,
  templateCareerHuntNudge,
  templateCareerCvNudge,
} from '@/lib/ops/email-templates';
import {
  careerDisciplineLabel,
  publicCareerHuntUrl,
  publicCareerPruebaUrl,
  publicCareerUrl,
} from '@/lib/ops/careers';
import { createAdminClient } from '@/lib/supabase/admin';
import { disciplineFromCatalogKey } from '@/lib/ops/career-disciplines';
import { huntCoversAllCrafts } from './progress';
import { huntRequiredForPosting } from './seeds';

async function postingProcess(jobPostingId: string) {
  const { data } = await createAdminClient()
    .from('ops_job_postings')
    .select('slug, requires_hunt, asks_discipline')
    .eq('id', jobPostingId)
    .maybeSingle();
  return data;
}

function applyHref(slug: string, discipline: string | null): string {
  return discipline
    ? `${publicCareerUrl(slug)}?discipline=${encodeURIComponent(discipline)}`
    : publicCareerUrl(slug);
}

async function huntNotifyContext(input: { catalogKey: string; jobPostingId: string }) {
  const posting = await postingProcess(input.jobPostingId);
  if (!huntRequiredForPosting(posting?.requires_hunt, input.catalogKey)) return null;
  const slug = posting?.slug ? String(posting.slug) : '';
  if (!slug) return null;
  const coverAll = huntCoversAllCrafts({
    asksDiscipline: posting?.asks_discipline,
    catalogKey: input.catalogKey,
  });
  const discipline = coverAll ? null : disciplineFromCatalogKey(input.catalogKey);
  return { slug, discipline, coverAll };
}

export async function notifyCandidateHuntPartTwo(input: {
  email: string;
  name: string;
  catalogKey: string;
  jobPostingId: string;
}): Promise<void> {
  const ctx = await huntNotifyContext(input);
  if (!ctx) return;
  const craft = careerDisciplineLabel(ctx.discipline) || 'Tester';
  await sendClientEmail({
    to: input.email,
    subject: ctx.coverAll ? 'Siguiente: un hallazgo de cada oficio' : 'Siguiente: un hallazgo de tu oficio',
    html: templateCareerHuntPartTwo({
      name: input.name,
      craft,
      pruebaHref: publicCareerPruebaUrl(ctx.slug, ctx.discipline),
      huntHref: publicCareerHuntUrl(ctx.discipline),
      coverAll: ctx.coverAll,
    }),
  }).catch(() => {});
}

export async function notifyCandidateApplyReady(input: {
  email: string;
  name: string;
  catalogKey: string;
  jobPostingId: string;
}): Promise<void> {
  const ctx = await huntNotifyContext(input);
  if (!ctx) return;
  await sendClientEmail({
    to: input.email,
    subject: 'Ya puedes postular a Codiva.dev',
    html: templateCareerApplyReady({
      name: input.name,
      applyHref: applyHref(ctx.slug, ctx.discipline),
      coverAll: ctx.coverAll,
    }),
  }).catch(() => {});
}

export async function notifyCandidateHuntNudge(input: {
  email: string;
  name: string;
  catalogKey: string;
  jobPostingId: string;
}): Promise<void> {
  const ctx = await huntNotifyContext(input);
  if (!ctx) return;
  await sendClientEmail({
    to: input.email,
    subject: 'Cuando quieras, sigue con el hallazgo',
    html: templateCareerHuntNudge({
      name: input.name,
      pruebaHref: publicCareerPruebaUrl(ctx.slug, ctx.discipline),
      huntHref: publicCareerHuntUrl(ctx.discipline),
      coverAll: ctx.coverAll,
    }),
  }).catch(() => {});
}

export async function notifyCandidateCvNudge(input: {
  email: string;
  name: string;
  catalogKey: string;
  jobPostingId: string;
}): Promise<void> {
  const ctx = await huntNotifyContext(input);
  if (!ctx) return;
  await sendClientEmail({
    to: input.email,
    subject: 'Falta tu CV para postular',
    html: templateCareerCvNudge({
      name: input.name,
      applyHref: applyHref(ctx.slug, ctx.discipline),
      coverAll: ctx.coverAll,
    }),
  }).catch(() => {});
}
