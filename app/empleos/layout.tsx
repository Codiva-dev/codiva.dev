import CareerI18n from '@/i18n/CareerI18n';
import { pickLocaleMessages } from '@/i18n/config';
import { getLocale } from '@/i18n/locale';
import enCareer from '@/i18n/locales/en/career.json';
import esCareer from '@/i18n/locales/es/career.json';
import LayoutClient from '../LayoutClient';
import { headers } from 'next/headers';
import { isCareerHost } from '@/lib/ops/host';

export async function generateMetadata() {
  const host = (await headers()).get('host');
  if (!isCareerHost(host)) return {};
  return {
    other: { 'csrf-token': 'hunt-csrf' },
  };
}

export default async function EmpleosLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <CareerI18n locale={locale} bundle={pickLocaleMessages(locale, esCareer, enCareer)}>
      <LayoutClient variant="career">{children}</LayoutClient>
    </CareerI18n>
  );
}
