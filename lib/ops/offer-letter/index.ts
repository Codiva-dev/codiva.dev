import { escapeHtml } from '@/utils/escapeHtml';
import { formatCurrency } from '@/lib/ops/labels';
import { BRAND_EMAIL, CODIVA_BRAND } from '@/lib/brand';
import { DEFAULT_LOCALE, type Locale } from '@/i18n/config';
import { tSync } from '@/i18n/translate';

const BRAND = BRAND_EMAIL;
const FONT_BODY = `'Inter', system-ui, -apple-system, Segoe UI, Arial, sans-serif`;
const FONT_DISPLAY = `'Plus Jakarta Sans', Inter, system-ui, sans-serif`;
const SITE = CODIVA_BRAND.urls.site.replace(/\/$/, '');
const LOGO_URL = `${SITE}/logo.svg`;

export const WORK_MODALITY_LABELS: Record<string, string> = {
  remote: 'Remoto',
  hybrid: 'Híbrido',
  onsite: 'Presencial',
};

export const OPS_ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  pm: 'Project Manager',
  dev: 'Desarrollador',
};

export const OFFER_STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  sent: 'Enviada',
  accepted: 'Aceptada',
  declined: 'Declinada',
  withdrawn: 'Retirada',
};

export function offerLabelsFor(locale: Locale = DEFAULT_LOCALE) {
  return {
    WORK_MODALITY_LABELS: {
      remote: tSync(locale, 'ops.modality.remote'),
      hybrid: tSync(locale, 'ops.modality.hybrid'),
      onsite: tSync(locale, 'ops.modality.onsite'),
    } as Record<string, string>,
    OPS_ROLE_LABELS: {
      admin: tSync(locale, 'ops.roles.admin'),
      pm: tSync(locale, 'ops.roles.pm'),
      dev: tSync(locale, 'ops.roles.dev'),
    } as Record<string, string>,
    OFFER_STATUS_LABELS: {
      draft: tSync(locale, 'ops.offerStatus.draft'),
      sent: tSync(locale, 'ops.offerStatus.sent'),
      accepted: tSync(locale, 'ops.offerStatus.accepted'),
      declined: tSync(locale, 'ops.offerStatus.declined'),
      withdrawn: tSync(locale, 'ops.offerStatus.withdrawn'),
    } as Record<string, string>,
  };
}

export type OfferLetterData = {
  fullName: string;
  email?: string | null;
  positionTitle: string;
  opsRole?: string;
  monthlyCompensation: number;
  currency?: string;
  workModality?: string;
  startDate?: string | Date | null;
  validUntil?: string | Date | null;
  responsibilities?: string;
  terms?: string;
  issuedAt?: string | Date;
  signerName?: string;
  signerTitle?: string;
  signerEmail?: string;
};

export const DEFAULT_RESPONSIBILITIES = `Coordinar el avance de proyectos de software a la medida y productos digitales asignados.
Ser el punto de contacto operativo entre cliente, diseño, desarrollo y dirección de Codiva.
Dar seguimiento a alcance, tiempos, riesgos, dependencias y entregables en las herramientas del equipo Codiva.dev.
Facilitar alineaciones, revisiones y demos con el cliente o stakeholders del proyecto.
Mantener claridad de prioridades, comunicar bloqueos a tiempo y proponer siguientes pasos.
Gestionar expectativas y cambios de alcance, escalando a dirección cuando afecten tiempos o costo.
Apoyar la documentación operativa del proyecto (hitos, tickets, entregables y estatus).
Participar en estimación, priorización y planeación de entregas cuando se requiera.
Colaborar en la mejora de procesos operativos del estudio (rituales, plantillas, handoffs).
Otras actividades afines al rol de Project Manager que Codiva asigne según las necesidades del estudio y de los proyectos.`;

