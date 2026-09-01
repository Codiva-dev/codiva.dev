import { describe, expect, it } from 'vitest';
import { HUNT_COVER_CRAFTS } from '@/lib/ops/career-disciplines';
import { HUNT_SEEDS, type HuntDifficulty } from './seeds';

const LEVELS: HuntDifficulty[] = ['easy', 'medium', 'hard'];

describe('HUNT_SEEDS coverage', () => {
  it('plants at least two findings per craft and difficulty', () => {
    for (const craft of HUNT_COVER_CRAFTS) {
      for (const difficulty of LEVELS) {
        const count = HUNT_SEEDS.filter((seed) => seed.craft === craft && seed.difficulty === difficulty).length;
        expect(count, `${craft} ${difficulty}`).toBeGreaterThanOrEqual(2);
      }
    }
  });
});
