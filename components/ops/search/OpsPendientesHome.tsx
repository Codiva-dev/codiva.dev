'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  AtSign,
  Banknote,
  CalendarClock,
  CheckCircle2,
  ListTodo,
  PencilLine,
  Rocket,
  Search,
  Ticket,
  Timer,
  Users,
  type LucideIcon,
} from 'lucide-react';
import MarkMentionReadButton from '@/components/ops/work-board/MarkMentionReadButton';
import ToastForm from '@/components/ops/ToastForm';
import Button from '@/components/ui/Button';
import { snoozeAttentionItem } from '@/lib/ops/attention-actions';
import { ATTENTION_KINDS, attentionBucket, type AttentionBucket, type AttentionKind } from '@/lib/ops/attention';
import type { OpsGreetingPeriod } from '@/lib/ops/home';
import {
  groupMonitorByTime,
  monitorTimeKind,
  pendingFilterCounts,
  type PendingHomeFilter,
  type PendingMonitorItem,
} from '@/lib/ops/pending-monitor';
import { textMatches } from '@/lib/ops/search-text';
import { cn } from '@/lib/cn';

const KIND_ICON: Record<PendingMonitorItem['kind'], LucideIcon> = {
  charge_overdue: Banknote,
  ticket_stale: Ticket,
  assignment_stuck: AlertTriangle,
  release_qa: Rocket,
  interview_unscheduled: CalendarClock,
  sprint_no_hours: Timer,
  lead_stale: Users,
  my_assignment: ListTodo,
  mention: AtSign,
  edit_request: PencilLine,
};

const KIND_WRAP: Record<PendingMonitorItem['kind'], string> = {
  charge_overdue: 'bg-red-50 text-red-700',
  ticket_stale: 'bg-sky-50 text-sky-700',
  assignment_stuck: 'bg-amber-50 text-amber-800',
  release_qa: 'bg-violet-50 text-violet-700',
  interview_unscheduled: 'bg-teal-50 text-teal-700',
  sprint_no_hours: 'bg-orange-50 text-orange-800',
  lead_stale: 'bg-zinc-100 text-zinc-700',
  my_assignment: 'bg-codiva-primary/10 text-codiva-primary',
  mention: 'bg-codiva-primary/10 text-codiva-primary',
  edit_request: 'bg-amber-50 text-amber-800',
};

function kindLabel(kind: PendingMonitorItem['kind'], t: (key: string) => string) {
  if (kind === 'my_assignment') return t('ops.pendientes.kind.assignment');
  if (kind === 'mention') return t('ops.pendientes.kind.mention');
  if (kind === 'edit_request') return t('ops.pendientes.kind.editRequest');
  if ((ATTENTION_KINDS as readonly string[]).includes(kind)) {
    return t(`ops.dashboard.attentionKind.${kind as AttentionKind}`);
  }
  return kind;
}

function timeLabel(at: string, t: (key: string, opts?: Record<string, unknown>) => string) {
  const stamp = monitorTimeKind(at);
  if (stamp.kind === 'none') return t('ops.pendientes.time.none');
  if (stamp.kind === 'today') return t('ops.pendientes.time.today');
  if (stamp.kind === 'tomorrow') return t('ops.pendientes.time.tomorrow');
  if (stamp.kind === 'yesterday') return t('ops.pendientes.time.yesterday');
  if (stamp.kind === 'ago') return t('ops.pendientes.time.ago', { count: stamp.days });
  return t('ops.pendientes.time.in', { count: stamp.days });
}

function cardAccent(item: PendingMonitorItem) {
  const bucket = attentionBucket(item.at);
  if (bucket === 'overdue' || item.kind === 'charge_overdue') return 'border-l-red-500';
  if (item.kind === 'mention' || item.kind === 'edit_request') return 'border-l-codiva-primary';
  if (bucket === 'today') return 'border-l-amber-400';
  return 'border-l-zinc-200';
}

