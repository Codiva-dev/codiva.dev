import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { listVisibleProjectIds } from '@/lib/ops/auth';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(projectId)) {
    return NextResponse.json({ error: 'Proyecto inválido' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { data: staff } = await supabase
    .from('staff_profiles')
    .select('id, role, capabilities')
    .eq('id', user.id)
    .eq('active', true)
    .maybeSingle();
  if (!staff) return NextResponse.json({ error: 'Solo staff' }, { status: 403 });

  const visibleIds = await listVisibleProjectIds(supabase, user.id, staff);
  if (visibleIds && !visibleIds.includes(projectId)) {
    return NextResponse.json({ error: 'Sin acceso' }, { status: 403 });
  }

  const admin = createAdminClient();

  const [
    { data: project },
    { data: documents },
    { data: members },
    { data: fileAccess },
    { data: activity },
  ] = await Promise.all([
    admin.from('projects').select('id, name, slug, status, document_retention_days, organization_id').eq('id', projectId).single(),
    admin
      .from('documents')
      .select(
        'id, type, title, source, signed, content_sha256, scan_status, scan_provider, scan_detail, retain_until, disposed_at, uploaded_by, uploaded_at, notes'
      )
      .eq('project_id', projectId)
      .order('uploaded_at', { ascending: false }),
    admin
      .from('project_members')
      .select(
        'id, user_id, role, invited_at, terms_accepted_at, terms_version, privacy_accepted_at, privacy_version, nda_accepted_at, nda_version'
      )
      .eq('project_id', projectId),
    admin
      .from('file_access_log')
      .select('id, document_id, file_path, action, actor_id, ip, user_agent, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(500),
    admin
      .from('activity_log')
      .select('id, entity_type, entity_id, action, actor_id, metadata, created_at')
      .contains('metadata', { project_id: projectId })
      .order('created_at', { ascending: false })
      .limit(500),
  ]);

  if (!project) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  const emails: Record<string, string> = {};
  const userIds = new Set<string>();
  (members ?? []).forEach((m) => userIds.add(m.user_id));
  (fileAccess ?? []).forEach((a) => {
    if (a.actor_id) userIds.add(a.actor_id);
  });
  await Promise.all(
    [...userIds].map(async (uid) => {
      const { data } = await admin.auth.admin.getUserById(uid);
      if (data.user?.email) emails[uid] = data.user.email;
    })
  );

  const payload = {
    exported_at: new Date().toISOString(),
    exported_by: user.email,
    project,
    members: (members ?? []).map((m) => ({
      ...m,
      email: emails[m.user_id] ?? null,
    })),
    documents: documents ?? [],
    file_access: (fileAccess ?? []).map((a) => ({
      ...a,
      actor_email: a.actor_id ? emails[a.actor_id] ?? null : null,
    })),
    activity: activity ?? [],
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="codiva-compliance-${project.slug}-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
