import CareerI18n from '@/i18n/CareerI18n';
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

export default function EmpleosLayout({ children }: { children: React.ReactNode }) {
  return (
    <CareerI18n>
      <LayoutClient variant="career">{children}</LayoutClient>
    </CareerI18n>
  );
}
