import { escapeHtml } from '@/utils/escapeHtml';
import { BRAND_EMAIL, brandWordmarkHtml } from '@/lib/brand';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAssessmentCatalog } from '@/lib/careers/assessments/catalog';
import { parseAnswers } from '@/lib/careers/assessments/server';
import { reviewRowsForAttempt, scoreAnswers } from '@/lib/careers/assessments/engine';
import { matchedSeedCountsForDiscipline } from '@/lib/careers/hunt/match';
import {
  huntConsiderationLabel,
  huntDifficultyLabel,
  scoreHuntReports,
  type HuntConsideration,
  type HuntScore,
} from '@/lib/careers/hunt/score';
import { splitHuntReports } from '@/lib/careers/hunt/review';
import {
  buildHuntTrailSteps,
  huntTrailRoute,
  summarizeHuntTrail,
  type HuntPageKind,
  type HuntTrailEvent,
  type HuntTrailQuality,
  type HuntTrailReport,
  type HuntTrailRouteStop,
} from '@/lib/careers/hunt/trail';
import { huntSeedById } from '@/lib/careers/hunt/seeds';
import {
  CAREER_DISCIPLINE_LABELS,
  disciplineFromCatalogKey,
  type CareerDiscipline,
} from '@/lib/ops/career-disciplines';
import { isClosedApplicationStatus, jobApplicationStatusLabel } from '@/lib/ops/careers';
import {
  careerEmailKey,
  classifyRecruitingStage,
  isCandidateReadyForCv,
  recruitingStageLabel,
  settledOfferEmailsFrom,
  type RecruitingStage,
} from '@/lib/careers/recruiting-stage';

const BRAND = BRAND_EMAIL;
const FONT_BODY = `'Inter', system-ui, -apple-system, Segoe UI, Arial, sans-serif`;
const FONT_DISPLAY = `'Plus Jakarta Sans', Inter, system-ui, sans-serif`;

export type RecruitingFinding = {
  title: string;
  pageUrl: string;
  description: string;
  expected: string | null;
  counts: boolean;
  difficultyLabel: string | null;
  evidenceCount: number;
  createdAt: string;
  reviewDiscarded: boolean;
};

export type RecruitingInterviewComment = {
  body: string;
  author: string | null;
  createdAt: string;
};

export type RecruitingInterviewRound = {
  title: string;
  kindLabel: string;
  status: string;
  statusLabel: string;
  outcomeLabel: string | null;
  interviewer: string | null;
  conductedAt: string | null;
  comments: RecruitingInterviewComment[];
  reports: { filename: string; notes: string | null }[];
};

function toRecruitingFinding(
  row: {
    title: string;
    page_url: string;
    description: string | null;
    expected: string | null;
    matched_seed_id: string | null;
    evidence_paths: unknown;
    created_at: string;
    review_status?: string | null;
  },
  discipline: CareerDiscipline | null
): RecruitingFinding {
  const discarded = row.review_status === 'discarded';
  const seed = row.matched_seed_id ? huntSeedById(row.matched_seed_id) : null;
  const counts =
    !discarded && (discipline ? matchedSeedCountsForDiscipline(row.matched_seed_id, discipline) : Boolean(seed));
  return {
    title: row.title,
    pageUrl: row.page_url,
    description: String(row.description || '').slice(0, 1400),
    expected: row.expected,
    counts,
    difficultyLabel: counts && seed ? huntDifficultyLabel(seed.difficulty, 'es') : null,
    evidenceCount: Array.isArray(row.evidence_paths) ? row.evidence_paths.length : 0,
    createdAt: row.created_at,
    reviewDiscarded: discarded,
  };
}

export type RecruitingDossier = {
  attemptId: string;
  fullName: string;
  email: string;
  vacancy: string;
  craft: string | null;
  status: string;
  stage: RecruitingStage;
  stageLabel: string;
  passed: boolean | null;
  scorePct: number | null;
  scoreCorrect: number | null;
  scoreTotal: number | null;
  attemptNumber: number;
  durationLabel: string;
  blurCount: number;
  startedAt: string;
  completedAt: string | null;
  applied: boolean;
  applicationStatusLabel: string | null;
  interviewLabel: string | null;
  interviews: RecruitingInterviewRound[];
  appliedAt: string | null;
  consideration: HuntConsideration;
  considerationLabel: string;
  craftHits: number;
  findingsTotal: number;
  difficultyMix: string;
  competencies: { name: string; ok: boolean }[];
  findings: RecruitingFinding[];
  trail: HuntTrailQuality;
  trailRoute: string;
};

export type RecruitingPipelineRow = {
  attemptId: string | null;
  applicationId: string | null;
  fullName: string;
  email: string;
  vacancy: string;
  craft: string | null;
  stage: RecruitingStage;
  passed: boolean | null;
  scorePct: number | null;
  consideration: HuntConsideration;
  considerationLabel: string;
  craftHits: number;
  findingsTotal: number;
  difficultyMix: string;
  trailLabel: string;
  browsedSite: boolean;
  applied: boolean;
  applicationStatusLabel: string | null;
  interviewLabel: string | null;
  interviews: RecruitingInterviewRound[];
  completedAt: string | null;
  startedAt: string | null;
  appliedAt: string | null;
};

export type RecruitingPipelinePack = {
  vacancy: string;
  ready: RecruitingPipelineRow[];
  applied: RecruitingPipelineRow[];
  test: RecruitingPipelineRow[];
  hired: RecruitingPipelineRow[];
  discarded: RecruitingPipelineRow[];
};

