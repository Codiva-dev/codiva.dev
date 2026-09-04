import { createHash, randomBytes, randomUUID } from 'crypto';
import { careerBaseUrl } from '@/lib/ops/host';
import { createAdminClient } from '@/lib/supabase/admin';
import { tSync } from '@/i18n/translate';
import { DEFAULT_LOCALE, type Locale } from '@/i18n/config';

export const CAREER_CV_BUCKET = 'job-application-cvs';
export const CAREER_MAX_CV_BYTES = 10 * 1024 * 1024;
export const CAREER_DEDUPE_HOURS = Number(process.env.CAREER_APPLY_DEDUPE_HOURS || 24);
export const CAREER_SIGNED_UPLOAD_EXPIRES_SEC = 120;

export const JOB_POSTING_STATUSES = ['draft', 'published', 'closed'] as const;
export type JobPostingStatus = (typeof JOB_POSTING_STATUSES)[number];

export const JOB_EMPLOYMENT_TYPES = ['full_time', 'part_time', 'contract', 'internship'] as const;
export type JobEmploymentType = (typeof JOB_EMPLOYMENT_TYPES)[number];

export const JOB_APPLICATION_STATUSES = ['new', 'reviewed', 'interview', 'hired', 'rejected'] as const;
export type JobApplicationStatus = (typeof JOB_APPLICATION_STATUSES)[number];

export const JOB_INTERVIEW_KINDS = ['screening', 'technical', 'culture', 'final', 'other'] as const;
export type JobInterviewKind = (typeof JOB_INTERVIEW_KINDS)[number];

export const JOB_HIRE_WORK_MODALITIES = ['remote', 'hybrid', 'onsite'] as const;
export type JobHireWorkModality = (typeof JOB_HIRE_WORK_MODALITIES)[number];

export const JOB_INTERVIEW_ROUND_STATUSES = ['planned', 'done', 'skipped'] as const;
export type JobInterviewRoundStatus = (typeof JOB_INTERVIEW_ROUND_STATUSES)[number];

export const JOB_INTERVIEW_OUTCOMES = ['advance', 'hold', 'reject'] as const;
export type JobInterviewOutcome = (typeof JOB_INTERVIEW_OUTCOMES)[number];

export function isJobInterviewKind(value: string): value is JobInterviewKind {
  return (JOB_INTERVIEW_KINDS as readonly string[]).includes(value);
}

export function isJobHireWorkModality(value: string): value is JobHireWorkModality {
  return (JOB_HIRE_WORK_MODALITIES as readonly string[]).includes(value);
}

export function parseInterviewPlan(values: unknown): JobInterviewKind[] {
  const raw = Array.isArray(values) ? values : values == null || values === '' ? [] : [values];
  const out: JobInterviewKind[] = [];
  const seen = new Set<string>();
  for (const value of raw) {
    const kind = String(value || '').trim();
    if (!isJobInterviewKind(kind) || seen.has(kind)) continue;
    seen.add(kind);
    out.push(kind);
  }
  return out;
}

export function parseHireCompensation(value: unknown): number | null {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount * 100) / 100;
}

export function parseHireCurrency(value: unknown): string {
  const raw = String(value ?? '').trim().toUpperCase();
  return raw.length >= 3 && raw.length <= 8 ? raw : 'USD';
}

export function isJobInterviewRoundStatus(value: string): value is JobInterviewRoundStatus {
  return (JOB_INTERVIEW_ROUND_STATUSES as readonly string[]).includes(value);
}

export function isJobInterviewOutcome(value: string): value is JobInterviewOutcome {
  return (JOB_INTERVIEW_OUTCOMES as readonly string[]).includes(value);
}

export function isDiscardedApplicationStatus(status: string) {
  return status === 'rejected';
}

/** Outside the active bolsa queue (discarded board or already hired). */
export function isClosedApplicationStatus(status: string) {
  return status === 'rejected' || status === 'hired';
}

/** Offer already in hire flow for that vacancy (not a blanket hide by personal email). */
export function isSettledPersonnelOfferStatus(status: string) {
  return status === 'sent' || status === 'accepted';
}

export const JOB_POSTING_STATUS_LABELS: Record<JobPostingStatus, string> = {
  draft: 'Borrador',
  published: 'Publicada',
  closed: 'Cerrada',
};

