import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  createOpsSignedUrl,
  isOpsStoragePath,
  organizationIdFromOpsPath,
  projectIdFromOpsPath,
} from '@/lib/ops/storage';
import { logActivity } from '@/lib/ops/activity';
import { requestAuditFromHeaders } from '@/lib/ops/request-audit';
import { listVisibleProjectIds } from '@/lib/ops/auth';
import { getAcceptanceStatus } from '@/lib/ops/legal/acceptances';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path')?.trim() ?? '';
  const documentId = searchParams.get('documentId');
  const audit = requestAuditFromHeaders(request.headers);

  if (!path || path.includes('..') || path.includes('\\') || !isOpsStoragePath(path)) {
    return NextResponse.json({ error: 'Ruta inválida' }, { status: 400 });
  }

  const projectId = projectIdFromOpsPath(path);
  const organizationId = organizationIdFromOpsPath(path);
  if (!projectId && !organizationId) {
    return NextResponse.json({ error: 'Ruta de archivo inválida' }, { status: 400 });
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
    .select('id, role, capabilities')
    .eq('id', user.id)
    .eq('active', true)
    .maybeSingle();

  let logProjectId = projectId;

  if (staff) {
    const visibleIds = await listVisibleProjectIds(supabase, user.id, staff);
    if (projectId) {
      if (visibleIds && !visibleIds.includes(projectId)) {
        return NextResponse.json({ error: 'Sin acceso' }, { status: 403 });
      }
    } else if (organizationId) {
      if (visibleIds) {
        const { data: orgProjects } = await supabase
          .from('projects')
          .select('id')
          .eq('organization_id', organizationId)
          .in('id', visibleIds.length ? visibleIds : ['00000000-0000-0000-0000-000000000000']);
        if (!orgProjects?.length) {
          return NextResponse.json({ error: 'Sin acceso' }, { status: 403 });
        }
        logProjectId = orgProjects[0].id;
      }
    }
  } else {
    if (projectId) {
      const { data: membership } = await supabase
        .from('project_members')
        .select(
          'id, terms_accepted_at, terms_version, privacy_accepted_at, privacy_version, nda_accepted_at, nda_version'
        )
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!membership) {
        return NextResponse.json({ error: 'Sin acceso' }, { status: 403 });
      }
      if (!getAcceptanceStatus(membership).complete) {
        return NextResponse.json({ error: 'Acepta los documentos legales' }, { status: 403 });
      }
    } else if (organizationId) {
      const { data: orgProjects } = await supabase
        .from('projects')
        .select('id')
        .eq('organization_id', organizationId);
      const ids = (orgProjects ?? []).map((p) => p.id);
      if (!ids.length) {
        return NextResponse.json({ error: 'Sin acceso' }, { status: 403 });
      }
      const { data: membership } = await supabase
        .from('project_members')
        .select(
          'id, project_id, terms_accepted_at, terms_version, privacy_accepted_at, privacy_version, nda_accepted_at, nda_version'
        )
        .eq('user_id', user.id)
        .in('project_id', ids)
        .limit(1)
        .maybeSingle();
      if (!membership) {
        return NextResponse.json({ error: 'Sin acceso' }, { status: 403 });
      }
      if (!getAcceptanceStatus(membership).complete) {
        return NextResponse.json({ error: 'Acepta los documentos legales' }, { status: 403 });
      }
      logProjectId = membership.project_id;
    }
  }

  const admin = createAdminClient();
  const { data: doc } = await admin
    .from('documents')
    .select('id, file_path, visible_to_client, disposed_at, scan_status, project_id')
    .eq('file_path', path)
    .maybeSingle();

  if (documentId && /^[0-9a-f-]{36}$/i.test(documentId)) {
    if (!doc || doc.id !== documentId || doc.file_path !== path) {
      return NextResponse.json({ error: 'Documento no coincide' }, { status: 403 });
    }
  }

  if (doc?.disposed_at) {
    return NextResponse.json({ error: 'Documento eliminado por retención' }, { status: 410 });
  }
  if (doc?.scan_status === 'infected') {
    return NextResponse.json({ error: 'Documento bloqueado' }, { status: 403 });
  }

  if (!staff) {
    if (doc) {
      if (!doc.visible_to_client) {
        return NextResponse.json({ error: 'Sin acceso' }, { status: 403 });
      }
    } else {
      const { data: deliverable } = await admin
        .from('deliverables')
        .select('id, visible_to_client, project_id')
        .eq('file_path', path)
        .maybeSingle();
      if (!deliverable?.visible_to_client) {
        return NextResponse.json({ error: 'Sin acceso' }, { status: 403 });
      }
    }
  }

  try {
    const signedUrl = await createOpsSignedUrl(path);

    await admin.from('file_access_log').insert({
      project_id: logProjectId,
      document_id: doc?.id ?? (documentId && /^[0-9a-f-]{36}$/i.test(documentId) ? documentId : null),
      file_path: path,
      action: 'download',
      actor_id: user.id,
      ip: audit.ip,
      user_agent: audit.userAgent,
    });

    await logActivity({
      entityType: 'file',
      entityId: logProjectId ?? organizationId ?? 'unknown',
      action: 'download',
      actorId: user.id,
      metadata: {
        project_id: logProjectId,
        organization_id: organizationId,
        file_path: path,
        document_id: doc?.id ?? documentId,
        via: 'api/ops/file',
        ip: audit.ip,
        user_agent: audit.userAgent,
      },
    });

    return NextResponse.redirect(signedUrl, 302);
  } catch {
    return NextResponse.json({ error: 'Archivo no disponible' }, { status: 404 });
  }
}
