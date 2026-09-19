import { redirect } from 'next/navigation';
import { opsHomeHref } from '@/lib/ops/home';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  redirect(opsHomeHref(await searchParams));
}
