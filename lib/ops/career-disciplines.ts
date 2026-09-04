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

/** Tipos de hallazgo plantados en la cacería. Los oficios se agrupan en estos tres. */
export const HUNT_FINDING_TYPES = ['functional', 'api', 'security'] as const;
export type HuntFindingType = (typeof HUNT_FINDING_TYPES)[number];

export const DISCIPLINE_FINDING_TYPE: Record<Exclude<CareerDiscipline, 'other'>, HuntFindingType> = {
  frontend: 'functional',
  'ux-ui': 'functional',
  qa: 'functional',
  backend: 'api',
  fullstack: 'api',
  security: 'security',
};

export const HUNT_FINDING_TYPE_LABELS: Record<HuntFindingType, string> = {
  functional: 'Prueba funcional',
  api: 'Prueba de API',
  security: 'Prueba de seguridad',
};

/** Tipos que hay que cubrir en la cacería integral. */
export const HUNT_COVER_CRAFTS = HUNT_FINDING_TYPES;
export type HuntCoverCraft = HuntFindingType;

export function isHuntFindingType(value: string): value is HuntFindingType {
  return (HUNT_FINDING_TYPES as readonly string[]).includes(value);
}

export function huntFindingTypeForDiscipline(
  discipline: string | null | undefined
): HuntFindingType | null {
  if (!discipline || !isCareerDiscipline(discipline) || discipline === 'other') return null;
  return DISCIPLINE_FINDING_TYPE[discipline];
}

export function huntFindingTypeLabel(
  type: string | null | undefined,
  locale: Locale = DEFAULT_LOCALE
): string | null {
  if (!type || !isHuntFindingType(type)) return null;
  return tSync(locale, `career.hunt_type.${type}`);
}

export function huntFindingTypeLabels(locale: Locale = DEFAULT_LOCALE): Record<HuntFindingType, string> {
  return Object.fromEntries(
    HUNT_FINDING_TYPES.map((key) => [key, tSync(locale, `career.hunt_type.${key}`)])
  ) as Record<HuntFindingType, string>;
}

export function huntFindingHintKey(discipline?: string | null, coverAll = false): string {
  const type = huntFindingTypeForDiscipline(discipline);
  if (type) return `career.hunt_finding_hint_${type}`;
  if (coverAll) return 'career.hunt_craft_hint_all';
  return 'career.hunt_craft_hint_other';
}

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
  hire_monthly_compensation?: number | string | null;
  hire_currency?: string | null;
  hire_work_modality?: string | null;
  interview_plan?: string[] | null;
  requirements?: string | null;
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
  return 'dev';
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