function MonitorCard({ item }: { item: PendingMonitorItem }) {
  const { t } = useTranslation();
  const Icon = KIND_ICON[item.kind];
  return (
    <article
      className={cn(
        'relative flex gap-3 rounded-2xl border border-zinc-200 border-l-4 bg-white p-4 shadow-sm transition hover:border-zinc-300 hover:shadow-md',
        cardAccent(item)
      )}
    >
      <Link href={item.href} className="absolute inset-0 rounded-2xl" aria-label={item.title} />
      <span
        className={cn('relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', KIND_WRAP[item.kind])}
        aria-hidden
      >
        <Icon className="h-4 w-4" strokeWidth={2} />
      </span>
      <div className="relative z-10 min-w-0 flex-1 pointer-events-none">
        <p className="flex flex-wrap items-center gap-x-2 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
          <span>{kindLabel(item.kind, t)}</span>
          <span aria-hidden>·</span>
          <span className="normal-case tracking-normal">{timeLabel(item.at, t)}</span>
        </p>
        <p className="mt-1 font-semibold text-zinc-900">{item.title}</p>
        {item.subtitle ? <p className="mt-1 line-clamp-2 text-sm text-zinc-600">{item.subtitle}</p> : null}
      </div>
      <div className="relative z-10 flex shrink-0 flex-col items-end justify-center gap-2">
        {item.mentionId ? (
          <MarkMentionReadButton
            mentionId={item.mentionId}
            label={t('ops.pendientes.markRead')}
            success={t('ops.pendientes.mentionRead')}
          />
        ) : null}
        {item.snoozeKey ? (
          <ToastForm success={t('ops.dashboard.attentionSnoozed')} action={snoozeAttentionItem}>
            <input type="hidden" name="item_key" value={item.snoozeKey} />
            <Button type="submit" size="xs" variant="secondary">
              {t('ops.dashboard.attentionSnooze')}
            </Button>
          </ToastForm>
        ) : null}
      </div>
    </article>
  );
}

function FilterChip({
  active,
  count,
  danger,
  label,
  onClick,
}: {
  active: boolean;
  count: number;
  danger?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition',
        active
          ? 'border-zinc-900 bg-zinc-900 text-white'
          : danger && count > 0
            ? 'border-red-200 bg-white text-red-700 hover:bg-red-50'
            : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
      )}
    >
      {label}
      <span
        className={cn(
          'rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums',
          active ? 'bg-white/15 text-white' : danger && count > 0 ? 'bg-red-50 text-red-700' : 'bg-zinc-100 text-zinc-600'
        )}
      >
        {count}
      </span>
    </button>
  );
}

