import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const search = new URL(request.url).searchParams;
  const id = search.get('id')?.trim() ?? '';
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
    .select('file_path, file_name, content_type')
    .eq('id', id)
    .maybeSingle();
  if (!file?.file_path?.startsWith('assignments/')) {
    return NextResponse.json({ error: 'Archivo no disponible' }, { status: 404 });
  }

  const admin = createAdminClient();
  const { data: blob, error } = await admin.storage.from('ops-files').download(file.file_path);
  if (error || !blob) {
    return NextResponse.json({ error: 'Archivo no disponible' }, { status: 404 });
  }

  const asDownload = search.get('download') === '1';
  const rawName = String(file.file_name || 'archivo').replace(/[\r\n"]/g, '');
  const filename = rawName.slice(0, 180) || 'archivo';
  const asciiName = filename.replace(/[^\x20-\x7E]/g, '_') || 'archivo';
  const mime =
    (blob.type && blob.type !== 'application/octet-stream' ? blob.type : file.content_type) ||
    'application/octet-stream';

  return new NextResponse(blob, {
    status: 200,
    headers: {
      'Content-Type': mime,
      'Content-Disposition': `${asDownload ? 'attachment' : 'inline'}; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
    },
  });
}
