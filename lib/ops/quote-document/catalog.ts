/**
 * Inventario de cotizaciones históricas en OneDrive (Clientes/).
 * Estructura común extraída de los .docx para la plantilla HTML de Ops.
 */
export type QuoteCatalogEntry = {
  client: string;
  file: string;
  serviceType: string;
  pattern: 'standard' | 'table' | 'enterprise';
};

/** Patrones detectados al analizar los .docx existentes */
export const QUOTE_DOCUMENT_PATTERNS = {
  standard: {
    label: 'Estándar (PWA / Web / App)',
    description:
      'Encabezado Codiva, meta del proyecto, alcance, entregables, módulos con horas/tarifa, resumen, consideraciones y extras.',
    examples: ['CD648', 'Amida', 'RODPIM', 'BESA', 'Inquilia'],
  },
  table: {
    label: 'Tabla de módulos',
    description: 'Estimación económica en tabla Módulo / Horas / Costo.',
    examples: ['RODPIM PWA', 'Kaucho Quimico'],
  },
  enterprise: {
    label: 'Enterprise / estratégica',
    description: 'Resumen ejecutivo, objetivos, diferenciador, múltiples secciones narrativas.',
    examples: ['Grupo IAMSA', 'Inquilia', 'NIRC', 'NATA-M'],
  },
} as const;

export const QUOTE_CATALOG: QuoteCatalogEntry[] = [
  { client: 'Amida', file: 'Cotizacion_Amida_PWA.docx', serviceType: 'PWA', pattern: 'standard' },
  { client: 'ARN TEQ', file: 'Cotizacion_ARNTEQ_PWA.docx', serviceType: 'PWA', pattern: 'standard' },
  { client: 'BESA', file: 'Cotizacion_BESA_App.docx', serviceType: 'App', pattern: 'standard' },
  { client: 'CD648', file: 'Cotizacion_CD648_PWA.docx', serviceType: 'PWA', pattern: 'standard' },
  { client: 'CD648', file: 'Cotizacion_CD648_Red.docx', serviceType: 'Red/API', pattern: 'standard' },
  { client: 'Grupo IAMSA', file: 'Cotizacion_IAMSA.docx', serviceType: 'Web', pattern: 'enterprise' },
  { client: 'Inquilia', file: 'Cotizacion_Inquilia_App.docx', serviceType: 'App', pattern: 'standard' },
  { client: 'Inquilia', file: 'arquitectura-completa.html', serviceType: 'Platform', pattern: 'enterprise' },
  { client: 'Jesus Mendez', file: 'Cotizacion_JM_Web.docx', serviceType: 'Web', pattern: 'standard' },
  { client: 'Kaucho Quimico', file: 'Cotizacion_EShop_KQ.docx', serviceType: 'E-Shop', pattern: 'table' },
  { client: 'Kaucho Quimico', file: 'Cotizacion_WEB_KQ.docx', serviceType: 'Web', pattern: 'standard' },
  { client: 'Maic/Gas', file: 'Cotizacion_REGIO_PWA.docx', serviceType: 'PWA', pattern: 'standard' },
  { client: 'FES', file: 'Cotizacion_eshop.pdf', serviceType: 'E-Shop', pattern: 'table' },
  { client: 'NATA-M', file: 'Cotizacion_AD_i18n.docx', serviceType: 'Admin/i18n', pattern: 'standard' },
  { client: 'NATA-M', file: 'propuesta.html', serviceType: 'Web', pattern: 'enterprise' },
  { client: 'Pentesting', file: 'Cotizacion_pentesting.docx', serviceType: 'Pentesting', pattern: 'standard' },
  { client: 'Pepe Martínez', file: 'Cotizacion_Jose_Martinez_APP_Automata.docx', serviceType: 'App', pattern: 'standard' },
  { client: 'Pepe Martínez', file: 'Cotizacion_Jose_Martinez_SPA_Fusion.docx', serviceType: 'SPA', pattern: 'standard' },
  { client: 'Quimialcla', file: 'Cotizacion_Quimialcla_Web.docx', serviceType: 'Web', pattern: 'standard' },
  { client: 'RISER', file: 'Cotizacion_RISER_WEB.docx', serviceType: 'Web', pattern: 'standard' },
  { client: 'RODPIM', file: 'Cotizacion_RODPIM_PWA.docx', serviceType: 'PWA', pattern: 'table' },
  { client: 'RODPIM', file: 'Cotizacion_RODPIM_APP.docx', serviceType: 'App', pattern: 'standard' },
  { client: 'RODPIM', file: 'Cotizacion_RODPIM_WEB.docx', serviceType: 'Web', pattern: 'standard' },
  { client: 'Universidad Tollancingo', file: 'Cotizacion_Universidad_Tollancingo_LMS.docx', serviceType: 'LMS', pattern: 'standard' },
  { client: 'YOU', file: 'Cotizacion_YOU_PWA.docx', serviceType: 'PWA', pattern: 'standard' },
  { client: 'NIRC', file: 'arquitectura-completa.html', serviceType: 'Platform', pattern: 'enterprise' },
  { client: 'NIRC', file: 'mvp-propuesta-fase1.md', serviceType: 'Platform', pattern: 'enterprise' },
];

export const DEFAULT_SERVICE_TYPE_LABELS: Record<string, string> = {
  PWA: 'COTIZACIÓN DE SERVICIOS DE DESARROLLO PWA',
  Web: 'COTIZACIÓN DE SERVICIOS DE DESARROLLO WEB',
  App: 'COTIZACIÓN DE SERVICIOS DE DESARROLLO DE APLICACIÓN',
  Platform: 'COTIZACIÓN DE DESARROLLO DE PLATAFORMA OPERATIVA',
  'E-Shop': 'COTIZACIÓN DE SERVICIOS DE DESARROLLO E-COMMERCE',
  LMS: 'COTIZACIÓN DE SERVICIOS DE DESARROLLO LMS',
  Pentesting: 'COTIZACIÓN DE SERVICIOS DE PENTESTING',
  SPA: 'COTIZACIÓN DE SERVICIOS DE DESARROLLO SPA',
};

export function serviceTypeHeading(serviceType: string, custom?: string): string {
  if (custom?.trim()) return custom.trim();
  const key = serviceType.trim();
  if (DEFAULT_SERVICE_TYPE_LABELS[key]) return DEFAULT_SERVICE_TYPE_LABELS[key];
  if (key.toUpperCase().startsWith('COTIZACIÓN')) return key;
  return `COTIZACION DE SERVICIOS - ${key || 'DESARROLLO A LA MEDIDA'}`;
}
