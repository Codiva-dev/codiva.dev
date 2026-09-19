import { chargeAmountNumber } from '@/lib/ops/charges';
import { textMatches } from '@/lib/ops/search-text';

export type FinanceChargeRow = {
  id: string;
  kind: string;
  title: string;
  amount: number | string | null;
  currency: string;
  status: string;
  due_date: string | null;
  project_id: string;
  projects:
    | {
        id: string;
        name: string;
        slug?: string | null;
        status: string;
        organization_id: string | null;
        organizations: { id: string; name: string } | { id: string; name: string }[] | null;
      }
    | {
        id: string;
        name: string;
        slug?: string | null;
        status: string;
        organization_id: string | null;
        organizations: { id: string; name: string } | { id: string; name: string }[] | null;
      }[]
    | null;
};

export type FinanceQuoteRow = {
  id: string;
  project_id: string | null;
  status: string;
  total_amount: number | string | null;
  currency: string;
  version: number;
};

export type FinanceProjectRow = {
  id: string;
  name: string;
  slug?: string | null;
  status: string;
  organization_id: string | null;
  organizations: { id: string; name: string } | { id: string; name: string }[] | null;
};

export type FinanceFilters = {
  org?: string;
  chargeStatus?: string;
  kind?: string;
  projectStatus?: string;
};

export type FinanceOrgBucket = {
  orgId: string;
  orgName: string;
  outstanding: number;
  paid: number;
  overdueCount: number;
  tbdCount: number;
  quoteTotal: number;
  projects: FinanceProjectBucket[];
};

export type FinanceProjectBucket = {
  projectId: string;
  projectSlug: string;
  projectName: string;
  projectStatus: string;
  outstanding: number;
  paid: number;
  overdueCount: number;
  tbdCount: number;
  quoteTotal: number;
  charges: {
    id: string;
    title: string;
    kind: string;
    status: string;
    amount: number | null;
    currency: string;
    due_date: string | null;
  }[];
};

export type FinanceSummary = {
  outstanding: number;
  paid: number;
  overdueCount: number;
  tbdCount: number;
  quoteTotal: number;
  chargeCount: number;
  orgs: FinanceOrgBucket[];
  orgOptions: { id: string; name: string }[];
};

function asOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/** Prefer accepted quote; else highest version with an amount. */
export function pickProjectQuoteTotal(
  quotes: FinanceQuoteRow[],
  projectId: string
): number {
  const forProject = quotes
    .filter((q) => q.project_id === projectId && chargeAmountNumber(q.total_amount) != null)
    .sort((a, b) => {
      if (a.status === 'accepted' && b.status !== 'accepted') return -1;
      if (b.status === 'accepted' && a.status !== 'accepted') return 1;
      return (b.version ?? 0) - (a.version ?? 0);
    });
  return chargeAmountNumber(forProject[0]?.total_amount) ?? 0;
}

