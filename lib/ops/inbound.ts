import type { createClient } from '@/lib/supabase/server';
import { can, canAny, type PermissionSubject } from '@/lib/ops/permissions';
import { applicationRoleLabel, isTesterPipelineItem } from '@/lib/ops/career-disciplines';
import { asProject } from '@/lib/ops/tickets';
import { isInboxLane, type InboxLane } from '@/lib/ops/inbox-lane';

type OpsClient = Awaited<ReturnType<typeof createClient>>;

export const INBOUND_FILTERS = ['all', 'contact', 'test', 'other', 'lead', 'ticket', 'career'] as const;
export type InboundFilter = (typeof INBOUND_FILTERS)[number];

export const INBOUND_KINDS = ['contact', 'lead', 'ticket', 'application', 'hunt'] as const;
export type InboundKind = (typeof INBOUND_KINDS)[number];

export type InboundContact = {
  id: string;
  name: string;
  email: string;
  message: string;
  status: string;
  lane: InboxLane;
  lane_reason: string | null;
  lead_id: string | null;
  created_at: string;
};

export type InboundItem = {
  key: string;
  kind: InboundKind;
  createdAt: string;
  title: string;
  subtitle: string;
  snippet: string;
  href: string;
  status?: string;
  contact?: InboundContact;
};

