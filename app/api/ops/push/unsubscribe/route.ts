import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getActiveStaffForApi } from '@/lib/ops/interview-file-access';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sin acceso' }, { status: 401 });
  const staff = await getActiveStaffForApi(supabase, user.id);
  if (!staff) return NextResponse.json({ error: 'Sin acceso' }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { endpoint?: string } | null;
  const endpoint = String(body?.endpoint || '').trim();
  if (!endpoint.startsWith('https://')) {
    return NextResponse.json({ error: 'Suscripción inválida' }, { status: 400 });
  }
  await supabase.from('ops_push_subscriptions').delete().eq('staff_id', staff.id).eq('endpoint', endpoint);
  return NextResponse.json({ ok: true });
}
