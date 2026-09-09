import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { loadActiveInterviewMember } from '@/lib/ops/auth';
import { logActivity } from '@/lib/ops/activity';
import { htmlToPdf } from '@/lib/ops/html-to-pdf';
import { canAny } from '@/lib/ops/permissions';
import { getActiveStaffForApi, partnerCanReadApplication, partnerCanReadJobPosting } from '@/lib/ops/interview-file-access';
import { loadRecruitingDossierForApplication } from '@/lib/ops/interview-brief';
import { requestAuditFromHeaders } from '@/lib/ops/request-audit';
import { isInterviewUuid } from '@/lib/ops/interview-partner';
import {
  loadRecruitingDossier,
  recruitingReportFilename,
  renderRecruitingDossierHtml,
} from '@/lib/careers/recruiting-report';

export const runtime = 'nodejs';
export const maxDuration = 60;

function toBodyInit(body: string | Uint8Array): BodyInit {
  if (typeof body === 'string') return body;
  const copy = new Uint8Array(body.byteLength);
  copy.set(body);
  return copy;
}

function asDownload(body: string | Uint8Array, filename: string, pdf: boolean) {
  return new NextResponse(toBodyInit(body), {
    status: 200,
    headers: {
      'Content-Type': pdf ? 'application/pdf' : 'text/html; charset=utf-8',
      'Content-Disposition': `${pdf ? 'attachment' : 'inline'}; filename="${filename}"`,
      'Cache-Control': 'no-store',
      'X-Frame-Options': 'SAMEORIGIN',
    },
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const applicationId = url.searchParams.get('id')?.trim() ?? '';
  const attemptId = url.searchParams.get('attempt')?.trim() ?? '';
  if (attemptId ? !isInterviewUuid(attemptId) : !isInterviewUuid(applicationId)) {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sin acceso' }, { status: 401 });

  const admin = createAdminClient();
  const staff = await getActiveStaffForApi(supabase, user.id);
  const staffOk = Boolean(staff && canAny(staff, ['team', 'careers_review']));
  const loaded = staffOk ? null : await loadActiveInterviewMember(supabase, user.id);
  if (!staffOk && !loaded) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 });

  let dossier;
  let metadata: Record<string, unknown>;

  if (attemptId) {
    const { data: attempt } = await admin
      .from('ops_job_assessment_attempts')
      .select('id, job_posting_id')
      .eq('id', attemptId)
      .maybeSingle();
    if (!attempt) return NextResponse.json({ error: 'Intento no encontrado' }, { status: 404 });
    if (loaded) {
      const allowed = await partnerCanReadJobPosting({
        memberId: loaded.member.id,
        jobPostingId: attempt.job_posting_id,
      });
      if (!allowed) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 });
    }
    dossier = await loadRecruitingDossier(attemptId);
    metadata = { attemptId, ip: null as string | null };
  } else {
    const { data: application } = await admin
      .from('ops_job_applications')
      .select('id, job_posting_id')
      .eq('id', applicationId)
      .maybeSingle();
    if (!application) return NextResponse.json({ error: 'Postulación no encontrada' }, { status: 404 });
    if (loaded) {
      const allowed = await partnerCanReadApplication({
        memberId: loaded.member.id,
        application,
      });
      if (!allowed) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 });
    }
    dossier = await loadRecruitingDossierForApplication(applicationId);
    metadata = { applicationId, ip: null as string | null };
  }

  if (!dossier) return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 });

  const format = url.searchParams.get('format') === 'pdf' ? 'pdf' : 'html';
  const html = renderRecruitingDossierHtml(dossier, { audience: 'partner' });
  const filename = recruitingReportFilename('candidato', dossier.fullName, format);

  const audit = requestAuditFromHeaders(request.headers);
  metadata.ip = audit.ip;
  metadata.format = format;
  await logActivity({
    entityType: 'job_assessment_attempt',
    entityId: dossier.attemptId,
    action: 'recruiting_report_candidate_partner',
    metadata,
    actorId: user.id,
  }).catch(() => {});

  if (format === 'html') return asDownload(html, filename, false);

  try {
    const pdf = await htmlToPdf(html);
    return asDownload(new Uint8Array(pdf), filename, true);
  } catch (err) {
    console.error('[entrevistas/recruiting-report] PDF', err);
    return NextResponse.json(
      { error: 'No se pudo generar el PDF. Abre el HTML o verifica Chrome en el entorno.' },
      { status: 500 }
    );
  }
}
