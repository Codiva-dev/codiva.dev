import { Resend } from 'resend';
import { CODIVA_BRAND } from '@/lib/brand';
import {
  templateLeadConfirmation,
  templateTicketConfirmation,
} from '@/lib/ops/email-templates';
import { tSync } from '@/i18n/translate';
import type { Locale } from '@/i18n/config';

export type EmailResult =
  | { ok: true }
  | { ok: false; skipped?: boolean; error: string };

export type EmailFromKind = 'noreply' | 'ops' | 'hello';

function escapeHtmlForEmail(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const resend = () => {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
};

const CONTACT_EMAIL = CODIVA_BRAND.urls.email;

/**
 * Remitentes:
 * - noreply → transaccionales al cliente (invites, cotización, recovery, legal)
 * - ops → alertas internas
 * - hello → casos excepcionales donde el From debe ser humano
 *
 * Respuestas: reply_to por defecto a hello@codiva.dev (noreply no se monitorea).
 */
function fromAddress(kind: EmailFromKind = 'noreply'): string {
  if (kind === 'ops') {
    return process.env.RESEND_FROM_OPS ?? `Codiva.dev <${CONTACT_EMAIL}>`;
  }
  if (kind === 'hello') {
    return process.env.RESEND_FROM_HELLO ?? `Codiva.dev <${CONTACT_EMAIL}>`;
  }
  return (
    process.env.RESEND_FROM_NOREPLY ??
    process.env.RESEND_FROM ??
    'Codiva.dev <noreply@codiva.dev>'
  );
}

function defaultReplyTo(): string {
  return process.env.RESEND_REPLY_TO ?? CONTACT_EMAIL;
}

export async function notifyStaff({
  subject,
  text,
  html,
  replyTo,
}: {
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
}): Promise<EmailResult> {
  const client = resend();
  const to = process.env.STAFF_NOTIFICATION_EMAIL ?? CONTACT_EMAIL;
  if (!client) return { ok: false, skipped: true, error: 'RESEND_API_KEY no configurada' };

  const payload = {
    from: fromAddress('ops'),
    to: [to],
    subject,
    html: html ?? `<p>${escapeHtmlForEmail(text ?? subject)}</p>`,
    ...(replyTo ? { reply_to: replyTo } : {}),
  };

  const { error } = await client.emails.send(payload);
  if (error) {
    console.error('Resend notifyStaff:', error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/** Nunca lanza: el pendiente en Ops no debe depender del correo. */
export async function notifyStaffSafe(
  args: Parameters<typeof notifyStaff>[0]
): Promise<EmailResult> {
  try {
    return await notifyStaff(args);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'notifyStaff failed';
    console.error('notifyStaffSafe:', err);
    return { ok: false, error: message };
  }
}

export type EmailAttachment = {
  filename: string;
  content: Buffer | string;
  contentType?: string;
};

export async function sendClientEmail({
  to,
  subject,
  html,
  replyTo,
  from = 'noreply',
  attachments,
}: {
  to: string;
  subject: string;
  html: string;
  /** Por defecto hello@; las respuestas no van a noreply. */
  replyTo?: string | null;
  from?: EmailFromKind;
  attachments?: EmailAttachment[];
}): Promise<EmailResult> {
  const client = resend();
  if (!client) return { ok: false, skipped: true, error: 'RESEND_API_KEY no configurada' };

  const resolvedReplyTo = replyTo === null ? undefined : (replyTo ?? defaultReplyTo());

  const { error } = await client.emails.send({
    from: fromAddress(from),
    to: [to],
    subject,
    html,
    ...(resolvedReplyTo ? { reply_to: resolvedReplyTo } : {}),
    ...(attachments?.length ? { attachments } : {}),
  });
  if (error) {
    console.error('Resend sendClientEmail:', error, { to });
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function sendLeadConfirmationEmail({
  to,
  name,
  locale = 'es',
}: {
  to: string;
  name: string;
  locale?: Locale;
}) {
  return sendClientEmail({
    to,
    subject: tSync(locale, 'email.lead.subject', { brand: CODIVA_BRAND.name }),
    html: templateLeadConfirmation(name, locale),
  });
}

export async function sendTicketConfirmationEmail({
  to,
  name,
  ticketTitle,
  locale = 'es',
}: {
  to: string;
  name: string;
  ticketTitle: string;
  locale?: Locale;
}) {
  return sendClientEmail({
    to,
    subject: tSync(locale, 'email.ticket.subject', { title: ticketTitle }),
    html: templateTicketConfirmation(name, ticketTitle, locale),
  });
}

/** @deprecated Usa sendLeadConfirmationEmail o sendTicketConfirmationEmail */
export async function sendConfirmationEmail({
  to,
  name,
  subject,
  ticketTitle,
}: {
  to: string;
  name: string;
  subject: string;
  body?: string;
  ticketTitle?: string;
}) {
  if (ticketTitle) {
    return sendTicketConfirmationEmail({ to, name, ticketTitle });
  }
  return sendClientEmail({
    to,
    subject,
    html: templateLeadConfirmation(name),
  });
}