export const JOB_EMPLOYMENT_LABELS: Record<JobEmploymentType, string> = {
  full_time: 'Tiempo completo',
  part_time: 'Medio tiempo',
  contract: 'Por proyecto',
  internship: 'Prácticas',
};

export function jobEmploymentLabel(
  type: string | null | undefined,
  locale: Locale = DEFAULT_LOCALE
): string | null {
  if (!type || !isJobEmploymentType(type)) return null;
  return tSync(locale, `career.employment.${type}`);
}

export function jobPostingStatusLabel(
  status: string | null | undefined,
  locale: Locale = DEFAULT_LOCALE
): string {
  if (!status || !isJobPostingStatus(status)) return status || '';
  return tSync(locale, `career.postingStatus.${status}`);
}

export function jobApplicationStatusLabel(
  status: string | null | undefined,
  locale: Locale = DEFAULT_LOCALE
): string {
  if (!status || !isJobApplicationStatus(status)) return status || '';
  return tSync(locale, `career.applicationStatus.${status}`);
}

export function careerOpsLabels(locale: Locale = DEFAULT_LOCALE) {
  return {
    JOB_POSTING_STATUS_LABELS: Object.fromEntries(
      JOB_POSTING_STATUSES.map((key) => [key, tSync(locale, `career.postingStatus.${key}`)])
    ) as Record<JobPostingStatus, string>,
    JOB_EMPLOYMENT_LABELS: Object.fromEntries(
      JOB_EMPLOYMENT_TYPES.map((key) => [key, tSync(locale, `career.employment.${key}`)])
    ) as Record<JobEmploymentType, string>,
    JOB_APPLICATION_STATUS_LABELS: Object.fromEntries(
      JOB_APPLICATION_STATUSES.map((key) => [key, tSync(locale, `career.applicationStatus.${key}`)])
    ) as Record<JobApplicationStatus, string>,
  };
}

export const JOB_APPLICATION_STATUS_LABELS: Record<JobApplicationStatus, string> = {
  new: 'Nueva',
  reviewed: 'Revisada',
  interview: 'Entrevista',
  hired: 'Contratada',
  rejected: 'Descartada',
};

export function isJobPostingStatus(value: string): value is JobPostingStatus {
  return (JOB_POSTING_STATUSES as readonly string[]).includes(value);
}

export function isJobEmploymentType(value: string): value is JobEmploymentType {
  return (JOB_EMPLOYMENT_TYPES as readonly string[]).includes(value);
}

export function isJobApplicationStatus(value: string): value is JobApplicationStatus {
  return (JOB_APPLICATION_STATUSES as readonly string[]).includes(value);
}

export function publicCareerListUrl(): string {
  return careerBaseUrl();
}

export function publicCareerUrl(slug: string): string {
  return `${careerBaseUrl()}/${slug}`;
}

export function publicCareerPruebaUrl(slug: string, discipline?: string | null): string {
  const base = `${careerBaseUrl()}/${slug}/prueba`;
  return discipline ? `${base}?discipline=${encodeURIComponent(discipline)}` : base;
}

export function publicCareerHuntUrl(discipline?: string | null): string {
  const base = `${careerBaseUrl()}/hallazgos`;
  return discipline ? `${base}?discipline=${encodeURIComponent(discipline)}` : base;
}

export function normalizeJobSlug(input: string): string {
  const slug = String(input || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
  return slug.length >= 2 ? slug : 'vacante';
}

export function uniqueJobSlugCandidate(base: string): string {
  const root = normalizeJobSlug(base);
  const suffix = randomBytes(3).toString('hex');
  return `${root}-${suffix}`.slice(0, 120);
}

export function sanitizePdfFilename(name: string): string {
  const base = String(name || 'cv.pdf').trim().toLowerCase();
  const cleaned = base.replace(/[^a-z0-9._-]+/g, '_').slice(0, 120);
  return cleaned.endsWith('.pdf') ? cleaned : `${cleaned || 'cv'}.pdf`;
}

export function buildCvStoragePath(jobPostingId: string, originalFilename: string): string {
  const safe = sanitizePdfFilename(originalFilename);
  return `applications/${jobPostingId}/${randomUUID()}_${safe}`;
}

export function isCvPathForJob(jobPostingId: string, path: string): boolean {
  const p = String(path || '').trim();
  const jid = String(jobPostingId || '').trim().toLowerCase();
  if (!jid || !/^[0-9a-f-]{36}$/i.test(jid)) return false;
  const re = new RegExp(
    `^applications/${jid}/[0-9a-f-]{8}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{12}_.+\\.pdf$`,
    'i'
  );
  return re.test(p);
}

export function isPdfBuffer(buffer: Buffer): boolean {
  return buffer.length >= 5 && buffer.subarray(0, 5).toString('utf8') === '%PDF-';
}

export function hashCareerIp(ip: string | null | undefined): string | null {
  const pepper =
    String(process.env.CAREER_IP_PEPPER || '').trim() ||
    String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!pepper || !ip) return null;
  return createHash('sha256').update(`${pepper}:${ip}`).digest('hex');
}