export const DEFAULT_QA_RESPONSIBILITIES = `Diseñar y ejecutar pruebas sobre productos de software a la medida y productos digitales de Codiva.dev.
Validar flujos críticos, regresiones y criterios de aceptación antes de una entrega o pase a producción.
Reportar defectos con pasos, evidencia y severidad en las herramientas del equipo.
Acompañar UAT con el cliente o stakeholders cuando el proyecto lo requiera.
Verificar correcciones y confirmar que el arreglo no rompe lo ya entregado.
Apoyar la calidad operativa del estudio: checklists, ambientes de prueba y handoff a desarrollo.
Otras actividades afines a testing y QA que Codiva asigne según las necesidades del estudio y de los proyectos.`;

export const DEFAULT_FRONTEND_RESPONSIBILITIES = `Probar interfaces de productos web a la medida de Codiva.dev: estados, flujos, accesibilidad y lo que el usuario ve y toca.
Reportar defectos de frontend con pasos, viewport, evidencia y resultado esperado vs. obtenido.
Distinguir un defecto de una preferencia de diseño y no bloquear una entrega por gusto personal.
Colaborar con desarrollo, diseño y PM en criterios de aceptación y regresiones de UI.
Otras actividades afines a testing de frontend que Codiva asigne según las necesidades del estudio y de los proyectos.`;

export const DEFAULT_BACKEND_RESPONSIBILITIES = `Probar APIs, autenticación, datos e integraciones de productos a la medida de Codiva.dev.
Validar contratos, permisos y casos que el cliente HTTP puede disparar aunque el front los esconda.
Reportar defectos de backend con request/response, ambiente y rol de prueba, sin filtrar secretos.
Colaborar con desarrollo y PM en criterios de aceptación, staging y pases a producción.
Otras actividades afines a testing de backend que Codiva asigne según las necesidades del estudio y de los proyectos.`;

export const DEFAULT_FULLSTACK_RESPONSIBILITIES = `Probar flujos de punta a punta en productos a la medida de Codiva.dev: interfaz, API y operación.
Perseguir huecos entre capas (éxito en UI con fallo de API, cache, flags, webhooks).
Reportar con evidencia de las capas involucradas, no con tickets aislados que no se relacionan.
Colaborar con PM, diseño y desarrollo; no comunicar «listo» si el camino real del cliente falla.
Otras actividades afines a testing full stack que Codiva asigne según las necesidades del estudio y de los proyectos.`;

export const DEFAULT_DESIGN_RESPONSIBILITIES = `Probar flujos, copy, usabilidad y handoff diseño↔build en productos a la medida de Codiva.dev.
Detectar cuando la interfaz miente, traba o deja al usuario sin siguiente paso.
Reportar problemas de UX/UI con tarea concreta, evidencia y severidad; no con preferencia personal.
Colaborar con diseño, desarrollo y PM en estados vacíos, errores y acciones destructivas.
Otras actividades afines a testing de UX/UI que Codiva asigne según las necesidades del estudio y de los proyectos.`;

export const DEFAULT_SECURITY_RESPONSIBILITIES = `Probar seguridad de aplicación en productos a la medida de Codiva.dev: autorización, cookies, cabeceras y filtración de datos.
Reportar hallazgos con alcance, impacto y evidencia mínima; no escanear producción ni explotar más de lo necesario.
Distinguir autenticación de autorización y un secreto filtrado de una preferencia de hardening.
Colaborar con desarrollo y PM para cerrar defectos antes del pase, sin teatro de pentest.
Otras actividades afines a testing de seguridad de aplicación que Codiva asigne según las necesidades del estudio y de los proyectos.`;

export function responsibilitiesForCareerDiscipline(
  discipline: string | null | undefined
): string | null {
  switch (discipline) {
    case 'frontend':
      return DEFAULT_FRONTEND_RESPONSIBILITIES;
    case 'backend':
      return DEFAULT_BACKEND_RESPONSIBILITIES;
    case 'fullstack':
      return DEFAULT_FULLSTACK_RESPONSIBILITIES;
    case 'ux-ui':
      return DEFAULT_DESIGN_RESPONSIBILITIES;
    case 'qa':
      return DEFAULT_QA_RESPONSIBILITIES;
    case 'security':
      return DEFAULT_SECURITY_RESPONSIBILITIES;
    default:
      return null;
  }
}

