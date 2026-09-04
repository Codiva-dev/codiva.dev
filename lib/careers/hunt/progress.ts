import { createAdminClient } from '@/lib/supabase/admin';
import { ASSESSMENT_PASS_WINDOW_DAYS } from '@/lib/careers/assessments/engine';
import {
  HUNT_COVER_CRAFTS,
  disciplineFromCatalogKey,
  type CareerDiscipline,
  type HuntCoverCraft,
} from '@/lib/ops/career-disciplines';
import { matchedSeedCountsForDiscipline } from './match';
import { huntRequiredForCatalog, huntRequiredForPosting, huntSeedById } from './seeds';
import { EMPTY_HUNT_SCORE, scoreHuntReports, type HuntScore } from './score';

export type HuntCraftSlot = {
  craft: HuntCoverCraft;
  found: boolean;
  foundAt: string | null;
};

export type HuntProgress = {
  required: boolean;
  ready: boolean;
  /** Primera vez que se cubrió lo pedido (un tipo, o el último de los tres). */
  readyAt: string | null;
  matched: number;
  needed: number;
  discipline: CareerDiscipline | null;
  coverAllCrafts: boolean;
  crafts: HuntCraftSlot[];
  score: HuntScore;
};

export const EMPTY_HUNT_PROGRESS: HuntProgress = {
  required: false,
  ready: true,
  readyAt: null,
  matched: 0,
  needed: 0,
  discipline: null,
  coverAllCrafts: false,
  crafts: [],
  score: EMPTY_HUNT_SCORE,
};

export function huntCoversAllCrafts(input: {
  asksDiscipline?: boolean | null;
  catalogKey?: string | null;
}): boolean {
  if (input.asksDiscipline === true) return false;
  if (input.asksDiscipline === false) return huntRequiredForCatalog(input.catalogKey);
  const key = String(input.catalogKey || '').trim().toLowerCase();
  return key === 'tester-general' || key === 'tester';
}

export function huntNeededCount(coverAllCrafts: boolean): number {
  return coverAllCrafts ? HUNT_COVER_CRAFTS.length : 1;
}

export type PublicHuntSession = {
  hunt_required: boolean;
  hunt_ready: boolean;
  hunt_cover_all: boolean;
  hunt_matched: number;
  hunt_needed: number;
  hunt_crafts: { craft: HuntCoverCraft; found: boolean }[];
};

export function toPublicHuntSession(hunt: HuntProgress): PublicHuntSession {
  return {
    hunt_required: hunt.required,
    hunt_ready: hunt.ready,
    hunt_cover_all: hunt.coverAllCrafts,
    hunt_matched: hunt.matched,
    hunt_needed: hunt.needed,
    hunt_crafts: hunt.coverAllCrafts
      ? hunt.crafts.map((slot) => ({ craft: slot.craft, found: slot.found }))
      : [],
  };
}

function emptyRequired(discipline: CareerDiscipline | null, coverAllCrafts: boolean): HuntProgress {
  const crafts: HuntCraftSlot[] = coverAllCrafts
    ? HUNT_COVER_CRAFTS.map((craft) => ({ craft, found: false, foundAt: null }))
    : [];
  return {
    required: true,
    ready: false,
    readyAt: null,
    matched: 0,
    needed: huntNeededCount(coverAllCrafts),
    discipline,
    coverAllCrafts,
    crafts,
    score: EMPTY_HUNT_SCORE,
  };
}

