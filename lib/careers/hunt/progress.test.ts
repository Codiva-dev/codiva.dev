import { describe, expect, it } from 'vitest';
import { HUNT_COVER_CRAFTS } from '@/lib/ops/career-disciplines';
import { huntCoversAllCrafts, huntProgressFromReports } from './progress';

describe('huntCoversAllCrafts', () => {
  it('covers every craft when the posting does not ask for one', () => {
    expect(huntCoversAllCrafts({ asksDiscipline: false, catalogKey: 'tester-general' })).toBe(true);
    expect(huntCoversAllCrafts({ asksDiscipline: true, catalogKey: 'tester-frontend' })).toBe(false);
    expect(huntCoversAllCrafts({ catalogKey: 'tester-general' })).toBe(true);
    expect(huntCoversAllCrafts({ catalogKey: 'tester-frontend' })).toBe(false);
  });
});

describe('huntProgressFromReports', () => {
  it('needs one matched seed per finding type and ignores duplicates of the same type', () => {
    const progress = huntProgressFromReports(
      [
        { matched_seed_id: 'career-copyright-year', created_at: '2026-09-01T10:00:00.000Z' },
        { matched_seed_id: 'feed-get-201', created_at: '2026-09-01T10:01:00.000Z' },
      ],
      { required: true, coverAllCrafts: true, discipline: null }
    );
    expect(progress.needed).toBe(HUNT_COVER_CRAFTS.length);
    expect(progress.needed).toBe(3);
    expect(progress.matched).toBe(2);
    expect(progress.ready).toBe(false);
    expect(progress.crafts.find((slot) => slot.craft === 'functional')?.found).toBe(true);
    expect(progress.crafts.find((slot) => slot.craft === 'api')?.found).toBe(true);
    expect(progress.crafts.find((slot) => slot.craft === 'security')?.found).toBe(false);
    expect(progress.crafts.map((slot) => slot.craft)).toEqual(['functional', 'api', 'security']);
  });

  it('does not let a second finding of the same type close another slot', () => {
    const progress = huntProgressFromReports(
      [
        { matched_seed_id: 'career-copyright-year', created_at: '2026-09-01T10:00:00.000Z' },
        { matched_seed_id: 'career-mapa-404', created_at: '2026-09-01T10:02:00.000Z' },
      ],
      { required: true, coverAllCrafts: true, discipline: null }
    );
    expect(progress.matched).toBe(1);
    expect(progress.crafts.filter((slot) => slot.found).map((slot) => slot.craft)).toEqual(['functional']);
  });

  it('closes when every required finding type has a seed', () => {
    const progress = huntProgressFromReports(
      [
        { matched_seed_id: 'career-skip-mismatch', created_at: '2026-09-01T10:00:00.000Z' },
        { matched_seed_id: 'career-feed-content-type', created_at: '2026-09-01T10:01:00.000Z' },
        { matched_seed_id: 'career-feed-empty-jobs', created_at: '2026-09-01T10:02:00.000Z' },
        { matched_seed_id: 'career-lang-en', created_at: '2026-09-01T10:03:00.000Z' },
        { matched_seed_id: 'career-copyright-year', created_at: '2026-09-01T10:04:00.000Z' },
        { matched_seed_id: 'career-feed-debug-key', created_at: '2026-09-01T10:05:00.000Z' },
      ],
      { required: true, coverAllCrafts: true, discipline: null }
    );
    expect(progress.ready).toBe(true);
    expect(progress.matched).toBe(3);
    expect(progress.readyAt).toBe('2026-09-01T10:05:00.000Z');
  });

  it('still closes a single-craft hunt with one matching seed', () => {
    const progress = huntProgressFromReports(
      [{ matched_seed_id: 'career-copyright-year', created_at: '2026-09-01T10:00:00.000Z' }],
      { required: true, coverAllCrafts: false, discipline: 'qa' }
    );
    expect(progress.ready).toBe(true);
    expect(progress.needed).toBe(1);
    expect(progress.coverAllCrafts).toBe(false);
  });

  it('closes a frontend hunt with a functional seed that used to belong to QA', () => {
    const progress = huntProgressFromReports(
      [{ matched_seed_id: 'career-copyright-year', created_at: '2026-09-01T10:00:00.000Z' }],
      { required: true, coverAllCrafts: false, discipline: 'frontend' }
    );
    expect(progress.ready).toBe(true);
  });
});
