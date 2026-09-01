import { randomBytes, randomInt } from 'crypto';
import { CAREER_DISCIPLINE_CATALOG, isCareerDiscipline, postingAsksDiscipline, type CareerDiscipline } from '@/lib/ops/career-disciplines';
import { getAssessmentCatalog } from './catalog';
import type {
  AssessmentAnswers,
  AssessmentCatalog,
  AssessmentEventType,
  AssessmentOptionOrders,
  AssessmentQuestion,
  PublicAssessmentQuestion,
} from './types';

export const ASSESSMENT_TOKEN_BYTES = 24;
export const ASSESSMENT_PASS_WINDOW_DAYS = 30;
export const ASSESSMENT_MAX_ATTEMPTS_PER_WEEK = 2;
export const ASSESSMENT_RETRY_COOLDOWN_HOURS = 12;

export function createAssessmentToken(): string {
  return randomBytes(ASSESSMENT_TOKEN_BYTES).toString('base64url');
}

export function shuffleInPlace<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = randomInt(0, i + 1);
    const current = items[i];
    const swap = items[j];
    if (current === undefined || swap === undefined) continue;
    items[i] = swap;
    items[j] = current;
  }
  return items;
}

export function pickQuestionIds(catalog: AssessmentCatalog): string[] {
  const ids = catalog.questions.map((q) => q.id);
  shuffleInPlace(ids);
  return ids.slice(0, Math.min(catalog.questionCount, ids.length));
}

export function buildOptionOrders(
  catalog: AssessmentCatalog,
  questionIds: string[]
): AssessmentOptionOrders {
  const orders: AssessmentOptionOrders = {};
  for (const id of questionIds) {
    const question = catalog.questions.find((q) => q.id === id);
    if (!question) continue;
    const keys = question.options.map((o) => o.key);
    shuffleInPlace(keys);
    orders[id] = keys;
  }
  return orders;
}

export function toPublicQuestion(
  question: AssessmentQuestion,
  optionOrder: string[] | undefined
): PublicAssessmentQuestion {
  const byKey = new Map(question.options.map((o) => [o.key, o]));
  const keys = optionOrder?.length ? optionOrder : question.options.map((o) => o.key);
  const options = keys
    .map((key) => byKey.get(key))
    .filter((o): o is NonNullable<typeof o> => Boolean(o));
  return {
    id: question.id,
    competency: question.competency,
    prompt: question.prompt,
    context: question.context,
    type: question.type,
    options,
    points: question.points,
  };
}

export function publicQuestionsForAttempt(
  catalog: AssessmentCatalog,
  questionIds: string[],
  optionOrders: AssessmentOptionOrders
): PublicAssessmentQuestion[] {
  return questionIds
    .map((id) => {
      const question = catalog.questions.find((q) => q.id === id);
      if (!question) return null;
      return toPublicQuestion(question, optionOrders[id]);
    })
    .filter((q): q is PublicAssessmentQuestion => Boolean(q));
}

function sameKeySet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const left = [...a].map((s) => s.trim()).sort();
  const right = [...b].map((s) => s.trim()).sort();
  return left.every((v, i) => v === right[i]);
}

function sameKeyOrder(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

export function scoreAnswers(
  catalog: AssessmentCatalog,
  questionIds: string[],
  answers: AssessmentAnswers
): { correct: number; total: number; pct: number; passed: boolean; byQuestion: Record<string, boolean> } {
  let correctPoints = 0;
  let totalPoints = 0;
  const byQuestion: Record<string, boolean> = {};

  for (const id of questionIds) {
    const question = catalog.questions.find((q) => q.id === id);
    if (!question) continue;
    totalPoints += question.points;
    const given = Array.isArray(answers[id]) ? answers[id] : [];
    const ok =
      question.type === 'rank'
        ? sameKeyOrder(given, question.correct)
        : sameKeySet(given, question.correct);
    byQuestion[id] = ok;
    if (ok) correctPoints += question.points;
  }

  const pct = totalPoints > 0 ? Math.round((correctPoints / totalPoints) * 10000) / 100 : 0;
  return {
    correct: correctPoints,
    total: totalPoints,
    pct,
    passed: pct >= catalog.passPct,
    byQuestion,
  };
}

export function remainingMs(expiresAt: string | Date, now = Date.now()): number {
  const exp = typeof expiresAt === 'string' ? new Date(expiresAt).getTime() : expiresAt.getTime();
  return Math.max(0, exp - now);
}

export function isAssessmentEventType(value: string): value is AssessmentEventType {
  return (
    value === 'started' ||
    value === 'resumed' ||
    value === 'question_viewed' ||
    value === 'answered' ||
    value === 'window_blur' ||
    value === 'window_focus' ||
    value === 'submitted' ||
    value === 'timed_out'
  );
}

export function sanitizeAnswerKeys(
  catalog: AssessmentCatalog,
  questionId: string,
  raw: unknown
): string[] | null {
  const question = catalog.questions.find((q) => q.id === questionId);
  if (!question) return null;
  const allowed = new Set(question.options.map((o) => o.key));
  const list = Array.isArray(raw) ? raw : typeof raw === 'string' ? [raw] : [];
  const keys = list
    .map((v) => String(v || '').trim())
    .filter((k) => allowed.has(k));
  const unique = [...new Set(keys)];
  if (question.type === 'single') return unique.slice(0, 1);
  if (question.type === 'rank') return unique.slice(0, question.options.length);
  return unique;
}

export function catalogForPosting(assessmentKey: string | null | undefined, slug: string) {
  return getAssessmentCatalog(assessmentKey) ?? getAssessmentCatalog(slug);
}

export function catalogForApplication(
  assessmentKey: string | null | undefined,
  slug: string,
  discipline?: string | null,
  asksDiscipline?: boolean | null
) {
  const asks = typeof asksDiscipline === 'boolean' ? asksDiscipline : postingAsksDiscipline(slug);
  if (asks) {
    if (!isCareerDiscipline(discipline ?? '')) return null;
    return getAssessmentCatalog(CAREER_DISCIPLINE_CATALOG[discipline as CareerDiscipline]);
  }
  return catalogForPosting(assessmentKey, slug);
}

export function reviewRowsForAttempt(
  catalog: AssessmentCatalog,
  questionIds: string[],
  answers: AssessmentAnswers,
  byQuestion: Record<string, boolean>
) {
  return questionIds.map((id) => {
    const question = catalog.questions.find((q) => q.id === id);
    return {
      id,
      competency: question?.competency ?? '',
      prompt: question?.prompt ?? id,
      type: question?.type ?? 'single',
      given: answers[id] ?? [],
      correct: question?.correct ?? [],
      ok: Boolean(byQuestion[id]),
      options: question?.options ?? [],
    };
  });
}
