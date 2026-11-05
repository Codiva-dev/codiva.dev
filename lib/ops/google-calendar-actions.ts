'use server';

import { revalidatePath } from 'next/cache';
import { requireStaff } from '@/lib/ops/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { revokeGoogleToken } from '@/lib/ops/google-calendar';
import { logActivity } from '@/lib/ops/activity';

export async function disconnectGoogleCalendar() {
  const { user } = await requireStaff();
  const admin = createAdminClient();
  const { data: link } = await admin
    .from('ops_google_calendar_links')
    .select('refresh_token, access_token')
    .eq('staff_id', user.id)
    .maybeSingle();

  if (link?.refresh_token) {
    await revokeGoogleToken(link.refresh_token);
  } else if (link?.access_token) {
    await revokeGoogleToken(link.access_token);
  }

  await admin.from('ops_google_calendar_sync').delete().eq('staff_id', user.id);
  await admin.from('ops_google_calendar_links').delete().eq('staff_id', user.id);

  await logActivity({
    entityType: 'staff_profile',
    entityId: user.id,
    action: 'google_calendar_disconnected',
    actorId: user.id,
  });

  revalidatePath('/settings');
  revalidatePath('/calendar');
}
