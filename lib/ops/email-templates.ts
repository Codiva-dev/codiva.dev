import { escapeHtml } from '@/utils/escapeHtml';
import { opsBaseUrl, marketingBaseUrl } from '@/lib/ops/host';
import { BRAND_EMAIL, CODIVA_BRAND, brandWordmarkHtml, paintBrandNameHtml } from '@/lib/brand';
import { DEFAULT_LOCALE, type Locale } from '@/i18n/config';
import { tSync } from '@/i18n/translate';

const BRAND = BRAND_EMAIL;
const BRAND_NAME = CODIVA_BRAND.name;
const CONTACT_EMAIL = CODIVA_BRAND.urls.email;
const FONT_BODY = `'Inter', Arial, Helvetica, sans-serif`;
const FONT_DISPLAY = `'Plus Jakarta Sans', Inter, Arial, Helvetica, sans-serif`;
const CTA_RADIUS = '12px';
/** Mark oficial: primary teal sobre fondo transparente. */
const LOGO_URL = `${CODIVA_BRAND.urls.site.replace(/\/$/, '')}/logo.svg`;

type LayoutOptions = {
  preview?: string;
  title: string;
  bodyHtml: string;
  footerNote?: string;
  cta?: { label: string; href: string };
  locale?: Locale;
};

function mailtoHref(to: string, params?: { subject?: string; body?: string }): string {
  const q: string[] = [];
  if (params?.subject) q.push(`subject=${encodeURIComponent(params.subject)}`);
  if (params?.body) q.push(`body=${encodeURIComponent(params.body)}`);
  return `mailto:${to}${q.length ? `?${q.join('&')}` : ''}`;
}

function mailtoAddressFromHref(href: string): string {
  const rest = href.replace(/^mailto:/i, '').split('?')[0] ?? '';
  try {
    return decodeURIComponent(rest);
  } catch {
    return rest;
  }
}

function contactMailtoHref(params?: { subject?: string; body?: string }): string {
  return mailtoHref(CONTACT_EMAIL, params);
}

