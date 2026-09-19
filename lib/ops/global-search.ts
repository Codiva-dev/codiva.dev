import { can, canAny, type PermissionSubject } from '@/lib/ops/permissions';
import { textMatches } from '@/lib/ops/search-text';

export const OPS_SEARCH_GROUPS = ['page', 'assignment', 'lead', 'project', 'ticket'] as const;
export type OpsSearchGroup = (typeof OPS_SEARCH_GROUPS)[number];

export type OpsSearchHit = {
  id: string;
  group: OpsSearchGroup;
  title: string;
  subtitle: string;
  href: string;
  searchText?: string;
};

export type OpsSearchNavItem = {
  href: string;
  labelKey: string;
  capability?: Parameters<typeof can>[1] | Parameters<typeof can>[1][] | null;
};

export const OPS_SEARCH_NAV: OpsSearchNavItem[] = [
  { href: '/dashboard', labelKey: 'ops.nav.dashboard', capability: null },
  { href: '/leads', labelKey: 'ops.nav.leads', capability: 'leads' },
  { href: '/inbox', labelKey: 'ops.nav.inbox', capability: 'inbox' },
  { href: '/projects', labelKey: 'ops.nav.projects', capability: null },
  { href: '/workload', labelKey: 'ops.nav.workload', capability: 'workload' },
  { href: '/pendientes', labelKey: 'ops.nav.pendientes', capability: 'assignments' },
  { href: '/asignaciones', labelKey: 'ops.nav.asignaciones', capability: 'assignments' },
  { href: '/organizations', labelKey: 'ops.nav.organizations', capability: 'organizations' },
  { href: '/users', labelKey: 'ops.nav.users', capability: 'portal_users' },
  { href: '/tickets', labelKey: 'ops.nav.tickets', capability: 'tickets' },
  { href: '/team', labelKey: 'ops.nav.team', capability: ['team', 'careers_review'] },
  { href: '/settings', labelKey: 'ops.nav.settings', capability: 'settings_profile' },
];

export function canSeeSearchNav(subject: PermissionSubject, item: OpsSearchNavItem): boolean {
  if (!item.capability) return true;
  return Array.isArray(item.capability) ? canAny(subject, item.capability) : can(subject, item.capability);
}

export function filterSearchHits(hits: OpsSearchHit[], query: string, limitPerGroup = 8): OpsSearchHit[] {
  const needle = String(query || '').trim();
  const matched = needle
    ? hits.filter((hit) =>
        textMatches(`${hit.title} ${hit.subtitle} ${hit.href} ${hit.searchText || ''}`, needle)
      )
    : hits.filter((hit) => hit.group === 'page');
  const counts = new Map<OpsSearchGroup, number>();
  const out: OpsSearchHit[] = [];
  for (const hit of matched) {
    const count = counts.get(hit.group) || 0;
    if (count >= limitPerGroup) continue;
    counts.set(hit.group, count + 1);
    out.push(hit);
  }
  return out;
}

export function groupSearchHits(hits: OpsSearchHit[]): Array<{ group: OpsSearchGroup; hits: OpsSearchHit[] }> {
  const byGroup = new Map<OpsSearchGroup, OpsSearchHit[]>();
  for (const group of OPS_SEARCH_GROUPS) byGroup.set(group, []);
  for (const hit of hits) byGroup.get(hit.group)?.push(hit);
  return OPS_SEARCH_GROUPS.map((group) => ({ group, hits: byGroup.get(group) || [] })).filter(
    (row) => row.hits.length > 0
  );
}
