import { huntRequiredForCatalog } from '@/lib/careers/hunt/seeds';
import { isClosedApplicationStatus, isSettledPersonnelOfferStatus } from '@/lib/ops/careers';

export type RecruitingStage = 'test' | 'ready' | 'applied' | 'discarded' | 'hired';

export function careerEmailKey(value: string): string {
  return value.trim().toLowerCase();
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
