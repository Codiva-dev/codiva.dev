'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import EmptyState from '@/components/ui/EmptyState';
import MarkMentionReadButton from '@/components/ops/work-board/MarkMentionReadButton';
import OpsBuscador from './OpsBuscador';
import { textMatches } from '@/lib/ops/search-text';

type PendingAssignment = {
  id: string;
  title: string;
  stream: string;
  status: string;
  dueLabel: string;
  progress_pct: number;
};

type PendingMention = {
  id: string;
  assignment_id: string;
  assignment_title: string;
  author_name: string;
  preview: string;
};

type PendingEdit = {
  id: string;
  assignment_id: string;
  assignment_title: string;
  requested_by_name: string;
  payload: string;
};

export default function OpsPendientesLists({
  assignments,
  mentions,
  editRequests,
  canManage,
  streamLabels,
  statusLabels,
}: {
  assignments: PendingAssignment[];
  mentions: PendingMention[];
  editRequests: PendingEdit[];
  canManage: boolean;
  streamLabels: Record<string, string>;
  statusLabels: Record<string, string>;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const catalogCount = assignments.length + mentions.length + (canManage ? editRequests.length : 0);

  const visibleAssignments = useMemo(
    () =>
      assignments.filter((row) =>
        textMatches(
          `${row.title} ${streamLabels[row.stream] || row.stream} ${statusLabels[row.status] || row.status} ${row.dueLabel}`,
          query
        )
      ),
    [assignments, query, streamLabels, statusLabels]
  );
  const visibleMentions = useMemo(
    () =>
      mentions.filter((row) =>
        textMatches(`${row.assignment_title} ${row.author_name} ${row.preview}`, query)
      ),
    [mentions, query]
  );
  const visibleEdits = useMemo(
    () =>
      canManage
        ? editRequests.filter((row) =>
            textMatches(`${row.assignment_title} ${row.requested_by_name} ${row.payload}`, query)
          )
        : [],
    [canManage, editRequests, query]
  );
  const matchedCount = visibleAssignments.length + visibleMentions.length + visibleEdits.length;

  return (
    <div className="space-y-8">
      <OpsBuscador
        query={query}
        onQueryChange={setQuery}
        placeholder={t('ops.buscador.placeholder')}
        catalogCount={catalogCount}
        matchedCount={matchedCount}
        noun={t('ops.buscador.nouns.pending')}
        nounOne={t('ops.buscador.nouns.pendingOne')}
        empty={
          query.trim() ? (
            <EmptyState>
              {t('ops.buscador.undoQueryHint', { noun: t('ops.buscador.nouns.pending') })}{' '}
              <button type="button" className="font-medium text-codiva-primary" onClick={() => setQuery('')}>
                {t('ops.buscador.clearQuery')}
              </button>
            </EmptyState>
          ) : null
        }
      />

      <section>
        <h2 className="mb-3 text-sm font-semibold text-zinc-900">{t('ops.pendientes.mine')}</h2>
        {visibleAssignments.length ? (
          <ul className="space-y-2">
            {visibleAssignments.map((row) => (
              <li key={row.id}>
                <Link
                  href={`/asignaciones?id=${row.id}`}
                  className="block rounded-xl border border-zinc-200 bg-white px-4 py-3 no-underline hover:border-codiva-primary/40 hover:bg-zinc-50"
                >
                  <p className="font-medium text-zinc-900">{row.title}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {streamLabels[row.stream] ?? row.stream}
                    {' · '}
                    {statusLabels[row.status] ?? row.status}
                    {row.dueLabel ? ` · ${row.dueLabel}` : ''}
                    {` · ${row.progress_pct}%`}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState>{query.trim() ? t('ops.buscador.noMatch', { nounOne: t('ops.buscador.nouns.pendingOne') }) : t('ops.pendientes.mineEmpty')}</EmptyState>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-zinc-900">{t('ops.pendientes.mentions')}</h2>
        {visibleMentions.length ? (
          <ul className="space-y-2">
            {visibleMentions.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3"
              >
                <Link href={`/asignaciones?id=${row.assignment_id}`} className="min-w-0 flex-1 no-underline">
                  <p className="font-medium text-zinc-900">{row.assignment_title}</p>
                  <p className="mt-1 text-sm text-zinc-600">{t('ops.pendientes.mentionedBy', { name: row.author_name })}</p>
                  {row.preview ? <p className="mt-1 line-clamp-2 text-sm text-zinc-500">{row.preview}</p> : null}
                </Link>
                <MarkMentionReadButton
                  mentionId={row.id}
                  label={t('ops.pendientes.markRead')}
                  success={t('ops.pendientes.mentionRead')}
                />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState>{query.trim() ? t('ops.buscador.noMatch', { nounOne: t('ops.buscador.nouns.pendingOne') }) : t('ops.pendientes.mentionsEmpty')}</EmptyState>
        )}
      </section>

      {canManage ? (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-zinc-900">{t('ops.pendientes.editRequests')}</h2>
          {visibleEdits.length ? (
            <ul className="space-y-2">
              {visibleEdits.map((row) => (
                <li key={row.id}>
                  <Link
                    href={`/asignaciones?id=${row.assignment_id}`}
                    className="block rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 no-underline hover:border-codiva-primary/40"
                  >
                    <p className="font-medium text-zinc-900">{row.assignment_title}</p>
                    <p className="mt-1 text-sm text-zinc-600">
                      {t('ops.pendientes.editRequestedBy', { name: row.requested_by_name })}
                    </p>
                    {row.payload ? (
                      <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-zinc-500">{row.payload}</p>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState>
              {query.trim()
                ? t('ops.buscador.noMatch', { nounOne: t('ops.buscador.nouns.pendingOne') })
                : t('ops.pendientes.editRequestsEmpty')}
            </EmptyState>
          )}
        </section>
      ) : null}
    </div>
  );
}