export function huntProgressFromReports(
  reports: { matched_seed_id?: string | null; created_at?: string | null }[],
  input: {
    required: boolean;
    coverAllCrafts: boolean;
    discipline: CareerDiscipline | null;
  }
): HuntProgress {
  if (!input.required) {
    return { ...EMPTY_HUNT_PROGRESS, discipline: input.discipline };
  }
  const score = scoreHuntReports(reports, input.discipline, {
    coverAllCrafts: input.coverAllCrafts,
  });

  if (input.coverAllCrafts) {
    const firstAt = new Map<HuntCoverCraft, string>();
    for (const row of reports) {
      const seed = row.matched_seed_id ? huntSeedById(row.matched_seed_id) : null;
      if (!seed || !HUNT_COVER_CRAFTS.includes(seed.craft)) continue;
      const at = String(row.created_at || '');
      const prev = firstAt.get(seed.craft);
      if (!prev || (at && at < prev)) firstAt.set(seed.craft, at);
    }
    const crafts: HuntCraftSlot[] = HUNT_COVER_CRAFTS.map((craft) => ({
      craft,
      found: firstAt.has(craft),
      foundAt: firstAt.get(craft) || null,
    }));
    const matched = crafts.filter((slot) => slot.found).length;
    const needed = HUNT_COVER_CRAFTS.length;
    const foundAts = crafts.map((slot) => slot.foundAt).filter((at): at is string => Boolean(at));
    const ready = matched >= needed;
    const readyAt = ready && foundAts.length ? [...foundAts].sort().at(-1) || null : null;
    return {
      required: true,
      ready,
      readyAt,
      matched,
      needed,
      discipline: input.discipline,
      coverAllCrafts: true,
      crafts,
      score,
    };
  }

  const discipline = input.discipline;
  if (!discipline) {
    return emptyRequired(null, false);
  }

  const matchingTimes = reports
    .filter((row) => matchedSeedCountsForDiscipline(row.matched_seed_id, discipline))
    .map((row) => String(row.created_at || ''))
    .filter(Boolean)
    .sort();
  const matched = matchingTimes.length;
  return {
    required: true,
    ready: matched >= 1,
    readyAt: matched >= 1 ? matchingTimes[0] : null,
    matched,
    needed: 1,
    discipline,
    coverAllCrafts: false,
    crafts: [],
    score,
  };
}

export async function postingRequiresHunt(
  jobPostingId: string,
  catalogKey?: string | null
): Promise<boolean> {
  const { data } = await createAdminClient()
    .from('ops_job_postings')
    .select('requires_hunt, asks_discipline')
    .eq('id', jobPostingId)
    .maybeSingle();
  return huntRequiredForPosting(data?.requires_hunt, catalogKey);
}

export async function huntProgressForAttempt(input: {
  email: string;
  catalogKey: string;
  jobPostingId?: string;
  required?: boolean;
}): Promise<HuntProgress> {
  let required = input.required;
  let asksDiscipline: boolean | null = null;
  if (input.jobPostingId) {
    const { data } = await createAdminClient()
      .from('ops_job_postings')
      .select('requires_hunt, asks_discipline')
      .eq('id', input.jobPostingId)
      .maybeSingle();
    if (required === undefined) {
      required = huntRequiredForPosting(data?.requires_hunt, input.catalogKey);
    }
    if (typeof data?.asks_discipline === 'boolean') asksDiscipline = data.asks_discipline;
  }
  if (required === undefined) required = huntRequiredForCatalog(input.catalogKey);
  const coverAllCrafts = huntCoversAllCrafts({
    asksDiscipline,
    catalogKey: input.catalogKey,
  });
  const discipline = coverAllCrafts
    ? null
    : asksDiscipline === false
      ? 'other'
      : disciplineFromCatalogKey(input.catalogKey);

  if (!required) {
    return { ...EMPTY_HUNT_PROGRESS, discipline };
  }
  if (!coverAllCrafts && !discipline) {
    return { ...EMPTY_HUNT_PROGRESS, required: false, discipline };
  }

  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - ASSESSMENT_PASS_WINDOW_DAYS * 24 * 3600 * 1000).toISOString();
  const { data } = await admin
    .from('ops_hunt_reports')
    .select('matched_seed_id, created_at')
    .ilike('email', input.email)
    .gte('created_at', cutoff);

  return huntProgressFromReports(data ?? [], {
    required: true,
    coverAllCrafts,
    discipline,
  });
}
