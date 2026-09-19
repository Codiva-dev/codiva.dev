import webpush from 'web-push';
import { can, type Capability } from '@/lib/ops/permissions';
import { createAdminClient } from '@/lib/supabase/admin';

export const PUSH_PUBLIC_KEY = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '').trim();
const PUSH_PRIVATE_KEY = (process.env.VAPID_PRIVATE_KEY || '').trim();
const PUSH_SUBJECT = (process.env.VAPID_SUBJECT || 'mailto:hello@codiva.dev').trim();

export function isPushConfigured() {
  return Boolean(PUSH_PUBLIC_KEY && PUSH_PRIVATE_KEY);
}

export type StaffPushPayload = {
  title: string;
  body: string;
  href: string;
  tag?: string;
};

function configure() {
  if (!isPushConfigured()) return false;
  webpush.setVapidDetails(PUSH_SUBJECT, PUSH_PUBLIC_KEY, PUSH_PRIVATE_KEY);
  return true;
}

export function isGonePushError(error: unknown) {
  const status =
    error && typeof error === 'object' && 'statusCode' in error
      ? Number((error as { statusCode?: number }).statusCode)
      : NaN;
  return status === 404 || status === 410;
}

export async function notifyStaffPush(opts: {
  staffIds: Array<string | null | undefined>;
  payload: StaffPushPayload;
  exceptStaffId?: string | null;
}): Promise<number> {
  if (!configure()) return 0;
  const ids = [...new Set(opts.staffIds.filter((id): id is string => Boolean(id)))].filter(
    (id) => id !== opts.exceptStaffId
  );
  if (!ids.length) return 0;

  const admin = createAdminClient();
  const { data: rows } = await admin
    .from('ops_push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .in('staff_id', ids);
  if (!rows?.length) return 0;

  const body = JSON.stringify({
    title: opts.payload.title.slice(0, 80),
    body: opts.payload.body.slice(0, 180),
    href: opts.payload.href,
    tag: opts.payload.tag || 'codiva-ops',
  });

  let sent = 0;
  for (const row of rows) {
    try {
      await webpush.sendNotification(
        {
          endpoint: row.endpoint,
          keys: { p256dh: row.p256dh, auth: row.auth },
        },
        body,
        { TTL: 60 * 60 }
      );
      sent += 1;
    } catch (error) {
      if (isGonePushError(error)) {
        await admin.from('ops_push_subscriptions').delete().eq('id', row.id);
        continue;
      }
      console.error('notifyStaffPush', error);
    }
  }
  return sent;
}

export async function notifyStaffPushSafe(opts: Parameters<typeof notifyStaffPush>[0]) {
  try {
    return await notifyStaffPush(opts);
  } catch (error) {
    console.error('notifyStaffPushSafe', error);
    return 0;
  }
}

export async function staffIdsWithCapability(capability: Capability): Promise<string[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('staff_profiles')
    .select('id, role, capabilities')
    .eq('active', true);
  return (data ?? []).filter((row) => can(row, capability)).map((row) => row.id);
}

export async function staffIdsForProjectPush(projectId: string | null | undefined): Promise<string[]> {
  if (projectId) {
    const admin = createAdminClient();
    const { data } = await admin.from('project_staff').select('staff_id').eq('project_id', projectId);
    const ids = [...new Set((data ?? []).map((row) => row.staff_id).filter(Boolean))];
    if (ids.length) return ids;
  }
  return staffIdsWithCapability('tickets');
}
