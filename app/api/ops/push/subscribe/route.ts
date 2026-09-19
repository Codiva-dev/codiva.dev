import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getActiveStaffForApi } from '@/lib/ops/interview-file-access';
import { isPushConfigured } from '@/lib/ops/push';
import { throwDb } from '@/lib/ops/throw-db';

export const runtime = 'nodejs';

function readKey(value: unknown, min: number, max: number) {
  const text = String(value || '').trim();
  if (text.length < min || text.length > max) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(text)) return null;
  return text;
}

export async function POST(request: Request) {
  if (!isPushConfigured()) {
    return NextResponse.json({ error: 'Push no configurado' }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sin acceso' }, { status: 401 });
  const staff = await getActiveStaffForApi(supabase, user.id);
  if (!staff) return NextResponse.json({ error: 'Sin acceso' }, { status: 401 });

  const body = (await request.json().catch(() => null)) as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  } | null;
  const endpoint = String(body?.endpoint || '').trim();
  const p256dh = readKey(body?.keys?.p256dh, 20, 200);
  const auth = readKey(body?.keys?.auth, 8, 200);
  if (!endpoint.startsWith('https://') || endpoint.length > 2000 || !p256dh || !auth) {
    return NextResponse.json({ error: 'Suscripción inválida' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from('ops_push_subscriptions').upsert(
    {
      staff_id: staff.id,
      endpoint,
      p256dh,
      auth,
      user_agent: request.headers.get('user-agent')?.slice(0, 240) || null,
    },
    { onConflict: 'endpoint' }
  );
  if (error) throw await throwDb(error);
  return NextResponse.json({ ok: true });
}
