export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/admin';
import {
  PUBLIC_RL_FORM,
  PUBLIC_RL_FORM_EMAIL,
  consumeIpRateLimit,
  consumeRateLimit,
  rateLimitJsonResponse,
} from '@/lib/rate-limit';
import { notifyStaffSafe, sendTicketConfirmationEmail } from '@/lib/ops/email';
import { notifyStaffPushSafe, staffIdsForProjectPush } from '@/lib/ops/push';
import { templateStaffAlert } from '@/lib/ops/email-templates';
import { logActivity } from '@/lib/ops/activity';
import { uploadOpsFile } from '@/lib/ops/storage';
import { opsBaseUrl } from '@/lib/ops/host';
import {
  TICKET_MAX_BYTES,
  TICKET_MAX_FILES,
  TICKET_PRIORITY_MAP,
  TICKET_PRIORITY_UI,
  type TicketPriorityUi,
} from '@/lib/ops/ticket-constants';
import { resolveTicketProject } from '@/lib/ops/tickets';

const toStr = (v: FormDataEntryValue | null) => (typeof v === 'string' ? v : (v ?? '').toString());

function isPriority(value: string): value is TicketPriorityUi {
  return (TICKET_PRIORITY_UI as readonly string[]).includes(value);
}

function validate(p: {
  name: string;
  email: string;
  company: string;
  issueTitle: string;
  issueDescription: string;
  priority: string;
  requireCompany: boolean;
}) {
  const e: string[] = [];
  const required = ['name', 'email', 'issueTitle', 'issueDescription', 'priority'] as const;
  for (const k of required) {
    if (!p[k] || p[k].trim() === '') e.push(`${k} requerido`);
  }
  if (p.requireCompany && !p.company.trim()) e.push('company requerido');
  if (p.email && !/^\S+@\S+\.\S+$/.test(p.email)) e.push('email inválido');
  if (p.priority && !isPriority(p.priority)) e.push('priority inválido');
  return e;
}

export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Servicio no configurado' }, { status: 503 });
  }

  const ipRl = await consumeIpRateLimit(req, 'public_ticket', PUBLIC_RL_FORM.windowMs, PUBLIC_RL_FORM.max);
  if (!ipRl.ok) return rateLimitJsonResponse(ipRl.retryAfterMs);

  try {
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Se requiere multipart/form-data' }, { status: 400 });
    }

    const form = await req.formData();
    const projectIdRaw = toStr(form.get('projectId')).trim();
    const body = {
      name: toStr(form.get('name')).trim(),
      email: toStr(form.get('email')).trim().toLowerCase(),
      company: toStr(form.get('company')).trim(),
      issueTitle: toStr(form.get('issueTitle')).trim(),
      issueDescription: toStr(form.get('issueDescription')).trim(),
      priority: toStr(form.get('priority')).trim(),
      incidentTime: toStr(form.get('incidentTime')).trim(),
      projectId: projectIdRaw || null,
      locale: toStr(form.get('locale')),
    };

    const errors = validate({ ...body, requireCompany: !body.projectId });
    if (errors.length) return NextResponse.json({ error: errors.join(' | ') }, { status: 400 });

    const emailRl = await consumeRateLimit(
      `public_ticket_email:${body.email}`,
      PUBLIC_RL_FORM_EMAIL.windowMs,
      PUBLIC_RL_FORM_EMAIL.max
    );
    if (!emailRl.ok) return rateLimitJsonResponse(emailRl.retryAfterMs);

    const files = form.getAll('attachments').filter((f): f is File => f instanceof File && f.size > 0);
    if (files.length > TICKET_MAX_FILES) {
      return NextResponse.json({ error: `Máximo ${TICKET_MAX_FILES} archivos` }, { status: 400 });
    }
    const oversized = files.find((f) => f.size > TICKET_MAX_BYTES);
    if (oversized) {
      return NextResponse.json({ error: `Archivo ${oversized.name} excede 10MB` }, { status: 400 });
    }

    const admin = createAdminClient();
    const linked = await resolveTicketProject({
      projectId: body.projectId,
      email: body.email,
    });

    const { data: ticket, error: ticketError } = await admin
      .from('tickets')
      .insert({
        project_id: linked.projectId,
        organization_id: linked.organizationId,
        title: body.issueTitle,
        description: body.issueDescription,
        status: 'new',
        priority: isPriority(body.priority) ? TICKET_PRIORITY_MAP[body.priority] : 'media',
        reporter_name: body.name,
        reporter_email: body.email,
        incident_time: body.incidentTime || null,
      })
      .select('id')
      .single();

    if (ticketError) throw ticketError;

    const uploaded = await Promise.allSettled(
      files.map(async (f) => {
        const stored = await uploadOpsFile(f, `tickets/${ticket.id}`);
        return {
          ticket_id: ticket.id,
          file_path: stored.path,
          file_url: stored.url || stored.path,
          file_name: f.name || 'attachment',
        };
      })
    );

    const attachmentRows = uploaded.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
    const failedUploads = uploaded.filter((r) => r.status === 'rejected').length;
    for (const r of uploaded) {
      if (r.status === 'rejected') console.error('ticket attachment:', r.reason);
    }

    if (attachmentRows.length) {
      await admin.from('ticket_attachments').insert(attachmentRows);
    }

    await logActivity({
      entityType: 'ticket',
      entityId: ticket.id,
      action: 'created',
      metadata: {
        source: body.projectId ? 'portal' : 'form',
        company: body.company || null,
        projectId: linked.projectId,
        projectName: linked.projectName,
        attachments: attachmentRows.length,
        failedUploads,
      },
    });

    const ticketUrl = `${opsBaseUrl()}/tickets/${ticket.id}`;

    await Promise.allSettled([
      sendTicketConfirmationEmail({
        to: body.email,
        name: body.name,
        ticketTitle: body.issueTitle,
        locale: body.locale === 'en' ? 'en' : 'es',
      }),
      notifyStaffSafe({
        subject: `[Ticket] ${body.priority} · ${body.issueTitle}`,
        html: templateStaffAlert(
          `Ticket ${body.priority} - ${body.issueTitle}`,
          [
            body.company ? `Empresa: ${body.company}` : null,
            linked.projectName ? `Proyecto: ${linked.projectName}` : 'Proyecto: sin vincular',
            `Reportado por: ${body.name} <${body.email}>`,
            body.incidentTime ? `Hora del incidente: ${body.incidentTime}` : null,
            body.issueDescription,
            attachmentRows.length ? `Adjuntos: ${attachmentRows.length}` : null,
            failedUploads ? `Adjuntos fallidos: ${failedUploads}` : null,
          ].filter((line): line is string => Boolean(line)),
          { ctaLabel: 'Ver ticket', ctaHref: ticketUrl }
        ),
        replyTo: body.email,
      }),
      notifyStaffPushSafe({
        staffIds: await staffIdsForProjectPush(linked.projectId),
        payload: {
          title: `Ticket ${body.priority}`,
          body: body.issueTitle,
          href: `/tickets/${ticket.id}`,
          tag: `ticket-${ticket.id}`,
        },
      }),
    ]);

    return NextResponse.json(
      { ok: true, ticketId: ticket.id, files: attachmentRows.length, failedUploads },
      { status: 201 }
    );
  } catch (err) {
    console.error('POST /api/ticket:', err);
    const message = err instanceof Error && err.message ? err.message : 'Error inesperado';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
