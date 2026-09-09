import { describe, expect, it } from 'vitest';
import { partitionInterviewQueue, selectFailedAttemptsForPartner, type InterviewQueueRow } from './interview-query';

function row(overrides: Partial<InterviewQueueRow>): InterviewQueueRow {
  return {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    full_name: 'Ada',
    email: 'ada@example.com',
    phone: null,
    status: 'interview',
    jobTitle: 'Tester',
    followUp: 'pending',
    ...overrides,
  };
}

describe('partitionInterviewQueue', () => {
  it('keeps rejected profiles in their own bucket', () => {
    const { open, rejected } = partitionInterviewQueue([
      row({ id: '1', status: 'interview', full_name: 'Activa' }),
      row({ id: '2', status: 'rejected', full_name: 'Descartada' }),
      row({ id: '3', status: 'reviewed', full_name: 'Revisada' }),
    ]);
    expect(open.map((item) => item.full_name)).toEqual(['Activa', 'Revisada']);
    expect(rejected.map((item) => item.full_name)).toEqual(['Descartada']);
  });
});

describe('selectFailedAttemptsForPartner', () => {
  const job = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const attempt = (overrides: Record<string, unknown> = {}) => ({
    id: '11111111-1111-4111-8111-111111111111',
    email: 'ada@example.com',
    full_name: 'Ada',
    job_posting_id: job,
    started_at: '2026-09-01T10:00:00.000Z',
    completed_at: '2026-09-01T10:20:00.000Z',
    status: 'completed',
    passed: false,
    score_pct: 40,
    ...overrides,
  });

  it('keeps the latest failed attempt and drops people who already applied', () => {
    const rows = selectFailedAttemptsForPartner(
      [
        attempt({ id: 'old', started_at: '2026-08-01T10:00:00.000Z', score_pct: 20 }),
        attempt({ id: 'latest', started_at: '2026-09-01T10:00:00.000Z', score_pct: 40 }),
        attempt({
          id: 'applied',
          email: 'bob@example.com',
          full_name: 'Bob',
          started_at: '2026-09-02T10:00:00.000Z',
        }),
        attempt({
          id: 'passed',
          email: 'cara@example.com',
          full_name: 'Cara',
          passed: true,
          score_pct: 90,
        }),
      ],
      [{ email: 'bob@example.com', job_posting_id: job }]
    );
    expect(rows.map((row) => row.id)).toEqual(['latest']);
  });
});
