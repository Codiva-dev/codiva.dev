import StatusBadge, { ticketTone } from '@/components/ops/StatusBadge';
import TicketRequestForm from '@/components/ticket/TicketRequestForm';
import TicketI18n from '@/i18n/TicketI18n';
import { pickLocaleMessages } from '@/i18n/config';
import { requireProjectMember } from '@/lib/ops/auth';
import { labelsFor } from '@/lib/ops/labels';
import { getT } from '@/i18n/locale';
import enTicket from '@/i18n/locales/en/ticket.json';
import esTicket from '@/i18n/locales/es/ticket.json';

export default async function PortalTicketsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { project, supabase, user } = await requireProjectMember(slug);
  const t = await getT();
  const { TICKET_STATUS_LABELS, formatDate } = labelsFor(t.locale);

  const { data: tickets } = await supabase
    .from('tickets')
    .select('id, title, status, priority, created_at')
    .eq('project_id', project.id)
    .order('created_at', { ascending: false });

  const defaultName =
    (typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name) ||
    (typeof user.user_metadata?.name === 'string' && user.user_metadata.name) ||
    user.email?.split('@')[0] ||
    '';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-4 text-lg font-semibold">{t('portal.ticketsPage.title')}</h2>
        <ul className="space-y-2">
          {(tickets ?? []).map((ticket) => (
            <li
              key={ticket.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{ticket.title}</p>
                <p className="text-xs text-zinc-500">{formatDate(ticket.created_at)}</p>
              </div>
              <StatusBadge label={TICKET_STATUS_LABELS[ticket.status]} tone={ticketTone(ticket.status)} />
            </li>
          ))}
          {!tickets?.length && (
            <p className="text-sm text-zinc-500">{t('portal.ticketsPage.empty')}</p>
          )}
        </ul>
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <h3 className="mb-3 font-semibold">{t('portal.ticketsPage.new')}</h3>
        <p className="mb-4 text-sm text-zinc-600">{t('portal.ticketsPage.hint')}</p>
        <TicketI18n locale={t.locale} bundle={pickLocaleMessages(t.locale, esTicket, enTicket)}>
          <TicketRequestForm
            variant="portal"
            projectId={project.id}
            projectName={project.name}
            defaultName={defaultName}
            defaultEmail={user.email || ''}
            lockedIdentity
          />
        </TicketI18n>
      </section>
    </div>
  );
}