function firstRelated<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function clip(value: string | null | undefined, max = 160): string {
  const text = (value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

export function parseInboundFilter(value: string | string[] | undefined): InboundFilter {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw && (INBOUND_FILTERS as readonly string[]).includes(raw)) {
    return raw as InboundFilter;
  }
  return 'all';
}

export function inboundFiltersFor(permissions: PermissionSubject): InboundFilter[] {
  const filters: InboundFilter[] = ['all'];
  if (can(permissions, 'inbox')) filters.push('contact', 'test', 'other');
  if (can(permissions, 'leads')) filters.push('lead');
  if (can(permissions, 'tickets')) filters.push('ticket');
  if (canAny(permissions, ['team', 'careers_review'])) filters.push('career');
  return filters;
}

function wantsKind(filter: InboundFilter, kind: InboundKind): boolean {
  if (filter === 'all') return true;
  if (filter === 'career') return kind === 'application' || kind === 'hunt';
  if (filter === 'test' || filter === 'other') return kind === 'contact';
  return filter === kind;
}

function contactLaneFor(filter: InboundFilter): InboxLane | 'pending' | null {
  if (filter === 'contact') return 'real';
  if (filter === 'test' || filter === 'other') return filter;
  if (filter === 'all') return 'pending';
  return null;
}

export async function loadInboundItems({
  supabase,
  permissions,
  filter = 'all',
  perKind = 50,
  maxItems,
  visibleProjectIds = null,
}: {
  supabase: OpsClient;
  permissions: PermissionSubject;
  filter?: InboundFilter;
  perKind?: number;
  maxItems?: number;
  visibleProjectIds?: string[] | null;
}): Promise<InboundItem[]> {
  const showContact = can(permissions, 'inbox') && wantsKind(filter, 'contact');
  const contactLane = contactLaneFor(filter);
  const showLeads = can(permissions, 'leads') && wantsKind(filter, 'lead');
  const showTickets = can(permissions, 'tickets') && wantsKind(filter, 'ticket');
  const showCareer = canAny(permissions, ['team', 'careers_review']) && (filter === 'all' || filter === 'career');
  const careerTestersOnly = showCareer && !can(permissions, 'team');
  const ticketProjectIds =
    visibleProjectIds === null
      ? null
      : visibleProjectIds.length
        ? visibleProjectIds
        : ['00000000-0000-0000-0000-000000000000'];

  const empty = { data: [] as never[] };
  const [contacts, leads, tickets, applications, hunts] = await Promise.all([
    showContact
      ? (() => {
          let query = supabase
            .from('inbox_messages')
            .select('id, name, email, message, status, lane, lane_reason, lead_id, created_at')
            .neq('status', 'archived')
            .order('created_at', { ascending: false })
            .limit(perKind);
          if (contactLane === 'pending') query = query.neq('lane', 'test');
          else if (contactLane) query = query.eq('lane', contactLane);
          return query;
        })()
      : Promise.resolve(empty),
    showLeads
      ? supabase
          .from('leads')
          .select('id, name, company, email, source, need, created_at')
          .eq('status', 'new')
          .order('created_at', { ascending: false })
          .limit(perKind)
      : Promise.resolve(empty),
    showTickets
      ? (() => {
          let query = supabase
            .from('tickets')
            .select('id, title, reporter_name, reporter_email, priority, created_at, projects(name)')
            .eq('status', 'new')
            .order('created_at', { ascending: false })
            .limit(perKind);
          if (ticketProjectIds) query = query.in('project_id', ticketProjectIds);
          return query;
        })()
      : Promise.resolve(empty),
    showCareer
      ? supabase
          .from('ops_job_applications')
          .select('id, full_name, email, discipline, created_at, ops_job_postings(title, slug, careers_pipeline)')
          .eq('status', 'new')
          .order('created_at', { ascending: false })
          .limit(perKind)
      : Promise.resolve(empty),
    showCareer
      ? supabase
          .from('ops_hunt_reports')
          .select('id, full_name, email, title, page_url, assessment_attempt_id, created_at')
          .eq('review_status', 'open')
          .order('created_at', { ascending: false })
          .limit(perKind)
      : Promise.resolve(empty),
  ]);

  const items: InboundItem[] = [];

  for (const row of contacts.data ?? []) {
    const lane = isInboxLane(row.lane) ? row.lane : 'real';
    items.push({
      key: `contact:${row.id}`,
      kind: 'contact',
      createdAt: row.created_at,
      title: row.name,
      subtitle: row.email,
      snippet: clip(row.message),
      href: lane === 'real' ? '/inbox' : `/inbox?kind=${lane}`,
      status: row.status,
      contact: { ...row, lane },
    });
  }

  for (const row of leads.data ?? []) {
    items.push({
      key: `lead:${row.id}`,
      kind: 'lead',
      createdAt: row.created_at,
      title: row.company || row.name,
      subtitle: row.email,
      snippet: clip(row.need),
      href: `/leads/${row.id}`,
    });
  }

  for (const row of tickets.data ?? []) {
    const project = asProject(row.projects);
    items.push({
      key: `ticket:${row.id}`,
      kind: 'ticket',
      createdAt: row.created_at,
      title: row.title,
      subtitle: project?.name || row.reporter_name || row.reporter_email,
      snippet: clip(row.reporter_email),
      href: `/tickets/${row.id}`,
      status: row.priority,
    });
  }

  for (const row of applications.data ?? []) {
    const posting = firstRelated(row.ops_job_postings);
    if (
      careerTestersOnly &&
      !isTesterPipelineItem({
        postingSlug: posting?.slug,
        discipline: row.discipline,
        careersPipeline: posting?.careers_pipeline,
      })
    ) {
      continue;
    }
    const role = applicationRoleLabel({
      postingTitle: posting?.title,
      discipline: row.discipline,
    });
    items.push({
      key: `application:${row.id}`,
      kind: 'application',
      createdAt: row.created_at,
      title: row.full_name,
      subtitle: role || row.email,
      snippet: role ? clip(row.email) : '',
      href: '/team?tab=bolsa',
    });
  }

  for (const row of hunts.data ?? []) {
    items.push({
      key: `hunt:${row.id}`,
      kind: 'hunt',
      createdAt: row.created_at,
      title: row.full_name,
      subtitle: row.email,
      snippet: clip(row.title),
      href: row.assessment_attempt_id
        ? `/team/intentos/${row.assessment_attempt_id}`
        : '/team?tab=bolsa',
    });
  }

  items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
  return typeof maxItems === 'number' ? items.slice(0, maxItems) : items;
}
