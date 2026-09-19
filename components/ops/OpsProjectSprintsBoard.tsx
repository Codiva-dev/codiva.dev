'use client';

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ToastForm from '@/components/ops/ToastForm';
import StatusBadge from '@/components/ops/StatusBadge';
import Input, { Select, Textarea } from '@/components/ui/Input';
import OpsBuscador from '@/components/ops/search/OpsBuscador';
import { TabLink, Tabs } from '@/components/ui/Tabs';
import { labelsFor } from '@/lib/ops/labels';
import { opsProjectPath } from '@/lib/ops/project-path';
import {
  filterSprintsByStatus,
  parseSprintStatusFilter,
  projectSprintsSearch,
  resolveSelectedSprintId,
  searchSprintItems,
  sortSprintsBySchedule,
  SPRINT_STATUS_FILTERS,
  type SprintItemRow,
  type SprintRow,
  type SprintStatusFilter,
} from '@/lib/ops/project-sprints';
import type { Locale } from '@/i18n/config';

type StaffOption = { id: string; full_name: string; role: string };

function sprintTone(status: string) {
  if (status === 'active') return 'success' as const;
  if (status === 'completed') return 'info' as const;
  return 'warning' as const;
}

function itemTone(status: string) {
  if (status === 'done') return 'success' as const;
  if (status === 'blocked') return 'danger' as const;
  if (status === 'in_progress') return 'info' as const;
  return 'warning' as const;
}

