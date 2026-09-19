'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import StatusBadge, { ticketTone } from '@/components/ops/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import OpsBuscador from './OpsBuscador';
import { textMatches } from '@/lib/ops/search-text';
import { opsProjectPath } from '@/lib/ops/project-path';

export type OpsWorkloadPerson = {
  id: string;
  name: string;
  role: string;
  sprintItems: {
    id: string;
    title: string;
    status: string;
    statusLabel: string;
    projectSlug: string;
    projectName: string;
    sprintName: string;
  }[];
  tickets: { id: string; title: string; status: string; statusLabel: string }[];
  hoursThisWeek: number;
  projectCount: number;
};

export default function OpsWorkloadList({ people }: { people: OpsWorkloadPerson[] }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const needle = query.trim();
    if (!needle) return people;
    return people.flatMap((person) => {
      const personHay = `${person.name} ${person.role}`;
      const personMatch = textMatches(personHay, needle);
      const sprintItems = personMatch
        ? person.sprintItems
        : person.sprintItems.filter((item) =>
            textMatches(`${item.title} ${item.projectName} ${item.sprintName} ${item.statusLabel}`, needle)
          );
      const tickets = personMatch
        ? person.tickets
        : person.tickets.filter((row) => textMatches(`${row.title} ${row.statusLabel}`, needle));
      if (!personMatch && !sprintItems.length && !tickets.length) return [];
      return [{ ...person, sprintItems, tickets }];
    });
  }, [people, query]);

  return (
    <div className="space-y-6">
      <OpsBuscador
        query={query}
        onQueryChange={setQuery}
        placeholder={t('ops.buscador.placeholder')}
        catalogCount={people.length}
        matchedCount={visible.length}
        noun={t('ops.buscador.nouns.people')}
        nounOne={t('ops.buscador.nouns.person')}
        empty={
          query.trim() ? (
            <EmptyState>
              {t('ops.buscador.undoQueryHint', { noun: t('ops.buscador.nouns.people') })}{' '}
              <button type="button" className="font-medium text-codiva-primary" onClick={() => setQuery('')}>
                {t('ops.buscador.clearQuery')}
              </button>
            </EmptyState>
          ) : null
        }
      />

      {visible.map((person) => (
        <section key={person.id} className="rounded-xl border border-zinc-200 bg-white p-5">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="font-semibold">{person.name}</h2>
              <p className="text-xs uppercase tracking-wide text-zinc-400">{person.role}</p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-zinc-600">
              <span>{t('ops.workloadPage.projectsCount', { count: person.projectCount })}</span>
              <span>{t('ops.workloadPage.openItems', { count: person.sprintItems.length })}</span>
              <span>{t('ops.workloadPage.ticketsCount', { count: person.tickets.length })}</span>
              <span className="font-medium text-codiva-primary">
                {t('ops.workloadPage.hoursWeek', { hours: person.hoursThisWeek.toFixed(1) })}
              </span>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-medium text-zinc-700">{t('ops.workloadPage.sprint')}</h3>
              <ul className="space-y-2">
                {person.sprintItems.map((item) => (
                  <li key={item.id} className="flex min-w-0 items-start justify-between gap-2 text-sm">
                    <div className="min-w-0">
                      <Link
                        href={opsProjectPath(item.projectSlug, '?tab=sprints')}
                        className="font-medium hover:text-codiva-primary"
                      >
                        {item.title}
                      </Link>
                      <p className="text-xs text-zinc-400">
                        {item.projectName} · {item.sprintName}
                      </p>
                    </div>
                    <StatusBadge
                      label={item.statusLabel}
                      tone={item.status === 'blocked' ? 'danger' : 'info'}
                    />
                  </li>
                ))}
                {!person.sprintItems.length && (
                  <p className="text-sm text-zinc-400">{t('ops.workloadPage.noOpenItems')}</p>
                )}
              </ul>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-medium text-zinc-700">{t('ops.workloadPage.tickets')}</h3>
              <ul className="space-y-2">
                {person.tickets.map((ticket) => (
                  <li key={ticket.id} className="flex min-w-0 items-start justify-between gap-2 text-sm">
                    <Link href={`/tickets/${ticket.id}`} className="min-w-0 break-words font-medium hover:text-codiva-primary">
                      {ticket.title}
                    </Link>
                    <StatusBadge label={ticket.statusLabel} tone={ticketTone(ticket.status)} />
                  </li>
                ))}
                {!person.tickets.length && <p className="text-sm text-zinc-400">{t('ops.workloadPage.noTickets')}</p>}
              </ul>
            </div>
          </div>
        </section>
      ))}
      {!people.length ? (
        <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-500">
          {t('ops.workloadPage.noStaff')}
        </p>
      ) : null}
    </div>
  );
}
