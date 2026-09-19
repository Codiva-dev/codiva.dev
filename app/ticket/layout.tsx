import TicketI18n from '@/i18n/TicketI18n';
import { pickLocaleMessages } from '@/i18n/config';
import { getLocale } from '@/i18n/locale';
import enTicket from '@/i18n/locales/en/ticket.json';
import esTicket from '@/i18n/locales/es/ticket.json';
import LayoutClient from '../LayoutClient';

export default async function TicketLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <TicketI18n locale={locale} bundle={pickLocaleMessages(locale, esTicket, enTicket)}>
      <LayoutClient variant="ticket">{children}</LayoutClient>
    </TicketI18n>
  );
}
