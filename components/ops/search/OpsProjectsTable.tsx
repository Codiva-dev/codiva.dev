'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import PreviewPopupLink from '@/components/ops/PreviewPopupLink';
import PortalClientUrl from '@/components/ops/PortalClientUrl';
import StatusBadge, { projectTone } from '@/components/ops/StatusBadge';
import { DataTable, EmptyRow, THead, Td, Th, Tr } from '@/components/ui/DataTable';
import { opsProjectPath } from '@/lib/ops/project-path';
import OpsClientFilter from './OpsClientFilter';

export type OpsProjectRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  progress_percent: number;
  client_visible: boolean;
  deliveryLabel: string;
  organizationName: string;
  previewHref: string;
};

export default function OpsProjectsTable({
  projects,
  emptyLabel,
  statusLabels,
  emptyMessage,
}: {
  projects: OpsProjectRow[];
  emptyLabel: string;
  statusLabels: Record<string, string>;
  emptyMessage: string;
}) {
  const { t } = useTranslation();
  return (
    <OpsClientFilter
      items={projects}
      haystack={(row) => `${row.name} ${row.organizationName} ${statusLabels[row.status] || row.status} ${row.slug}`}
      placeholder={t('ops.buscador.placeholder')}
      noun={t('ops.buscador.nouns.projects')}
      nounOne={t('ops.buscador.nouns.project')}
    >
      {(visible) => (
        <DataTable>
          <THead>
            <tr>
              <Th>{t('ops.projectsPage.colProject')}</Th>
              <Th>{t('ops.projectsPage.colClient')}</Th>
              <Th>{t('ops.projectsPage.colStatus')}</Th>
              <Th>{t('ops.projectsPage.colPortal')}</Th>
              <Th>{t('ops.projectsPage.colDelivery')}</Th>
            </tr>
          </THead>
          <tbody>
            {visible.map((row) => (
              <Tr key={row.id}>
                <Td>
                  <Link href={opsProjectPath(row.slug)} className="font-medium hover:text-codiva-primary">
                    {row.name}
                  </Link>
                  <div className="text-xs text-zinc-500">{t('ops.projectsPage.progressPct', { pct: row.progress_percent })}</div>
                </Td>
                <Td>{row.organizationName || emptyLabel}</Td>
                <Td>
                  <StatusBadge label={statusLabels[row.status]} tone={projectTone(row.status)} />
                </Td>
                <Td>
                  <div className="flex flex-col items-start gap-1.5">
                    <PreviewPopupLink href={row.previewHref} className="text-codiva-primary hover:underline">
                      {t('ops.projectsPage.preview')}
                    </PreviewPopupLink>
                    <PortalClientUrl slug={row.slug} />
                    {!row.client_visible ? (
                      <span className="text-[11px] text-amber-700">{t('ops.projectsPage.hidden')}</span>
                    ) : null}
                  </div>
                </Td>
                <Td className="text-zinc-500">{row.deliveryLabel}</Td>
              </Tr>
            ))}
            {!visible.length && <EmptyRow colSpan={5}>{emptyMessage}</EmptyRow>}
          </tbody>
        </DataTable>
      )}
    </OpsClientFilter>
  );
}
