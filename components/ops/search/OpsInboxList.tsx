'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import ToastForm from '@/components/ops/ToastForm';
import StatusBadge from '@/components/ops/StatusBadge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import OpsClientFilter from '@/components/ops/search/OpsClientFilter';
import {
  convertInboxToLead,
  deleteInboxMessage,
  updateInboxLane,
  updateInboxStatus,
} from '@/lib/ops/actions/leads';
import type { Locale } from '@/i18n/config';
import { formatDate } from '@/lib/ops/labels';
import { INBOX_LANES, type InboxLane } from '@/lib/ops/inbox-lane';
import type { InboundItem, InboundKind } from '@/lib/ops/inbound';

function kindTone(kind: InboundKind): 'info' | 'warning' | 'danger' | 'success' | 'neutral' {
  if (kind === 'contact') return 'info';
  if (kind === 'lead') return 'warning';
  if (kind === 'ticket') return 'danger';
  if (kind === 'application') return 'success';
  return 'warning';
}

function laneTone(lane: InboxLane): 'info' | 'warning' | 'danger' | 'success' | 'neutral' {
  if (lane === 'real') return 'success';
  if (lane === 'test') return 'warning';
  return 'neutral';
}

export default function OpsInboxList({
  items,
  statusLabels,
  laneLabels,
  kindLabels,
  locale,
}: {
  items: InboundItem[];
  statusLabels: Record<string, string>;
  laneLabels: Record<InboxLane, string>;
  kindLabels: Record<InboundKind, string>;
  locale: Locale;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <OpsClientFilter
      items={items}
      haystack={(item) =>
        `${item.title} ${item.subtitle} ${item.snippet} ${kindLabels[item.kind]} ${item.contact?.email || ''} ${item.contact?.message || ''}`
      }
      placeholder={t('ops.buscador.placeholder')}
      noun={t('ops.buscador.nouns.inbox')}
      nounOne={t('ops.buscador.nouns.inboxOne')}
    >
      {(visible) => (
        <div className="space-y-4">
          {visible.map((item) => {
            const contact = item.contact;
            if (contact) {
              const messageId = contact.id;
              return (
                <Card key={item.key} as="article">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <StatusBadge label={kindLabels.contact} tone={kindTone('contact')} />
                        <StatusBadge label={laneLabels[contact.lane]} tone={laneTone(contact.lane)} />
                        <h2 className="font-semibold">{contact.name}</h2>
                      </div>
                      <p className="text-sm text-zinc-500">
                        {contact.email} · {formatDate(contact.created_at, locale)}
                      </p>
                    </div>
                    <StatusBadge
                      label={statusLabels[contact.status]}
                      tone={contact.status === 'unread' ? 'info' : 'neutral'}
                    />
                  </div>
                  <p className="text-sm whitespace-pre-wrap text-zinc-700">{contact.message}</p>
                  <div className="mt-4 flex flex-wrap items-end gap-2">
                    <ToastForm
                      success={t('ops.inbox.saved')}
                      action={async (formData: FormData) => {
                        await updateInboxStatus(messageId, String(formData.get('status')));
                      }}
                      className="flex items-end gap-2"
                    >
                      <select
                        name="status"
                        defaultValue={contact.status}
                        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none transition focus:border-codiva-primary focus:ring-2 focus:ring-codiva-primary/20"
                      >
                        {Object.entries(statusLabels).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                      <Button type="submit" variant="secondary" size="xs">
                        {t('ops.inbox.save')}
                      </Button>
                    </ToastForm>
                    <ToastForm
                      success={t('ops.inbox.laneSaved')}
                      action={async (formData: FormData) => {
                        await updateInboxLane(messageId, String(formData.get('lane')));
                      }}
                      className="flex items-end gap-2"
                    >
                      <select
                        name="lane"
                        defaultValue={contact.lane}
                        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none transition focus:border-codiva-primary focus:ring-2 focus:ring-codiva-primary/20"
                      >
                        {INBOX_LANES.map((lane) => (
                          <option key={lane} value={lane}>
                            {laneLabels[lane]}
                          </option>
                        ))}
                      </select>
                      <Button type="submit" variant="secondary" size="xs">
                        {t('ops.inbox.save')}
                      </Button>
                    </ToastForm>
                    {contact.lead_id ? (
                      <Button as={Link} href={`/leads/${contact.lead_id}`} variant="secondary" size="xs">
                        {t('ops.inbox.viewLead')}
                      </Button>
                    ) : contact.lane === 'real' ? (
                      <ToastForm
                        success={t('ops.inbox.convertSuccess')}
                        action={async () => {
                          const result = await convertInboxToLead(messageId);
                          router.push(`/leads/${result.leadId}`);
                        }}
                      >
                        <Button type="submit" size="xs">
                          {t('ops.inbox.convertLead')}
                        </Button>
                      </ToastForm>
                    ) : null}
                    <ToastForm
                      success={t('ops.inbox.deleted')}
                      confirmTitle={t('ops.inbox.delete')}
                      confirmLabel={t('ops.inbox.delete')}
                      confirmMessage={t('ops.inbox.deleteConfirm')}
                      action={async () => {
                        await deleteInboxMessage(messageId);
                      }}
                    >
                      <Button type="submit" variant="danger" size="xs">
                        {t('ops.inbox.delete')}
                      </Button>
                    </ToastForm>
                  </div>
                </Card>
              );
            }

            return (
              <Card key={item.key} as="article">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <StatusBadge label={kindLabels[item.kind]} tone={kindTone(item.kind)} />
                      <h2 className="font-semibold">{item.title}</h2>
                    </div>
                    <p className="text-sm text-zinc-500">
                      {item.subtitle} · {formatDate(item.createdAt, locale)}
                    </p>
                    {item.snippet ? <p className="mt-2 text-sm text-zinc-700">{item.snippet}</p> : null}
                  </div>
                  <Button as={Link} href={item.href} variant="secondary" size="xs">
                    {t('ops.inbox.open')}
                  </Button>
                </div>
              </Card>
            );
          })}
          {!visible.length && <EmptyState>{t('ops.inbox.empty')}</EmptyState>}
        </div>
      )}
    </OpsClientFilter>
  );
}