export function safeCareerStr(value: unknown, max: number): string {
  return String(value ?? '')
    .trim()
    .slice(0, max);
}

export { consumeRateLimit as careerRateLimitConsume } from '@/lib/rate-limit';

export const CAREER_RL_SIGN_UPLOAD = {
  windowMs: 60 * 60 * 1000,
  max: Number(process.env.CAREER_RL_SIGN_UPLOAD_PER_IP_HOUR || 40),
};

export const CAREER_RL_APPLY = {
  windowMs: 60 * 60 * 1000,
  max: Number(process.env.CAREER_RL_APPLY_PER_IP_HOUR || 15),
};

export const CAREER_RL_APPLY_EMAIL = {
  windowMs: 24 * 60 * 60 * 1000,
  max: Number(process.env.CAREER_RL_APPLY_PER_EMAIL_DAY || 8),
};

export const CAREER_RL_ASSESSMENT = {
  windowMs: 60 * 60 * 1000,
  max: Number(process.env.CAREER_RL_ASSESSMENT_PER_IP_HOUR || 40),
};

export const CAREER_RL_HUNT_BEACON = {
  windowMs: 60 * 60 * 1000,
  max: Number(process.env.CAREER_RL_HUNT_BEACON_PER_IP_HOUR || 180),
};

const BULLET_LINE_RE = /^[\u2022\u2023\u25E6\u2043\u2219•\-*]\s+(.*)$/;
export {
  CAREER_DISCIPLINES,
  CAREER_DISCIPLINE_LABELS,
  CAREER_DISCIPLINE_CATALOG,
  JOB_HIRE_OPS_ROLES,
  TESTER_JOB_SLUG,
  TESTER_JOB_SLUGS,
  isCareerDiscipline,
  isHuntFindingType,
  isJobHireOpsRole,
  isCareersPipelinePosting,
  isTesterCatalogKey,
  isTesterJobSlug,
  isTesterPipelineItem,
  postingAsksDiscipline,
  postingHireOpsRole,
  disciplineFromCatalogKey,
  careerDisciplineLabel,
  careerDisciplineLabels,
  huntFindingHintKey,
  huntFindingTypeForDiscipline,
  huntFindingTypeLabel,
  huntFindingTypeLabels,
  applicationRoleLabel,
  type CareerDiscipline,
  type HuntFindingType,
  type JobHireOpsRole,
  type JobPostingProcessFields,
} from '@/lib/ops/career-disciplines';

const SECTION_TITLES = new Set(
  [
    'descripción',
    'description',
    'responsabilidades',
    'responsibilities',
    'sobre el rol',
    'sobre el puesto',
    'about the role',
    'perfiles que buscamos',
    'profiles we look for',
    'condiciones',
    'conditions',
    'perfil',
    'profile',
    'requisitos',
    'requirements',
    'deseable',
    'nice to have',
  ].map((s) => s.toLowerCase())
);

const SECTION_TITLE_KEYS: Record<string, string> = {
  descripción: 'career.section.description',
  description: 'career.section.description',
  responsabilidades: 'career.section.responsibilities',
  responsibilities: 'career.section.responsibilities',
  'sobre el rol': 'career.about_role',
  'sobre el puesto': 'career.about_role',
  'about the role': 'career.about_role',
  'perfiles que buscamos': 'career.section.profiles',
  'profiles we look for': 'career.section.profiles',
  condiciones: 'career.section.conditions',
  conditions: 'career.section.conditions',
  perfil: 'career.section.profile',
  profile: 'career.section.profile',
  requisitos: 'career.requirements',
  requirements: 'career.requirements',
  deseable: 'career.section.nice_to_have',
  'nice to have': 'career.section.nice_to_have',
};

