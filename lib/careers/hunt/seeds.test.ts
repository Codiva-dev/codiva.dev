import { describe, expect, it } from 'vitest';
import { HUNT_COVER_CRAFTS } from '@/lib/ops/career-disciplines';
import { HUNT_SEEDS, huntSeedCatalogText, type HuntDifficulty } from './seeds';

const LEVELS: HuntDifficulty[] = ['easy', 'medium', 'hard'];

describe('HUNT_SEEDS coverage', () => {
  it('plants at least two findings per type and difficulty', () => {
    expect(HUNT_COVER_CRAFTS).toEqual(['functional', 'api', 'security']);
    for (const craft of HUNT_COVER_CRAFTS) {
      for (const difficulty of LEVELS) {
        const count = HUNT_SEEDS.filter((seed) => seed.craft === craft && seed.difficulty === difficulty).length;
        expect(count, `${craft} ${difficulty}`).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('lists planted findings grouped by the three test types', () => {
    const catalog = huntSeedCatalogText();
    expect(catalog).toContain(`Hallazgos plantados en la vacante de tester (${HUNT_SEEDS.length}):`);
    expect(catalog).toContain('Prueba funcional');
    expect(catalog).toContain('Prueba de API');
    expect(catalog).toContain('Prueba de seguridad');
    expect(catalog).not.toContain('Tester frontend');
    for (const seed of HUNT_SEEDS) {
      expect(catalog).toContain(seed.title);
    }
  });
});
