import { timingSafeEqual } from 'node:crypto';
import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/admin';
import { notifyStaff } from '@/lib/ops/email';
import {
  isUsageMeter,
  periodLabelFromIso,
  vendorSlotIsDue,
  type UsageMeter,
} from '@/lib/ops/saas-license';

export function ingestAuthorized(header: string | null): boolean {
  const expected = process.env.CODIVA_SAAS_INGEST_SECRET?.trim() ?? '';
  if (!expected || !header?.startsWith('Bearer ')) return false;
  const given = header.slice(7);
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

async function instanceByKey(instanceKey: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('saas_instances')
    .select('id, instance_key, project_id, status')
    .eq('instance_key', instanceKey)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function ingestUsageEvent(input: {
  instanceKey: string;
  meter: string;
  aggregateId: string;
  occurredAt?: string;
}) {
  if (!isSupabaseConfigured()) throw new Error('misconfigured');
  if (!isUsageMeter(input.meter)) throw new Error('meter');
  const instance = await instanceByKey(input.instanceKey);
  if (!instance) throw new Error('instance');
  const admin = createAdminClient();
  const occurredAt = input.occurredAt || new Date().toISOString();
  const { error: eventError } = await admin.from('saas_usage_events').insert({
    instance_id: instance.id,
    meter: input.meter,
    aggregate_id: input.aggregateId,
    occurred_at: occurredAt,
  });
  if (eventError && eventError.code !== '23505') throw eventError;
  if (eventError?.code === '23505') return { ok: true, duplicate: true };
  const period = periodLabelFromIso(occurredAt);
  const { data: counter } = await admin
    .from('saas_usage_counters')
    .select('id, quantity')
    .eq('instance_id', instance.id)
    .eq('period_label', period)
    .eq('meter', input.meter)
    .maybeSingle();
  if (counter) {
    await admin
      .from('saas_usage_counters')
      .update({ quantity: Number(counter.quantity) + 1 })
      .eq('id', counter.id);
  } else {
    await admin.from('saas_usage_counters').insert({
      instance_id: instance.id,
      period_label: period,
      meter: input.meter as UsageMeter,
      quantity: 1,
    });
  }
  return { ok: true, duplicate: false };
}

export async function ingestVendorExpiry(input: {
  instanceKey: string;
  slot: string;
  expiresAt: string | null;
  lastError?: string | null;
  checkedAt?: string;
}) {
  if (!isSupabaseConfigured()) throw new Error('misconfigured');
  if (input.slot !== 'cincel' && input.slot !== 'idse' && input.slot !== 'stp') {
    throw new Error('slot');
  }
  const instance = await instanceByKey(input.instanceKey);
  if (!instance) throw new Error('instance');
  const admin = createAdminClient();
  const { data: previous } = await admin
    .from('saas_vendor_slots')
    .select('expires_at, last_error')
    .eq('instance_id', instance.id)
    .eq('slot', input.slot)
    .maybeSingle();
  const { error } = await admin.from('saas_vendor_slots').upsert(
    {
      instance_id: instance.id,
      slot: input.slot,
      expires_at: input.expiresAt,
      last_error: input.lastError ?? null,
      last_checked_at: input.checkedAt || new Date().toISOString(),
    },
    { onConflict: 'instance_id,slot' }
  );
  if (error) throw error;
  const due = vendorSlotIsDue(input.expiresAt);
  const becameDue =
    due && (!previous || previous.last_error !== input.lastError || !vendorSlotIsDue(previous.expires_at));
  if (becameDue || input.lastError === 'jwt_expired') {
    await notifyStaff({
      subject: `NIRC vendor ${input.slot}`,
      text: `La instancia ${input.instanceKey} tiene ${input.slot} por vencer o vencido (${input.expiresAt ?? 'sin fecha'}). Renovar en la escotilla Super Admin de la instancia.`,
    });
  }
  return { ok: true };
}

export async function snapshotForInstance(instanceKey: string) {
  if (!isSupabaseConfigured()) throw new Error('misconfigured');
  const instance = await instanceByKey(instanceKey);
  if (!instance) return null;
  const admin = createAdminClient();
  const { data: full } = await admin.from('saas_instances').select('*').eq('id', instance.id).single();
  const period = new Date().toISOString().slice(0, 7);
  const { data: counters } = await admin
    .from('saas_usage_counters')
    .select('meter, quantity, period_label')
    .eq('instance_id', instance.id)
    .eq('period_label', period);
  const meters: Record<string, number> = {};
  for (const row of counters ?? []) meters[row.meter] = Number(row.quantity) || 0;
  const { data: vendors } = await admin
    .from('saas_vendor_slots')
    .select('slot, expires_at, last_error')
    .eq('instance_id', instance.id);
  return {
    status: full?.status ?? null,
    periodStart: full?.period_start ?? null,
    periodEnd: full?.period_end ?? null,
    graceUntil: full?.grace_until ?? null,
    modules: full?.modules ?? [],
    meters,
    vendors: vendors ?? [],
  };
}
