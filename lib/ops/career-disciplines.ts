import { tSync } from '@/i18n/translate';
import { DEFAULT_LOCALE, type Locale } from '@/i18n/config';

export const CAREER_DISCIPLINES = [
  'frontend',
  'backend',
  'fullstack',
  'ux-ui',
  'qa',
  'security',
  'other',
] as const;

export type CareerDiscipline = (typeof CAREER_DISCIPLINES)[number];

/** Oficios que hay que cubrir en la cacería integral. «Otro» no cuenta. */
export const HUNT_COVER_CRAFTS = CAREER_DISCIPLINES.filter(
  (craft): craft is Exclude<CareerDiscipline, 'other'> => craft !== 'other'
);

export type HuntCoverCraft = (typeof HUNT_COVER_CRAFTS)[number];

export const CAREER_DISCIPLINE_LABELS: Record<CareerDiscipline, string> = {
  frontend: 'Tester frontend',
  backend: 'Tester backend',
  fullstack: 'Tester full stack',
  'ux-ui': 'Tester UX / UI',
  qa: 'Tester QA',
  security: 'Tester de seguridad',
  other: 'Tester (otro oficio)',
};

export function careerDisciplineLabel(
  discipline: string | null | undefined,
  locale: Locale = DEFAULT_LOCALE
): string | null {
  if (!discipline || !isCareerDiscipline(discipline)) return null;
  return tSync(locale, `career.tester.${discipline}`);
}

export function careerDisciplineLabels(locale: Locale = DEFAULT_LOCALE): Record<CareerDiscipline, string> {
  return Object.fromEntries(
    CAREER_DISCIPLINES.map((key) => [key, tSync(locale, `career.tester.${key}`)])
  ) as Record<CareerDiscipline, string>;
}

/** Rol visible en Ops y correos: oficio de tester si existe, si no el título de la vacante. */
export function applicationRoleLabel(input: {
  postingTitle?: string | null;
  discipline?: string | null;
  locale?: Locale;
}): string {
  const craft = careerDisciplineLabel(input.discipline, input.locale);
  if (craft) return craft;
  return String(input.postingTitle || '').trim();
}

export const CAREER_DISCIPLINE_CATALOG: Record<CareerDiscipline, string> = {
  frontend: 'tester-frontend',
  backend: 'tester-backend',
  fullstack: 'tester-fullstack',
  'ux-ui': 'tester-ux-ui',
  qa: 'tester-qa',
  security: 'tester-security',
  other: 'tester-general',
};

export function isCareerDiscipline(value: string): value is CareerDiscipline {
  return (CAREER_DISCIPLINES as readonly string[]).includes(value);
}

export function disciplineFromCatalogKey(key: string | null | undefined): CareerDiscipline | null {
  const catalogKey = String(key || '').trim();
  const found = (Object.entries(CAREER_DISCIPLINE_CATALOG) as [CareerDiscipline, string][]).find(
    ([, value]) => value === catalogKey
  );
  return found?.[0] ?? null;
}

export const JOB_HIRE_OPS_ROLES = ['admin', 'pm', 'dev'] as const;
export type JobHireOpsRole = (typeof JOB_HIRE_OPS_ROLES)[number];

export function isJobHireOpsRole(value: string): value is JobHireOpsRole {
  return (JOB_HIRE_OPS_ROLES as readonly string[]).includes(value);
}

export type JobPostingProcessFields = {
  slug?: string | null;
  assessment_key?: string | null;
  asks_discipline?: boolean | null;
  requires_hunt?: boolean | null;
  careers_pipeline?: boolean | null;
  hire_ops_role?: string | null;
};

function postingSlugOf(
  posting: JobPostingProcessFields | string | null | undefined
): string {
  if (typeof posting === 'string' || posting == null) return String(posting || '').trim().toLowerCase();
  return String(posting.slug || '').trim().toLowerCase();
}

/** Oficio en la postulación: solo el flag de la vacante. */
export function postingAsksDiscipline(
  posting: JobPostingProcessFields | string | null | undefined
): boolean {
  if (posting && typeof posting === 'object' && typeof posting.asks_discipline === 'boolean') {
    return posting.asks_discipline;
  }
  return false;
}

export const TESTER_JOB_SLUG = 'tester';
export const TESTER_JOB_SLUGS = ['tester-qa', 'tester'] as const;

export function isTesterJobSlug(slug: string | null | undefined): boolean {
  const value = String(slug || '').trim().toLowerCase();
  return value === 'tester' || value === 'tester-qa' || value.startsWith('tester-');
}

export function isTesterCatalogKey(key: string | null | undefined): boolean {
  return String(key || '').trim().toLowerCase().startsWith('tester-');
}

export function isCareersPipelinePosting(
  posting: JobPostingProcessFields | string | null | undefined
): boolean {
  if (posting && typeof posting === 'object' && typeof posting.careers_pipeline === 'boolean') {
    return posting.careers_pipeline;
  }
  return isTesterJobSlug(postingSlugOf(posting));
}

export function postingHireOpsRole(
  posting: JobPostingProcessFields | string | null | undefined
): JobHireOpsRole {
  if (posting && typeof posting === 'object' && posting.hire_ops_role && isJobHireOpsRole(posting.hire_ops_role)) {
    return posting.hire_ops_role;
  }
  return postingSlugOf(posting) === 'project-manager' ? 'pm' : 'dev';
}

export function isTesterPipelineItem(input: {
  catalogKey?: string | null;
  postingSlug?: string | null;
  discipline?: string | null;
  careersPipeline?: boolean | null;
}): boolean {
  if (typeof input.careersPipeline === 'boolean') return input.careersPipeline;
  return (
    isTesterCatalogKey(input.catalogKey) ||
    isTesterJobSlug(input.postingSlug) ||
    Boolean(input.discipline && isCareerDiscipline(input.discipline))
  );
}
