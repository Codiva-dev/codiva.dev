import Link from 'next/link';
import { getT } from '@/i18n/locale';
import type { TicketRow } from './types';

export default async function ProjectTicketsTab({ tickets }: { tickets: TicketRow[] }) {
  const t = await getT();
  return (
    <ul className="space-y-2">
      {tickets.map((ticket) => (
        <li key={ticket.id}>
          <Link href={`/tickets/${ticket.id}`} className="block rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm hover:border-codiva-primary/30">
            {ticket.title}
          </Link>
        </li>
      ))}
      {!tickets.length && <p className="text-sm text-zinc-500">{t('ops.project.noTickets')}</p>}
    </ul>
  );
}