export const DEFAULT_TERMS = `La compensación se paga de forma mensual en la moneda indicada, previo acuerdo de facturación o esquema de pago vigente.
La colaboración inicia en la fecha acordada, sujeta a la aceptación escrita de esta carta oferta.
Las responsabilidades listadas son enunciativas y no limitativas: describen el núcleo del rol, sin excluir tareas razonablemente relacionadas con la operación de proyectos de Codiva.dev.
El alcance concreto de proyectos, carga y prioridades puede variar conforme a la operación del estudio; cambios materiales de rol o compensación se acordarán por escrito.
Cualquiera de las partes podrá dar por terminada la relación con aviso razonable, conforme a lo que se pacte por escrito.
Esta carta no constituye por sí sola un contrato laboral definitivo; formaliza la intención de incorporar a la persona al equipo de operaciones de Codiva.dev bajo los términos aquí descritos.`;

function formatLongDate(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value.includes('T') ? value : `${value}T12:00:00`) : value;
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
}

function paragraphs(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map(
      (block) =>
        `<p class="body">${paintEscaped(escapeHtml(block).replace(/\n/g, '<br/>'))}</p>`
    )
    .join('');
}

function bulletList(text: string): string {
  const items = text
    .split(/\n/)
    .map((l) => l.replace(/^[\s•\--]+/, '').trim())
    .filter(Boolean);
  if (!items.length) return '';
  return `<ul class="bullets">
    ${items.map((item) => `<li>${paintEscaped(escapeHtml(item))}</li>`).join('')}
  </ul>`;
}

function termList(text: string): string {
  const items = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!items.length) return '';
  if (items.length === 1) return paragraphs(items[0]);
  return `<ol class="terms">
    ${items.map((item) => `<li>${paintEscaped(escapeHtml(item))}</li>`).join('')}
  </ol>`;
}

function section(title: string, body: string, mode: 'bullets' | 'terms' | 'prose' = 'prose'): string {
  if (!body.trim()) return '';
  const content =
    mode === 'bullets' ? bulletList(body) : mode === 'terms' ? termList(body) : paragraphs(body);
  return `
    <section class="section">
      <h2 class="section-title">${escapeHtml(title)}</h2>
      ${content}
    </section>`;
}

function metaItem(label: string, value: string, emphasize = false): string {
  return `
    <div class="meta-item${emphasize ? ' meta-item--accent' : ''}">
      <span class="meta-label">${escapeHtml(label)}</span>
      <span class="meta-value">${escapeHtml(value)}</span>
    </div>`;
}

/** Wordmark oficial: Codiva (#18181B) + .dev (primary #104E4E). */
function brandWordmarkHtml(sizePx = 22): string {
  return `<span class="wordmark" style="font-size:${sizePx}px;">Codiva<span class="wordmark-dot">.dev</span></span>`;
}

function paintEscaped(escaped: string): string {
  return escaped.replaceAll('Codiva.dev', brandWordmarkHtml(13));
}

export function offerLetterFilename(fullName: string, ext: 'html' | 'pdf' = 'html') {
  const safe = fullName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
  return `Carta-Oferta-Codiva-${safe || 'Candidato'}.${ext}`;
}