function emailLayout({ preview, title, bodyHtml, footerNote, cta, locale = DEFAULT_LOCALE }: LayoutOptions): string {
  const isMailtoCta = Boolean(cta?.href.startsWith('mailto:'));
  const ctaTarget = isMailtoCta ? '' : ' target="_blank" rel="noopener noreferrer"';
  const ctaFallbackHref = isMailtoCta ? mailtoHref(mailtoAddressFromHref(cta!.href)) : cta?.href;
  const ctaFallbackLabel = isMailtoCta ? mailtoAddressFromHref(cta!.href) : cta?.href;
  const ctaFallbackHint = isMailtoCta
    ? tSync(locale, 'email.ctaMailtoFallback')
    : tSync(locale, 'email.ctaFallback');
  const ctaBlock = cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
        <tr>
          <td style="border-radius:${CTA_RADIUS};background:${BRAND.primary};">
            <a href="${escapeHtml(cta.href)}"${ctaTarget}
               style="display:inline-block;padding:14px 28px;font-family:${FONT_BODY};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:${CTA_RADIUS};">
              ${escapeHtml(cta.label)}
            </a>
          </td>
        </tr>
      </table>
      <p style="margin:12px 0 0;font-family:${FONT_BODY};font-size:12px;line-height:1.5;color:${BRAND.muted};word-break:break-all;">
        ${escapeHtml(ctaFallbackHint)}<br/>
        <a href="${escapeHtml(ctaFallbackHref ?? '')}" style="color:${BRAND.primary};">${escapeHtml(ctaFallbackLabel ?? '')}</a>
      </p>`
    : '';

  const previewText = preview
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preview)}</div>`
    : '';

  const defaultFooter = CODIVA_BRAND.tagline;

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${escapeHtml(title)}</title>
  <!--[if !mso]><!-->
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=Plus+Jakarta+Sans:wght@600;700&display=swap" rel="stylesheet"/>
  <!--<![endif]-->
</head>
<body style="margin:0;padding:0;background:${BRAND.background};">
  ${previewText}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.background};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${BRAND.card};border:1px solid ${BRAND.border};border-radius:16px;overflow:hidden;">
          <tr>
            <td bgcolor="${BRAND.card}" style="background:${BRAND.card};padding:24px 32px 20px;border-bottom:1px solid ${BRAND.border};">
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
                <tr>
                  <td style="vertical-align:middle;padding-right:12px;">
                    <img src="${LOGO_URL}" alt="" width="36" height="36" style="display:block;border:0;outline:none;"/>
                  </td>
                  <td style="vertical-align:middle;">
                    ${brandWordmarkHtml({ as: 'p' })}
                  </td>
                </tr>
              </table>
              <h1 style="margin:0;font-family:${FONT_DISPLAY};font-size:22px;line-height:1.3;font-weight:700;color:${BRAND.text};">${paintBrandNameHtml(escapeHtml(title), 22)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <div style="font-family:${FONT_BODY};font-size:15px;line-height:1.65;color:${BRAND.text};">
                ${paintBrandNameHtml(bodyHtml)}
              </div>
              ${ctaBlock}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;border-top:1px solid ${BRAND.border};">
              <p style="margin:0;font-family:${FONT_BODY};font-size:12px;line-height:1.5;color:${BRAND.muted};">
                ${footerNote ? paintBrandNameHtml(escapeHtml(footerNote), 12) : escapeHtml(defaultFooter)}
              </p>
              <p style="margin:8px 0 0;font-family:${FONT_BODY};font-size:12px;line-height:1.5;">
                <a href="mailto:${CONTACT_EMAIL}" style="color:${BRAND.primary};text-decoration:none;">${CONTACT_EMAIL}</a>
                <span style="color:${BRAND.muted};"> · </span>
                <a href="${marketingBaseUrl()}" style="color:${BRAND.primary};text-decoration:none;">codiva.dev</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function greeting(name: string, locale: Locale = DEFAULT_LOCALE): string {
  return `<p style="margin:0 0 16px;">${escapeHtml(tSync(locale, 'email.hello'))} <strong>${escapeHtml(name)}</strong>,</p>`;
}

export type QuoteEmailContext = {
  recipientName?: string;
  partnerName?: string;
  endClientLabel?: string;
};

export function templateLeadConfirmation(name: string, locale: Locale = DEFAULT_LOCALE): string {
  return emailLayout({
    locale,
    preview: tSync(locale, 'email.lead.preview', { brand: BRAND_NAME }),
    title: tSync(locale, 'email.lead.title'),
    bodyHtml: `
      ${greeting(name, locale)}
      <p style="margin:0 0 12px;">${tSync(locale, 'email.lead.body1')}</p>
      <p style="margin:0;">${tSync(locale, 'email.lead.body2')}</p>
    `,
    cta: {
      label: tSync(locale, 'email.lead.cta'),
      href: contactMailtoHref({ subject: tSync(locale, 'email.lead.subject', { brand: BRAND_NAME }) }),
    },
    footerNote: tSync(locale, 'email.lead.footer'),
  });
}

export function templateTicketConfirmation(
  name: string,
  ticketTitle: string,
  locale: Locale = DEFAULT_LOCALE
): string {
  return emailLayout({
    locale,
    preview: tSync(locale, 'email.ticket.preview', { title: ticketTitle }),
    title: tSync(locale, 'email.ticket.title'),
    bodyHtml: `
      ${greeting(name, locale)}
      <p style="margin:0 0 12px;">${tSync(locale, 'email.ticket.body1')}</p>
      <p style="margin:0 0 16px;padding:12px 16px;background:${BRAND.background};border-radius:8px;border-left:4px solid ${BRAND.primary};">
        <strong>${escapeHtml(ticketTitle)}</strong>
      </p>
      <p style="margin:0;">${tSync(locale, 'email.ticket.body2')}</p>
    `,
    cta: {
      label: tSync(locale, 'email.ticket.cta'),
      href: contactMailtoHref({ subject: tSync(locale, 'email.ticket.subject', { title: ticketTitle }) }),
    },
  });
}

export function templatePasswordRecovery(locale: Locale = DEFAULT_LOCALE): string {
  return emailLayout({
    locale,
    preview: tSync(locale, 'email.recovery.preview'),
    title: tSync(locale, 'email.recovery.title'),
    bodyHtml: `
      <p style="margin:0 0 12px;">${tSync(locale, 'email.recovery.body1')}</p>
      <p style="margin:0 0 12px;">${tSync(locale, 'email.recovery.body2')}</p>
      <p style="margin:0;color:${BRAND.muted};font-size:14px;">${tSync(locale, 'email.recovery.body3')}</p>
    `,
    cta: { label: tSync(locale, 'email.recovery.cta'), href: '{{RECOVERY_LINK}}' },
  });
}

export function templatePortalPasswordRecovery(
  projectName: string,
  locale: Locale = DEFAULT_LOCALE
): string {
  return emailLayout({
    locale,
    preview: tSync(locale, 'email.portalRecovery.preview', { project: projectName }),
    title: tSync(locale, 'email.portalRecovery.title'),
    bodyHtml: `
      <p style="margin:0 0 12px;">${tSync(locale, 'email.portalRecovery.body1', { project: '__PROJECT__' }).replace(
        '__PROJECT__',
        `<strong>${escapeHtml(projectName)}</strong>`
      )}</p>
      <p style="margin:0;color:${BRAND.muted};font-size:14px;">${tSync(locale, 'email.portalRecovery.body2')}</p>
    `,
    cta: { label: tSync(locale, 'email.portalRecovery.cta'), href: '{{RECOVERY_LINK}}' },
  });
}

function projectAccessBlock(projectName: string, locale: Locale): string {
  const names = projectName
    .split(/\s+y\s+/)
    .flatMap((part) => part.split(/,\s*/))
    .map((n) => n.trim())
    .filter(Boolean);
  if (names.length <= 1) {
    return `<p style="margin:0 0 12px;">${tSync(locale, 'email.portalInviteNew.accessOne', {
      brand: BRAND_NAME,
      project: projectName,
    })
      .replace(escapeHtml(BRAND_NAME), `<strong>${escapeHtml(BRAND_NAME)}</strong>`)
      .replace(escapeHtml(projectName), `<strong>${escapeHtml(projectName)}</strong>`)}</p>`;
  }
  const list = names.map((n) => `<li style="margin:0 0 4px;"><strong>${escapeHtml(n)}</strong></li>`).join('');
  return `<p style="margin:0 0 12px;">${tSync(locale, 'email.portalInviteNew.accessMany', {
    brand: BRAND_NAME,
  }).replace(escapeHtml(BRAND_NAME), `<strong>${escapeHtml(BRAND_NAME)}</strong>`)}</p><ul style="margin:0 0 12px;padding-left:20px;">${list}</ul>`;
}

function projectAccessBlockExisting(projectName: string, locale: Locale): string {
  const names = projectName
    .split(/\s+y\s+/)
    .flatMap((part) => part.split(/,\s*/))
    .map((n) => n.trim())
    .filter(Boolean);
  if (names.length <= 1) {
    return `<p style="margin:0 0 12px;">${tSync(locale, 'email.portalInviteExisting.accessOne', {
      brand: BRAND_NAME,
      project: projectName,
    })
      .replace(escapeHtml(BRAND_NAME), `<strong>${escapeHtml(BRAND_NAME)}</strong>`)
      .replace(escapeHtml(projectName), `<strong>${escapeHtml(projectName)}</strong>`)}</p>`;
  }
  const list = names.map((n) => `<li style="margin:0 0 4px;"><strong>${escapeHtml(n)}</strong></li>`).join('');
  return `<p style="margin:0 0 12px;">${tSync(locale, 'email.portalInviteExisting.accessMany', {
    brand: BRAND_NAME,
  }).replace(escapeHtml(BRAND_NAME), `<strong>${escapeHtml(BRAND_NAME)}</strong>`)}</p><ul style="margin:0 0 12px;padding-left:20px;">${list}</ul>`;
}

export function templatePortalInviteNewUser(
  projectName: string,
  email: string,
  tempPassword: string,
  loginUrl: string,
  options?: QuoteEmailContext,
  locale: Locale = DEFAULT_LOCALE
): string {
  const hello = options?.recipientName ? greeting(options.recipientName, locale) : '';
  const clientLine = options?.endClientLabel
    ? `<p style="margin:0 0 12px;">${tSync(locale, 'email.portalInviteNew.client', {
        name: options.endClientLabel,
      }).replace(escapeHtml(options.endClientLabel), `<strong>${escapeHtml(options.endClientLabel)}</strong>`)}</p>`
    : '';

  return emailLayout({
    locale,
    preview: tSync(locale, 'email.portalInviteNew.preview', { project: projectName }),
    title: tSync(locale, 'email.portalInviteNew.title'),
    bodyHtml: `
      ${hello}
      ${projectAccessBlock(projectName, locale)}
      ${clientLine}
      <p style="margin:0 0 12px;">${tSync(locale, 'email.portalInviteNew.body')}</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;width:100%;background:${BRAND.background};border-radius:8px;">
        <tr>
          <td style="padding:16px;font-family:${FONT_BODY};font-size:14px;line-height:1.6;">
            <p style="margin:0 0 8px;"><strong>${tSync(locale, 'email.portalInviteNew.email')}</strong> ${escapeHtml(email)}</p>
            <p style="margin:0;"><strong>${tSync(locale, 'email.portalInviteNew.tempPassword')}</strong> <code style="background:#fff;padding:2px 6px;border-radius:4px;">${escapeHtml(tempPassword)}</code></p>
          </td>
        </tr>
      </table>
      <p style="margin:0;color:${BRAND.muted};font-size:14px;">${tSync(locale, 'email.portalInviteNew.changeHint')}</p>
    `,
    cta: { label: tSync(locale, 'email.portalInviteNew.cta'), href: loginUrl },
  });
}

export function templatePortalInviteExistingUser(
  projectName: string,
  loginUrl: string,
  options?: QuoteEmailContext,
  locale: Locale = DEFAULT_LOCALE
): string {
  const hello = options?.recipientName ? greeting(options.recipientName, locale) : '';
  const clientLine = options?.endClientLabel
    ? `<p style="margin:0 0 12px;">${tSync(locale, 'email.portalInviteNew.client', {
        name: options.endClientLabel,
      }).replace(escapeHtml(options.endClientLabel), `<strong>${escapeHtml(options.endClientLabel)}</strong>`)}</p>`
    : '';

  return emailLayout({
    locale,
    preview: tSync(locale, 'email.portalInviteExisting.preview', { project: projectName }),
    title: tSync(locale, 'email.portalInviteExisting.title'),
    bodyHtml: `
      ${hello}
      ${projectAccessBlockExisting(projectName, locale)}
      ${clientLine}
      <p style="margin:0 0 12px;">${tSync(locale, 'email.portalInviteExisting.body')}</p>
      <p style="margin:0;">${tSync(locale, 'email.portalInviteExisting.help')} <a href="mailto:${CONTACT_EMAIL}" style="color:${BRAND.primary};">${CONTACT_EMAIL}</a>.</p>
    `,
    cta: { label: tSync(locale, 'email.portalInviteExisting.cta'), href: loginUrl },
  });
}

export function templateStaffInviteNewUser(
  fullName: string,
  email: string,
  tempPassword: string,
  loginUrl: string,
  roleLabel: string
): string {
  const hello = fullName ? greeting(fullName) : '';
  return emailLayout({
    preview: `Acceso a Codiva.dev`,
    title: 'Bienvenido al equipo',
    bodyHtml: `
      ${hello}
      <p style="margin:0 0 12px;">Se creó tu acceso a <strong>${escapeHtml(BRAND_NAME)}</strong> con rol <strong>${escapeHtml(roleLabel)}</strong>.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;width:100%;background:${BRAND.background};border-radius:8px;">
        <tr>
          <td style="padding:16px;font-family:${FONT_BODY};font-size:14px;line-height:1.6;">
            <p style="margin:0 0 8px;"><strong>Email:</strong> ${escapeHtml(email)}</p>
            <p style="margin:0;"><strong>Contraseña temporal:</strong> <code style="background:#fff;padding:2px 6px;border-radius:4px;">${escapeHtml(tempPassword)}</code></p>
          </td>
        </tr>
      </table>
      <p style="margin:0;color:${BRAND.muted};font-size:14px;">Cambia tu contraseña al ingresar.</p>
    `,
    cta: { label: 'Entrar a Codiva.dev', href: loginUrl },
  });
}

export function templateStaffInviteExistingUser(
  fullName: string,
  loginUrl: string,
  roleLabel: string
): string {
  const hello = fullName ? greeting(fullName) : '';
  return emailLayout({
    preview: `Acceso a Codiva.dev`,
    title: 'Acceso a Codiva.dev',
    bodyHtml: `
      ${hello}
      <p style="margin:0 0 12px;">Se te otorgó acceso a <strong>${escapeHtml(BRAND_NAME)}</strong> con rol <strong>${escapeHtml(roleLabel)}</strong>.</p>
      <p style="margin:0;">Usa tu correo y contraseña habituales.</p>
    `,
    cta: { label: 'Entrar a Codiva.dev', href: loginUrl },
  });
}

export function templateInterviewInviteNewUser(
  fullName: string,
  email: string,
  tempPassword: string,
  loginUrl: string,
  orgName: string,
  locale: Locale = DEFAULT_LOCALE
): string {
  const hello = fullName ? greeting(fullName, locale) : '';
  return emailLayout({
    locale,
    preview: tSync(locale, 'email.interviewInviteNew.preview', { org: orgName }),
    title: tSync(locale, 'email.interviewInviteNew.title'),
    bodyHtml: `
      ${hello}
      <p style="margin:0 0 12px;">${tSync(locale, 'email.interviewInviteNew.body', {
        brand: BRAND_NAME,
        org: orgName,
      })}</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;width:100%;background:${BRAND.background};border-radius:8px;">
        <tr>
          <td style="padding:16px;font-family:${FONT_BODY};font-size:14px;line-height:1.6;">
            <p style="margin:0 0 8px;"><strong>${tSync(locale, 'email.interviewInviteNew.email')}</strong> ${escapeHtml(email)}</p>
            <p style="margin:0;"><strong>${tSync(locale, 'email.interviewInviteNew.tempPassword')}</strong> <code style="background:#fff;padding:2px 6px;border-radius:4px;">${escapeHtml(tempPassword)}</code></p>
          </td>
        </tr>
      </table>
      <p style="margin:0;color:${BRAND.muted};font-size:14px;">${tSync(locale, 'email.interviewInviteNew.changeHint')}</p>
    `,
    cta: { label: tSync(locale, 'email.interviewInviteNew.cta'), href: loginUrl },
  });
}

export function templateInterviewInviteExistingUser(
  fullName: string,
  loginUrl: string,
  orgName: string,
  locale: Locale = DEFAULT_LOCALE
): string {
  const hello = fullName ? greeting(fullName, locale) : '';
  return emailLayout({
    locale,
    preview: tSync(locale, 'email.interviewInviteExisting.preview', { org: orgName }),
    title: tSync(locale, 'email.interviewInviteExisting.title'),
    bodyHtml: `
      ${hello}
      <p style="margin:0 0 12px;">${tSync(locale, 'email.interviewInviteExisting.body', {
        brand: BRAND_NAME,
        org: orgName,
      })}</p>
    `,
    cta: { label: tSync(locale, 'email.interviewInviteExisting.cta'), href: loginUrl },
  });
}

export function templateInterviewAssigned(opts: {
  recipientName: string;
  candidateName: string;
  jobTitle: string;
  href: string;
  locale?: Locale;
}): string {
  const locale = opts.locale ?? DEFAULT_LOCALE;
  const hello = opts.recipientName ? greeting(opts.recipientName, locale) : '';
  return emailLayout({
    locale,
    preview: tSync(locale, 'email.interviewAssigned.preview', { candidate: opts.candidateName }),
    title: tSync(locale, 'email.interviewAssigned.title'),
    bodyHtml: `
      ${hello}
      <p style="margin:0 0 12px;">${tSync(locale, 'email.interviewAssigned.body', {
        candidate: opts.candidateName,
        job: opts.jobTitle,
      })}</p>
    `,
    cta: { label: tSync(locale, 'email.interviewAssigned.cta'), href: opts.href },
  });
}

export function templateQuoteSent(
  projectName: string,
  portalUrl: string,
  options?: QuoteEmailContext,
  locale: Locale = DEFAULT_LOCALE
): string {
  const hello = options?.recipientName
    ? greeting(options.recipientName, locale)
    : options?.partnerName
      ? greeting(options.partnerName, locale)
      : '';
  const clientLine = options?.endClientLabel
    ? `<p style="margin:0 0 12px;">${tSync(locale, 'email.quoteSent.client', { name: options.endClientLabel }).replace(
        options.endClientLabel,
        `<strong>${escapeHtml(options.endClientLabel)}</strong>`
      )}</p>`
    : '';

  return emailLayout({
    locale,
    preview: tSync(locale, 'email.quoteSent.preview', { project: projectName }),
    title: tSync(locale, 'email.quoteSent.title'),
    bodyHtml: `
      ${hello}
      <p style="margin:0 0 12px;">${tSync(locale, 'email.quoteSent.body1', {
        brand: BRAND_NAME,
        project: projectName,
      })
        .replace(BRAND_NAME, `<strong>${escapeHtml(BRAND_NAME)}</strong>`)
        .replace(projectName, `<strong>${escapeHtml(projectName)}</strong>`)}</p>
      ${clientLine}
      <p style="margin:0 0 12px;">${tSync(locale, 'email.quoteSent.body2')}</p>
      <p style="margin:0;">${tSync(locale, 'email.quoteSent.doubts')} <a href="mailto:${CONTACT_EMAIL}" style="color:${BRAND.primary};">${CONTACT_EMAIL}</a>.</p>
    `,
    cta: { label: tSync(locale, 'email.quoteSent.cta'), href: portalUrl },
  });
}

export function templateLeadQuoteSent(
  subjectLabel: string,
  quoteUrl: string,
  options?: QuoteEmailContext,
  locale: Locale = DEFAULT_LOCALE
): string {
  const hello = options?.partnerName
    ? greeting(options.partnerName, locale)
    : options?.recipientName
      ? greeting(options.recipientName, locale)
      : '';
  const clientLine = options?.endClientLabel
    ? `<p style="margin:0 0 12px;">${tSync(locale, 'email.quoteSent.client', { name: options.endClientLabel }).replace(
        options.endClientLabel,
        `<strong>${escapeHtml(options.endClientLabel)}</strong>`
      )}</p>`
    : '';

  return emailLayout({
    locale,
    preview: tSync(locale, 'email.leadQuote.preview', { subject: subjectLabel }),
    title: tSync(locale, 'email.leadQuote.title'),
    bodyHtml: `
      ${hello}
      <p style="margin:0 0 12px;">${tSync(locale, 'email.leadQuote.body1', {
        brand: BRAND_NAME,
        subject: subjectLabel,
      })
        .replace(BRAND_NAME, `<strong>${escapeHtml(BRAND_NAME)}</strong>`)
        .replace(subjectLabel, `<strong>${escapeHtml(subjectLabel)}</strong>`)}</p>
      ${clientLine}
      <p style="margin:0;">${tSync(locale, 'email.leadQuote.body2')} <a href="mailto:${CONTACT_EMAIL}" style="color:${BRAND.primary};">${CONTACT_EMAIL}</a>.</p>
    `,
    cta: { label: tSync(locale, 'email.leadQuote.cta'), href: quoteUrl },
    footerNote: tSync(locale, 'email.leadQuote.footer'),
  });
}

export function templateLegalReacceptance(
  projectName: string,
  acceptUrl: string,
  versionCode: string,
  locale: Locale = DEFAULT_LOCALE
): string {
  return emailLayout({
    locale,
    preview: tSync(locale, 'email.legalReaccept.preview', { project: projectName }),
    title: tSync(locale, 'email.legalReaccept.title'),
    bodyHtml: `
      <p style="margin:0 0 12px;">${tSync(locale, 'email.legalReaccept.body1', {
        project: projectName,
        version: versionCode,
      })
        .replace(projectName, `<strong>${escapeHtml(projectName)}</strong>`)
        .replace(versionCode, `<strong>${escapeHtml(versionCode)}</strong>`)}</p>
      <p style="margin:0;">${tSync(locale, 'email.legalReaccept.body2')}</p>
    `,
    cta: { label: tSync(locale, 'email.legalReaccept.cta'), href: acceptUrl },
    footerNote: tSync(locale, 'email.legalReaccept.footer'),
  });
}

export function templateStaffAlert(
  title: string,
  lines: string[],
  options?: { ctaLabel?: string; ctaHref?: string }
): string {
  const rows = lines
    .map(
      (line) =>
        `<p style="margin:0 0 8px;font-family:${FONT_BODY};font-size:14px;line-height:1.5;color:${BRAND.text};">${escapeHtml(line)}</p>`
    )
    .join('');

  return emailLayout({
    preview: title,
    title,
    bodyHtml: rows,
    cta: {
      label: options?.ctaLabel ?? 'Abrir Codiva.dev',
      href: options?.ctaHref ?? `${opsBaseUrl()}/dashboard`,
    },
    footerNote: 'Notificación interna · Codiva.dev',
  });
}

export function templateContactInboxStaff(name: string, email: string, message: string): string {
  return emailLayout({
    preview: `Nuevo mensaje de contacto de ${name}`,
    title: 'Nuevo mensaje de contacto',
    bodyHtml: `
      <p style="margin:0 0 8px;"><strong>Nombre:</strong> ${escapeHtml(name)}</p>
      <p style="margin:0 0 16px;"><strong>Correo:</strong> <a href="mailto:${escapeHtml(email)}" style="color:${BRAND.primary};">${escapeHtml(email)}</a></p>
      <p style="margin:0 0 8px;"><strong>Mensaje:</strong></p>
      <p style="margin:0;padding:16px;background:${BRAND.background};border-radius:8px;white-space:pre-line;">${escapeHtml(message)}</p>
    `,
    cta: { label: 'Ver inbox', href: `${opsBaseUrl()}/inbox` },
    footerNote: 'Responde directamente a este correo para contactar al remitente.',
  });
}

export function templateCareerApplicationStaff({
  name,
  email,
  phone,
  jobTitle,
  discipline,
  coverLetter,
  opsHref,
  scorePct,
}: {
  name: string;
  email: string;
  phone?: string;
  jobTitle: string;
  discipline?: string;
  coverLetter?: string;
  opsHref: string;
  scorePct?: number | null;
}): string {
  const scoreLine =
    typeof scorePct === 'number'
      ? `<p style="margin:0 0 8px;"><strong>Prueba:</strong> ${escapeHtml(String(scorePct))}% (aprobada)</p>`
      : '';
  return emailLayout({
    preview: `${name} postul\u00f3 a ${jobTitle}`,
    title: 'Nueva postulaci\u00f3n',
    bodyHtml: `
      <p style="margin:0 0 8px;"><strong>Vacante:</strong> ${escapeHtml(jobTitle)}</p>
      ${discipline ? `<p style="margin:0 0 8px;"><strong>Oficio:</strong> ${escapeHtml(discipline)}</p>` : ''}
      ${scoreLine}
      <p style="margin:0 0 8px;"><strong>Nombre:</strong> ${escapeHtml(name)}</p>
      <p style="margin:0 0 8px;"><strong>Correo:</strong> <a href="mailto:${escapeHtml(email)}" style="color:${BRAND.primary};">${escapeHtml(email)}</a></p>
      ${phone ? `<p style="margin:0 0 8px;"><strong>Tel\u00e9fono:</strong> ${escapeHtml(phone)}</p>` : ''}
      ${
        coverLetter
          ? `<p style="margin:16px 0 8px;"><strong>Mensaje:</strong></p>
      <p style="margin:0;padding:16px;background:${BRAND.background};border-radius:8px;white-space:pre-line;">${escapeHtml(coverLetter)}</p>`
          : ''
      }
    `,
    cta: { label: 'Ver inbox', href: opsHref },
    footerNote: 'Notificaci\u00f3n interna \u00b7 Bolsa de trabajo Codiva.dev',
  });
}

export function templateHuntReportStaff({
  name,
  email,
  pageUrl,
  title,
  description,
  expected,
  matchedTitle,
  discipline,
  opsHref,
}: {
  name: string;
  email: string;
  pageUrl: string;
  title: string;
  description: string;
  expected?: string;
  matchedTitle?: string;
  discipline?: string;
  opsHref: string;
}): string {
  return emailLayout({
    preview: `${name} report\u00f3 un hallazgo`,
    title: 'Nuevo hallazgo',
    bodyHtml: `
      ${matchedTitle ? `<p style="margin:0 0 8px;"><strong>Coincidencia:</strong> ${escapeHtml(matchedTitle)}</p>` : '<p style="margin:0 0 8px;"><strong>Coincidencia:</strong> ninguna semilla conocida (puede ser un defecto real)</p>'}
      ${discipline ? `<p style="margin:0 0 8px;"><strong>Oficio:</strong> ${escapeHtml(discipline)}</p>` : ''}
      <p style="margin:0 0 8px;"><strong>T\u00edtulo:</strong> ${escapeHtml(title)}</p>
      <p style="margin:0 0 8px;"><strong>URL:</strong> ${escapeHtml(pageUrl)}</p>
      <p style="margin:0 0 8px;"><strong>Nombre:</strong> ${escapeHtml(name)}</p>
      <p style="margin:0 0 8px;"><strong>Correo:</strong> <a href="mailto:${escapeHtml(email)}" style="color:${BRAND.primary};">${escapeHtml(email)}</a></p>
      <p style="margin:16px 0 8px;"><strong>Qu\u00e9 vio:</strong></p>
      <p style="margin:0;padding:16px;background:${BRAND.background};border-radius:8px;white-space:pre-line;">${escapeHtml(description)}</p>
      ${
        expected
          ? `<p style="margin:16px 0 8px;"><strong>Esperado:</strong></p>
      <p style="margin:0;padding:16px;background:${BRAND.background};border-radius:8px;white-space:pre-line;">${escapeHtml(expected)}</p>`
          : ''
      }
    `,
    cta: { label: 'Ver inbox', href: opsHref },
    footerNote: 'Notificaci\u00f3n interna \u00b7 Cacer\u00eda de hallazgos Codiva.dev',
  });
}

export function templateCareerHuntPartTwo({
  name,
  craft,
  pruebaHref,
  huntHref,
  locale = DEFAULT_LOCALE,
  coverAll = false,
}: {
  name: string;
  craft: string;
  pruebaHref: string;
  huntHref: string;
  locale?: Locale;
  coverAll?: boolean;
}): string {
  return emailLayout({
    preview: tSync(locale, 'email.careerHunt.preview'),
    title: tSync(locale, 'email.careerHunt.title'),
    locale,
    bodyHtml: `
      <p style="margin:0 0 12px;">${escapeHtml(tSync(locale, 'email.hello'))} ${escapeHtml(name)},</p>
      <p style="margin:0 0 12px;">${escapeHtml(
        coverAll
          ? tSync(locale, 'email.careerHunt.body1All')
          : tSync(locale, 'email.careerHunt.body1', { craft })
      )}</p>
      <p style="margin:0 0 12px;">${escapeHtml(tSync(locale, 'email.careerHunt.body2'))}</p>
      <p style="margin:0;">${escapeHtml(tSync(locale, 'email.careerHunt.body3'))}<br/>
        <a href="${escapeHtml(huntHref)}" style="color:${BRAND.primary};">${escapeHtml(huntHref)}</a>
      </p>
    `,
    cta: { label: tSync(locale, 'email.careerHunt.cta'), href: pruebaHref },
    footerNote: tSync(locale, 'email.lead.footer'),
  });
}

export function templateCareerApplyReady({
  name,
  applyHref,
  locale = DEFAULT_LOCALE,
  coverAll = false,
}: {
  name: string;
  applyHref: string;
  locale?: Locale;
  coverAll?: boolean;
}): string {
  return emailLayout({
    preview: tSync(locale, 'email.careerApplyReady.preview'),
    title: tSync(locale, 'email.careerApplyReady.title'),
    locale,
    bodyHtml: `
      <p style="margin:0 0 12px;">${escapeHtml(tSync(locale, 'email.hello'))} ${escapeHtml(name)},</p>
      <p style="margin:0 0 12px;">${escapeHtml(
        tSync(locale, coverAll ? 'email.careerApplyReady.body1All' : 'email.careerApplyReady.body1')
      )}</p>
      <p style="margin:0;">${escapeHtml(tSync(locale, 'email.careerApplyReady.body2'))}</p>
    `,
    cta: { label: tSync(locale, 'email.careerApplyReady.cta'), href: applyHref },
    footerNote: tSync(locale, 'email.lead.footer'),
  });
}

export function templateCareerHuntNudge({
  name,
  pruebaHref,
  huntHref,
  locale = DEFAULT_LOCALE,
  coverAll = false,
}: {
  name: string;
  pruebaHref: string;
  huntHref: string;
  locale?: Locale;
  coverAll?: boolean;
}): string {
  return emailLayout({
    preview: tSync(locale, 'email.careerHuntNudge.preview'),
    title: tSync(locale, 'email.careerHuntNudge.title'),
    locale,
    bodyHtml: `
      <p style="margin:0 0 12px;">${escapeHtml(tSync(locale, 'email.hello'))} ${escapeHtml(name)},</p>
      <p style="margin:0 0 12px;">${escapeHtml(
        tSync(locale, coverAll ? 'email.careerHuntNudge.body1All' : 'email.careerHuntNudge.body1')
      )}</p>
      <p style="margin:0;">${escapeHtml(tSync(locale, 'email.careerHuntNudge.body2'))}<br/>
        <a href="${escapeHtml(huntHref)}" style="color:${BRAND.primary};">${escapeHtml(huntHref)}</a>
      </p>
    `,
    cta: { label: tSync(locale, 'email.careerHuntNudge.cta'), href: pruebaHref },
    footerNote: tSync(locale, 'email.lead.footer'),
  });
}

export function templateCareerCvNudge({
  name,
  applyHref,
  locale = DEFAULT_LOCALE,
  coverAll = false,
}: {
  name: string;
  applyHref: string;
  locale?: Locale;
  coverAll?: boolean;
}): string {
  return emailLayout({
    preview: tSync(locale, 'email.careerCvNudge.preview'),
    title: tSync(locale, 'email.careerCvNudge.title'),
    locale,
    bodyHtml: `
      <p style="margin:0 0 12px;">${escapeHtml(tSync(locale, 'email.hello'))} ${escapeHtml(name)},</p>
      <p style="margin:0 0 12px;">${escapeHtml(
        tSync(locale, coverAll ? 'email.careerCvNudge.body1All' : 'email.careerCvNudge.body1')
      )}</p>
      <p style="margin:0;">${escapeHtml(tSync(locale, 'email.careerCvNudge.body2'))}</p>
    `,
    cta: { label: tSync(locale, 'email.careerCvNudge.cta'), href: applyHref },
    footerNote: tSync(locale, 'email.lead.footer'),
  });
}

export function templateCareerApplicationRejected({
  name,
  jobTitle,
  openingsHref,
  locale = DEFAULT_LOCALE,
}: {
  name: string;
  jobTitle: string;
  openingsHref: string;
  locale?: Locale;
}): string {
  return emailLayout({
    preview: tSync(locale, 'email.careerRejected.preview', { jobTitle }),
    title: tSync(locale, 'email.careerRejected.title'),
    locale,
    bodyHtml: `
      <p style="margin:0 0 12px;">${escapeHtml(tSync(locale, 'email.hello'))} ${escapeHtml(name)},</p>
      <p style="margin:0 0 12px;">${escapeHtml(tSync(locale, 'email.careerRejected.body1', { jobTitle }))}</p>
      <p style="margin:0 0 12px;">${escapeHtml(tSync(locale, 'email.careerRejected.body2'))}</p>
      <p style="margin:0 0 16px;">${escapeHtml(tSync(locale, 'email.careerRejected.body3'))}</p>
      <p style="margin:0;">${escapeHtml(tSync(locale, 'email.careerRejected.signoff'))}<br/>
        ${escapeHtml(tSync(locale, 'email.careerRejected.team'))}</p>
    `,
    cta: { label: tSync(locale, 'email.careerRejected.cta'), href: openingsHref },
    footerNote: tSync(locale, 'email.lead.footer'),
  });
}

export function templateCareerApplicationPhaseChanged({
  name,
  jobTitle,
  kind,
  locale = DEFAULT_LOCALE,
}: {
  name: string;
  jobTitle: string;
  kind: 'reviewed' | 'hired' | 'interview';
  locale?: Locale;
}): string {
  const prefix =
    kind === 'hired' ? 'email.careerHired' : kind === 'interview' ? 'email.careerInterview' : 'email.careerReviewed';
  const subject = tSync(locale, `${prefix}.subject`, { jobTitle });
  return emailLayout({
    preview: tSync(locale, `${prefix}.preview`, { jobTitle }),
    title: tSync(locale, `${prefix}.title`),
    locale,
    bodyHtml: `
      <p style="margin:0 0 12px;">${escapeHtml(tSync(locale, 'email.hello'))} ${escapeHtml(name)},</p>
      <p style="margin:0 0 12px;">${escapeHtml(tSync(locale, `${prefix}.body1`, { jobTitle }))}</p>
      <p style="margin:0 0 12px;">${escapeHtml(tSync(locale, `${prefix}.body2`))}</p>
      <p style="margin:0 0 16px;">${escapeHtml(tSync(locale, `${prefix}.body3`))}</p>
      <p style="margin:0;">${escapeHtml(tSync(locale, `${prefix}.signoff`))}<br/>
        ${escapeHtml(tSync(locale, `${prefix}.team`))}</p>
    `,
    cta: {
      label: tSync(locale, `${prefix}.cta`),
      href: contactMailtoHref({
        subject,
        body: kind === 'interview' ? tSync(locale, 'email.careerInterview.replyBody') : undefined,
      }),
    },
    footerNote: tSync(locale, 'email.lead.footer'),
  });
}

/** Reemplaza placeholder de recovery link en plantilla Supabase o post-proceso */
export function applyRecoveryLink(html: string, link: string): string {
  return html.replace(/\{\{RECOVERY_LINK\}\}/g, link);
}

export function templatePasswordRecoveryHtml(link: string, locale: Locale = DEFAULT_LOCALE): string {
  return applyRecoveryLink(templatePasswordRecovery(locale), link);
}

export function templatePortalPasswordRecoveryHtml(
  projectName: string,
  link: string,
  locale: Locale = DEFAULT_LOCALE
): string {
  return applyRecoveryLink(templatePortalPasswordRecovery(projectName, locale), link);
}