export default function OpsPendientesHome({
  firstName,
  greetingPeriod,
  actions,
  timeline,
}: {
  firstName: string;
  greetingPeriod: OpsGreetingPeriod;
  actions: PendingMonitorItem[];
  timeline: PendingMonitorItem[];
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<PendingHomeFilter>('all');
  const counts = useMemo(() => pendingFilterCounts(actions, timeline), [actions, timeline]);

  const visibleActions = useMemo(
    () => actions.filter((row) => textMatches(`${kindLabel(row.kind, t)} ${row.title} ${row.subtitle}`, query)),
    [actions, query, t]
  );
  const visibleTimeline = useMemo(
    () => timeline.filter((row) => textMatches(`${kindLabel(row.kind, t)} ${row.title} ${row.subtitle}`, query)),
    [query, t, timeline]
  );
  const grouped = useMemo(() => groupMonitorByTime(visibleTimeline), [visibleTimeline]);

  const helloKey =
    greetingPeriod === 'morning'
      ? 'ops.pendientes.helloMorning'
      : greetingPeriod === 'afternoon'
        ? 'ops.pendientes.helloAfternoon'
        : 'ops.pendientes.helloEvening';

  const summaryParts = [
    counts.overdue ? t('ops.pendientes.summaryOverdue', { count: counts.overdue }) : '',
    counts.actions ? t('ops.pendientes.summaryActions', { count: counts.actions }) : '',
    counts.today ? t('ops.pendientes.summaryToday', { count: counts.today }) : '',
  ].filter(Boolean);
  const summary = summaryParts.length ? summaryParts.join(' · ') : t('ops.pendientes.summaryClear');

  const showActions = filter === 'all' || filter === 'actions';
  const showTimeline = filter === 'all';
  const bucketFilter = filter !== 'all' && filter !== 'actions' ? filter : null;
  const bucketActions = bucketFilter
    ? visibleActions.filter((row) => attentionBucket(row.at) === bucketFilter)
    : [];
  const visibleGroups = bucketFilter ? grouped.filter((group) => group.bucket === bucketFilter) : grouped;
  const matchedCount = visibleActions.length + visibleTimeline.length;
  const catalogCount = counts.all;
  const emptyCatalog = catalogCount === 0;
  const emptyFilter =
    !emptyCatalog &&
    ((filter === 'actions' && !visibleActions.length) ||
      (bucketFilter && !bucketActions.length && !visibleGroups.length) ||
      (filter === 'all' && !matchedCount));

  const chips: Array<{ id: PendingHomeFilter; label: string; danger?: boolean }> = [
    { id: 'all', label: t('ops.pendientes.filterAll') },
    { id: 'actions', label: t('ops.pendientes.actionsTitle') },
    { id: 'overdue', label: t('ops.pendientes.bucket.overdue'), danger: true },
    { id: 'today', label: t('ops.pendientes.bucket.today') },
    { id: 'week', label: t('ops.pendientes.bucket.week') },
    { id: 'later', label: t('ops.pendientes.bucket.later') },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-codiva-primary">{t('ops.pendientes.kicker')}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            {t(helloKey, { name: firstName })}
          </h1>
          <p className={cn('mt-2 text-sm', counts.overdue ? 'font-medium text-red-700' : 'text-zinc-600')}>{summary}</p>
        </div>
        <label className="relative w-full max-w-md lg:w-80">
          <span className="sr-only">{t('ops.pendientes.searchPlaceholder')}</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('ops.pendientes.searchPlaceholder')}
            className="w-full rounded-2xl border border-zinc-200 bg-white py-2.5 pl-10 pr-3 text-sm text-zinc-900 outline-none transition focus:border-codiva-primary focus:ring-2 focus:ring-codiva-primary/20"
          />
        </label>
      </header>

      {emptyCatalog ? null : (
        <div className="sticky top-0 z-10 -mx-4 mt-6 bg-codiva-background/90 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {chips.map((chip) => (
              <FilterChip
                key={chip.id}
                active={filter === chip.id}
                count={counts[chip.id]}
                danger={chip.danger}
                label={chip.label}
                onClick={() => setFilter(chip.id)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 space-y-8">
        {emptyCatalog ? (
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50/60 px-6 py-16 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" strokeWidth={1.75} aria-hidden />
            <h2 className="mt-4 text-xl font-semibold text-zinc-900">{t('ops.pendientes.caughtUpTitle')}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-zinc-600">{t('ops.pendientes.caughtUpBody')}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button as={Link} href="/asignaciones" size="sm">
                {t('ops.pendientes.openBoard')}
              </Button>
              <Button as={Link} href="/dashboard" size="sm" variant="secondary">
                {t('ops.pendientes.openDashboard')}
              </Button>
            </div>
          </div>
        ) : null}

        {emptyFilter ? (
          <p className="text-sm text-zinc-500">
            {query.trim()
              ? t('ops.buscador.noMatch', { nounOne: t('ops.buscador.nouns.pendingOne') })
              : t('ops.pendientes.filterEmpty')}
            {query.trim() ? (
              <>
                {' '}
                <button type="button" className="font-medium text-codiva-primary" onClick={() => setQuery('')}>
                  {t('ops.buscador.clearQuery')}
                </button>
              </>
            ) : null}
          </p>
        ) : null}

        {bucketFilter ? (
          bucketActions.length || visibleGroups.length ? (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-zinc-900">
                {t(`ops.pendientes.bucket.${bucketFilter}`)}
              </h2>
              <ul className="space-y-3">
                {[...bucketActions, ...(visibleGroups[0]?.items ?? [])].map((item) => (
                  <li key={item.key}>
                    <MonitorCard item={item} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null
        ) : (
          <>
            {showActions && visibleActions.length ? (
              <section>
                <h2 className="mb-3 text-sm font-semibold text-zinc-900">{t('ops.pendientes.actionsTitle')}</h2>
                <ul className="space-y-3">
                  {visibleActions.map((item) => (
                    <li key={item.key}>
                      <MonitorCard item={item} />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {showTimeline
              ? visibleGroups.map((group) => (
                  <section key={group.bucket}>
                    <h2 className="mb-3 text-sm font-semibold text-zinc-900">
                      {t(`ops.pendientes.bucket.${group.bucket as AttentionBucket}`)}
                    </h2>
                    <ul className="space-y-3">
                      {group.items.map((item) => (
                        <li key={item.key}>
                          <MonitorCard item={item} />
                        </li>
                      ))}
                    </ul>
                  </section>
                ))
              : null}
          </>
        )}
      </div>
    </div>
  );
}
