import { describe, expect, it } from 'vitest';
import {
  applicationCoversAttempt,
  attemptsForApplication,
  careerEmailKey,
  classifyRecruitingStage,
  isCandidateReadyForCv,
  latestAttemptByJobEmail,
  recruitingAttemptKey,
  recruitingStageLabel,
  settledOfferEmailsFrom,
} from './recruiting-stage';

const tester = 'tester-frontend';
const queue = (emails: string[]) => emails.map(careerEmailKey);

describe('isCandidateReadyForCv', () => {
  it('requires a pass, a craft hit when hunt is required, and no CV yet', () => {
    expect(
      isCandidateReadyForCv({
        email: 'a@x.com',
        passed: true,
        catalogKey: tester,
        craftHits: 1,
        leftActiveQueueEmails: queue([]),
      })
    ).toBe(true);
  });

  it('treats a non-tester catalog as ready without a hunt hit', () => {
    expect(
      isCandidateReadyForCv({
        email: 'a@x.com',
        passed: true,
        catalogKey: 'pm-general',
        craftHits: 0,
        leftActiveQueueEmails: queue([]),
      })
    ).toBe(true);
  });

  it('requires every craft when huntNeeded is 6', () => {
    expect(
      isCandidateReadyForCv({
        email: 'a@x.com',
        passed: true,
        catalogKey: 'tester-general',
        craftHits: 5,
        leftActiveQueueEmails: queue([]),
        huntNeeded: 6,
      })
    ).toBe(false);
    expect(
      isCandidateReadyForCv({
        email: 'a@x.com',
        passed: true,
        catalogKey: 'tester-general',
        craftHits: 6,
        leftActiveQueueEmails: queue([]),
        huntNeeded: 6,
      })
    ).toBe(true);
  });

  it('honors an explicit huntRequired flag over the catalog', () => {
    expect(
      isCandidateReadyForCv({
        email: 'a@x.com',
        passed: true,
        catalogKey: tester,
        craftHits: 0,
        leftActiveQueueEmails: queue([]),
        huntRequired: false,
      })
    ).toBe(true);
  });

  it('rejects a failed attempt, a tester without a craft hit, or someone already in the queue', () => {
    expect(
      isCandidateReadyForCv({
        email: 'a@x.com',
        passed: false,
        catalogKey: tester,
        craftHits: 2,
        leftActiveQueueEmails: queue([]),
      })
    ).toBe(false);
    expect(
      isCandidateReadyForCv({
        email: 'a@x.com',
        passed: true,
        catalogKey: tester,
        craftHits: 0,
        leftActiveQueueEmails: queue([]),
      })
    ).toBe(false);
    expect(
      isCandidateReadyForCv({
        email: 'A@x.com',
        passed: true,
        catalogKey: tester,
        craftHits: 1,
        leftActiveQueueEmails: queue(['a@x.com']),
      })
    ).toBe(false);
  });
});

describe('classifyRecruitingStage', () => {
  const base = {
    email: 'a@x.com',
    passed: true as boolean | null,
    catalogKey: tester,
    craftHits: 1,
    leftActiveQueueEmails: queue([]),
  };

  it('names bolsa phases from application status first', () => {
    expect(classifyRecruitingStage({ ...base, applicationStatus: 'rejected' })).toBe('discarded');
    expect(classifyRecruitingStage({ ...base, applicationStatus: 'hired' })).toBe('hired');
    expect(classifyRecruitingStage({ ...base, applicationStatus: 'interview' })).toBe('applied');
    expect(classifyRecruitingStage({ ...base, applicationStatus: 'new' })).toBe('applied');
  });

  it('uses ready vs test when there is no application', () => {
    expect(classifyRecruitingStage(base)).toBe('ready');
    expect(classifyRecruitingStage({ ...base, passed: false })).toBe('test');
    expect(classifyRecruitingStage({ ...base, craftHits: 0 })).toBe('test');
  });

  it('treats a settled offer without an application as hired', () => {
    expect(classifyRecruitingStage({ ...base, settledOffer: true })).toBe('hired');
    expect(
      classifyRecruitingStage({ ...base, applicationStatus: 'reviewed', settledOffer: true })
    ).toBe('applied');
  });

  it('exposes the same labels the bolsa uses', () => {
    expect(recruitingStageLabel('ready')).toBe('Listos para CV');
    expect(recruitingStageLabel('applied')).toBe('Con CV');
    expect(recruitingStageLabel('test')).toBe('En prueba');
    expect(recruitingStageLabel('discarded')).toBe('Descartados');
    expect(recruitingStageLabel('hired')).toBe('Contratados');
  });
});

describe('applicationCoversAttempt', () => {
  const testerJob = 'job-tester';
  const pmJob = 'job-pm';

  it('only covers the vacancy they already applied to', () => {
    const applications = [{ email: 'a@x.com', job_posting_id: testerJob }];
    expect(
      applicationCoversAttempt({ email: 'A@x.com', jobPostingId: testerJob, applications })
    ).toBe(true);
    expect(
      applicationCoversAttempt({ email: 'a@x.com', jobPostingId: pmJob, applications })
    ).toBe(false);
  });

  it('keeps a new vacancy test visible after a hire on another opening', () => {
    expect(
      applicationCoversAttempt({
        email: 'a@x.com',
        jobPostingId: testerJob,
        applications: [{ email: 'a@x.com', job_posting_id: pmJob }],
      })
    ).toBe(false);
  });
});

describe('latestAttemptByJobEmail', () => {
  it('keeps the newest attempt per vacancy, not per person', () => {
    const map = latestAttemptByJobEmail([
      { id: 'old', email: 'a@x.com', job_posting_id: 'job-a', started_at: '2026-08-01T00:00:00Z' },
      { id: 'new', email: 'a@x.com', job_posting_id: 'job-a', started_at: '2026-09-03T00:00:00Z' },
      { id: 'other', email: 'a@x.com', job_posting_id: 'job-b', started_at: '2026-08-15T00:00:00Z' },
    ]);
    expect(map.get(recruitingAttemptKey('a@x.com', 'job-a'))?.id).toBe('new');
    expect(map.get(recruitingAttemptKey('a@x.com', 'job-b'))?.id).toBe('other');
  });
});

describe('attemptsForApplication', () => {
  it('returns every test for that vacancy, newest first', () => {
    const rows = attemptsForApplication(
      [
        { id: 'old', email: 'a@x.com', job_posting_id: 'job-a', started_at: '2026-08-01T00:00:00Z' },
        { id: 'new', email: 'a@x.com', job_posting_id: 'job-a', started_at: '2026-09-03T00:00:00Z' },
        { id: 'other', email: 'a@x.com', job_posting_id: 'job-b', started_at: '2026-09-04T00:00:00Z' },
      ],
      { email: 'a@x.com', job_posting_id: 'job-a', assessment_attempt_id: 'old' }
    );
    expect(rows.map((row) => row.id)).toEqual(['new', 'old']);
  });
});

describe('settledOfferEmailsFrom', () => {
  it('collects sent and accepted offer emails', () => {
    const emails = settledOfferEmailsFrom([
      { email: 'ops@x.com', career_email: 'A@x.com', status: 'sent' },
      { email: 'b@x.com', career_email: null, status: 'draft' },
      { email: 'c@x.com', career_email: 'c@x.com', status: 'accepted' },
    ]);
    expect(emails.has('a@x.com')).toBe(true);
    expect(emails.has('ops@x.com')).toBe(true);
    expect(emails.has('c@x.com')).toBe(true);
    expect(emails.has('b@x.com')).toBe(false);
  });
});
