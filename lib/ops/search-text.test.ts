import { describe, expect, it } from 'vitest';
import {
  foldText,
  highlightMatches,
  rankedFilterSuggestions,
  tallyFilterValues,
  textMatches,
} from './search-text';

describe('foldText', () => {
  it('strips accents and lowercases', () => {
    expect(foldText('  Fundación ')).toBe('fundacion');
  });
});

describe('textMatches', () => {
  it('treats an empty query as a match', () => {
    expect(textMatches('cualquier cosa', '  ')).toBe(true);
  });

  it('matches without accents', () => {
    expect(textMatches('B1 · Fundaciones', 'fundaciones')).toBe(true);
    expect(textMatches('Jean Claude', 'claude')).toBe(true);
  });

  it('requires every token of 2+ chars', () => {
    expect(textMatches('Migrar auth de Supabase', 'migrar supabase')).toBe(true);
    expect(textMatches('Migrar auth de Supabase', 'migrar kiosk')).toBe(false);
    expect(textMatches('Portal NIRC', 'a nirc')).toBe(true);
  });

  it('matches digit fragments for phones and ids', () => {
    expect(textMatches('Tel 55 1234 5678', '551234')).toBe(true);
    expect(textMatches('Ticket AB-90210', '90210')).toBe(true);
  });

  it('does not digit-match mixed codes like INV-12', () => {
    expect(textMatches('Factura 99', 'INV12')).toBe(false);
  });
});

describe('highlightMatches', () => {
  it('marks folded tokens in the original string', () => {
    const spans = highlightMatches('B1 · Fundaciones', 'fundaciones');
    expect(spans.filter((span) => span.match).map((span) => span.text)).toEqual(['Fundaciones']);
  });

  it('returns the whole string unmarked when nothing hits', () => {
    expect(highlightMatches('Pool FCFS', 'kiosk')).toEqual([{ text: 'Pool FCFS', match: false }]);
  });
});

describe('tallyFilterValues', () => {
  it('counts picked keys', () => {
    const counts = tallyFilterValues(
      [{ stream: 'delivery' }, { stream: 'delivery' }, { stream: 'people' }],
      (row) => row.stream
    );
    expect(counts.get('delivery')).toBe(2);
    expect(counts.get('people')).toBe(1);
  });
});

describe('rankedFilterSuggestions', () => {
  it('ranks matching options by count', () => {
    const hits = rankedFilterSuggestions('jean', [
      {
        id: 'person',
        label: 'Persona',
        options: [
          { value: '1', label: 'Jean Claude', count: 3 },
          { value: '2', label: 'Rafael', count: 8 },
        ],
      },
    ]);
    expect(hits.map((hit) => hit.value)).toEqual(['1']);
  });
});
