import { createAdminClient } from '@/lib/supabase/admin';
import {
  loadRecruitingDossier,
  type RecruitingDossier,
  type RecruitingFinding,
} from '@/lib/careers/recruiting-report';
import type { HuntTrailQuality } from '@/lib/careers/hunt/trail';
import { isInterviewUuid } from '@/lib/ops/interview-partner';

export type InterviewPartnerFinding = {
  title: string;
  pageUrl: string;
  description: string;
  expected: string | null;
  counts: boolean;
  difficultyLabel: string | null;
  evidenceCount: number;
  reviewDiscarded: boolean;
};

/** Recorte del reporte de evaluación para entrevistadores externos (sin blur/IP/peers). */
export type InterviewPartnerBrief = {
  craft: string | null;
  passed: boolean | null;
  scorePct: number | null;
  scoreCorrect: number | null;
  scoreTotal: number | null;
  attemptNumber: number | null;
  durationLabel: string | null;
  considerationLabel: string | null;
  craftHits: number;
  findingsTotal: number;
  difficultyMix: string | null;
  trailSummary: string;
  trailRoute: string | null;
  competencies: { name: string; ok: boolean }[];
  findings: InterviewPartnerFinding[];
};

function formatTrailMs(ms: number): string {
  if (ms < 0) return '-';
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m} min ${s}s` : `${s}s`;
}

export function summarizeHuntTrailForPartner(trail: HuntTrailQuality): string {
  const parts: string[] = [];
  if (trail.formOnly) parts.push('Poco recorrido: casi solo el formulario de la prueba.');
  else if (trail.browsedSite) {
    parts.push(`Recorrió el sitio (${trail.uniquePages} páginas distintas, ${trail.pageViews} vistas).`);
  } else {
    parts.push('Aún no hay páginas en el mapa de cacería.');
  }
  if (trail.visitedFeed) parts.push('Pasó por el feed JSON.');
  if (trail.visitedMarketing) parts.push('También visitó el sitio público.');
  if (trail.msToFirstCraft != null) {
    parts.push(`Primer hallazgo del oficio a los ${formatTrailMs(trail.msToFirstCraft)}.`);
  } else {
    parts.push('Todavía no hay hallazgo del oficio.');
  }
  return parts.join(' ');
}

function toPartnerFinding(row: RecruitingFinding): InterviewPartnerFinding {
  return {
    title: row.title,
    pageUrl: row.pageUrl,
    description: row.description,
    expected: row.expected,
    counts: row.counts,
    difficultyLabel: row.difficultyLabel,
    evidenceCount: row.evidenceCount,
    reviewDiscarded: row.reviewDiscarded,
  };
}

export function toInterviewPartnerBrief(dossier: RecruitingDossier): InterviewPartnerBrief {
  return {
    craft: dossier.craft,
    passed: dossier.passed,
    scorePct: dossier.scorePct,
    scoreCorrect: dossier.scoreCorrect,
    scoreTotal: dossier.scoreTotal,
    attemptNumber: dossier.attemptNumber,
    durationLabel: dossier.durationLabel,
    considerationLabel: dossier.considerationLabel,
    craftHits: dossier.craftHits,
    findingsTotal: dossier.findingsTotal,
    difficultyMix: dossier.difficultyMix || null,
    trailSummary: summarizeHuntTrailForPartner(dossier.trail),
    trailRoute: dossier.trailRoute || null,
    competencies: dossier.competencies.map((row) => ({ name: row.name, ok: row.ok })),
    findings: dossier.findings.map(toPartnerFinding),
  };
}

export async function loadInterviewPartnerBrief(
  applicationId: string
): Promise<InterviewPartnerBrief | null> {
  if (!isInterviewUuid(applicationId)) return null;
  const admin = createAdminClient();
  const { data: application } = await admin
    .from('ops_job_applications')
    .select('id, email, assessment_attempt_id')
    .eq('id', applicationId)
    .maybeSingle();
  if (!application) return null;

  let attemptId = application.assessment_attempt_id as string | null;
  if (!attemptId && application.email) {
    const { data: attempt } = await admin
      .from('ops_job_assessment_attempts')
      .select('id')
      .ilike('email', application.email)
      .order('completed_at', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    attemptId = attempt?.id ?? null;
  }
  if (!attemptId) return null;

  const dossier = await loadRecruitingDossier(attemptId);
  if (!dossier) return null;
  return toInterviewPartnerBrief(dossier);
}
