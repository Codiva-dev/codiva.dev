import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getT } from '@/i18n/locale';
import { can } from '@/lib/ops/permissions';
import { throwDb } from '@/lib/ops/throw-db';
import { scanUploadedBytes } from '@/lib/ops/malware-scan';
import {
  OPS_FILES_BUCKET,
  deleteOpsFile,
  opsStorageFileName,
  sha256Hex,
} from '@/lib/ops/storage';
import {
  WORK_FILE_MAX_BYTES,
  WORK_FILE_MAX_COUNT,
  WORK_FILE_PROBLEM_I18N,
  canMutateWorkAssignment,
  workFileKind,
  workFileLabel,
  workFileProblem,
} from '@/lib/ops/work-board';
import {
  WORK_ASSIGNMENT_ID_RE,
  WORK_FILE_SIGNED_UPLOAD_EXPIRES_SEC,
  isWorkAssignmentFilePath,
  workAssignmentFileFolder,
} from '@/lib/ops/work-file-path';

export const runtime = 'nodejs';

type StaffRow = {
  id: string;
  role: string | null;
  capabilities: string[] | null;
};

async function jsonError(status: number, key: string, vars?: Record<string, string | number>) {
  const t = await getT();
  return NextResponse.json({ ok: false, error: t(key, vars) }, { status });
}

async function loadStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'unauth' as const, supabase };

  const { data: staff } = await supabase
    .from('staff_profiles')
    .select('id, role, capabilities, active')
    .eq('id', user.id)
    .eq('active', true)
    .maybeSingle();
  if (!staff) return { error: 'forbidden' as const, supabase };

  if (!can(staff, 'assignments')) return { error: 'forbidden' as const, supabase };
  return { supabase, staff: staff as StaffRow };
}

async function loadMutableAssignment(
  supabase: Awaited<ReturnType<typeof createClient>>,
  staff: StaffRow,
  assignmentId: string
) {
  const { data: assignment, error } = await supabase
    .from('work_assignments')
    .select('id, title, status, assignee_id')
    .eq('id', assignmentId)
    .maybeSingle();
  if (error || !assignment) return { error: 'missing' as const };
  const manage = can(staff, 'assignments_manage');
  if (!canMutateWorkAssignment(staff.id, assignment.assignee_id, manage)) {
    return { error: 'forbidden' as const };
  }
  return { assignment };
}

