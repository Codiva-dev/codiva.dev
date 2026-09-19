import { describe, expect, it } from 'vitest';
import { resolveTeamTab, rowsMissingEmail, teamTabLoads } from './team-page';

describe('resolveTeamTab', () => {
  it('keeps explicit public tabs', () => {
    expect(resolveTeamTab('bolsa', true)).toBe('bolsa');
    expect(resolveTeamTab('entrevistadores', false)).toBe('entrevistadores');
  });

  it('defaults staff without team capability to bolsa', () => {
    expect(resolveTeamTab(undefined, false)).toBe('bolsa');
    expect(resolveTeamTab('miembros', false)).toBe('bolsa');
    expect(resolveTeamTab('ofertas', false)).toBe('bolsa');
  });

  it('defaults team managers to miembros', () => {
    expect(resolveTeamTab(undefined, true)).toBe('miembros');
    expect(resolveTeamTab('ofertas', true)).toBe('ofertas');
  });
});

describe('teamTabLoads', () => {
  it('does not pull career datasets on miembros', () => {
    expect(teamTabLoads('miembros', true)).toMatchObject({
      members: true,
      offerLinks: true,
      offerList: false,
      jobsFull: false,
      jobsLite: false,
      partners: false,
      partnerEmails: false,
      offerCount: true,
      newApplicationCount: true,
    });
  });

  it('keeps interview partners off ofertas', () => {
    expect(teamTabLoads('ofertas', true)).toMatchObject({
      members: false,
      offerList: true,
      jobsFull: false,
      partners: false,
      offerCount: false,
      newApplicationCount: true,
    });
  });

  it('loads lite jobs on entrevistadores and full jobs on bolsa', () => {
    expect(teamTabLoads('entrevistadores', true).jobsLite).toBe(true);
    expect(teamTabLoads('entrevistadores', true).jobsFull).toBe(false);
    expect(teamTabLoads('bolsa', true).jobsFull).toBe(true);
    expect(teamTabLoads('bolsa', true).partnerEmails).toBe(false);
  });
});

describe('rowsMissingEmail', () => {
  it('skips rows that already have an email', () => {
    expect(
      rowsMissingEmail([
        { id: '1', email: 'a@codiva.dev' },
        { id: '2', email: '  ' },
        { id: '3', email: null },
      ]).map((row) => row.id)
    ).toEqual(['2', '3']);
  });
});
