-- NIRC: pedir registros patronales y certificados IMSS (altas IDSE).
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
  '94000001-0001-4000-8000-000000000010',
  p.id,
  'registro_patronal',
  'Registro patronal y certificados',
  'Registro(s) patronal(es) y certificados IMSS vigentes para altas IDSE.',
  'PDF o ZIP con el número de RP, el patrón y los certificados vigentes. Si hay varios RP, inclúyanlos todos. Si no carga, un enlace (Drive, Dropbox, SharePoint).',
  'other',
  'file',
  'open',
  true,
  47,
  true
FROM public.projects p
WHERE p.id = 'b0000001-0001-4000-8000-00000000000b'
   OR p.slug = 'nirc'
ON CONFLICT (id) DO NOTHING;
