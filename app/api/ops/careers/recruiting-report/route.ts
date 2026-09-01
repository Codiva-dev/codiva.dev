import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/ops/activity';
import { htmlToPdf } from '@/lib/ops/html-to-pdf';
import { can, canAny } from '@/lib/ops/permissions';
import { isCareersPipelinePosting, isTesterCatalogKey } from '@/lib/ops/career-disciplines';
import { createAdminClient } from '@/lib/supabase/admin';
import { requestAuditFromHeaders } from '@/lib/ops/request-audit';
import {
  loadRecruitingDossier,
  loadRecruitingPipeline,
  recruitingReportFilename,
  renderRecruitingDossierHtml,
  renderRecruitingPipelineHtml,
} from '@/lib/careers/recruiting-report';

export const runtime = 'nodejs';
export const maxDuration = 60;

async function requireTeamStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'No autenticado' }, { status: 401 }) };
  const { data: staff } = await supabase
    .from('staff_profiles')
    .select('id, role, active, capabilities')
    .eq('id', user.id)
    .eq('active', true)
    .maybeSingle();
  if (!staff || !canAny(staff, ['team', 'careers_review'])) {
    return { error: NextResponse.json({ error: 'Sin acceso' }, { status: 403 }) };
  }
  return { user, staff };
}

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
  const access = await requireTeamStaff();
  if ('error' in access && access.error) return access.error;
  const user = 'user' in access ? access.user : null;
  const staff = 'staff' in access ? access.staff : null;
  if (!user || !staff) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  const testersOnly = !can(staff, 'team');

  const url = new URL(request.url);
  const format = url.searchParams.get('format') === 'pdf' ? 'pdf' : 'html';
  const attemptId = url.searchParams.get('attempt')?.trim() || '';
  const pipeline = url.searchParams.get('pipeline') === '1';
  const jobId = url.searchParams.get('job')?.trim() || '';

  let html: string;
  let filename: string;
  let entityId: string;
  let action: string;

  if (attemptId && /^[0-9a-f-]{36}$/i.test(attemptId)) {
    if (testersOnly) {
      const admin = createAdminClient();
      const { data: attempt } = await admin
        .from('ops_job_assessment_attempts')
        .select('catalog_key')
        .eq('id', attemptId)
        .maybeSingle();
      if (!isTesterCatalogKey(attempt?.catalog_key)) {
        return NextResponse.json({ error: 'Sin acceso' }, { status: 403 });
      }
    }
    const dossier = await loadRecruitingDossier(attemptId);
    if (!dossier) return NextResponse.json({ error: 'Intento no encontrado' }, { status: 404 });
    html = renderRecruitingDossierHtml(dossier);
    filename = recruitingReportFilename('candidato', dossier.fullName, format);
    entityId = dossier.attemptId;
    action = 'recruiting_report_candidate';
  } else if (pipeline) {
    if (jobId && !/^[0-9a-f-]{36}$/i.test(jobId)) {
      return NextResponse.json({ error: 'Vacante inválida' }, { status: 400 });
    }
    let pipelineJobId = jobId || undefined;
    if (testersOnly) {
      const admin = createAdminClient();
      const { data: testerJob } = await admin
        .from('ops_job_postings')
        .select('id, careers_pipeline, slug')
        .eq('careers_pipeline', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      const fallback =
        testerJob ||
        (
          await admin
            .from('ops_job_postings')
            .select('id, careers_pipeline, slug')
            .in('slug', ['tester', 'tester-qa'])
            .limit(1)
            .maybeSingle()
        ).data;
      if (jobId && jobId !== fallback?.id) {
        const { data: requested } = await admin
          .from('ops_job_postings')
          .select('id, careers_pipeline, slug')
          .eq('id', jobId)
          .maybeSingle();
        if (!requested || !isCareersPipelinePosting(requested)) {
          return NextResponse.json({ error: 'Sin acceso' }, { status: 403 });
        }
        pipelineJobId = requested.id;
      } else {
        pipelineJobId = fallback?.id;
      }
    }
    const pack = await loadRecruitingPipeline(pipelineJobId);
    html = renderRecruitingPipelineHtml(pack);
    filename = recruitingReportFilename('pipeline', pack.vacancy, format);
    entityId = pipelineJobId || '00000000-0000-4000-8000-000000000002';
    action = 'recruiting_report_pipeline';
  } else {
    return NextResponse.json({ error: 'Indica attempt o pipeline=1' }, { status: 400 });
  }

  const audit = requestAuditFromHeaders(request.headers);
  await logActivity({
    entityType: 'job_assessment_attempt',
    entityId,
    action,
    metadata: { format, jobId: jobId || null, ip: audit.ip },
    actorId: user.id,
  }).catch(() => {});

  if (format === 'html') return asDownload(html, filename, false);

  try {
    const pdf = await htmlToPdf(html);
    return asDownload(new Uint8Array(pdf), filename, true);
  } catch (err) {
    console.error('[recruiting-report] PDF', err);
    return NextResponse.json(
      { error: 'No se pudo generar el PDF. Abre el HTML o verifica Chrome en el entorno.' },
      { status: 500 }
    );
  }
}
