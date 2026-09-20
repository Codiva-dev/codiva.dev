import { NextResponse } from 'next/server';
import { requirePortalAccess } from '@/lib/ops/auth';
import { getAcceptanceStatus } from '@/lib/ops/legal/acceptances';
import {
  buildMutualNdaHtml,
  mutualNdaFilename,
} from '@/lib/ops/legal/mutual-nda';

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const access = await requirePortalAccess(slug);

  if (!access.isStaffPreview) {
    const status = getAcceptanceStatus(access.membership);
    if (!status.complete) {
      return new NextResponse('Acepta los documentos legales para ver este material.', { status: 403 });
    }
  }

  const project = access.project;
  const org = project.organizations as { name?: string } | { name?: string }[] | null;
  const orgName = Array.isArray(org) ? org[0]?.name : org?.name;
  const clientName = orgName?.trim() || project.name;

  const html = buildMutualNdaHtml({
    clientName,
    projectName: project.name,
    projectScope: project.description,
    effectiveDate: new Date(),
  });

  const filename = mutualNdaFilename(clientName);

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
