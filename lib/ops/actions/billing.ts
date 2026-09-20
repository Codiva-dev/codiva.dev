'use server';

import { revalidatePath } from 'next/cache';
import {
  assertCapability,
  assertProjectAccessOrThrow,
} from '@/lib/ops/auth';
import { logActivity } from '@/lib/ops/activity';
import { optionalHttpUrl } from '@/lib/ops/requested-url';
import { throwDb } from '@/lib/ops/throw-db';
import { deriveSaasStatusFromCharges, isLicenseStatus } from '@/lib/ops/saas-license';
import { signAndPushSaasProject } from '@/lib/ops/saas-push';
import { notifyStaff } from '@/lib/ops/email';

function parseChargeAmount(raw: FormDataEntryValue | null): number | null {
  const text = String(raw ?? '').trim();
  if (!text) return null;
  const n = Number(text.replace(/,/g, ''));
  if (!Number.isFinite(n) || n < 0) throw new Error('Monto inválido');
  return n;
}

function parseNoticeDays(raw: FormDataEntryValue | null): number {
  const text = String(raw ?? '').trim();
  if (!text) return 30;
  const n = parseInt(text, 10);
  if (!Number.isFinite(n) || n < 0) throw new Error('Días de aviso inválidos');
  return n;
}

async function syncSaasStatusFromCharges(
  supabase: Awaited<ReturnType<typeof assertCapability>>['supabase'],
  projectId: string
) {
  const { data: instance } = await supabase
    .from('saas_instances')
    .select('id, status')
    .eq('project_id', projectId)
    .maybeSingle();
  if (!instance) return;
  const { data: charges } = await supabase
    .from('project_charges')
    .select('kind, status, due_date, notice_days')
    .eq('project_id', projectId);
  const next = deriveSaasStatusFromCharges(charges ?? []);
  const rank = { active: 0, grace: 1, locked: 2 } as const;
  const current = isLicenseStatus(instance.status) ? instance.status : 'active';
  if (rank[next] <= rank[current]) return;
  await supabase
    .from('saas_instances')
    .update({ status: next, updated_at: new Date().toISOString() })
    .eq('id', instance.id);
  if (next === 'grace' || next === 'locked') {
    await notifyStaff({
      subject: `NIRC licencia ${next}`,
      text: `Un cargo SaaS dejó la instancia en ${next}.`,
    });
  }
  await signAndPushSaasProject(supabase, projectId);
}

export async function createProjectCharge(projectId: string, formData: FormData) {
  const access = await assertCapability('charges');
  await assertProjectAccessOrThrow(access, projectId);
  const { supabase, user } = access;

  const status = String(formData.get('status') || 'pending');
  const kind = String(formData.get('kind') || 'development');
  const paidAt =
    status === 'paid'
      ? String(formData.get('paidAt') || '') || new Date().toISOString()
      : null;

  const { data: last } = await supabase
    .from('project_charges')
    .select('sort_order')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from('project_charges').insert({
    project_id: projectId,
    kind,
    title: String(formData.get('title') || '').trim() || 'Cargo',
    description: String(formData.get('description') || ''),
    amount: parseChargeAmount(formData.get('amount')),
    currency: String(formData.get('currency') || 'MXN'),
    status,
    due_date: String(formData.get('dueDate') || '') || null,
    paid_at: paidAt,
    period_label: String(formData.get('periodLabel') || '') || null,
    notice_days: parseNoticeDays(formData.get('noticeDays')),
    sort_order: (last?.sort_order ?? -1) + 1,
    visible_to_client: formData.get('visibleToClient') === 'on',
    staff_notes: String(formData.get('staffNotes') || ''),
  });
  if (error) throw await throwDb(error);

  await logActivity({
    entityType: 'project_charge',
    entityId: projectId,
    action: 'created',
    actorId: user.id,
    metadata: { project_id: projectId, kind, status },
  });

  await syncSaasStatusFromCharges(supabase, projectId);
  revalidatePath(`/projects/${projectId}`);
}

