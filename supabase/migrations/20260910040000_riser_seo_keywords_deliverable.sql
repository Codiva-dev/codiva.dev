INSERT INTO public.deliverables (
  id, project_id, title, description, url, kind, sort_order, visible_to_client
) VALUES (
  'f11c82f4-38d2-418d-9c19-f99742c293e7',
  'b11c82f4-38d2-418d-9c19-f99742c293e6',
  'Palabras para SEO y redes',
  'Listado de trabajo para el sitio y LinkedIn: intención, servicios, plazas, inglés y lo que no usar.',
  '/client-packs/riser/seo-palabras.html',
  'proposal', 8, true
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  url = EXCLUDED.url,
  kind = EXCLUDED.kind,
  sort_order = EXCLUDED.sort_order,
  visible_to_client = EXCLUDED.visible_to_client;
