import { describe, expect, it } from 'vitest';
import { scoreHuntReports } from './score';

describe('scoreHuntReports', () => {
  it('does not treat leftover “other” as a single-craft hunt when covering every type', () => {
    const reports = [
      { matched_seed_id: 'career-copyright-year' },
      { matched_seed_id: 'feed-http-date-2024' },
      { matched_seed_id: 'career-feed-debug-key' },
    ];
    expect(scoreHuntReports(reports, 'other', { coverAllCrafts: true }).consideration).toBe('strong');
    expect(scoreHuntReports(reports, 'other').consideration).toBe('solid');
  });
});
