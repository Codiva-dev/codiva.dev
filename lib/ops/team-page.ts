export type TeamTab = 'miembros' | 'ofertas' | 'entrevistadores' | 'bolsa';

export function resolveTeamTab(tabParam: string | undefined, canManageTeam: boolean): TeamTab {
  if (tabParam === 'bolsa') return 'bolsa';
  if (tabParam === 'entrevistadores') return 'entrevistadores';
  if (!canManageTeam) return 'bolsa';
  if (tabParam === 'ofertas') return 'ofertas';
  return 'miembros';
}

export function teamTabLoads(tab: TeamTab, canManageTeam: boolean) {
  return {
    members: tab === 'miembros' && canManageTeam,
    offerList: tab === 'ofertas' && canManageTeam,
    offerLinks: tab === 'miembros' && canManageTeam,
    jobsFull: tab === 'bolsa',
    jobsLite: tab === 'entrevistadores',
    partners: tab === 'entrevistadores' || tab === 'bolsa',
    partnerEmails: tab === 'entrevistadores',
    offerCount: canManageTeam && tab !== 'ofertas',
    newApplicationCount: tab !== 'bolsa',
  };
}

export function rowsMissingEmail<T extends { email?: string | null }>(rows: T[]): T[] {
  return rows.filter((row) => !String(row.email || '').trim());
}