export async function updateProjectCharge(
  chargeId: string,
  projectId: string,
  formData: FormData
) {
  const access = await assertCapability('charges');
  await assertProjectAccessOrThrow(access, projectId);
  const { supabase, user } = access;

  const status = String(formData.get('status') || 'pending');
  const existingPaidAt = String(formData.get('existingPaidAt') || '') || null;
  const paidAt =
    status === 'paid'
      ? String(formData.get('paidAt') || '') || existingPaidAt || new Date().toISOString()
      : null;

  const { error } = await supabase
    .from('project_charges')
    .update({
      kind: String(formData.get('kind') || 'development'),
      title: String(formData.get('title') || '').trim() || 'Cargo',
      description: String(formData.get('description') || ''),
      amount: parseChargeAmount(formData.get('amount')),
      currency: String(formData.get('currency') || 'MXN'),
      status,
      due_date: String(formData.get('dueDate') || '') || null,
      paid_at: paidAt,
      period_label: String(formData.get('periodLabel') || '') || null,
      notice_days: parseNoticeDays(formData.get('noticeDays')),
      visible_to_client: formData.get('visibleToClient') === 'on',
      staff_notes: String(formData.get('staffNotes') || ''),
      updated_at: new Date().toISOString(),
    })
    .eq('id', chargeId)
    .eq('project_id', projectId);
  if (error) throw await throwDb(error);

  await logActivity({
    entityType: 'project_charge',
    entityId: chargeId,
    action: 'updated',
    actorId: user.id,
    metadata: { project_id: projectId, status },
  });

  await syncSaasStatusFromCharges(supabase, projectId);
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteProjectCharge(chargeId: string, projectId: string) {
  const access = await assertCapability('charges');
  await assertProjectAccessOrThrow(access, projectId);
  const { supabase, user } = access;

  const { error } = await supabase
    .from('project_charges')
    .delete()
    .eq('id', chargeId)
    .eq('project_id', projectId);
  if (error) throw await throwDb(error);

  await logActivity({
    entityType: 'project_charge',
    entityId: chargeId,
    action: 'deleted',
    actorId: user.id,
    metadata: { project_id: projectId },
  });

  await syncSaasStatusFromCharges(supabase, projectId);
  revalidatePath(`/projects/${projectId}`);
}

export async function updateProjectSiteUrls(projectId: string, formData: FormData) {
  const access = await assertCapability('site_access');
  await assertProjectAccessOrThrow(access, projectId);
  const { supabase, user } = access;

  const preview = optionalHttpUrl(String(formData.get('sitePreviewUrl') || ''));
  const production = optionalHttpUrl(String(formData.get('siteProductionUrl') || ''));

  const { error } = await supabase
    .from('projects')
    .update({
      site_preview_url: preview,
      site_production_url: production,
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId);
  if (error) throw await throwDb(error);

  await logActivity({
    entityType: 'project',
    entityId: projectId,
    action: 'site_urls_updated',
    actorId: user.id,
    metadata: {
      project_id: projectId,
      has_preview: Boolean(preview),
      has_production: Boolean(production),
    },
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/p`);
}

export async function createSiteAccess(projectId: string, formData: FormData) {
  const access = await assertCapability('site_access');
  await assertProjectAccessOrThrow(access, projectId);
  const { supabase, user } = access;

  const { data: last } = await supabase
    .from('project_site_access')
    .select('sort_order')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const label = String(formData.get('label') || '').trim() || 'Acceso';
  const kind = String(formData.get('kind') || 'other');
  const hasSecret = Boolean(String(formData.get('secret') || '').trim());

  const { data: created, error } = await supabase
    .from('project_site_access')
    .insert({
      project_id: projectId,
      label,
      kind,
      url: optionalHttpUrl(String(formData.get('url') || '')),
      username: String(formData.get('username') || '').trim() || null,
      secret: String(formData.get('secret') || '').trim() || null,
      notes: String(formData.get('notes') || ''),
      visible_to_client: formData.get('visibleToClient') === 'on',
      sort_order: (last?.sort_order ?? -1) + 1,
    })
    .select('id')
    .single();
  if (error || !created) throw await throwDb(error);

  await logActivity({
    entityType: 'project_site_access',
    entityId: created.id,
    action: 'created',
    actorId: user.id,
    metadata: { project_id: projectId, kind, label, has_secret: hasSecret },
  });

  revalidatePath(`/projects/${projectId}`);
}

export async function updateSiteAccess(accessId: string, projectId: string, formData: FormData) {
  const access = await assertCapability('site_access');
  await assertProjectAccessOrThrow(access, projectId);
  const { supabase, user } = access;

  const label = String(formData.get('label') || '').trim() || 'Acceso';
  const kind = String(formData.get('kind') || 'other');
  const secretRaw = String(formData.get('secret') || '');
  const keepSecret = formData.get('keepSecret') === 'on';
  const hasSecretInput = Boolean(secretRaw.trim());

  const payload: Record<string, unknown> = {
    label,
    kind,
    url: optionalHttpUrl(String(formData.get('url') || '')),
    username: String(formData.get('username') || '').trim() || null,
    notes: String(formData.get('notes') || ''),
    visible_to_client: formData.get('visibleToClient') === 'on',
    updated_at: new Date().toISOString(),
  };
  if (hasSecretInput) {
    payload.secret = secretRaw.trim();
  } else if (!keepSecret) {
    payload.secret = null;
  }

  const { error } = await supabase
    .from('project_site_access')
    .update(payload)
    .eq('id', accessId)
    .eq('project_id', projectId);
  if (error) throw await throwDb(error);

  await logActivity({
    entityType: 'project_site_access',
    entityId: accessId,
    action: 'updated',
    actorId: user.id,
    metadata: {
      project_id: projectId,
      kind,
      label,
      secret_changed: hasSecretInput || !keepSecret,
    },
  });

  revalidatePath(`/projects/${projectId}`);
}

export async function deleteSiteAccess(accessId: string, projectId: string) {
  const access = await assertCapability('site_access');
  await assertProjectAccessOrThrow(access, projectId);
  const { supabase, user } = access;

  const { error } = await supabase
    .from('project_site_access')
    .delete()
    .eq('id', accessId)
    .eq('project_id', projectId);
  if (error) throw await throwDb(error);

  await logActivity({
    entityType: 'project_site_access',
    entityId: accessId,
    action: 'deleted',
    actorId: user.id,
    metadata: { project_id: projectId },
  });

  revalidatePath(`/projects/${projectId}`);
}
