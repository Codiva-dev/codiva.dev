'use server';

import { revalidatePath } from 'next/cache';
import { assertCapability, assertProjectAccessOrThrow } from '@/lib/ops/auth';
import { logActivity } from '@/lib/ops/activity';
import { throwDb, throwPublic } from '@/lib/ops/throw-db';
import { notifyStaff } from '@/lib/ops/email';
import { isLicenseStatus, parseLicenseModules, type LicenseStatus } from '@/lib/ops/saas-license';
import { signAndPushSaasProject } from '@/lib/ops/saas-push';
import { opsProjectPath } from '@/lib/ops/project-path';

const SLOTS = ['cincel', 'idse', 'stp'] as const;

async function licenseSecret(): Promise<string> {
  const secret = process.env.CODIVA_LICENSE_SECRET?.trim() ?? '';
  if (!secret) await throwPublic('ops.license.errSecret');
  return secret;
}

async function ensureVendorSlots(
  supabase: Awaited<ReturnType<typeof assertCapability>>['supabase'],
  instanceId: string
) {
  for (const slot of SLOTS) {
    const { error } = await supabase.from('saas_vendor_slots').upsert(
      { instance_id: instanceId, slot },
      { onConflict: 'instance_id,slot', ignoreDuplicates: true }
    );
    if (error) throw await throwDb(error);
  }
}

export async function ensureSaasInstance(projectId: string, slug: string) {
  const access = await assertCapability('saas_licenses');
  await assertProjectAccessOrThrow(access, projectId);
  const { supabase, user } = access;

  const { data: existing } = await supabase
    .from('saas_instances')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle();
  if (existing) {
    await ensureVendorSlots(supabase, existing.id);
    return existing;
  }

  const now = new Date();
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
  const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0))
    .toISOString()
    .slice(0, 10);
  const { data, error } = await supabase
    .from('saas_instances')
    .insert({
      project_id: projectId,
      instance_key: slug || 'nirc',
      status: 'active',
      period_start: periodStart,
      period_end: periodEnd,
      modules: ['cincel', 'idse', 'stp'],
    })
    .select('*')
    .single();
  if (error) throw await throwDb(error);
  await ensureVendorSlots(supabase, data.id);
  await logActivity({
    entityType: 'saas_instance',
    entityId: data.id,
    action: 'created',
    actorId: user.id,
    metadata: { project_id: projectId },
  });
  revalidatePath(`/projects/${projectId}`);
  return data;
}

async function loadInstance(
  supabase: Awaited<ReturnType<typeof assertCapability>>['supabase'],
  projectId: string
) {
  const { data, error } = await supabase
    .from('saas_instances')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle();
  if (error) throw await throwDb(error);
  if (!data) await throwPublic('ops.license.errMissing');
  return data;
}

export async function saveSaasInstance(projectId: string, formData: FormData) {
  const access = await assertCapability('saas_licenses');
  await assertProjectAccessOrThrow(access, projectId);
  const { supabase, user } = access;
  const row = await loadInstance(supabase, projectId);

  const statusRaw = String(formData.get('status') || row.status);
  const status: LicenseStatus = isLicenseStatus(statusRaw) ? statusRaw : row.status;
  const picked = formData.getAll('modules').map(String);
  const modules = parseLicenseModules(picked.length ? picked : row.modules);
  const periodStart = String(formData.get('periodStart') || row.period_start || '');
  const periodEnd = String(formData.get('periodEnd') || row.period_end || '');
  const graceUntil = String(formData.get('graceUntil') || '') || null;
  const instanceKey = String(formData.get('instanceKey') || row.instance_key).trim();
  const instancePushUrl = String(formData.get('instancePushUrl') || '').trim() || null;
  const notes = String(formData.get('notes') || '');

  const { error } = await supabase
    .from('saas_instances')
    .update({
      status,
      modules,
      period_start: periodStart || null,
      period_end: periodEnd || null,
      grace_until: graceUntil,
      instance_key: instanceKey,
      instance_push_url: instancePushUrl,
      notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', row.id);
  if (error) throw await throwDb(error);

  await logActivity({
    entityType: 'saas_instance',
    entityId: row.id,
    action: 'updated',
    actorId: user.id,
    metadata: { project_id: projectId, status },
  });

  if (status !== row.status && (status === 'grace' || status === 'locked')) {
    await notifyStaff({
      subject: `NIRC licencia ${status}`,
      text: `La instancia ${instanceKey} pasó a ${status}.`,
    });
  }

  await signAndPushSaasProject(supabase, projectId);
  revalidatePath(`/projects/${projectId}`);
}

export async function signAndPushSaasLicense(projectId: string) {
  const access = await assertCapability('saas_licenses');
  await assertProjectAccessOrThrow(access, projectId);
  const { supabase, user } = access;
  await licenseSecret();
  const row = await loadInstance(supabase, projectId);
  const token = await signAndPushSaasProject(supabase, projectId);
  if (!token) await throwPublic('ops.license.errSecret');
  await logActivity({
    entityType: 'saas_instance',
    entityId: row.id,
    action: 'signed',
    actorId: user.id,
    metadata: { project_id: projectId },
  });
  revalidatePath(`/projects/${projectId}`);
  return token;
}

export async function setSaasStatus(projectId: string, status: LicenseStatus) {
  const access = await assertCapability('saas_licenses');
  await assertProjectAccessOrThrow(access, projectId);
  const { supabase, user } = access;
  const row = await loadInstance(supabase, projectId);
  const { error } = await supabase
    .from('saas_instances')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', row.id);
  if (error) throw await throwDb(error);
  await logActivity({
    entityType: 'saas_instance',
    entityId: row.id,
    action: 'status',
    actorId: user.id,
    metadata: { project_id: projectId, status },
  });
  if (status === 'grace' || status === 'locked') {
    await notifyStaff({
      subject: `NIRC licencia ${status}`,
      text: `La instancia ${row.instance_key} pasó a ${status}.`,
    });
  }
  await signAndPushSaasProject(supabase, projectId);
  revalidatePath(`/projects/${projectId}`);
}

export async function saveSaasVendorSlot(
  projectId: string,
  slot: string,
  formData: FormData
) {
  const access = await assertCapability('saas_licenses');
  await assertProjectAccessOrThrow(access, projectId);
  const { supabase } = access;
  const row = await loadInstance(supabase, projectId);
  const expiresAt = String(formData.get('expiresAt') || '') || null;
  const notes = String(formData.get('notes') || '');
  const { error } = await supabase
    .from('saas_vendor_slots')
    .upsert(
      {
        instance_id: row.id,
        slot,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        notes,
        last_checked_at: new Date().toISOString(),
      },
      { onConflict: 'instance_id,slot' }
    );
  if (error) throw await throwDb(error);
  revalidatePath(`/projects/${projectId}`);
}

export function saasLicenseHref(slug: string) {
  return opsProjectPath(slug, '?tab=licencia');
}

