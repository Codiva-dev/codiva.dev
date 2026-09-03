import { huntRequiredForCatalog } from '@/lib/careers/hunt/seeds';
import { isClosedApplicationStatus, isSettledPersonnelOfferStatus } from '@/lib/ops/careers';

export type RecruitingStage = 'test' | 'ready' | 'applied' | 'discarded' | 'hired';

export function careerEmailKey(value: string): string {
  return value.trim().toLowerCase();
}

/** One candidate in one vacancy. Hired on another opening must not hide a new test. */
export function recruitingAttemptKey(email: string, jobPostingId: string | null | undefined): string {
  const job = String(jobPostingId || '').trim();
  if (!job) return '';
  return `${careerEmailKey(email)}::${job}`;
}

export function applicationCoversAttempt(input: {
  email: string;
  jobPostingId: string | null | undefined;
  applications: { email: string; job_posting_id?: string | null }[];
}): boolean {
  const key = recruitingAttemptKey(input.email, input.jobPostingId);
  if (!key) return false;
  return input.applications.some((row) => recruitingAttemptKey(row.email, row.job_posting_id) === key);
}

export function latestAttemptByJobEmail<
  T extends { email: string; job_posting_id: string; started_at: string },
>(attempts: T[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const row of attempts) {
    const key = recruitingAttemptKey(row.email, row.job_posting_id);
    if (!key) continue;
    const current = map.get(key);
    if (!current || new Date(row.started_at) > new Date(current.started_at)) {
      map.set(key, row);
    }
  }
  return map;
}

export function attemptsForApplication<
  T extends { id: string; email: string; job_posting_id: string; started_at: string },
>(
  attempts: T[],
  application: { email: string; job_posting_id?: string | null; assessment_attempt_id?: string | null }
): T[] {
  const key = recruitingAttemptKey(application.email, application.job_posting_id);
  if (!key) return [];
  return attempts
    .filter((row) => recruitingAttemptKey(row.email, row.job_posting_id) === key)
    .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
}

export function isCandidateReadyForCv(input: {
  email: string;
  passed: boolean | null;
  catalogKey: string | null | undefined;
  craftHits: number;
  leftActiveQueueEmails: Iterable<string>;
  huntRequired?: boolean;
  huntNeeded?: number;
}): boolean {
  const left = new Set([...input.leftActiveQueueEmails].map(careerEmailKey));
  if (left.has(careerEmailKey(input.email))) return false;
  if (!input.passed) return false;
  const huntRequired =
    typeof input.huntRequired === 'boolean'
      ? input.huntRequired
      : huntRequiredForCatalog(input.catalogKey);
  const huntNeeded = Math.max(1, input.huntNeeded ?? 1);
  if (huntRequired && input.craftHits < huntNeeded) return false;
  return true;
}

export function classifyRecruitingStage(input: {
  email: string;
  passed: boolean | null;
  catalogKey: string | null | undefined;
  craftHits: number;
  applicationStatus?: string | null;
  leftActiveQueueEmails: Iterable<string>;
  settledOffer?: boolean;
  huntRequired?: boolean;
  huntNeeded?: number;
}): RecruitingStage {
  const status = input.applicationStatus || null;
  if (status === 'rejected') return 'discarded';
  if (status === 'hired') return 'hired';
  if (status && !isClosedApplicationStatus(status)) return 'applied';
  if (!status && input.settledOffer) return 'hired';
  if (
    isCandidateReadyForCv({
      email: input.email,
      passed: input.passed,
      catalogKey: input.catalogKey,
      craftHits: input.craftHits,
      leftActiveQueueEmails: input.leftActiveQueueEmails,
      huntRequired: input.huntRequired,
      huntNeeded: input.huntNeeded,
    })
  ) {
    return 'ready';
  }
  return 'test';
}

export function recruitingStageLabel(stage: RecruitingStage): string {
  if (stage === 'ready') return 'Listos para CV';
  if (stage === 'applied') return 'Con CV';
  if (stage === 'test') return 'En prueba';
  if (stage === 'discarded') return 'Descartados';
  return 'Contratados';
}

export function settledOfferEmailsFrom(
  offers: { email?: string | null; career_email?: string | null; status: string }[]
): Set<string> {
  const emails = new Set<string>();
  for (const row of offers) {
    if (!isSettledPersonnelOfferStatus(row.status)) continue;
    if (row.career_email) emails.add(careerEmailKey(row.career_email));
    if (row.email) emails.add(careerEmailKey(row.email));
  }
  return emails;
}