function formatWhen(value: string | null | undefined): string {
  if (!value) return '-';
  return new Date(value).toLocaleString('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatDuration(ms: number | null | undefined): string {
  if (!ms || ms < 0) return '-';
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m} min ${s}s` : `${s}s`;
}

function slugName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'candidato';
}

export function recruitingReportFilename(kind: 'candidato' | 'pipeline', name: string, ext: 'html' | 'pdf'): string {
  const day = new Date().toISOString().slice(0, 10);
  return `codiva-${kind}-${slugName(name)}-${day}.${ext}`;
}

function considerationRank(value: HuntConsideration) {
  if (value === 'strong') return 3;
  if (value === 'solid') return 2;
  if (value === 'minimum') return 1;
  return 0;
}

function difficultyMixLabel(score: HuntScore): string {
  const parts: string[] = [];
  if (score.byDifficulty.easy) parts.push(`${score.byDifficulty.easy} fácil`);
  if (score.byDifficulty.medium) parts.push(`${score.byDifficulty.medium} media`);
  if (score.byDifficulty.hard) parts.push(`${score.byDifficulty.hard} alta`);
  return parts.join(' · ');
}

function interviewProgressLabel(rounds: { status: string }[]): string | null {
  if (!rounds.length) return null;
  const open = rounds.filter((row) => row.status !== 'skipped');
  const total = open.length || rounds.length;
  const done = rounds.filter((row) => row.status === 'done').length;
  return `Entrevista · ${done}/${total}`;
}

const INTERVIEW_KIND_LABELS: Record<string, string> = {
  screening: 'Filtro',
  technical: 'Técnica',
  culture: 'Fit',
  final: 'Final',
  other: 'Otra',
};

const INTERVIEW_STATUS_LABELS: Record<string, string> = {
  planned: 'Pendiente',
  done: 'Realizada',
  skipped: 'Omitida',
};

const INTERVIEW_OUTCOME_LABELS: Record<string, string> = {
  advance: 'Avanzar',
  hold: 'En espera',
  reject: 'No continuar',
};

type InterviewRoundInput = {
  id: string;
  kind: string;
  title: string;
  status: string;
  outcome: string | null;
  interviewer_id: string | null;
  partner_member_id?: string | null;
  conducted_at: string | null;
  sort_order?: number | null;
};

type InterviewReportInput = {
  round_id: string;
  original_filename: string | null;
  notes: string | null;
};

type InterviewCommentInput = {
  round_id: string;
  author_id: string;
  body: string;
  created_at: string;
};

function toRecruitingInterviews(
  rounds: InterviewRoundInput[],
  comments: InterviewCommentInput[],
  names: Map<string, string>,
  reports: InterviewReportInput[] = []
): RecruitingInterviewRound[] {
  const commentsByRound = new Map<string, RecruitingInterviewComment[]>();
  for (const row of comments) {
    const list = commentsByRound.get(row.round_id) ?? [];
    list.push({
      body: String(row.body || '').slice(0, 2000),
      author: names.get(row.author_id) || null,
      createdAt: row.created_at,
    });
    commentsByRound.set(row.round_id, list);
  }
  const reportsByRound = new Map<string, InterviewReportInput[]>();
  for (const row of reports) {
    const list = reportsByRound.get(row.round_id) ?? [];
    list.push(row);
    reportsByRound.set(row.round_id, list);
  }
  return [...rounds]
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((round) => ({
      title: round.title,
      kindLabel: INTERVIEW_KIND_LABELS[round.kind] || round.kind,
      status: round.status,
      statusLabel: INTERVIEW_STATUS_LABELS[round.status] || round.status,
      outcomeLabel: round.outcome ? INTERVIEW_OUTCOME_LABELS[round.outcome] || round.outcome : null,
      interviewer: round.partner_member_id
        ? names.get(round.partner_member_id) || null
        : round.interviewer_id
          ? names.get(round.interviewer_id) || null
          : null,
      conductedAt: round.conducted_at,
      comments: commentsByRound.get(round.id) ?? [],
      reports: (reportsByRound.get(round.id) ?? []).map((row) => ({
        filename: row.original_filename || 'reporte.pdf',
        notes: row.notes,
      })),
    }));
}

function interviewHasProgress(rounds: RecruitingInterviewRound[]): boolean {
  return rounds.some(
    (round) =>
      round.status !== 'planned' ||
      round.comments.length > 0 ||
      Boolean(round.outcomeLabel) ||
      round.reports.length > 0
  );
}

async function loadInterviewPack(
  admin: ReturnType<typeof createAdminClient>,
  applicationIds: string[]
): Promise<{
  roundsByApplication: Map<string, InterviewRoundInput[]>;
  interviewsByApplication: Map<string, RecruitingInterviewRound[]>;
}> {
  const roundsByApplication = new Map<string, InterviewRoundInput[]>();
  const interviewsByApplication = new Map<string, RecruitingInterviewRound[]>();
  if (!applicationIds.length) return { roundsByApplication, interviewsByApplication };

  const { data: rounds } = await admin
    .from('ops_job_interview_rounds')
    .select('id, application_id, sort_order, kind, title, status, outcome, interviewer_id, partner_member_id, conducted_at')
    .in('application_id', applicationIds)
    .order('sort_order', { ascending: true });
  for (const round of rounds ?? []) {
    const list = roundsByApplication.get(round.application_id) ?? [];
    list.push(round);
    roundsByApplication.set(round.application_id, list);
  }

  const roundIds = (rounds ?? []).map((row) => row.id);
  const { data: comments } = roundIds.length
    ? await admin
        .from('ops_job_interview_comments')
        .select('round_id, author_id, body, created_at')
        .in('round_id', roundIds)
        .order('created_at', { ascending: true })
    : { data: [] as InterviewCommentInput[] };
  const { data: reports } = roundIds.length
    ? await admin
        .from('ops_interview_reports')
        .select('round_id, original_filename, notes')
        .in('round_id', roundIds)
        .order('created_at', { ascending: true })
    : { data: [] as InterviewReportInput[] };

  const staffIds = [
    ...new Set(
      [
        ...(rounds ?? []).map((row) => row.interviewer_id),
        ...(comments ?? []).map((row) => row.author_id),
      ].filter((id): id is string => Boolean(id))
    ),
  ];
  const partnerIds = [...new Set((rounds ?? []).map((row) => row.partner_member_id).filter((id): id is string => Boolean(id)))];
  const { data: staff } = staffIds.length
    ? await admin.from('staff_profiles').select('id, full_name').in('id', staffIds)
    : { data: [] as { id: string; full_name: string }[] };
  const { data: partners } = partnerIds.length
    ? await admin.from('ops_recruiting_partner_members').select('id, full_name').in('id', partnerIds)
    : { data: [] as { id: string; full_name: string }[] };
  const names = new Map([
    ...(staff ?? []).map((row) => [row.id, row.full_name] as const),
    ...(partners ?? []).map((row) => [row.id, row.full_name] as const),
  ]);

  const commentsByRound = comments ?? [];
  for (const [applicationId, list] of roundsByApplication) {
    interviewsByApplication.set(applicationId, toRecruitingInterviews(list, commentsByRound, names, reports ?? []));
  }
  return { roundsByApplication, interviewsByApplication };
}

function pageKindLabel(kind: HuntPageKind, extras?: { slug?: string; path?: string }): string {
  if (kind === 'job') return extras?.slug ? `Vacante ${extras.slug}` : 'Vacante';
  if (kind === 'other') return extras?.path || 'Otra página';
  if (kind === 'jobs') return 'Bolsa';
  if (kind === 'test') return extras?.slug ? `Prueba · ${extras.slug}` : 'Prueba';
  if (kind === 'findings') return 'Hallazgos';
  if (kind === 'feed') return 'Feed JSON';
  if (kind === 'home') return 'Inicio';
  if (kind === 'services') return 'Servicios';
  if (kind === 'about') return 'Nosotros';
  if (kind === 'cases') return 'Casos';
  if (kind === 'contact') return 'Contacto';
  if (kind === 'legal') return 'Legal';
  return 'Página';
}

function trailRouteLabel(stops: HuntTrailRouteStop[]): string {
  if (!stops.length) return '';
  return stops
    .map((stop) => {
      const name = pageKindLabel(stop.pageKind, { slug: stop.slug, path: stop.path });
      return stop.reported ? `${name} (reportó)` : name;
    })
    .join(' → ');
}

function compactTrailLabel(trail: HuntTrailQuality): string {
  if (trail.uniquePages < 1) return 'Sin recorrido';
  if (trail.formOnly) return 'Solo formulario';
  const parts = [`${trail.uniquePages} pág. · sitio`];
  if (trail.visitedFeed) parts.push('feed');
  if (trail.msToFirstCraft != null) parts.push(`oficio ${formatDuration(trail.msToFirstCraft)}`);
  return parts.join(' · ');
}

function craftLabel(discipline: string | null | undefined): string | null {
  if (!discipline || !(discipline in CAREER_DISCIPLINE_LABELS)) return null;
  return CAREER_DISCIPLINE_LABELS[discipline as CareerDiscipline];
}

function postingTitleOf(
  value: { title?: string | null } | { title?: string | null }[] | null | undefined
): string | null {
  const row = Array.isArray(value) ? value[0] : value;
  return row?.title || null;
}

function sortPipelineRows(rows: RecruitingPipelineRow[]): RecruitingPipelineRow[] {
  return [...rows].sort((a, b) => {
    const rank = considerationRank(b.consideration) - considerationRank(a.consideration);
    if (rank) return rank;
    const da = new Date(a.appliedAt || a.completedAt || a.startedAt || 0).getTime();
    const db = new Date(b.appliedAt || b.completedAt || b.startedAt || 0).getTime();
    return db - da;
  });
}

function huntBundle(
  reports: {
    email: string;
    matched_seed_id: string | null;
    page_url: string;
    created_at: string;
    review_status?: string | null;
  }[],
  email: string,
  discipline: CareerDiscipline | null,
  events: HuntTrailEvent[],
  passedAt: string | null
) {
  const forEmail = reports.filter((item) => careerEmailKey(item.email) === careerEmailKey(email));
  const { active } = splitHuntReports(forEmail);
  const score = scoreHuntReports(active, discipline);
  const trailReports: HuntTrailReport[] = forEmail.map((row) => ({
    matched_seed_id: row.matched_seed_id,
    page_url: row.page_url,
    created_at: row.created_at,
  }));
  const trail = summarizeHuntTrail({
    passedAt,
    discipline,
    events,
    reports: trailReports,
  });
  return {
    score,
    findingsTotal: forEmail.length,
    difficultyMix: difficultyMixLabel(score),
    trail,
    trailLabel: compactTrailLabel(trail),
  };
}

export async function loadRecruitingDossier(attemptId: string): Promise<RecruitingDossier | null> {
  const admin = createAdminClient();
  const { data: attempt } = await admin
    .from('ops_job_assessment_attempts')
    .select(
      'id, job_posting_id, catalog_key, full_name, email, status, attempt_number, started_at, completed_at, time_limit_sec, question_ids, answers, score_correct, score_total, score_pct, passed, duration_ms, blur_count'
    )
    .eq('id', attemptId)
    .maybeSingle();
  if (!attempt) return null;

  const discipline = disciplineFromCatalogKey(attempt.catalog_key);
  const emailKey = careerEmailKey(attempt.email);
  const [
    { data: posting },
    { data: applicationsByEmail },
    { data: huntByAttempt },
    { data: huntByEmail },
    { data: huntTrail },
    { data: offersByEmail },
    { data: offersByCareer },
  ] = await Promise.all([
    admin.from('ops_job_postings').select('title').eq('id', attempt.job_posting_id).maybeSingle(),
    admin
      .from('ops_job_applications')
      .select('id, status, created_at, assessment_attempt_id')
      .ilike('email', attempt.email)
      .order('created_at', { ascending: false })
      .limit(8),
    admin
      .from('ops_hunt_reports')
      .select('id, page_url, title, description, expected, matched_seed_id, evidence_paths, created_at, review_status')
      .eq('assessment_attempt_id', attempt.id)
      .order('created_at', { ascending: false }),
    admin
      .from('ops_hunt_reports')
      .select('id, page_url, title, description, expected, matched_seed_id, evidence_paths, created_at, review_status')
      .ilike('email', attempt.email)
      .order('created_at', { ascending: false })
      .limit(40),
    admin
      .from('ops_hunt_events')
      .select('event_type, path, host, referrer, created_at')
      .eq('assessment_attempt_id', attempt.id)
      .order('created_at', { ascending: true })
      .limit(200),
    admin.from('ops_personnel_offers').select('email, career_email, status').ilike('email', attempt.email).limit(8),
    admin
      .from('ops_personnel_offers')
      .select('email, career_email, status')
      .ilike('career_email', attempt.email)
      .limit(8),
  ]);

  const application =
    (applicationsByEmail ?? []).find((row) => row.assessment_attempt_id === attempt.id) ||
    (applicationsByEmail ?? [])[0] ||
    null;
  const settledEmails = settledOfferEmailsFrom([...(offersByEmail ?? []), ...(offersByCareer ?? [])]);
  const settledOffer = settledEmails.has(emailKey);
  const leftActiveQueueEmails = new Set<string>([
    ...(application ? [emailKey] : []),
    ...(settledOffer ? [emailKey] : []),
  ]);

  let interviewLabel: string | null = null;
  let interviews: RecruitingInterviewRound[] = [];
  if (application?.id) {
    const pack = await loadInterviewPack(admin, [application.id]);
    const rounds = pack.roundsByApplication.get(application.id) ?? [];
    interviews = pack.interviewsByApplication.get(application.id) ?? [];
    interviewLabel = interviewProgressLabel(rounds);
  }

  const byId = new Map<string, NonNullable<typeof huntByAttempt>[number]>();
  for (const row of [...(huntByAttempt ?? []), ...(huntByEmail ?? [])]) byId.set(row.id, row);
  const huntReports = [...byId.values()].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const { active: huntScoring } = splitHuntReports(huntReports);
  const score = scoreHuntReports(huntScoring, discipline);
  const catalog = getAssessmentCatalog(attempt.catalog_key);
  const answers = parseAnswers(attempt.answers);
  const questionIds = (attempt.question_ids as string[]) || [];
  const scored = catalog
    ? scoreAnswers(catalog, questionIds, answers)
    : { byQuestion: {} as Record<string, boolean> };
  const review = catalog ? reviewRowsForAttempt(catalog, questionIds, answers, scored.byQuestion) : [];

  const findings = huntReports.map((row) => toRecruitingFinding(row, discipline));
  const trail = summarizeHuntTrail({
    passedAt: attempt.completed_at,
    discipline,
    events: huntTrail ?? [],
    reports: huntReports,
  });
  const trailRoute = trailRouteLabel(huntTrailRoute(buildHuntTrailSteps(huntTrail ?? [], huntReports)));
  const stage = classifyRecruitingStage({
    email: attempt.email,
    passed: attempt.passed,
    catalogKey: attempt.catalog_key,
    craftHits: score.craftHits,
    applicationStatus: application?.status ?? null,
    leftActiveQueueEmails,
    settledOffer,
  });

  return {
    attemptId: attempt.id,
    fullName: attempt.full_name,
    email: attempt.email,
    vacancy: posting?.title || 'Vacante',
    craft: discipline ? CAREER_DISCIPLINE_LABELS[discipline as CareerDiscipline] : null,
    status: attempt.status,
    stage,
    stageLabel: recruitingStageLabel(stage),
    passed: attempt.passed,
    scorePct: attempt.score_pct,
    scoreCorrect: attempt.score_correct,
    scoreTotal: attempt.score_total,
    attemptNumber: attempt.attempt_number,
    durationLabel: formatDuration(attempt.duration_ms),
    blurCount: attempt.blur_count || 0,
    startedAt: attempt.started_at,
    completedAt: attempt.completed_at,
    applied: Boolean(application?.id),
    applicationStatusLabel: application ? jobApplicationStatusLabel(application.status, 'es') : null,
    interviewLabel,
    interviews,
    appliedAt: application?.created_at ?? null,
    consideration: score.consideration,
    considerationLabel: huntConsiderationLabel(score.consideration, 'es'),
    craftHits: score.craftHits,
    findingsTotal: huntReports.length,
    difficultyMix: difficultyMixLabel(score),
    competencies: review.map((row) => ({ name: row.competency, ok: row.ok })),
    findings,
    trail,
    trailRoute,
  };
}

type HuntReportLite = {
  email: string;
  matched_seed_id: string | null;
  page_url: string;
  created_at: string;
  review_status: string | null;
};

type HuntEventLite = HuntTrailEvent & { assessment_attempt_id: string };

export async function loadRecruitingPipeline(jobPostingId?: string): Promise<RecruitingPipelinePack> {
  const admin = createAdminClient();
  let attemptQuery = admin
    .from('ops_job_assessment_attempts')
    .select(
      'id, job_posting_id, catalog_key, full_name, email, status, score_pct, passed, started_at, completed_at, attempt_number'
    )
    .order('created_at', { ascending: false })
    .limit(80);
  if (jobPostingId) attemptQuery = attemptQuery.eq('job_posting_id', jobPostingId);
  let applicationQuery = admin
    .from('ops_job_applications')
    .select(
      'id, full_name, email, discipline, status, created_at, assessment_attempt_id, job_posting_id, ops_job_postings(title)'
    )
    .order('created_at', { ascending: false })
    .limit(120);
  if (jobPostingId) applicationQuery = applicationQuery.eq('job_posting_id', jobPostingId);

  const [{ data: attempts }, { data: applicationsRaw }] = await Promise.all([attemptQuery, applicationQuery]);

  const postingIds = [
    ...new Set([
      ...(attempts ?? []).map((row) => row.job_posting_id),
      ...(applicationsRaw ?? []).map((row) => row.job_posting_id),
    ]),
  ];
  const emails = [
    ...new Set([
      ...(attempts ?? []).map((row) => row.email),
      ...(applicationsRaw ?? []).map((row) => row.email),
    ]),
  ];
  const emailVariants = [...new Set(emails.flatMap((email) => [email, email.toLowerCase()]))];
  const attemptIds = (attempts ?? []).map((row) => row.id);
  const applicationIds = (applicationsRaw ?? []).map((row) => row.id);
  const linkedAttemptIds = [
    ...new Set(
      (applicationsRaw ?? [])
        .map((row) => row.assessment_attempt_id)
        .filter((id): id is string => Boolean(id) && !attemptIds.includes(id))
    ),
  ];
  const eventAttemptIds = [...attemptIds, ...linkedAttemptIds];

  const emptyHunt: HuntReportLite[] = [];
  const emptyEvents: HuntEventLite[] = [];
  const [
    { data: postings },
    { data: huntReports },
    { data: huntEvents },
    { data: linkedAttempts },
    { data: offersByEmail },
    { data: offersByCareer },
  ] = await Promise.all([
    postingIds.length
      ? admin.from('ops_job_postings').select('id, title').in('id', postingIds)
      : Promise.resolve({ data: [] as { id: string; title: string }[] }),
    emailVariants.length
      ? admin
          .from('ops_hunt_reports')
          .select('email, matched_seed_id, page_url, created_at, review_status')
          .in('email', emailVariants)
          .limit(800)
      : Promise.resolve({ data: emptyHunt }),
    eventAttemptIds.length
      ? admin
          .from('ops_hunt_events')
          .select('assessment_attempt_id, event_type, path, host, referrer, created_at')
          .in('assessment_attempt_id', eventAttemptIds)
          .limit(1200)
      : Promise.resolve({ data: emptyEvents }),
    linkedAttemptIds.length
      ? admin
          .from('ops_job_assessment_attempts')
          .select('id, email, passed, score_pct, catalog_key, started_at, completed_at, full_name, job_posting_id')
          .in('id', linkedAttemptIds)
      : Promise.resolve({
          data: [] as {
            id: string;
            email: string;
            passed: boolean | null;
            score_pct: number | null;
            catalog_key: string | null;
            started_at: string;
            completed_at: string | null;
            full_name: string;
            job_posting_id: string;
          }[],
        }),
    emailVariants.length
      ? admin.from('ops_personnel_offers').select('email, career_email, status').in('email', emailVariants).limit(200)
      : Promise.resolve({ data: [] as { email: string | null; career_email: string | null; status: string }[] }),
    emailVariants.length
      ? admin
          .from('ops_personnel_offers')
          .select('email, career_email, status')
          .in('career_email', emailVariants)
          .limit(200)
      : Promise.resolve({ data: [] as { email: string | null; career_email: string | null; status: string }[] }),
  ]);

  const { roundsByApplication, interviewsByApplication } = await loadInterviewPack(admin, applicationIds);

  type AttemptRow = NonNullable<typeof attempts>[number] & {
    completed_at?: string | null;
    full_name?: string;
    job_posting_id?: string;
  };
  const attemptById = new Map<string, AttemptRow>(
    [...(attempts ?? []), ...(linkedAttempts ?? [])].map((row) => [row.id, row as AttemptRow])
  );
  const attemptByEmail = new Map<string, AttemptRow>();
  for (const row of [...(attempts ?? []), ...(linkedAttempts ?? [])] as AttemptRow[]) {
    const key = careerEmailKey(row.email);
    const current = attemptByEmail.get(key);
    if (!current || new Date(row.started_at) > new Date(current.started_at)) {
      attemptByEmail.set(key, row);
    }
  }

  const postingTitle = new Map((postings ?? []).map((row) => [row.id, row.title]));
  const eventsByAttempt = new Map<string, HuntTrailEvent[]>();
  for (const event of huntEvents ?? []) {
    const list = eventsByAttempt.get(event.assessment_attempt_id) ?? [];
    list.push(event);
    eventsByAttempt.set(event.assessment_attempt_id, list);
  }

  const appliedEmails = new Set((applicationsRaw ?? []).map((row) => careerEmailKey(row.email)));
  const settledEmails = settledOfferEmailsFrom([...(offersByEmail ?? []), ...(offersByCareer ?? [])]);
  const leftActiveQueueEmails = new Set([...appliedEmails, ...settledEmails]);

  const reports = huntReports ?? [];

  const ready: RecruitingPipelineRow[] = [];
  const test: RecruitingPipelineRow[] = [];
  const applied: RecruitingPipelineRow[] = [];
  const hired: RecruitingPipelineRow[] = [];
  const discarded: RecruitingPipelineRow[] = [];

  const readyEmails = new Set<string>();
  for (const row of attemptByEmail.values()) {
    const discipline = disciplineFromCatalogKey(row.catalog_key);
    const hunt = huntBundle(
      reports,
      row.email,
      discipline,
      eventsByAttempt.get(row.id) ?? [],
      row.completed_at ?? null
    );
    if (
      !isCandidateReadyForCv({
        email: row.email,
        passed: row.passed,
        catalogKey: row.catalog_key,
        craftHits: hunt.score.craftHits,
        leftActiveQueueEmails,
      })
    ) {
      continue;
    }
    readyEmails.add(careerEmailKey(row.email));
    ready.push({
      attemptId: row.id,
      applicationId: null,
      fullName: row.full_name || '',
      email: row.email,
      vacancy: postingTitle.get(row.job_posting_id || '') || 'Vacante',
      craft: craftLabel(discipline),
      stage: 'ready',
      passed: row.passed,
      scorePct: row.score_pct,
      consideration: hunt.score.consideration,
      considerationLabel: huntConsiderationLabel(hunt.score.consideration, 'es'),
      craftHits: hunt.score.craftHits,
      findingsTotal: hunt.findingsTotal,
      difficultyMix: hunt.difficultyMix,
      trailLabel: hunt.trailLabel,
      browsedSite: hunt.trail.browsedSite,
      applied: false,
      applicationStatusLabel: null,
      interviewLabel: null,
      interviews: [],
      completedAt: row.completed_at ?? null,
      startedAt: row.started_at,
      appliedAt: null,
    });
  }

  for (const row of attempts ?? []) {
    const key = careerEmailKey(row.email);
    if (leftActiveQueueEmails.has(key) || readyEmails.has(key)) continue;
    const discipline = disciplineFromCatalogKey(row.catalog_key);
    const hunt = huntBundle(
      reports,
      row.email,
      discipline,
      eventsByAttempt.get(row.id) ?? [],
      row.completed_at
    );
    test.push({
      attemptId: row.id,
      applicationId: null,
      fullName: row.full_name,
      email: row.email,
      vacancy: postingTitle.get(row.job_posting_id) || 'Vacante',
      craft: craftLabel(discipline),
      stage: 'test',
      passed: row.passed,
      scorePct: row.score_pct,
      consideration: hunt.score.consideration,
      considerationLabel: huntConsiderationLabel(hunt.score.consideration, 'es'),
      craftHits: hunt.score.craftHits,
      findingsTotal: hunt.findingsTotal,
      difficultyMix: hunt.difficultyMix,
      trailLabel: hunt.trailLabel,
      browsedSite: hunt.trail.browsedSite,
      applied: false,
      applicationStatusLabel: null,
      interviewLabel: null,
      interviews: [],
      completedAt: row.completed_at,
      startedAt: row.started_at,
      appliedAt: null,
    });
  }

  for (const row of applicationsRaw ?? []) {
    const discipline =
      row.discipline && row.discipline in CAREER_DISCIPLINE_LABELS
        ? (row.discipline as CareerDiscipline)
        : null;
    const attempt =
      (row.assessment_attempt_id ? attemptById.get(row.assessment_attempt_id) : null) ||
      attemptByEmail.get(careerEmailKey(row.email)) ||
      null;
    const hunt = huntBundle(
      reports,
      row.email,
      discipline || disciplineFromCatalogKey(attempt?.catalog_key),
      attempt ? eventsByAttempt.get(attempt.id) ?? [] : [],
      attempt?.completed_at ?? null
    );
    const stage: RecruitingStage =
      row.status === 'rejected' ? 'discarded' : row.status === 'hired' ? 'hired' : 'applied';
    const pipelineRow: RecruitingPipelineRow = {
      attemptId: attempt?.id ?? null,
      applicationId: row.id,
      fullName: row.full_name,
      email: row.email,
      vacancy: postingTitleOf(row.ops_job_postings) || postingTitle.get(row.job_posting_id) || 'Vacante',
      craft: craftLabel(discipline),
      stage,
      passed: attempt?.passed ?? null,
      scorePct: attempt?.score_pct ?? null,
      consideration: hunt.score.consideration,
      considerationLabel: huntConsiderationLabel(hunt.score.consideration, 'es'),
      craftHits: hunt.score.craftHits,
      findingsTotal: hunt.findingsTotal,
      difficultyMix: hunt.difficultyMix,
      trailLabel: hunt.trailLabel,
      browsedSite: hunt.trail.browsedSite,
      applied: true,
      applicationStatusLabel: jobApplicationStatusLabel(row.status, 'es'),
      interviewLabel: interviewProgressLabel(roundsByApplication.get(row.id) ?? []),
      interviews: interviewsByApplication.get(row.id) ?? [],
      completedAt: attempt?.completed_at ?? null,
      startedAt: attempt?.started_at ?? null,
      appliedAt: row.created_at,
    };
    if (stage === 'discarded') discarded.push(pipelineRow);
    else if (stage === 'hired') hired.push(pipelineRow);
    else if (!isClosedApplicationStatus(row.status)) applied.push(pipelineRow);
  }

  const vacancy =
    jobPostingId && (ready[0] || applied[0] || test[0] || hired[0] || discarded[0])?.vacancy
      ? (ready[0] || applied[0] || test[0] || hired[0] || discarded[0])!.vacancy
      : postingIds.length === 1
        ? postingTitle.get(postingIds[0]!) || 'Bolsa Codiva.dev'
        : 'Bolsa Codiva.dev';

  return {
    vacancy,
    ready: sortPipelineRows(ready),
    applied: sortPipelineRows(applied),
    test: sortPipelineRows(test),
    hired: sortPipelineRows(hired),
    discarded: sortPipelineRows(discarded),
  };
}

function trailCopy(trail: HuntTrailQuality): string {
  const parts: string[] = [];
  if (trail.formOnly) parts.push('Poco recorrido: casi solo el formulario de la prueba.');
  else if (trail.browsedSite) {
    parts.push(`Recorrió el sitio (${trail.uniquePages} páginas distintas, ${trail.pageViews} vistas).`);
  } else parts.push('Aún no hay páginas en el mapa de cacería.');
  if (trail.visitedFeed) parts.push('Pasó por el feed JSON.');
  if (trail.visitedMarketing) parts.push('También visitó el sitio público.');
  if (trail.msToFirstCraft != null) {
    parts.push(`Primer hallazgo del oficio a los ${formatDuration(trail.msToFirstCraft)}.`);
  } else {
    parts.push('Todavía no hay hallazgo del oficio.');
  }
  return parts.join(' ');
}

function resultCopy(d: RecruitingDossier): string {
  if (d.passed) return `Aprobó criterio${d.scorePct != null ? ` · ${d.scorePct}%` : ''}`;
  if (d.status === 'completed') return `No aprobó criterio${d.scorePct != null ? ` · ${d.scorePct}%` : ''}`;
  if (d.status === 'started') return 'Criterio en curso';
  return d.status;
}

function applicationCopy(d: RecruitingDossier): string {
  if (!d.applied) return 'No ha postulado';
  const parts = [d.applicationStatusLabel || 'Ya postuló'];
  if (d.interviewLabel) parts.push(d.interviewLabel);
  if (d.appliedAt) parts.push(formatWhen(d.appliedAt));
  return parts.join(' · ');
}

function interviewRoundArticles(rounds: RecruitingInterviewRound[]): string {
  return rounds
    .map((round) => {
      const meta = [
        round.kindLabel,
        round.statusLabel,
        round.outcomeLabel,
        round.interviewer,
        round.conductedAt ? formatWhen(round.conductedAt) : null,
      ].filter(Boolean);
      const comments = round.comments
        .map((comment) => {
          const who = [comment.author, formatWhen(comment.createdAt)].filter(Boolean).join(' · ');
          return `<p style="margin:8px 0 0;font-size:14px;line-height:1.55;white-space:pre-wrap;">${escapeHtml(comment.body)}</p>
            ${who ? `<p style="margin:4px 0 0;font-size:12px;color:${BRAND.muted};">${escapeHtml(who)}</p>` : ''}`;
        })
        .join('');
      const reports = round.reports
        .map(
          (report) =>
            `<p style="margin:8px 0 0;font-size:13px;">Reporte: ${escapeHtml(report.filename)}${
              report.notes ? ` · ${escapeHtml(report.notes)}` : ''
            }</p>`
        )
        .join('');
      return `<article style="margin:0 0 16px;padding:14px 16px;border:1px solid ${BRAND.border};border-radius:12px;">
            <p style="margin:0 0 6px;font-weight:600;">${escapeHtml(round.title)}</p>
            <p style="margin:0;font-size:12px;color:${BRAND.muted};">${escapeHtml(meta.join(' · '))}</p>
            ${comments}
            ${reports}
          </article>`;
    })
    .join('');
}

function interviewSection(rounds: RecruitingInterviewRound[]): string {
  if (!interviewHasProgress(rounds)) return '';
  return `<h2>Entrevistas</h2>
      ${interviewRoundArticles(rounds)}`;
}

function pipelineInterviewNotes(rows: RecruitingPipelineRow[]): string {
  const withProgress = rows.filter((row) => interviewHasProgress(row.interviews));
  if (!withProgress.length) return '';
  return withProgress
    .map(
      (row) => `<p style="margin:20px 0 8px;font-weight:600;">${escapeHtml(row.fullName)}</p>
      ${interviewRoundArticles(row.interviews)}`
    )
    .join('');
}

function findingArticles(rows: RecruitingFinding[], empty: string): string {
  if (!rows.length) return empty ? `<p style="color:${BRAND.muted};">${escapeHtml(empty)}</p>` : '';
  return rows
    .map((row) => {
      const badge = row.reviewDiscarded
        ? 'Descartado en revisión · no cuenta'
        : row.counts
          ? `Cuenta para el oficio${row.difficultyLabel ? ` · dificultad ${escapeHtml(row.difficultyLabel)}` : ''}`
          : 'No cuenta para la prueba';
      return `<article style="margin:0 0 16px;padding:14px 16px;border:1px solid ${BRAND.border};border-radius:12px;">
            <p style="margin:0 0 6px;font-weight:600;">${escapeHtml(row.title)}</p>
            <p style="margin:0 0 8px;font-size:12px;color:${BRAND.muted};">${escapeHtml(row.pageUrl)} · ${escapeHtml(formatWhen(row.createdAt))}${row.evidenceCount ? ` · ${row.evidenceCount} captura(s)` : ''}</p>
            <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:${row.counts ? BRAND.primary : BRAND.muted};">${badge}</p>
            <p style="margin:0;font-size:14px;line-height:1.55;white-space:pre-wrap;">${escapeHtml(row.description)}</p>
            ${row.expected ? `<p style="margin:8px 0 0;font-size:13px;color:${BRAND.muted};"><strong>Esperado:</strong> ${escapeHtml(row.expected)}</p>` : ''}
          </article>`;
    })
    .join('');
}

export function renderRecruitingDossierHtml(d: RecruitingDossier): string {
  const competencies = d.competencies
    .map(
      (row) =>
        `<tr>
          <td style="padding:8px 10px;border-bottom:1px solid ${BRAND.border};">${escapeHtml(row.name)}</td>
          <td style="padding:8px 10px;border-bottom:1px solid ${BRAND.border};font-weight:600;color:${row.ok ? BRAND.primary : '#B42318'};">${row.ok ? 'Correcta' : 'Incorrecta'}</td>
        </tr>`
    )
    .join('');
  const huntBits = [
    `${d.craftHits} hallazgo(s) del oficio`,
    `señal ${d.considerationLabel}`,
    `${d.findingsTotal} reporte(s)`,
  ];
  if (d.difficultyMix) huntBits.push(d.difficultyMix);

  return documentShell({
    title: `Candidato · ${d.fullName}`,
    heading: d.fullName,
    kicker: 'Reporte de evaluación · Confidencial',
    body: `
      <table class="meta" role="presentation">
        <tr><th>Correo</th><td>${escapeHtml(d.email)}</td></tr>
        <tr><th>Vacante</th><td>${escapeHtml(d.vacancy)}</td></tr>
        <tr><th>Oficio</th><td>${escapeHtml(d.craft || '-')}</td></tr>
        <tr><th>Fase</th><td>${escapeHtml(d.stageLabel)}</td></tr>
        <tr><th>Postulación</th><td>${escapeHtml(applicationCopy(d))}</td></tr>
        <tr><th>Criterio</th><td>${escapeHtml(resultCopy(d))}${d.scoreCorrect != null ? ` · ${d.scoreCorrect}/${d.scoreTotal} pts` : ''} · intento ${d.attemptNumber}</td></tr>
        <tr><th>Tiempo</th><td>${escapeHtml(d.durationLabel)} · ${d.blurCount ? `${d.blurCount} salidas de ventana` : 'sin salidas de ventana'}</td></tr>
        <tr><th>Fechas</th><td>Inicio ${escapeHtml(formatWhen(d.startedAt))}${d.completedAt ? ` · cierre ${escapeHtml(formatWhen(d.completedAt))}` : ''}</td></tr>
        <tr><th>Cacería</th><td>${escapeHtml(huntBits.join(' · '))}</td></tr>
      </table>
      ${interviewSection(d.interviews)}
      <h2>Cómo cazó</h2>
      <p>${escapeHtml(trailCopy(d.trail))}</p>
      ${d.trailRoute ? `<p class="note">Ruta: ${escapeHtml(d.trailRoute)}</p>` : ''}
      <h2>Competencias (criterio)</h2>
      ${
        competencies
          ? `<table class="grid"><thead><tr><th>Competencia</th><th>Resultado</th></tr></thead><tbody>${competencies}</tbody></table>`
          : `<p style="color:${BRAND.muted};">Sin catálogo para reconstruir competencias.</p>`
      }
      <h2>Hallazgos reportados</h2>
      ${findingArticles(d.findings, 'Todavía no reportó hallazgos.')}
    `,
  });
}

function criterionCell(row: RecruitingPipelineRow): string {
  const result = row.passed ? 'Aprobó' : row.passed === false ? 'No' : '-';
  const pct = row.scorePct != null ? ` ${row.scorePct}%` : '';
  return `${result}${pct}`;
}

function huntCell(row: RecruitingPipelineRow): string {
  const mix = row.difficultyMix ? `<div class="sub">${escapeHtml(row.difficultyMix)}</div>` : '';
  return `${row.craftHits} · ${escapeHtml(row.considerationLabel)}${mix}`;
}

function statusCell(row: RecruitingPipelineRow): string {
  const status = row.applicationStatusLabel || '-';
  const interview = row.interviewLabel ? `<div class="sub">${escapeHtml(row.interviewLabel)}</div>` : '';
  return `${escapeHtml(status)}${interview}`;
}

function pipelineTable(rows: RecruitingPipelineRow[], withStatus: boolean): string {
  if (!rows.length) return '';
  const head = withStatus
    ? `<tr>
                  <th>Candidato</th>
                  <th>Oficio</th>
                  <th>Estado</th>
                  <th>Criterio</th>
                  <th>Cacería</th>
                  <th>Recorrido</th>
                  <th>Fecha</th>
                </tr>`
    : `<tr>
                  <th>Candidato</th>
                  <th>Oficio</th>
                  <th>Criterio</th>
                  <th>Cacería</th>
                  <th>Recorrido</th>
                  <th>Fecha</th>
                </tr>`;
  const body = rows
    .map((row) => {
      const when = formatWhen(row.appliedAt || row.completedAt || row.startedAt);
      const status = withStatus ? `<td>${statusCell(row)}</td>` : '';
      return `<tr>
        <td>${escapeHtml(row.fullName)}<div class="sub">${escapeHtml(row.email)}</div></td>
        <td>${escapeHtml(row.craft || '-')}<div class="sub">${escapeHtml(row.vacancy)}</div></td>
        ${status}
        <td>${criterionCell(row)}</td>
        <td>${huntCell(row)}</td>
        <td>${escapeHtml(row.trailLabel)}</td>
        <td>${escapeHtml(when)}</td>
      </tr>`;
    })
    .join('');
  return `<table class="grid">
              <thead>${head}</thead>
              <tbody>${body}</tbody>
            </table>`;
}

function pipelineSection(stage: RecruitingStage, rows: RecruitingPipelineRow[], withStatus: boolean): string {
  if (!rows.length) return '';
  return `
      <h2>${escapeHtml(recruitingStageLabel(stage))} · ${rows.length}</h2>
      ${pipelineTable(rows, withStatus)}
      ${pipelineInterviewNotes(rows)}
    `;
}

export function renderRecruitingPipelineHtml(input: RecruitingPipelinePack): string {
  const total =
    input.ready.length + input.applied.length + input.test.length + input.hired.length + input.discarded.length;
  const counts = [
    input.ready.length ? `${input.ready.length} listos` : null,
    input.applied.length ? `${input.applied.length} con CV` : null,
    input.test.length ? `${input.test.length} en prueba` : null,
    input.hired.length ? `${input.hired.length} contratados` : null,
    input.discarded.length ? `${input.discarded.length} descartados` : null,
  ].filter(Boolean);

  const sections = [
    pipelineSection('ready', input.ready, false),
    pipelineSection('applied', input.applied, true),
    pipelineSection('test', input.test, false),
    pipelineSection('hired', input.hired, true),
    pipelineSection('discarded', input.discarded, true),
  ].join('');

  return documentShell({
    title: `Pipeline · ${input.vacancy}`,
    heading: 'Pipeline de evaluación',
    kicker: 'Reporte de reclutamiento · Confidencial',
    body: `
      <p class="lede">${escapeHtml(input.vacancy)}. ${
        counts.length ? escapeHtml(counts.join(' · ')) : `${total} persona(s)`
      }.</p>
      ${sections || `<p style="color:${BRAND.muted};">Todavía no hay intentos ni postulaciones.</p>`}
    `,
  });
}

function documentShell(input: { title: string; heading: string; kicker: string; body: string }): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${escapeHtml(input.title)} · Codiva.dev</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700&display=swap" rel="stylesheet"/>
  <style>
    body { margin:0; padding:32px 20px; background:${BRAND.background}; color:${BRAND.text}; font-family:${FONT_BODY}; }
    .page { max-width:800px; margin:0 auto; background:${BRAND.card}; border:1px solid ${BRAND.border}; border-radius:16px; padding:32px 36px 28px; }
    .kicker { margin:0 0 6px; font-size:11px; letter-spacing:.14em; text-transform:uppercase; font-weight:700; color:${BRAND.primary}; }
    h1 { margin:0 0 8px; font-family:${FONT_DISPLAY}; font-size:26px; letter-spacing:-.02em; }
    h2 { margin:28px 0 8px; font-family:${FONT_DISPLAY}; font-size:16px; }
    .lede, .note { font-size:13px; line-height:1.55; color:${BRAND.muted}; }
    .lede { margin:0 0 20px; }
    .note { margin:0 0 12px; }
    .meta { width:100%; border-collapse:collapse; margin:0 0 8px; }
    .meta th { text-align:left; width:120px; padding:7px 0; color:${BRAND.muted}; font-size:12px; font-weight:600; vertical-align:top; }
    .meta td { padding:7px 0; font-size:14px; }
    .grid { width:100%; border-collapse:collapse; font-size:13px; }
    .grid th { text-align:left; padding:8px 10px; background:#F3F6F6; border-bottom:1px solid ${BRAND.border}; font-size:11px; letter-spacing:.04em; text-transform:uppercase; color:${BRAND.muted}; }
    .grid td { padding:8px 10px; border-bottom:1px solid ${BRAND.border}; vertical-align:top; }
    .sub { font-size:11px; color:${BRAND.muted}; margin-top:2px; }
    footer { margin-top:28px; padding-top:16px; border-top:1px solid ${BRAND.border}; font-size:11px; color:${BRAND.muted}; line-height:1.5; }
    @media print { body { background:#fff; padding:0; } .page { border:none; } }
  </style>
</head>
<body>
  <div class="page">
    ${brandWordmarkHtml({ sizePx: 20 })}
    <p class="kicker" style="margin-top:18px;">${escapeHtml(input.kicker)}</p>
    <h1>${escapeHtml(input.heading)}</h1>
    ${input.body}
    <footer>
      Confidencial. Solo para evaluación de talento con Codiva.dev. No reenviar al candidato ni publicar.
      Las semillas de la cacería y el banco de preguntas no forman parte de este documento.
    </footer>
  </div>
</body>
</html>`;
}
