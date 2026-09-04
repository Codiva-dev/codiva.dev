import {
  HUNT_COVER_CRAFTS,
  isCareerDiscipline,
  type CareerDiscipline,
} from '@/lib/ops/career-disciplines';
import { matchedSeedCountsForDiscipline } from './match';
import { huntSeedById, HUNT_DIFFICULTY_POINTS, type HuntDifficulty } from './seeds';

export type HuntConsideration = 'none' | 'minimum' | 'solid' | 'strong';

export type HuntScore = {
  points: number;
  craftHits: number;
  uniqueSeeds: number;
  unknown: number;
  byDifficulty: Record<HuntDifficulty, number>;
  hardest: HuntDifficulty | null;
  consideration: HuntConsideration;
};

export const EMPTY_HUNT_SCORE: HuntScore = {
  points: 0,
  craftHits: 0,
  uniqueSeeds: 0,
  unknown: 0,
  byDifficulty: { easy: 0, medium: 0, hard: 0 },
  hardest: null,
  consideration: 'none',
};

export function scoreHuntReports(
  reports: { matched_seed_id?: string | null }[],
  discipline?: string | null,
  options?: { coverAllCrafts?: boolean }
): HuntScore {
  const coverAllCrafts = Boolean(options?.coverAllCrafts);
  const craft: CareerDiscipline | null = isCareerDiscipline(discipline ?? '')
    ? (discipline as CareerDiscipline)
    : null;
  const seen = new Set<string>();
  const coveredCrafts = new Set<string>();
  const byDifficulty: Record<HuntDifficulty, number> = { easy: 0, medium: 0, hard: 0 };
  let points = 0;
  let craftHits = 0;
  let unknown = 0;
  let hardest: HuntDifficulty | null = null;

  for (const row of reports) {
    const seedId = row.matched_seed_id;
    if (!seedId) {
      unknown += 1;
      continue;
    }
    if (seen.has(seedId)) continue;
    seen.add(seedId);
    const seed = huntSeedById(seedId);
    if (!seed) {
      unknown += 1;
      continue;
    }
    if (coverAllCrafts) {
      if (!HUNT_COVER_CRAFTS.includes(seed.craft)) {
        continue;
      }
      const firstForCraft = !coveredCrafts.has(seed.craft);
      coveredCrafts.add(seed.craft);
      if (firstForCraft) craftHits += 1;
    } else {
      const counts = craft ? matchedSeedCountsForDiscipline(seed.id, craft) : true;
      if (!counts) continue;
      craftHits += 1;
    }
    points += HUNT_DIFFICULTY_POINTS[seed.difficulty];
    byDifficulty[seed.difficulty] += 1;
    if (seed.difficulty === 'hard') hardest = 'hard';
    else if (seed.difficulty === 'medium' && hardest !== 'hard') hardest = 'medium';
    else if (!hardest) hardest = 'easy';
  }

  let consideration: HuntConsideration = 'none';
  if (coverAllCrafts) {
    if (craftHits >= HUNT_COVER_CRAFTS.length) consideration = 'strong';
    else if (craftHits >= 2 || hardest === 'hard' || points >= 6) consideration = 'solid';
    else if (craftHits >= 1) consideration = 'minimum';
  } else if (craftHits >= 1) {
    if (hardest === 'hard' || points >= 6) {
      consideration = 'strong';
    } else if (hardest === 'medium' || craftHits >= 2 || points >= 3) {
      consideration = 'solid';
    } else {
      consideration = 'minimum';
    }
  }

  return {
    points: Math.round(points * 10) / 10,
    craftHits,
    uniqueSeeds: seen.size,
    unknown,
    byDifficulty,
    hardest,
    consideration,
  };
}

export function huntConsiderationLabel(value: HuntConsideration, locale: 'es' | 'en' = 'es'): string {
  if (locale === 'en') {
    if (value === 'strong') return 'Strong';
    if (value === 'solid') return 'Solid';
    if (value === 'minimum') return 'Minimum';
    return 'None';
  }
  if (value === 'strong') return 'Fuerte';
  if (value === 'solid') return 'Sólido';
  if (value === 'minimum') return 'Mínimo';
  return 'Sin señal';
}

export function huntDifficultyLabel(value: HuntDifficulty, locale: 'es' | 'en' = 'es'): string {
  if (locale === 'en') {
    if (value === 'hard') return 'Hard';
    if (value === 'medium') return 'Medium';
    return 'Easy';
  }
  if (value === 'hard') return 'Alta';
  if (value === 'medium') return 'Media';
  return 'Fácil';
}
