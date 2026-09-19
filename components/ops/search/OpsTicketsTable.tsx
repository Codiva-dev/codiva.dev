'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import StatusBadge, { ticketTone } from '@/components/ops/StatusBadge';
import { DataTable, EmptyRow, THead, Td, Th, Tr } from '@/components/ui/DataTable';
import OpsClientFilter from './OpsClientFilter';

export type OpsTicketRow = {
  id: string;
  title: string;
  projectName: string;
  reporterName: string;
  reporterEmail: string;
  assigneeName: string;
  priority: string;
  priorityLabel: string;
  status: string;
  statusLabel: string;
  createdAt: string;
};

export default function OpsTicketsTable({ tickets }: { tickets: OpsTicketRow[] }) {
  const { t } = useTranslation();
  return (
    <OpsClientFilter
      items={tickets}
      haystack={(row) =>
        `${row.title} ${row.projectName} ${row.reporterName} ${row.reporterEmail} ${row.assigneeName} ${row.priorityLabel} ${row.statusLabel}`
      }
      placeholder={t('ops.buscador.placeholder')}
      noun={t('ops.buscador.nouns.tickets')}
      nounOne={t('ops.buscador.nouns.ticket')}
    >
      {(visible) => (
        <DataTable>
          <THead>
            <tr>
              <Th>{t('ops.ticketsPage.colTicket')}</Th>
              <Th>{t('ops.ticketsPage.colProject')}</Th>
              <Th>{t('ops.ticketsPage.colReporter')}</Th>
              <Th>{t('ops.ticketsPage.colAssignee')}</Th>
              <Th>{t('ops.ticketsPage.colPriority')}</Th>
              <Th>{t('ops.ticketsPage.colStatus')}</Th>
              <Th>{t('ops.ticketsPage.colDate')}</Th>
            </tr>
          </THead>
          <tbody>
            {visible.map((ticket) => (
              <Tr key={ticket.id}>
                <Td>
                  <Link href={`/tickets/${ticket.id}`} className="font-medium hover:text-codiva-primary">
                    {ticket.title}
                  </Link>
                </Td>
                <Td className="text-zinc-600">{ticket.projectName}</Td>
                <Td>
                  <div>{ticket.reporterName}</div>
                  <div className="text-zinc-500">{ticket.reporterEmail}</div>
                </Td>
                <Td className="text-zinc-600">{ticket.assigneeName}</Td>
                <Td>{ticket.priorityLabel}</Td>
                <Td>
                  <StatusBadge label={ticket.statusLabel} tone={ticketTone(ticket.status)} />
                </Td>
                <Td className="text-zinc-500">{ticket.createdAt}</Td>
              </Tr>
            ))}
            {!visible.length && <EmptyRow colSpan={7}>{t('ops.ticketsPage.empty')}</EmptyRow>}
          </tbody>
        </DataTable>
      )}
    </OpsClientFilter>
  );
}