export default function OpsProjectSprintsBoard({
  projectSlug,
  locale,
  canPlan,
  currentUserId,
  allStaff,
  sprints,
  items,
  selectedSprintId,
  sprintStatus,
  searchQuery,
  onCreateSprint,
  onUpdateSprint,
  onCreateItem,
  onUpdateItem,
}: {
  projectSlug: string;
  locale: Locale;
  canPlan: boolean;
  currentUserId: string;
  allStaff: StaffOption[];
  sprints: SprintRow[];
  items: SprintItemRow[];
  selectedSprintId: string | null;
  sprintStatus: string;
  searchQuery: string;
  onCreateSprint: (formData: FormData) => Promise<unknown>;
  onUpdateSprint: (formData: FormData) => Promise<unknown>;
  onCreateItem: (formData: FormData) => Promise<unknown>;
  onUpdateItem: (formData: FormData) => Promise<unknown>;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const { formatDate, SPRINT_ITEM_STATUS_LABELS, SPRINT_STATUS_LABELS } = labelsFor(locale);
  const [query, setQuery] = useState(searchQuery);
  const statusFilter = parseSprintStatusFilter(sprintStatus);
  const staffName = useMemo(() => new Map(allStaff.map((row) => [row.id, row.full_name])), [allStaff]);
  const sorted = useMemo(() => sortSprintsBySchedule(sprints), [sprints]);
  const visibleSprints = useMemo(
    () => filterSprintsByStatus(sorted, statusFilter),
    [sorted, statusFilter]
  );
  const visibleItems = useMemo(
    () => (canPlan ? items : items.filter((row) => row.assignee_id === currentUserId)),
    [canPlan, items, currentUserId]
  );
  const selectedId = resolveSelectedSprintId(sprints, selectedSprintId, statusFilter);
  const sprint = visibleSprints.find((row) => row.id === selectedId) ?? null;
  const hits = useMemo(
    () =>
      searchSprintItems(sorted, visibleItems, query, (id) =>
        id ? staffName.get(id) || '' : t('ops.sprints.unassigned')
      ),
    [sorted, visibleItems, query, staffName, t]
  );
  const searching = Boolean(query.trim());

  function href(next: { sprint?: string | null; sprintStatus?: SprintStatusFilter; q?: string | null }) {
    return opsProjectPath(
      projectSlug,
      projectSprintsSearch({
        sprint: next.sprint === undefined ? selectedId : next.sprint,
        sprintStatus: next.sprintStatus === undefined ? statusFilter : next.sprintStatus,
        q: next.q === undefined ? undefined : next.q,
      })
    );
  }

  return (
    <div className="space-y-8">
      {canPlan ? (
        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="mb-3 font-semibold">{t('ops.sprints.newTitle')}</h2>
          <ToastForm success={t('ops.sprints.created')} action={onCreateSprint} className="grid gap-3 sm:grid-cols-2">
            <Input name="name" required placeholder={t('ops.sprints.namePlaceholder')} size="sm" />
            <Select name="status" defaultValue="planned" size="sm">
              {Object.entries(SPRINT_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <Input name="startsOn" type="date" size="sm" />
            <Input name="endsOn" type="date" size="sm" />
            <Textarea name="goal" placeholder={t('ops.sprints.goal')} rows={2} size="sm" className="sm:col-span-2" />
            <button type="submit" className="w-fit rounded-lg bg-codiva-primary px-4 py-2 text-sm text-white">
              {t('ops.sprints.create')}
            </button>
          </ToastForm>
        </section>
      ) : null}

      {sorted.length ? (
        <>
          <div className="space-y-4">
            <Tabs variant="pills">
              <TabLink href={href({ sprintStatus: 'all', sprint: selectedId })} active={statusFilter === 'all'} variant="pills">
                {t('ops.sprints.filterAll')}
              </TabLink>
              {SPRINT_STATUS_FILTERS.map((status) => (
                <TabLink
                  key={status}
                  href={href({ sprintStatus: status, sprint: selectedId })}
                  active={statusFilter === status}
                  variant="pills"
                >
                  {SPRINT_STATUS_LABELS[status]}
                </TabLink>
              ))}
            </Tabs>

            <div>
              <OpsBuscador
                query={query}
                onQueryChange={setQuery}
                placeholder={t('ops.sprints.searchPlaceholder')}
                searchAriaLabel={t('ops.sprints.searchLabel')}
                catalogCount={visibleItems.length}
                matchedCount={hits.length}
                noun={t('ops.buscador.nouns.items')}
                nounOne={t('ops.buscador.nouns.item')}
                hits={
                  searching
                    ? hits.slice(0, 8).map((hit) => ({
                        id: hit.item.id,
                        title: hit.item.title,
                        subtitle: hit.sprint.name,
                      }))
                    : []
                }
                onHitSelect={(id) => {
                  const hit = hits.find((row) => row.item.id === id);
                  if (!hit) return;
                  setQuery('');
                  router.push(href({ sprint: hit.sprint.id, sprintStatus: 'all', q: null }));
                }}
                empty={
                  searching ? (
                    <p className="text-sm text-zinc-500">{t('ops.sprints.emptySearch', { query: query.trim() })}</p>
                  ) : null
                }
              />
            </div>

            {visibleSprints.length ? (
              <Tabs>
                {visibleSprints.map((row) => (
                  <TabLink key={row.id} href={href({ sprint: row.id, q: null })} active={!searching && row.id === selectedId}>
                    {row.name}
                  </TabLink>
                ))}
              </Tabs>
            ) : (
              <p className="text-sm text-zinc-500">{t('ops.sprints.emptyFilter')}</p>
            )}
          </div>

          {searching ? (
            <section className="rounded-xl border border-zinc-200 bg-white p-5">
              <p className="mb-3 text-sm font-medium text-zinc-700">
                {t('ops.sprints.searchCount', { count: hits.length })}
              </p>
              {hits.length ? (
                <ul className="space-y-2">
                  {hits.map((hit) => (
                    <li key={hit.item.id}>
                      <Link
                        href={href({ sprint: hit.sprint.id, sprintStatus: 'all', q: null })}
                        className="block rounded-lg border border-zinc-100 px-3 py-3 no-underline hover:border-codiva-primary/40 hover:bg-zinc-50"
                      >
                        <p className="text-sm font-medium text-zinc-900">{hit.item.title}</p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {hit.sprint.name}
                          {' · '}
                          {SPRINT_ITEM_STATUS_LABELS[hit.item.status] ?? hit.item.status}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-zinc-500">{t('ops.sprints.emptySearch', { query: query.trim() })}</p>
              )}
            </section>
          ) : sprint ? (
            <SprintPanel
              sprint={sprint}
              items={visibleItems.filter((row) => row.sprint_id === sprint.id)}
              canPlan={canPlan}
              allStaff={allStaff}
              staffName={staffName}
              formatDate={formatDate}
              statusLabels={SPRINT_STATUS_LABELS}
              itemStatusLabels={SPRINT_ITEM_STATUS_LABELS}
              onUpdateSprint={onUpdateSprint}
              onCreateItem={onCreateItem}
              onUpdateItem={onUpdateItem}
            />
          ) : null}
        </>
      ) : (
        <p className="rounded-xl border border-dashed border-zinc-300 bg-white px-4 py-8 text-center text-sm text-zinc-500">
          {t('ops.sprints.empty')}
        </p>
      )}
    </div>
  );
}

function SprintPanel({
  sprint,
  items,
  canPlan,
  allStaff,
  staffName,
  formatDate,
  statusLabels,
  itemStatusLabels,
  onUpdateSprint,
  onCreateItem,
  onUpdateItem,
}: {
  sprint: SprintRow;
  items: SprintItemRow[];
  canPlan: boolean;
  allStaff: StaffOption[];
  staffName: Map<string, string>;
  formatDate: (date: string | null | undefined) => string;
  statusLabels: Record<string, string>;
  itemStatusLabels: Record<string, string>;
  onUpdateSprint: (formData: FormData) => Promise<unknown>;
  onCreateItem: (formData: FormData) => Promise<unknown>;
  onUpdateItem: (formData: FormData) => Promise<unknown>;
}) {
  const { t } = useTranslation();

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold">{sprint.name}</h2>
          {sprint.goal ? <p className="mt-1 text-sm text-zinc-600">{sprint.goal}</p> : null}
          <p className="mt-1 text-xs text-zinc-400">
            {sprint.starts_on ? formatDate(sprint.starts_on) : '-'} → {sprint.ends_on ? formatDate(sprint.ends_on) : '-'}
          </p>
        </div>
        <StatusBadge label={statusLabels[sprint.status] ?? sprint.status} tone={sprintTone(sprint.status)} />
      </div>

      {canPlan ? (
        <ToastForm
          success={t('ops.sprints.updated')}
          action={onUpdateSprint}
          className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
        >
          <input type="hidden" name="sprintId" value={sprint.id} />
          <Input name="name" defaultValue={sprint.name} size="sm" />
          <Select name="status" defaultValue={sprint.status} size="sm">
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <Input name="startsOn" type="date" defaultValue={sprint.starts_on ?? ''} size="sm" />
          <Input name="endsOn" type="date" defaultValue={sprint.ends_on ?? ''} size="sm" />
          <Textarea
            name="goal"
            defaultValue={sprint.goal}
            rows={2}
            size="sm"
            className="sm:col-span-2 lg:col-span-4"
          />
          <button type="submit" className="rounded-lg border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-50">
            {t('ops.sprints.save')}
          </button>
        </ToastForm>
      ) : null}

      <ul className="space-y-3">
        {items.map((row) => (
          <li key={row.id} className="rounded-lg border border-zinc-100 p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">{row.title}</p>
              <StatusBadge label={itemStatusLabels[row.status] ?? row.status} tone={itemTone(row.status)} />
            </div>
            {row.details ? <p className="mb-2 text-sm text-zinc-600">{row.details}</p> : null}
            <p className="mb-2 text-xs text-zinc-400">
              {t('ops.sprints.assigned', {
                name: row.assignee_id
                  ? staffName.get(row.assignee_id) || row.assignee_id.slice(0, 8)
                  : t('ops.sprints.unassigned'),
              })}
            </p>
            <ToastForm success={t('ops.sprints.itemUpdated')} action={onUpdateItem} className="flex flex-wrap gap-2">
              <input type="hidden" name="itemId" value={row.id} />
              {canPlan ? (
                <>
                  <Input name="title" defaultValue={row.title} size="sm" className="w-auto min-w-40" />
                  <Select name="assigneeId" defaultValue={row.assignee_id ?? ''} size="sm" className="w-auto">
                    <option value="">{t('ops.sprints.unassigned')}</option>
                    {allStaff.map((staff) => (
                      <option key={staff.id} value={staff.id}>
                        {staff.full_name || staff.id.slice(0, 8)}
                      </option>
                    ))}
                  </Select>
                </>
              ) : null}
              <Select name="status" defaultValue={row.status} size="sm" className="w-auto">
                {Object.entries(itemStatusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
              <button type="submit" className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50">
                {t('ops.sprints.update')}
              </button>
            </ToastForm>
          </li>
        ))}
      </ul>
      {!items.length ? (
        <p className="text-sm text-zinc-500">{canPlan ? t('ops.sprints.emptyItems') : t('ops.sprints.emptyMine')}</p>
      ) : null}

      {canPlan ? (
        <ToastForm success={t('ops.sprints.itemCreated')} action={onCreateItem} className="mt-4 grid gap-2 sm:grid-cols-2">
          <input type="hidden" name="sprintId" value={sprint.id} />
          <Input name="title" required placeholder={t('ops.sprints.newItem')} size="sm" />
          <Select name="assigneeId" size="sm">
            <option value="">{t('ops.sprints.unassigned')}</option>
            {allStaff.map((staff) => (
              <option key={staff.id} value={staff.id}>
                {staff.full_name || staff.id.slice(0, 8)}
              </option>
            ))}
          </Select>
          <Textarea name="details" placeholder={t('ops.sprints.details')} rows={2} size="sm" className="sm:col-span-2" />
          <button type="submit" className="w-fit rounded-lg bg-codiva-primary px-3 py-2 text-sm text-white">
            {t('ops.sprints.addItem')}
          </button>
        </ToastForm>
      ) : null}
    </section>
  );
}
