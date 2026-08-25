-- NIRC: pedir las bases de talento que operan hoy (carga masiva al pool).
INSERT INTO public.document_requests (
  id,
  project_id,
  code,
  title,
  description,
  instructions,
  expected_type,
  input_mode,
  status,
  required,
  sort_order,
  visible_to_client
)
SELECT
  '94000001-0001-4000-8000-000000000009',
  p.id,
  'talent_databases',
  'Bases de datos de talento',
  'Exportación vigente del pool de candidatos/empleados que operan hoy (Excel, ATS u otras listas).',
  'Excel o CSV, una fila por persona, con encabezados originales. Si hay varias fuentes, un ZIP o un enlace (Drive, Dropbox, SharePoint).',
  'other',
  'file',
  'open',
  true,
  42,
  true
FROM public.projects p
WHERE p.id = 'b0000001-0001-4000-8000-00000000000b'
   OR p.slug = 'nirc'
ON CONFLICT (id) DO NOTHING;
