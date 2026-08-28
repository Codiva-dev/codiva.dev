-- NIRC portal: split the single build blob into the 18-week MVP phases (client-facing, no economics).

UPDATE public.projects
SET target_delivery_date = '2026-12-21'
WHERE id = 'b0000001-0001-4000-8000-00000000000b'
   OR slug = 'nirc';

UPDATE public.milestones
SET
  title = 'Arranque de implementación',
  description = 'Semana 1. Ambientes de trabajo, accesos sandbox (Cincel y Stripe listos; IDSE cuando el proveedor lo entregue), catálogo de registro patronal y plantilla de adhesión.',
  status = 'in_progress',
  due_date = '2026-08-24',
  sort_order = 5,
  visible_to_client = true
WHERE id = 'f0000001-0001-4000-8000-00000000000f';

INSERT INTO public.milestones (
  id, project_id, title, description, status, sort_order, due_date, visible_to_client
)
VALUES
  (
    'f0000001-0001-4000-8000-000000000010',
    'b0000001-0001-4000-8000-00000000000b',
    'Plataforma base',
    'Semanas 2-5. Accesos y permisos, backoffice, expediente del personal, carga masiva y consentimientos.',
    'pending',
    6,
    '2026-09-21',
    true
  ),
  (
    'f0000001-0001-4000-8000-000000000011',
    'b0000001-0001-4000-8000-00000000000b',
    'Bolsa y convocatoria',
    'Semanas 6-9. Labores, afinidad, vacantes, convocatoria automática, ofertas por orden de llegada, lista de espera y reemplazos.',
    'pending',
    7,
    '2026-10-19',
    true
  ),
  (
    'f0000001-0001-4000-8000-000000000012',
    'b0000001-0001-4000-8000-00000000000b',
    'Entrada en sitio',
    'Semanas 10-13. Tableta kiosk, QR, geocerca, INE, firma de adhesión y alta IMSS. Nadie pasa a trabajando sin alta aceptada.',
    'pending',
    8,
    '2026-11-16',
    true
  ),
  (
    'f0000001-0001-4000-8000-000000000013',
    'b0000001-0001-4000-8000-00000000000b',
    'Salida y pago',
    'Semanas 14-16. Check-out, baja IMSS, dispersión Stripe y registro contable simple.',
    'pending',
    9,
    '2026-12-07',
    true
  ),
  (
    'f0000001-0001-4000-8000-000000000014',
    'b0000001-0001-4000-8000-00000000000b',
    'Pruebas y go-live',
    'Semanas 17-18. Recorrido punta a punta, capacitación al equipo NIRC y arranque asistido en producción.',
    'pending',
    10,
    '2026-12-21',
    true
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  sort_order = EXCLUDED.sort_order,
  due_date = EXCLUDED.due_date,
  visible_to_client = EXCLUDED.visible_to_client;

INSERT INTO public.milestone_updates (id, milestone_id, body, created_at)
VALUES (
  'f1000001-0001-4000-8000-000000000003',
  'f0000001-0001-4000-8000-00000000000f',
  E'18 ago 2026 - Arranque de implementación.\n• Arquitectura certificada; el plan de 18 semanas queda visible en el portal.\n• Semana 1: ambientes, sandboxes y plantilla de adhesión.\n• Pendiente de NIRC: sandbox IDSE PRO y política de abandono.',
  '2026-08-18T04:00:00Z'
)
ON CONFLICT (id) DO NOTHING;
