'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import StatusBadge from '@/components/ops/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import OpsClientFilter from './OpsClientFilter';

export type OpsPortalUserRow = {
  userId: string;
  email: string;
  projectNames: string;
  roles: string;
  hub: boolean;
  legalComplete: boolean;
};

export default function OpsPortalUsersList({ users }: { users: OpsPortalUserRow[] }) {
  const { t } = useTranslation();
  return (
    <OpsClientFilter
      items={users}
      haystack={(row) => `${row.email} ${row.projectNames} ${row.roles}`}
      placeholder={t('ops.buscador.placeholder')}
      noun={t('ops.buscador.nouns.users')}
      nounOne={t('ops.buscador.nouns.user')}
    >
      {(visible) => (
        <ul className="space-y-2">
          {visible.map((info) => (
            <li key={info.userId}>
              <Link
                href={`/users/${info.userId}`}
                className="block rounded-xl border border-zinc-200 bg-white px-4 py-3 no-underline hover:border-codiva-primary/30 hover:no-underline"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-zinc-900">{info.email}</p>
                    <p className="text-sm text-zinc-500">{info.projectNames || t('ops.portalUsers.noProjects')}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {info.hub ? <StatusBadge label={t('ops.portalUsers.hubBadge')} tone="info" /> : null}
                    <StatusBadge label={info.roles} />
                    <StatusBadge
                      label={info.legalComplete ? t('ops.portalUsers.legalOk') : t('ops.portalUsers.legalPending')}
                      tone={info.legalComplete ? 'success' : 'warning'}
                    />
                  </div>
                </div>
              </Link>
            </li>
          ))}
          {!visible.length && <EmptyState>{t('ops.portalUsers.empty')}</EmptyState>}
        </ul>
      )}
    </OpsClientFilter>
  );
}
