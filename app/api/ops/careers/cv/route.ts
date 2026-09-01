import { NextResponse } from 'next/server';
import { requireCareersReview } from '@/lib/ops/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { logActivity } from '@/lib/ops/activity';
import { requestAuditFromHeaders } from '@/lib/ops/request-audit';
import { CAREER_CV_BUCKET, isCvPathForJob } from '@/lib/ops/careers';
import { can } from '@/lib/ops/permissions';
import { isTesterPipelineItem } from '@/lib/ops/career-disciplines';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const applicationId = searchParams.get('id')?.trim() ?? '';
  if (!applicationId || !/^[0-9a-f-]{36}$/i.test(applicationId)) {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });
  }

  const { user, supabase, staff } = await requireCareersReview();
  const { data: application, error } = await supabase
    .from('ops_job_applications')
    .select('id, job_posting_id, cv_storage_path, original_filename, discipline, ops_job_postings(slug, careers_pipeline)')
    .eq('id', applicationId)
    .maybeSingle();

  if (error || !application?.cv_storage_path) {
    return NextResponse.json({ error: 'Postulación no encontrada' }, { status: 404 });
  }
  const posting = Array.isArray(application.ops_job_postings)
    ? application.ops_job_postings[0]
    : application.ops_job_postings;
  if (
    !can(staff, 'team') &&
    !isTesterPipelineItem({
      postingSlug: posting?.slug,
      discipline: application.discipline,
      careersPipeline: posting?.careers_pipeline,
    })
  ) {
    return NextResponse.json({ error: 'Sin acceso' }, { status: 403 });
  }
  if (!isCvPathForJob(application.job_posting_id, application.cv_storage_path)) {
    return NextResponse.json({ error: 'Ruta de CV inválida' }, { status: 400 });
  }

  const asDownload = searchParams.get('download') === '1';

  const admin = createAdminClient();
  const { data: file, error: fileErr } = await admin.storage
    .from(CAREER_CV_BUCKET)
    .download(application.cv_storage_path);

  if (fileErr || !file) {
    return NextResponse.json({ error: 'No se pudo abrir el CV' }, { status: 500 });
  }

  const audit = requestAuditFromHeaders(request.headers);
  await logActivity({
    entityType: 'job_application',
    entityId: application.id,
    action: asDownload ? 'cv_downloaded' : 'cv_viewed',
    metadata: { ip: audit.ip, userAgent: audit.userAgent },
    actorId: user.id,
  });

  const rawName = String(application.original_filename || 'cv.pdf').replace(/[\r\n"]/g, '');
  const filename = rawName.slice(0, 180) || 'cv.pdf';
  const asciiName = filename.replace(/[^\x20-\x7E]/g, '_') || 'cv.pdf';
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = file.type && file.type !== 'application/octet-stream' ? file.type : 'application/pdf';

  return new NextResponse(bytes, {
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
