import {
  CAREER_DISCIPLINES,
  isCareerDiscipline,
  type CareerDiscipline,
} from '@/lib/ops/career-disciplines';
import { HUNT_SEEDS, huntSeedById, type HuntDifficulty, type HuntSeed, type HuntSurface } from './seeds';
import { careerBaseUrl } from '@/lib/ops/host';

function fold(value: string): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();
}

function parseUrl(raw: string): URL | null {
  const value = String(raw || '').trim();
  if (!value) return null;
  try {
    return value.includes('://') ? new URL(value) : new URL(value, `${careerBaseUrl()}/`);
  } catch {
    return null;
  }
}

function normalizePath(raw: string): string {
  const url = parseUrl(raw);
  if (url) {
    let path = url.pathname.replace(/\/+$/, '') || '/';
    const host = url.hostname.toLowerCase();
    if (host.startsWith('career.') && path === '/') path = '/empleos';
    return path.toLowerCase();
  }
  const path = String(raw || '').split('?')[0]?.toLowerCase() || '';
  return path.startsWith('/') ? path.replace(/\/+$/, '') || '/' : `/${path}`;
}

function reportSurface(raw: string): HuntSurface | null {
  const url = parseUrl(raw);
  if (!url) return null;
  const host = url.hostname.toLowerCase();
  if (host.startsWith('career.')) return 'career';
  if (host === 'www.codiva.dev' || host === 'codiva.dev') return 'marketing';
  return null;
}

function pathMatches(seed: HuntSeed, path: string): boolean {
  if (seed.paths.includes('*')) return true;
  return seed.paths.some((prefix) => {
    const p = prefix.replace(/\/+$/, '') || '/';
    if (p === '/') return path === '/' || path === '/empleos';
    return path === p || path.startsWith(`${p}/`);
  });
}

function tokenHits(blob: string, token: string): boolean {
  const t = fold(token).trim();
  if (!t) return false;
  if (t.length >= 6 || /[^a-z0-9]/.test(t)) return blob.includes(t);
  const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'u').test(blob);
}

function matchedTokens(blob: string, tokens: string[]): string[] {
  return tokens.filter((token) => tokenHits(blob, token));
}

function isStrongToken(token: string): boolean {
  const t = fold(token);
  return t.length >= 12 || /[_/=#.:\[\]]/.test(t) || (t.length >= 8 && t.includes('-'));
}

/** Oficio dueño + full stack (front o back) + «otro» (cualquiera). */
export function craftsCountedFor(discipline: CareerDiscipline): CareerDiscipline[] {
  if (discipline === 'fullstack') return ['frontend', 'backend', 'fullstack'];
  if (discipline === 'other') return [...CAREER_DISCIPLINES];
  return [discipline];
}

export function seedCountsForDiscipline(seed: HuntSeed, discipline: CareerDiscipline): boolean {
  return craftsCountedFor(discipline).includes(seed.craft);
}

export function matchedSeedCountsForDiscipline(
  seedId: string | null | undefined,
  discipline: CareerDiscipline
): boolean {
  const seed = seedId ? huntSeedById(seedId) : null;
  return Boolean(seed && seedCountsForDiscipline(seed, discipline));
}

export type HuntMatch = {
  seedId: string;
  title: string;
  craft: CareerDiscipline;
  difficulty: HuntDifficulty;
  countsForCraft: boolean;
  score: number;
};

export function matchHuntReport(input: {
  pageUrl: string;
  title: string;
  description: string;
  expected?: string | null;
  discipline?: string | null;
}): HuntMatch | null {
  const path = normalizePath(input.pageUrl);
  const surface = reportSurface(input.pageUrl);
  const blob = fold(`${input.title} ${input.description} ${input.expected || ''}`);
  const rawDiscipline = input.discipline ?? '';
  const discipline = isCareerDiscipline(rawDiscipline) ? rawDiscipline : null;
  let best: HuntMatch | null = null;

  for (const seed of HUNT_SEEDS) {
    if (seed.surface === 'career' && surface === 'marketing') continue;
    if (!pathMatches(seed, path)) continue;

    const anchors = matchedTokens(blob, seed.anchors);
    const minAnchors = seed.minAnchors ?? 1;
    if (anchors.length < minAnchors) continue;

    const support = matchedTokens(blob, seed.keywords);
    const strong = anchors.some(isStrongToken);
    if (!strong && support.length < 1) continue;

    const countsForCraft = discipline
      ? seedCountsForDiscipline(seed, discipline)
      : seed.craft !== 'other';
    const score =
      anchors.length * 25 +
      support.length * 8 +
      (seed.paths.includes('*') ? 0 : 5) +
      (countsForCraft ? 20 : 0);

    if (!best || score > best.score) {
      best = {
        seedId: seed.id,
        title: seed.title,
        craft: seed.craft,
        difficulty: seed.difficulty,
        countsForCraft,
        score,
      };
    }
  }
  return best;
}
