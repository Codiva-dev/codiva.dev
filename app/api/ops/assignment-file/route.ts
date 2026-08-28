import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createOpsSignedUrl } from '@/lib/ops/storage';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get('id')?.trim() ?? '';
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Archivo inválido' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const { data: staff } = await supabase
    .from('staff_profiles')
    .select('id')
    .eq('id', user.id)
    .eq('active', true)
    .maybeSingle();
  if (!staff) {
    return NextResponse.json({ error: 'Sin acceso' }, { status: 403 });
  }

  const { data: file } = await supabase
    .from('work_assignment_files')
    .select('file_path')
    .eq('id', id)
    .maybeSingle();
  if (!file?.file_path?.startsWith('assignments/')) {
    return NextResponse.json({ error: 'Archivo no disponible' }, { status: 404 });
  }

  try {
    const signedUrl = await createOpsSignedUrl(file.file_path);
    return NextResponse.redirect(signedUrl, 302);
  } catch {
    return NextResponse.json({ error: 'Archivo no disponible' }, { status: 404 });
  }
}
