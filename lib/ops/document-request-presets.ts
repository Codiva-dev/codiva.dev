export type DocumentRequestPreset = {
  code: string;
  title: string;
  description: string;
  instructions: string;
  expectedType: 'nda' | 'other' | 'contract' | 'proposal_pdf';
  inputMode: 'file' | 'text' | 'credentials' | 'url';
  required: boolean;
  sortOrder: number;
};

export const DOCUMENT_REQUEST_PRESETS: DocumentRequestPreset[] = [
  {
    code: 'nda_signed',
    title: 'NDA firmado',
    description: 'Devolver el NDA mutuo firmado por el representante legal de la organización.',
    instructions:
      'Descarga el borrador aquí, hazlo firmar por el representante legal y súbelo en PDF. Si la carga falla, pega un enlace (Drive, Dropbox, SharePoint) al PDF firmado.',
    expectedType: 'nda',
    inputMode: 'file',
    required: true,
    sortOrder: 10,
  },
  {
    code: 'github_url',
    title: 'URL de GitHub existente',
    description: 'Repositorio GitHub actual del producto o del código del que partiremos.',
    instructions:
      'Pega la URL del repo (por ejemplo https://github.com/org/repo). Si es privado, invita a j.martell@codiva.dev y confírmalo en notas.',
    expectedType: 'other',
    inputMode: 'url',
    required: true,
    sortOrder: 20,
  },
  {
    code: 'constancia_situacion_fiscal',
    title: 'Constancia de Situación Fiscal',
    description: 'Constancia vigente emitida por el SAT (RFC, régimen y domicilio fiscal).',
    instructions: 'PDF descargado del portal del SAT. Debe coincidir con los datos de facturación.',
    expectedType: 'other',
    inputMode: 'file',
    required: true,
    sortOrder: 48,
  },
  {
    code: 'talent_databases',
    title: 'Bases de datos de talento',
    description: 'Exportación vigente del pool de candidatos/empleados que operan hoy (Excel, ATS u otras listas).',
    instructions:
      'Excel o CSV, una fila por persona, con encabezados originales. Si hay varias fuentes, un ZIP o un enlace (Drive, Dropbox, SharePoint).',
    expectedType: 'other',
    inputMode: 'file',
    required: true,
    sortOrder: 42,
  },
];

export function documentRequestPresetByCode(code: string) {
  return DOCUMENT_REQUEST_PRESETS.find((preset) => preset.code === code) ?? null;
}
