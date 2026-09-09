-- RISER Web Institucional: fondos de videollamada (archivos del escritorio).
INSERT INTO public.deliverables (
  id, project_id, title, description, url, kind, sort_order, visible_to_client
) VALUES
  (
    'e11c82f4-38d2-418d-9c19-f99742c293e1',
    'b11c82f4-38d2-418d-9c19-f99742c293e6',
    'Fondo videollamada — navy',
    'Fondo de videollamada con lockup centrado sobre navy.',
    '/client-packs/riser/videocall-navy.png',
    'other', 2, true
  ),
  (
    'e11c82f4-38d2-418d-9c19-f99742c293e2',
    'b11c82f4-38d2-418d-9c19-f99742c293e6',
    'Fondo videollamada — claro',
    'Fondo de videollamada con lockup centrado sobre fondo claro.',
    '/client-packs/riser/videocall-claro.png',
    'other', 3, true
  ),
  (
    'e11c82f4-38d2-418d-9c19-f99742c293e3',
    'b11c82f4-38d2-418d-9c19-f99742c293e6',
    'Fondo videollamada — Ricardo abajo derecha navy',
    'Fondo navy con lockup y nombre abajo a la derecha.',
    '/client-packs/riser/videocall-ricardo-abajo-der-navy.png',
    'other', 4, true
  ),
  (
    'e11c82f4-38d2-418d-9c19-f99742c293e4',
    'b11c82f4-38d2-418d-9c19-f99742c293e6',
    'Fondo videollamada — Ricardo abajo derecha claro',
    'Fondo claro con lockup y nombre abajo a la derecha.',
    '/client-packs/riser/videocall-ricardo-abajo-der-claro.png',
    'other', 5, true
  ),
  (
    'e11c82f4-38d2-418d-9c19-f99742c293e5',
    'b11c82f4-38d2-418d-9c19-f99742c293e6',
    'Fondo videollamada — Ricardo arriba izquierda navy',
    'Fondo navy con lockup y nombre arriba a la izquierda.',
    '/client-packs/riser/videocall-ricardo-arriba-izq-navy.png',
    'other', 6, true
  ),
  (
    'e11c82f4-38d2-418d-9c19-f99742c293e6',
    'b11c82f4-38d2-418d-9c19-f99742c293e6',
    'Fondo videollamada — Ricardo arriba izquierda claro',
    'Fondo claro con lockup y nombre arriba a la izquierda.',
    '/client-packs/riser/videocall-ricardo-arriba-izq-claro.png',
    'other', 7, true
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  url = EXCLUDED.url,
  kind = EXCLUDED.kind,
  sort_order = EXCLUDED.sort_order,
  visible_to_client = EXCLUDED.visible_to_client,
  file_path = NULL,
  file_url = NULL;