export function careerSectionTitle(title: string, locale: Locale = DEFAULT_LOCALE): string {
  const key = SECTION_TITLE_KEYS[title.trim().toLowerCase()];
  return key ? tSync(locale, key) : title;
}

export type JobPostingCopyFields = {
  title: string;
  description?: string | null;
  requirements?: string | null;
  location?: string | null;
  title_en?: string | null;
  description_en?: string | null;
  requirements_en?: string | null;
  location_en?: string | null;
};

function pickLocalized(en: string | null | undefined, es: string | null | undefined, locale: Locale): string {
  const english = String(en || '').trim();
  const spanish = String(es || '').trim();
  if (locale === 'en' && english) return english;
  return spanish;
}

function localizeKnownLocation(location: string, locale: Locale): string {
  if (locale !== 'en' || !location) return location;
  return location
    .replace(/\bRemoto\b/gi, 'Remote')
    .replace(/\bHíbrido\b/gi, 'Hybrid')
    .replace(/\bPresencial\b/gi, 'On-site')
    .replace(/\bMéxico\b/gi, 'Mexico')
    .replace(/\bMexico\b/gi, 'Mexico');
}

export function localizedJobPostingCopy(row: JobPostingCopyFields, locale: Locale = DEFAULT_LOCALE) {
  const location = pickLocalized(row.location_en, row.location, locale);
  return {
    title: pickLocalized(row.title_en, row.title, locale) || row.title,
    description: pickLocalized(row.description_en, row.description, locale),
    requirements: pickLocalized(row.requirements_en, row.requirements, locale),
    location: location ? localizeKnownLocation(location, locale) : '',
  };
}

export type CareerBodyBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] };

export type CareerPostingSection = {
  title: string;
  blocks: CareerBodyBlock[];
};

function formatSectionBody(body: string): CareerBodyBlock[] {
  const lines = String(body ?? '').split('\n');
  const blocks: CareerBodyBlock[] = [];
  let paragraphBuf: string[] = [];
  let listBuf: string[] = [];

  const flushParagraph = () => {
    const text = paragraphBuf.join('\n').trim();
    if (text) blocks.push({ type: 'paragraph', text });
    paragraphBuf = [];
  };
  const flushList = () => {
    if (listBuf.length) blocks.push({ type: 'list', items: [...listBuf] });
    listBuf = [];
  };

  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed) {
      flushList();
      flushParagraph();
      continue;
    }
    const bullet = trimmed.match(BULLET_LINE_RE);
    if (bullet) {
      flushParagraph();
      listBuf.push(bullet[1].trim());
      continue;
    }
    flushList();
    paragraphBuf.push(trimmed);
  }
  flushList();
  flushParagraph();
  return blocks;
}

export function parseCareerPostingSections(text: string | null | undefined): CareerPostingSection[] {
  const raw = String(text ?? '')
    .replace(/\r\n/g, '\n')
    .trim();
  if (!raw) return [];

  const lines = raw.split('\n');
  const sections: { title: string; lines: string[] }[] = [];
  let current = { title: '', lines: [] as string[] };

  const pushCurrent = () => {
    const body = current.lines.join('\n').trim();
    if (current.title || body) sections.push({ title: current.title.trim(), lines: [...current.lines] });
    current = { title: '', lines: [] };
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const header = trimmed.match(/^(.+):\s*$/);
    if (header && SECTION_TITLES.has(header[1].trim().toLowerCase())) {
      pushCurrent();
      current.title = header[1].trim();
      continue;
    }
    current.lines.push(line);
  }
  pushCurrent();

  return sections
    .map((section) => ({
      title: section.title,
      blocks: formatSectionBody(section.lines.join('\n')),
    }))
    .filter((section) => section.title || section.blocks.length);
}

export async function assertCareerCvObjectExists(storagePath: string): Promise<boolean> {
  const admin = createAdminClient();
  const parts = String(storagePath || '')
    .split('/')
    .filter(Boolean);
  if (parts.length < 2) return false;
  const fileName = parts.pop();
  const dir = parts.join('/');
  const { data, error } = await admin.storage.from(CAREER_CV_BUCKET).list(dir, { limit: 100 });
  if (error || !Array.isArray(data) || !fileName) return false;
  return data.some((f) => f.name === fileName);
}