export async function GET(request: Request) {
  const search = new URL(request.url).searchParams;
  const id = search.get('id')?.trim() ?? '';
  if (!WORK_ASSIGNMENT_ID_RE.test(id)) {
    return NextResponse.json({ error: 'Archivo inválido' }, { status: 400 });
  }

  const loaded = await loadStaff();
  if ('error' in loaded && loaded.error === 'unauth') {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }
  if ('error' in loaded) {
    return NextResponse.json({ error: 'Sin acceso' }, { status: 403 });
  }
  const { supabase, staff } = loaded;

  const { data: file } = await supabase
    .from('work_assignment_files')
    .select('file_path, file_name, content_type, assignment_id')
    .eq('id', id)
    .maybeSingle();
  if (!file?.file_path?.startsWith('assignments/') || !file.assignment_id) {
    return NextResponse.json({ error: 'Archivo no disponible' }, { status: 404 });
  }

  const mutable = await loadMutableAssignment(supabase, staff, file.assignment_id);
  if ('error' in mutable) {
    return NextResponse.json({ error: 'Sin acceso' }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: blob, error } = await admin.storage.from(OPS_FILES_BUCKET).download(file.file_path);
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

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError(400, 'common.status.actionFailed');
  }

  const intent = String(body.intent || '').trim();
  const assignmentId = String(body.assignmentId || '').trim();
  if (!WORK_ASSIGNMENT_ID_RE.test(assignmentId)) {
    return jsonError(400, 'ops.asignaciones.notFound');
  }

  const access = await loadStaff();
  if ('error' in access && access.error === 'unauth') {
    return jsonError(401, 'common.status.forbidden');
  }
  if ('error' in access) {
    return jsonError(403, 'ops.asignaciones.forbiddenEdit');
  }

  const mutable = await loadMutableAssignment(access.supabase, access.staff, assignmentId);
  if ('error' in mutable) {
    return jsonError(
      mutable.error === 'missing' ? 404 : 403,
      mutable.error === 'missing' ? 'ops.asignaciones.notFound' : 'ops.asignaciones.forbiddenEdit'
    );
  }

  const t = await getT();
  const { count } = await access.supabase
    .from('work_assignment_files')
    .select('id', { count: 'exact', head: true })
    .eq('assignment_id', assignmentId);
  const existingCount = count ?? 0;

  if (intent === 'sign') {
    if (existingCount >= WORK_FILE_MAX_COUNT) {
      return jsonError(400, 'ops.asignaciones.tooManyFiles');
    }
    const fileName = String(body.fileName || '').slice(0, 240);
    const contentType = String(body.contentType || '');
    const byteSize = Number(body.byteSize);
    const problem = workFileProblem({ name: fileName, type: contentType, size: byteSize });
    if (problem) {
      const name = workFileLabel(fileName) || t('ops.asignaciones.unnamedFile');
      return jsonError(400, WORK_FILE_PROBLEM_I18N[problem], { name });
    }
    const kind = workFileKind(contentType, fileName);
    if (!kind) {
      const name = workFileLabel(fileName) || t('ops.asignaciones.unnamedFile');
      return jsonError(400, WORK_FILE_PROBLEM_I18N.type, { name });
    }

    const path = `${workAssignmentFileFolder(assignmentId)}/${opsStorageFileName(fileName)}`;
    const admin = createAdminClient();
    const { data: signed, error: signErr } = await admin.storage
      .from(OPS_FILES_BUCKET)
      .createSignedUploadUrl(path);

    if (signErr || !signed?.signedUrl) {
      console.error('[work-file] sign failed', signErr);
      return jsonError(500, 'ops.asignaciones.fileUploadFailed', {
        name: workFileLabel(fileName) || t('ops.asignaciones.unnamedFile'),
      });
    }

    return NextResponse.json({
      ok: true,
      signedUrl: signed.signedUrl,
      path: signed.path || path,
      expiresIn: WORK_FILE_SIGNED_UPLOAD_EXPIRES_SEC,
    });
  }

  if (intent === 'complete') {
    const path = String(body.path || '').trim();
    const fileName = String(body.fileName || '').slice(0, 240);
    const contentType = String(body.contentType || '');
    if (!isWorkAssignmentFilePath(assignmentId, path)) {
      return jsonError(400, 'ops.asignaciones.notFound');
    }
    if (existingCount >= WORK_FILE_MAX_COUNT) {
      await deleteOpsFile(path).catch(() => undefined);
      return jsonError(400, 'ops.asignaciones.tooManyFiles');
    }

    const admin = createAdminClient();
    const { data: blob, error: dlErr } = await admin.storage.from(OPS_FILES_BUCKET).download(path);
    if (dlErr || !blob) {
      return jsonError(400, 'ops.asignaciones.fileUploadFailed', {
        name: workFileLabel(fileName) || t('ops.asignaciones.unnamedFile'),
      });
    }

    const buffer = Buffer.from(await blob.arrayBuffer());
    const problem = workFileProblem({
      name: fileName,
      type: contentType || blob.type,
      size: buffer.byteLength,
    });
    if (problem) {
      await deleteOpsFile(path).catch(() => undefined);
      const name = workFileLabel(fileName) || t('ops.asignaciones.unnamedFile');
      return jsonError(400, WORK_FILE_PROBLEM_I18N[problem], { name });
    }
    const kind = workFileKind(contentType || blob.type, fileName);
    if (!kind) {
      await deleteOpsFile(path).catch(() => undefined);
      return jsonError(400, WORK_FILE_PROBLEM_I18N.type, {
        name: workFileLabel(fileName) || t('ops.asignaciones.unnamedFile'),
      });
    }
    if (buffer.byteLength > WORK_FILE_MAX_BYTES) {
      await deleteOpsFile(path).catch(() => undefined);
      return jsonError(400, WORK_FILE_PROBLEM_I18N.tooBig, {
        name: workFileLabel(fileName) || t('ops.asignaciones.unnamedFile'),
      });
    }

    const scan = await scanUploadedBytes(buffer, sha256Hex(buffer), fileName);
    if (scan.status === 'infected') {
      await deleteOpsFile(path).catch(() => undefined);
      return jsonError(400, 'common.status.fileRejected');
    }

    const { error } = await access.supabase.from('work_assignment_files').insert({
      assignment_id: assignmentId,
      uploaded_by: access.staff.id,
      file_name: fileName || 'file',
      file_path: path,
      content_type: contentType || blob.type || 'application/octet-stream',
      byte_size: buffer.byteLength,
      kind,
    });
    if (error) {
      await deleteOpsFile(path).catch(() => undefined);
      try {
        await throwDb(error);
      } catch (err) {
        const message = err instanceof Error ? err.message : t('common.status.actionFailed');
        return NextResponse.json({ ok: false, error: message }, { status: 400 });
      }
    }

    revalidatePath('/pendientes');
    revalidatePath('/workload');
    revalidatePath('/asignaciones');
    return NextResponse.json({ ok: true });
  }

  return jsonError(400, 'common.status.actionFailed');
}
