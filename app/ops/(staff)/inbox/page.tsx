import OpsPageHeader from '@/components/ops/OpsPageHeader';
import OpsInboxList from '@/components/ops/search/OpsInboxList';
import { TabLink, Tabs } from '@/components/ui/Tabs';
import { listVisibleProjectIds, requireCapability } from '@/lib/ops/auth';
import { labelsFor } from '@/lib/ops/labels';
import {
  inboundFiltersFor,
  loadInboundItems,
  parseInboundFilter,
  type InboundFilter,
  type InboundKind,
} from '@/lib/ops/inbound';
import { type InboxLane } from '@/lib/ops/inbox-lane';
import { getT } from '@/i18n/locale';

function filterHref(kind: InboundFilter) {
  return kind === 'all' ? '/inbox' : `/inbox?kind=${kind}`;
}

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string | string[] }>;
}) {
  const { supabase, user, staff } = await requireCapability('inbox');
  const params = await searchParams;
  const t = await getT();
  const { INBOX_STATUS_LABELS } = labelsFor(t.locale);
  const filter = parseInboundFilter(params.kind);
  const availableFilters = inboundFiltersFor(staff);
  const activeFilter = availableFilters.includes(filter) ? filter : 'all';
  const items = await loadInboundItems({
    supabase,
    permissions: staff,
    filter: activeFilter,
    visibleProjectIds: await listVisibleProjectIds(supabase, user.id, staff),
  });

  const filterLabel: Record<InboundFilter, string> = {
    all: t('ops.inbox.filterAll'),
    contact: t('ops.inbox.filterContact'),
    test: t('ops.inbox.filterTest'),
    other: t('ops.inbox.filterOther'),
    lead: t('ops.inbox.filterLeads'),
    ticket: t('ops.inbox.filterTickets'),
    career: t('ops.inbox.filterCareer'),
  };
  const laneLabel: Record<InboxLane, string> = {
    real: t('ops.inbox.laneReal'),
    test: t('ops.inbox.laneTest'),
    other: t('ops.inbox.laneOther'),
  };
  const kindLabel: Record<InboundKind, string> = {
    contact: t('ops.inbox.kindContact'),
    lead: t('ops.inbox.kindLead'),
    ticket: t('ops.inbox.kindTicket'),
    application: t('ops.inbox.kindApplication'),
    hunt: t('ops.inbox.kindHunt'),
  };

  return (
    <div>
      <OpsPageHeader title={t('ops.pages.inbox')} description={t('ops.pages.inboxDesc')} />
      <Tabs variant="pills">
        {availableFilters.map((kind) => (
          <TabLink key={kind} href={filterHref(kind)} active={activeFilter === kind} variant="pills">
            {filterLabel[kind]}
          </TabLink>
        ))}
      </Tabs>
      <OpsInboxList
        items={items}
        statusLabels={INBOX_STATUS_LABELS}
        laneLabels={laneLabel}
        kindLabels={kindLabel}
        locale={t.locale === 'en' ? 'en' : 'es'}
      />
    </div>
  );
}
