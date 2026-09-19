import { describe, expect, it } from 'vitest';
import { filterSearchHits, groupSearchHits, type OpsSearchHit } from './global-search';

const hits: OpsSearchHit[] = [
  { id: 'p1', group: 'page', title: 'Asignaciones', subtitle: 'Tablero', href: '/asignaciones' },
  { id: 'a1', group: 'assignment', title: 'Portal NIRC', subtitle: 'Jean', href: '/asignaciones?id=a1' },
  { id: 'l1', group: 'lead', title: 'Acme', subtitle: 'ana@acme.com', href: '/leads/l1' },
];

describe('filterSearchHits', () => {
  it('shows pages when the query is empty', () => {
    expect(filterSearchHits(hits, '').map((hit) => hit.id)).toEqual(['p1']);
  });

  it('matches entities without accents', () => {
    expect(filterSearchHits(hits, 'nirc').map((hit) => hit.id)).toEqual(['a1']);
  });
});

describe('groupSearchHits', () => {
  it('keeps group order and drops empty groups', () => {
    expect(groupSearchHits(hits).map((row) => row.group)).toEqual(['page', 'assignment', 'lead']);
  });
});
