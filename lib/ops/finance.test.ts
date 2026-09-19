import { describe, expect, it } from 'vitest';
import { filterFinanceOrgsByQuery, type FinanceOrgBucket } from '@/lib/ops/finance';

function org(partial: Partial<FinanceOrgBucket> & { orgName: string }): FinanceOrgBucket {
  return {
    orgId: partial.orgId ?? partial.orgName,
    outstanding: 0,
    paid: 0,
    overdueCount: 0,
    tbdCount: 0,
    quoteTotal: 0,
    projects: [],
    ...partial,
  };
}

describe('filterFinanceOrgsByQuery', () => {
  const sample: FinanceOrgBucket[] = [
    org({
      orgName: 'Acme',
      projects: [
        {
          projectId: 'p1',
          projectSlug: 'acme-web',
          projectName: 'Sitio Acme',
          projectStatus: 'active',
          outstanding: 100,
          paid: 0,
          overdueCount: 0,
          tbdCount: 0,
          quoteTotal: 1000,
          charges: [
            { id: 'c1', title: 'Hosting anual', kind: 'hosting', status: 'pending', amount: 100, currency: 'MXN', due_date: null },
          ],
        },
      ],
    }),
    org({
      orgName: 'Beta Labs',
      projects: [
        {
          projectId: 'p2',
          projectSlug: 'beta-app',
          projectName: 'App Beta',
          projectStatus: 'quoting',
          outstanding: 0,
          paid: 50,
          overdueCount: 0,
          tbdCount: 0,
          quoteTotal: 50,
          charges: [
            { id: 'c2', title: 'Dominio', kind: 'domain', status: 'paid', amount: 50, currency: 'MXN', due_date: null },
          ],
        },
      ],
    }),
  ];

  it('returns all orgs when the query is empty', () => {
    expect(filterFinanceOrgsByQuery(sample, '  ')).toHaveLength(2);
  });

  it('keeps an org when its name matches', () => {
    const next = filterFinanceOrgsByQuery(sample, 'acme');
    expect(next.map((row) => row.orgName)).toEqual(['Acme']);
    expect(next[0].projects).toHaveLength(1);
  });

  it('keeps a project when only the project name matches', () => {
    const next = filterFinanceOrgsByQuery(sample, 'sitio');
    expect(next).toHaveLength(1);
    expect(next[0].projects.map((row) => row.projectName)).toEqual(['Sitio Acme']);
  });

  it('keeps matching charges inside a project', () => {
    const next = filterFinanceOrgsByQuery(sample, 'dominio');
    expect(next[0].orgName).toBe('Beta Labs');
    expect(next[0].projects[0].charges.map((row) => row.title)).toEqual(['Dominio']);
  });
});
