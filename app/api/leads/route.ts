import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/admin';
import { notifyStaffSafe, sendLeadConfirmationEmail } from '@/lib/ops/email';
import { templateStaffAlert } from '@/lib/ops/email-templates';
import { logActivity } from '@/lib/ops/activity';
import { opsBaseUrl } from '@/lib/ops/host';
import { NextResponse } from 'next/server';
import { localIsoDate } from '@/lib/local-iso-date';
import { reportError } from '@/lib/report-error';
import {
  PUBLIC_RL_FORM,
  PUBLIC_RL_FORM_EMAIL,
  consumeIpRateLimit,
  consumeRateLimit,
  rateLimitJsonResponse,
} from '@/lib/rate-limit';

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Servicio no configurado' }, { status: 503 });
  }

  const ipRl = await consumeIpRateLimit(request, 'public_leads', PUBLIC_RL_FORM.windowMs, PUBLIC_RL_FORM.max);
  if (!ipRl.ok) return rateLimitJsonResponse(ipRl.retryAfterMs);

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const emailKey = String(body.email || '').trim().toLowerCase();
    if (emailKey) {
      const emailRl = await consumeRateLimit(
        `public_leads_email:${emailKey}`,
        PUBLIC_RL_FORM_EMAIL.windowMs,
        PUBLIC_RL_FORM_EMAIL.max
      );
      if (!emailRl.ok) return rateLimitJsonResponse(emailRl.retryAfterMs);
    }

    const deliveryDate = String(body.deliveryDate || '').trim();
    if (deliveryDate && deliveryDate < localIsoDate()) {
      return NextResponse.json({ error: 'invalid_fields' }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: lead, error } = await admin
      .from('leads')
      .insert({
        status: 'new',
        source: 'web_cotiza',
        name: body.name || 'Sin nombre',
        company: body.company || '',
        email: body.email || '',
        phone: body.phone || '',
        need: body.need || '',
        sections: body.sections ?? [],
        functionalities: body.functionalities ?? [],
        has_content: body.hasContent || null,
        has_domain: body.hasDomain || null,
        has_hosting: body.hasHosting || null,
        delivery_date: deliveryDate || null,
        budget: body.budget ? parseFloat(String(body.budget)) : null,
        reference_site: body.referenceSite || null,
      })
      .select('id')
      .single();

    if (error) throw error;

    await logActivity({
      entityType: 'lead',
      entityId: lead.id,
      action: 'created',
      metadata: { source: 'web_cotiza' },
    });

    await Promise.allSettled([
      sendLeadConfirmationEmail({
        to: String(body.email || ''),
        name: String(body.name || 'Cliente'),
        locale: body.locale === 'en' ? 'en' : 'es',
      }),
      notifyStaffSafe({
        subject: `[Lead] ${body.company || body.name}`,
        html: templateStaffAlert(
          `Nuevo lead - ${body.company || body.name}`,
          [
            `Nombre: ${body.name}`,
            body.company ? `Empresa: ${body.company}` : null,
            `Email: ${body.email}`,
            body.phone ? `Tel: ${body.phone}` : null,
            body.need ? `Necesidad: ${body.need}` : null,
          ].filter(Boolean) as string[],
          { ctaLabel: 'Ver lead', ctaHref: `${opsBaseUrl()}/leads/${lead.id}` }
        ),
        replyTo: body.email ? String(body.email) : undefined,
      }),
    ]);

    return NextResponse.json({ ok: true, id: lead.id }, { status: 201 });
  } catch (err) {
    reportError(err);
    return NextResponse.json({ error: 'Error al registrar solicitud' }, { status: 500 });
  }
}