export function renderOfferLetterHtml(data: OfferLetterData): string {
  const currency = data.currency || 'USD';
  const modality = WORK_MODALITY_LABELS[data.workModality || 'remote'] || data.workModality || 'Remoto';
  const issuedAt = data.issuedAt ? formatLongDate(data.issuedAt) : formatLongDate(new Date());
  const startLabel = data.startDate ? formatLongDate(data.startDate) : 'Por acordar';
  const validLabel = data.validUntil ? formatLongDate(data.validUntil) : null;
  const compensation = formatCurrency(data.monthlyCompensation, currency);
  const responsibilities = String(data.responsibilities || '').trim();
  const terms = (data.terms || DEFAULT_TERMS).trim();
  const signerName = data.signerName || 'Jean Claude Martell';
  const signerTitle = data.signerTitle || 'Codiva.dev';
  const signerEmail = data.signerEmail || 'j.martell@codiva.dev';
  const emailItem = data.email ? metaItem('Correo', data.email) : '';
  const host = SITE.replace(/^https?:\/\//, '');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Carta oferta - ${escapeHtml(data.fullName)} · Codiva.dev</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700&display=swap" rel="stylesheet"/>
  <style>
    :root {
      --primary: ${BRAND.primary};
      --primary-dark: ${BRAND.primaryDark};
      --ink: ${BRAND.text};
      --muted: ${BRAND.muted};
      --text-muted: ${BRAND.textMuted};
      --line: ${BRAND.border};
      --soft: #F3F6F6;
      --accent-wash: #E7F3F2;
      --paper: #FFFFFF;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      background: var(--paper);
      color: var(--ink);
      font-family: ${FONT_BODY};
      -webkit-font-smoothing: antialiased;
    }
    .page {
      width: 100%;
      max-width: 800px;
      margin: 0 auto;
      background: var(--paper);
      padding: 0 0 8px;
    }
    .topbar {
      height: 6px;
      background: linear-gradient(90deg, var(--primary-dark) 0%, var(--primary) 55%, #1A6B6B 100%);
    }
    .header {
      padding: 28px 40px 22px;
      border-bottom: 1px solid var(--line);
      background:
        radial-gradient(120% 80% at 100% 0%, rgba(16,78,78,0.06) 0%, transparent 55%),
        var(--paper);
    }
    .brand-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 28px;
    }
    .brand-lockup {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand-lockup img {
      display: block;
      width: 36px;
      height: 36px;
      border: 0;
    }
    .wordmark {
      font-family: ${FONT_DISPLAY};
      line-height: 1.15;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: var(--ink);
    }
    .wordmark-dot { font-weight: 500; color: var(--primary); }
    .doc-chip {
      margin: 0;
      padding: 6px 12px;
      border-radius: 999px;
      border: 1px solid rgba(16,78,78,0.18);
      background: var(--accent-wash);
      font-family: ${FONT_DISPLAY};
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--primary);
      white-space: nowrap;
    }
    .kicker {
      margin: 0 0 8px;
      font-family: ${FONT_DISPLAY};
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--primary);
    }
    .title {
      margin: 0;
      font-family: ${FONT_DISPLAY};
      font-size: 32px;
      line-height: 1.15;
      font-weight: 700;
      letter-spacing: -0.03em;
      color: var(--ink);
    }
    .subtitle {
      margin: 10px 0 0;
      font-size: 15px;
      font-weight: 500;
      color: var(--text-muted);
    }
    .content { padding: 28px 40px 36px; }
    .date {
      margin: 0 0 18px;
      font-size: 13px;
      color: var(--muted);
    }
    .salutation, .intro, .body {
      margin: 0 0 14px;
      font-size: 14.5px;
      line-height: 1.7;
      color: var(--ink);
    }
    .intro { margin-bottom: 22px; color: var(--text-muted); }
    .intro strong, .salutation strong { color: var(--ink); font-weight: 600; }
    .offer-panel {
      display: grid;
      grid-template-columns: 1.1fr 1fr;
      gap: 0;
      margin: 0 0 28px;
      border: 1px solid var(--line);
      border-radius: 14px;
      overflow: hidden;
      background: var(--paper);
    }
    .comp-block {
      padding: 22px 24px;
      background: linear-gradient(160deg, var(--primary-dark) 0%, var(--primary) 100%);
      color: #fff;
    }
    .comp-label {
      margin: 0 0 8px;
      font-family: ${FONT_DISPLAY};
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      opacity: 0.82;
    }
    .comp-value {
      margin: 0;
      font-family: ${FONT_DISPLAY};
      font-size: 28px;
      line-height: 1.15;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    .comp-note {
      margin: 10px 0 0;
      font-size: 12px;
      line-height: 1.45;
      opacity: 0.88;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px 18px;
      padding: 18px 20px;
      background: var(--soft);
    }
    .meta-item { min-width: 0; }
    .meta-label {
      display: block;
      margin: 0 0 3px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--muted);
    }
    .meta-value {
      display: block;
      font-size: 13.5px;
      font-weight: 600;
      color: var(--ink);
      line-height: 1.35;
      word-break: break-word;
    }
    .meta-item--accent .meta-value { color: var(--primary); }
    .section { margin-top: 26px; page-break-inside: avoid; }
    .section-title {
      margin: 0 0 12px;
      padding-bottom: 8px;
      border-bottom: 2px solid var(--accent-wash);
      font-family: ${FONT_DISPLAY};
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--primary);
    }
    .bullets, .terms {
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .bullets li, .terms li {
      position: relative;
      margin: 0 0 9px;
      padding-left: 18px;
      font-size: 13.5px;
      line-height: 1.6;
      color: var(--ink);
    }
    .bullets li:last-child, .terms li:last-child { margin-bottom: 0; }
    .bullets li::before {
      content: "";
      position: absolute;
      left: 0;
      top: 0.55em;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--primary);
      opacity: 0.85;
    }
    .terms li {
      padding-left: 26px;
      counter-increment: term;
    }
    .terms { counter-reset: term; }
    .terms li::before {
      content: counter(term);
      position: absolute;
      left: 0;
      top: 0.1em;
      width: 18px;
      height: 18px;
      border-radius: 999px;
      background: var(--accent-wash);
      color: var(--primary);
      font-size: 10px;
      font-weight: 700;
      line-height: 18px;
      text-align: center;
    }
    .note {
      margin: 10px 0 0;
      font-size: 12px;
      line-height: 1.55;
      color: var(--muted);
    }
    .accept {
      margin-top: 26px;
      padding: 16px 18px;
      border-radius: 12px;
      background: var(--soft);
      border: 1px solid var(--line);
    }
    .accept p {
      margin: 0;
      font-size: 13.5px;
      line-height: 1.65;
      color: var(--ink);
    }
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 28px;
      margin-top: 34px;
      page-break-inside: avoid;
    }
    .sig-label {
      margin: 0 0 48px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--muted);
    }
    .sig-label .wordmark {
      text-transform: none;
      letter-spacing: -0.02em;
    }
    .sig-line {
      border-top: 1px solid var(--ink);
      padding-top: 12px;
    }
    .sig-name {
      margin: 0;
      font-family: ${FONT_DISPLAY};
      font-size: 14.5px;
      font-weight: 700;
      letter-spacing: -0.01em;
      color: var(--ink);
    }
    .sig-meta {
      margin: 4px 0 0;
      font-size: 12.5px;
      color: var(--muted);
    }
    .footer {
      margin-top: 34px;
      padding-top: 16px;
      border-top: 1px solid var(--line);
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .footer img {
      width: 24px;
      height: 24px;
      display: block;
      flex-shrink: 0;
    }
    .footer p {
      margin: 0;
      font-size: 12px;
      line-height: 1.45;
      color: var(--muted);
    }
    .footer a {
      color: var(--primary);
      text-decoration: none;
      font-weight: 500;
    }
    @page {
      size: A4;
    }
    @media print {
      body { background: #fff !important; }
      .page { max-width: none; }
      .offer-panel, .accept, .comp-block, .topbar { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .header { padding-top: 22px; }
      .header, .content { padding-left: 4mm; padding-right: 4mm; }
    }
    @media (max-width: 640px) {
      .header, .content { padding-left: 20px; padding-right: 20px; }
      .offer-panel, .meta-grid, .signatures { grid-template-columns: 1fr; }
      .brand-row { flex-direction: column; align-items: flex-start; }
    }
  </style>
</head>
<body>
  <article class="page">
    <div class="topbar"></div>
    <header class="header">
      <div class="brand-row">
        <div class="brand-lockup">
          <img src="${LOGO_URL}" alt="Codiva" width="36" height="36"/>
          ${brandWordmarkHtml(22)}
        </div>
        <p class="doc-chip">Carta oferta</p>
      </div>
      <p class="kicker">Oferta de incorporación</p>
      <h1 class="title">${escapeHtml(data.fullName)}</h1>
      <p class="subtitle">${escapeHtml(data.positionTitle)}</p>
    </header>

    <div class="content">
      <p class="date">Ciudad de México, a ${escapeHtml(issuedAt)}</p>
      <p class="salutation">Estimado/a <strong>${escapeHtml(data.fullName)}</strong>:</p>
      <p class="intro">
        En ${brandWordmarkHtml(15)} nos da gusto ofrecerte incorporarte a nuestro equipo de operaciones
        como <strong>${escapeHtml(data.positionTitle)}</strong>. Esta carta formaliza los términos principales de la oferta.
      </p>

      <div class="offer-panel">
        <div class="comp-block">
          <p class="comp-label">Compensación mensual</p>
          <p class="comp-value">${escapeHtml(compensation)}</p>
          <p class="comp-note">Monto bruto mensual · modalidad ${escapeHtml(modality).toLowerCase()}</p>
        </div>
        <div class="meta-grid">
          ${metaItem('Puesto', data.positionTitle)}
          ${emailItem}
          ${metaItem('Modalidad', modality)}
          ${metaItem('Inicio', startLabel)}
          ${metaItem('Emisión', issuedAt)}
          ${validLabel ? metaItem('Vigencia', validLabel, true) : ''}
        </div>
      </div>

      ${section('Responsabilidades', responsibilities, 'bullets')}
      <p class="note">Lista enunciativa del núcleo del rol; no es exhaustiva ni limita actividades afines que Codiva asigne.</p>
      ${section('Condiciones', terms, 'terms')}

      <section class="section">
        <h2 class="section-title">Aceptación</h2>
        <div class="accept">
          <p>
            Si estás de acuerdo con estos términos, responde por escrito a esta carta (correo o documento firmado)
            indicando tu aceptación. Con ello daremos inicio a tu alta en el equipo de operaciones de ${brandWordmarkHtml(15)}.
          </p>
        </div>
      </section>

      <div class="signatures">
        <div>
          <p class="sig-label">Por ${brandWordmarkHtml(13)}</p>
          <div class="sig-line">
            <p class="sig-name">${escapeHtml(signerName)}</p>
            <p class="sig-meta">${signerTitle === 'Codiva.dev' ? brandWordmarkHtml(13) : escapeHtml(signerTitle)}</p>
            <p class="sig-meta">${escapeHtml(signerEmail)}</p>
          </div>
        </div>
        <div>
          <p class="sig-label">Acepto la oferta</p>
          <div class="sig-line">
            <p class="sig-name">${escapeHtml(data.fullName)}</p>
            <p class="sig-meta">Nombre y firma</p>
            <p class="sig-meta">Fecha: _______________</p>
          </div>
        </div>
      </div>

      <footer class="footer">
        <img src="${LOGO_URL}" alt="" width="24" height="24"/>
        <div>
          <p>${escapeHtml(CODIVA_BRAND.tagline)}</p>
          <p>
            <a href="mailto:${CODIVA_BRAND.urls.email}">${CODIVA_BRAND.urls.email}</a>
            · <a href="${CODIVA_BRAND.urls.site}">${escapeHtml(host)}</a>
          </p>
        </div>
      </footer>
    </div>
  </article>
</body>
</html>`;
}

export function rowToOfferLetterData(row: {
  full_name: string;
  email?: string | null;
  position_title: string;
  ops_role?: string | null;
  monthly_compensation: number | string;
  currency?: string | null;
  work_modality?: string | null;
  start_date?: string | null;
  valid_until?: string | null;
  responsibilities?: string | null;
  terms?: string | null;
  issued_at?: string | null;
}): OfferLetterData {
  return {
    fullName: row.full_name,
    email: row.email,
    positionTitle: row.position_title,
    opsRole: row.ops_role || undefined,
    monthlyCompensation: Number(row.monthly_compensation),
    currency: row.currency || 'USD',
    workModality: row.work_modality || 'remote',
    startDate: row.start_date,
    validUntil: row.valid_until,
    responsibilities: row.responsibilities || undefined,
    terms: row.terms || undefined,
    issuedAt: row.issued_at || undefined,
  };
}
