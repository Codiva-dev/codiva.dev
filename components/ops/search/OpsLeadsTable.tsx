'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import StatusBadge, { leadTone } from '@/components/ops/StatusBadge';
import { DataTable, EmptyRow, THead, Td, Th, Tr } from '@/components/ui/DataTable';
import OpsClientFilter from '@/components/ops/search/OpsClientFilter';

export type OpsLeadRow = {
  id: string;
  name: string;
  company: string | null;
  email: string;
  status: string;
  source: string;
  partner_company: string | null;
  end_client_company: string | null;
  createdAtLabel: string;
};

export default function OpsLeadsTable({
  leads,
  emptyLabel,
  sourceLabels,
  statusLabels,
}: {
  leads: OpsLeadRow[];
  emptyLabel: string;
  sourceLabels: Record<string, string>;
  statusLabels: Record<string, string>;
}) {
  const { t } = useTranslation();
  return (
    <OpsClientFilter
      items={leads}
      haystack={(lead) =>
        `${lead.end_client_company || ''} ${lead.company || ''} ${lead.partner_company || ''} ${lead.name} ${lead.email} ${
          sourceLabels[lead.source] || lead.source
        } ${statusLabels[lead.status] || lead.status}`
      }
      placeholder={t('ops.buscador.placeholder')}
      noun={t('ops.buscador.nouns.leads')}
      nounOne={t('ops.buscador.nouns.lead')}
    >
      {(visible) => (
        <DataTable>
          <THead>
            <tr>
              <Th>{t('ops.leadsPage.colCompany')}</Th>
              <Th>{t('ops.leadsPage.colContact')}</Th>
              <Th>{t('ops.leadsPage.colSource')}</Th>
              <Th>{t('ops.leadsPage.colStatus')}</Th>
              <Th>{t('ops.leadsPage.colDate')}</Th>
            </tr>
          </THead>
          <tbody>
            {visible.map((lead) => (
              <Tr key={lead.id}>
                <Td>
                  <Link href={`/leads/${lead.id}`} className="font-medium hover:text-codiva-primary">
                    {lead.end_client_company || lead.company || lead.partner_company || emptyLabel}
                  </Link>
                  {lead.partner_company && lead.company && lead.partner_company !== lead.company ? (
                    <div className="text-xs text-zinc-500">
                      {t('ops.leadsPage.viaPartner', { company: lead.partner_company })}
                    </div>
                  ) : null}
                </Td>
                <Td>
                  <div>{lead.name}</div>
                  <div className="text-zinc-500">{lead.email}</div>
                </Td>
                <Td className="text-zinc-500">{sourceLabels[lead.source] || lead.source}</Td>
                <Td>
                  <StatusBadge label={statusLabels[lead.status]} tone={leadTone(lead.status)} />
                </Td>
                <Td className="text-zinc-500">{lead.createdAtLabel}</Td>
              </Tr>
            ))}
            {!visible.length && <EmptyRow colSpan={5}>{t('ops.leadsPage.empty')}</EmptyRow>}
          </tbody>
        </DataTable>
      )}
    </OpsClientFilter>
  );
}
