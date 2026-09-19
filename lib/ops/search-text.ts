export type HighlightSpan = { text: string; match: boolean };

export function foldText(value: string | null | undefined): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .trim();
}

function digitsOnly(value: string | null | undefined): string {
  return String(value ?? '').replace(/\D/g, '');
}

function looksLikeCode(value: string): boolean {
  const raw = String(value ?? '').trim();
  if (!raw || /\s/.test(raw)) return false;
  const compact = raw.replace(/[^a-zA-Z0-9]/g, '');
  return compact.length >= 3 && compact.length <= 16 && /[a-zA-Z]/.test(compact) && /\d/.test(compact);
}

function allIncluded(haystack: string, tokens: string[]): boolean {
  return tokens.every((token) => haystack.includes(token));
}

type FoldMap = {
  normalized: string;
  origStart: number[];
  origEnd: number[];
};

function foldMap(source: string): FoldMap {
  const origStart: number[] = [];
  const origEnd: number[] = [];
  let normalized = '';
  let index = 0;
  while (index < source.length) {
    const char = String.fromCodePoint(source.codePointAt(index) ?? 0);
    const width = char.length;
    const folded = char.normalize('NFD').replace(/\p{M}+/gu, '').toLowerCase();
    if (!folded) {
      if (origEnd.length) origEnd[origEnd.length - 1] = index + width;
      index += width;
      continue;
    }
    for (const piece of folded) {
      origStart.push(index);
      origEnd.push(index + width);
      normalized += piece;
    }
    index += width;
  }
  return { normalized, origStart, origEnd };
}

export function textMatches(haystack: string | null | undefined, query: string | null | undefined): boolean {
  const needle = foldText(query);
  if (!needle) return true;
  const folded = foldText(haystack);
  if (folded.includes(needle)) return true;
  const tokens = needle.split(/\s+/).filter((token) => token.length >= 2);
  if (tokens.length > 0 && allIncluded(folded, tokens)) return true;
  if (looksLikeCode(String(query ?? ''))) return false;
  const queryDigits = digitsOnly(query);
  if (queryDigits.length >= 3) {
    const hayDigits = digitsOnly(haystack);
    if (hayDigits.includes(queryDigits)) return true;
    if (tokens.length > 1) {
      const tokenDigits = tokens.map(digitsOnly).filter(Boolean);
      if (tokenDigits.length === tokens.length && allIncluded(hayDigits, tokenDigits)) return true;
    }
  }
  return false;
}

export function highlightMatches(
  source: string | null | undefined,
  query: string | null | undefined
): HighlightSpan[] {
  const text = source == null ? '' : String(source);
  if (!text) return [];
  const foldedQuery = foldText(query);
  if (!foldedQuery) return [{ text, match: false }];
  const tokens = foldedQuery.split(/\s+/).filter((token) => token.length >= 2);
  if (!tokens.length) return [{ text, match: false }];
  const { normalized, origStart, origEnd } = foldMap(text);
  if (!normalized) return [{ text, match: false }];

  const ranges: Array<{ start: number; end: number }> = [];
  for (const token of tokens) {
    if (token.length > normalized.length) continue;
    let from = 0;
    while (from <= normalized.length - token.length) {
      const at = normalized.indexOf(token, from);
      if (at < 0) break;
      ranges.push({ start: origStart[at], end: origEnd[at + token.length - 1] });
      from = at + token.length;
    }
  }
  if (!ranges.length) return [{ text, match: false }];

  ranges.sort((a, b) => a.start - b.start || a.end - b.end);
  const merged: Array<{ start: number; end: number }> = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (last && range.start <= last.end) last.end = Math.max(last.end, range.end);
    else merged.push({ ...range });
  }

  const spans: HighlightSpan[] = [];
  let cursor = 0;
  for (const range of merged) {
    if (range.start > cursor) spans.push({ text: text.slice(cursor, range.start), match: false });
    spans.push({ text: text.slice(range.start, range.end), match: true });
    cursor = range.end;
  }
  if (cursor < text.length) spans.push({ text: text.slice(cursor), match: false });
  return spans.filter((span) => span.text !== '');
}

export function tallyFilterValues<T>(
  rows: T[],
  pick: (row: T) => string | string[] | null | undefined
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    let raw: string | string[] | null | undefined;
    try {
      raw = pick(row);
    } catch {
      continue;
    }
    const values = Array.isArray(raw) ? raw : [raw];
    for (const value of values) {
      if (value == null || value === '') continue;
      const key = String(value).trim();
      if (!key) continue;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }
  return counts;
}

export function rankedFilterSuggestions<T extends { id: string; label: string; options?: Array<{ value: string; label: string; count?: number }> }>(
  query: string,
  groups: T[],
  limit = 12
): Array<{ groupId: string; groupLabel: string; value: string; label: string; count: number }> {
  const needle = foldText(query);
  if (!needle) return [];
  const hits: Array<{ groupId: string; groupLabel: string; value: string; label: string; count: number }> = [];
  for (const group of groups) {
    for (const option of group.options || []) {
      const haystack = `${group.label} ${option.label} ${option.value}`;
      if (!textMatches(haystack, query) && !foldText(haystack).includes(needle)) continue;
      hits.push({
        groupId: group.id,
        groupLabel: group.label,
        value: option.value,
        label: option.label,
        count: Number(option.count) || 0,
      });
    }
  }
  return hits
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'es'))
    .slice(0, limit);
}