export function buildFinanceSummary(
  charges: FinanceChargeRow[],
  quotes: FinanceQuoteRow[],
  projects: FinanceProjectRow[],
  filters: FinanceFilters = {}
): FinanceSummary {
  const orgOptionsMap = new Map<string, string>();
  for (const p of projects) {
    const org = asOne(p.organizations);
    if (org?.id) orgOptionsMap.set(org.id, org.name);
  }

  const chargeSpecific = Boolean(filters.kind || filters.chargeStatus);

  const filteredCharges = charges.filter((row) => {
    const project = asOne(row.projects);
    const org = asOne(project?.organizations);

    if (filters.org && org?.id !== filters.org) return false;
    if (filters.projectStatus && project?.status !== filters.projectStatus) return false;
    if (filters.kind && row.kind !== filters.kind) return false;
    if (filters.chargeStatus) {
      if (filters.chargeStatus === 'outstanding') {
        if (row.status !== 'pending' && row.status !== 'overdue') return false;
      } else if (row.status !== filters.chargeStatus) {
        return false;
      }
    }
    return true;
  });

  type AccProject = {
    projectId: string;
    projectSlug: string;
    projectName: string;
    projectStatus: string;
    orgId: string;
    orgName: string;
    outstanding: number;
    paid: number;
    overdueCount: number;
    tbdCount: number;
    charges: FinanceProjectBucket['charges'];
  };

  const byProject = new Map<string, AccProject>();

  function ensureProject(project: {
    id: string;
    name: string;
    slug?: string | null;
    status: string;
    organizations: FinanceProjectRow['organizations'];
  }) {
    let bucket = byProject.get(project.id);
    if (bucket) return bucket;
    const org = asOne(project.organizations);
    bucket = {
      projectId: project.id,
      projectSlug: project.slug || project.id,
      projectName: project.name,
      projectStatus: project.status,
      orgId: org?.id ?? 'sin-org',
      orgName: org?.name ?? 'Sin organización',
      outstanding: 0,
      paid: 0,
      overdueCount: 0,
      tbdCount: 0,
      charges: [],
    };
    byProject.set(project.id, bucket);
    return bucket;
  }

  for (const row of filteredCharges) {
    const project = asOne(row.projects);
    if (!project) continue;
    const bucket = ensureProject(project);

    const amount = chargeAmountNumber(row.amount);
    const isOutstanding = row.status === 'pending' || row.status === 'overdue';

    if (isOutstanding) {
      if (amount == null) bucket.tbdCount += 1;
      else bucket.outstanding += amount;
      if (row.status === 'overdue') bucket.overdueCount += 1;
    } else if (row.status === 'paid' && amount != null) {
      bucket.paid += amount;
    }

    bucket.charges.push({
      id: row.id,
      title: row.title,
      kind: row.kind,
      status: row.status,
      amount,
      currency: row.currency || 'MXN',
      due_date: row.due_date,
    });
  }

  // Projects with quotes (and no matching charges) still appear unless charge-specific filters apply.
  if (!chargeSpecific) {
    for (const p of projects) {
      if (filters.org) {
        const org = asOne(p.organizations);
        if (org?.id !== filters.org) continue;
      }
      if (filters.projectStatus && p.status !== filters.projectStatus) continue;
      if (pickProjectQuoteTotal(quotes, p.id) > 0 || byProject.has(p.id)) {
        ensureProject(p);
      }
    }
  }

  const byOrg = new Map<string, FinanceOrgBucket>();
  let outstanding = 0;
  let paid = 0;
  let overdueCount = 0;
  let tbdCount = 0;
  let quoteTotal = 0;

  const sortedProjects = [...byProject.values()].sort((a, b) => {
    if (a.orgName !== b.orgName) return a.orgName.localeCompare(b.orgName, 'es');
    return a.projectName.localeCompare(b.projectName, 'es');
  });

  for (const p of sortedProjects) {
    const projectQuote = pickProjectQuoteTotal(quotes, p.projectId);

    outstanding += p.outstanding;
    paid += p.paid;
    overdueCount += p.overdueCount;
    tbdCount += p.tbdCount;
    quoteTotal += projectQuote;

    let org = byOrg.get(p.orgId);
    if (!org) {
      org = {
        orgId: p.orgId,
        orgName: p.orgName,
        outstanding: 0,
        paid: 0,
        overdueCount: 0,
        tbdCount: 0,
        quoteTotal: 0,
        projects: [],
      };
      byOrg.set(p.orgId, org);
    }

    org.outstanding += p.outstanding;
    org.paid += p.paid;
    org.overdueCount += p.overdueCount;
    org.tbdCount += p.tbdCount;
    org.quoteTotal += projectQuote;
    org.projects.push({
      projectId: p.projectId,
      projectSlug: p.projectSlug,
      projectName: p.projectName,
      projectStatus: p.projectStatus,
      outstanding: p.outstanding,
      paid: p.paid,
      overdueCount: p.overdueCount,
      tbdCount: p.tbdCount,
      quoteTotal: projectQuote,
      charges: p.charges.sort((a, b) => {
        const statusRank = (s: string) =>
          s === 'overdue' ? 0 : s === 'pending' ? 1 : s === 'paid' ? 2 : 3;
        const rank = statusRank(a.status) - statusRank(b.status);
        if (rank !== 0) return rank;
        return (a.due_date ?? '').localeCompare(b.due_date ?? '');
      }),
    });
  }

  return {
    outstanding,
    paid,
    overdueCount,
    tbdCount,
    quoteTotal,
    chargeCount: filteredCharges.length,
    orgs: [...byOrg.values()].sort((a, b) => a.orgName.localeCompare(b.orgName, 'es')),
    orgOptions: [...orgOptionsMap.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es')),
  };
}

export function filterFinanceOrgsByQuery(orgs: FinanceOrgBucket[], query: string): FinanceOrgBucket[] {
  const needle = query.trim();
  if (!needle) return orgs;
  return orgs.flatMap((org) => {
    if (textMatches(org.orgName, needle)) return [org];
    const projects = org.projects.flatMap((project) => {
      const projectHay = `${project.projectName} ${project.projectStatus}`;
      if (textMatches(projectHay, needle)) return [project];
      const charges = project.charges.filter((charge) =>
        textMatches(`${charge.title} ${charge.kind} ${charge.status}`, needle)
      );
      if (!charges.length) return [];
      return [{ ...project, charges }];
    });
    if (!projects.length) return [];
    return [{ ...org, projects }];
  });
}
