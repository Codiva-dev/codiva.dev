import { describe, expect, it } from 'vitest';
import { huntCoverageLabel, huntTypeFilterLabel, scoreHuntReports } from './score';

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

  it('maps unified hunt consideration to how many finding types are covered', () => {
    expect(
      scoreHuntReports([{ matched_seed_id: 'career-feed-content-type' }], null, { coverAllCrafts: true })
        .consideration
    ).toBe('minimum');
    expect(
      scoreHuntReports(
        [{ matched_seed_id: 'career-copyright-year' }, { matched_seed_id: 'feed-http-date-2024' }],
        null,
        { coverAllCrafts: true }
      ).consideration
    ).toBe('solid');
  });

  it('labels coverage by finding type instead of a craft signal', () => {
    expect(huntCoverageLabel(0, 3)).toBe('Sin tipos de prueba');
    expect(huntCoverageLabel(1, 3)).toBe('1 de 3 tipos');
    expect(huntCoverageLabel(3, 3)).toBe('3 de 3 tipos');
    expect(huntTypeFilterLabel('none')).toBe('Sin tipos');
    expect(huntTypeFilterLabel('strong')).toBe('3 tipos');
  });
});
