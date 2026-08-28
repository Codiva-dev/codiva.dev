-- NIRC portal: Architecture freeze signed 2026-08-17 + handoff to build (client-facing).

UPDATE public.projects
SET
  status = 'active',
  start_date = '2026-08-17',
  target_delivery_date = '2027-03-15',
  progress_percent = 28,
  description = E'Workforce eventual · Arquitectura certificada (freeze 17 ago 2026). Siguiente: implementación MVP (build), UAT y go-live.\n\nEntrada: tableta kiosk escanea QR → adhesión (solo trabajador) → idle; alta IMSS en paralelo.\nSalida: check-out dispara baja IMSS y pago Stripe en paralelo (SPEI solo respaldo).\n\nSandboxes: Cincel y Stripe listos; IDSE PRO pendiente de proveedor.'
WHERE id = 'b0000001-0001-4000-8000-00000000000b'
   OR slug = 'nirc';

UPDATE public.milestones m
SET
  title = v.title,
  description = v.description,
  status = v.status::public.milestone_status,
  due_date = v.due_date::date
FROM (VALUES
  ('f0000001-0001-4000-8000-00000000000a', 'Documentación base (Fase 0)', 'Arquitectura, flujos y MVP documentados en repo.', 'completed', '2026-08-17'),
  ('f0000001-0001-4000-8000-00000000000b', 'Arquitectura - arranque', 'Track A iniciado. Decisiones kiosk, baja en check-out, INE documental, sandboxes Cincel/Stripe.', 'completed', '2026-08-17'),
  ('f0000001-0001-4000-8000-00000000000c', 'Arquitectura - fundaciones', 'ADRs base, trazabilidad, catálogo P0 y ownership de principios.', 'completed', '2026-08-17'),
  ('f0000001-0001-4000-8000-00000000000d', 'Arquitectura - dominios', 'Specs CRM, pool/FCFS, QR/kiosk, Cincel, IDSE, Stripe, contabilidad y privacidad.', 'completed', '2026-08-17'),
  ('f0000001-0001-4000-8000-00000000000e', 'Architecture freeze', 'Paquete de arquitectura firmado 17 ago 2026. Handoff a implementación listo.', 'completed', '2026-08-17'),
  ('f0000001-0001-4000-8000-00000000000f', 'Build MVP - UAT / go-live', 'Implementación (~18 semanas), UAT y producción. Arranque de scaffold disponible.', 'in_progress', '2027-03-15')
) AS v(id, title, description, status, due_date)
WHERE m.id = v.id::uuid;

INSERT INTO public.milestone_updates (id, milestone_id, body, created_at)
VALUES (
  'f1000001-0001-4000-8000-000000000002',
  'f0000001-0001-4000-8000-00000000000e',
  E'17 ago 2026 - Architecture freeze firmado.\n• Arquitectura de producto certificada (decisiones de entrada, salida, pagos y cumplimiento).\n• Check-out: baja IMSS y pago Stripe en paralelo; SPEI solo como respaldo.\n• Handoff a fase de implementación (build) listo.\n• Pendiente operativo: sandbox IDSE PRO; política de abandono a confirmar con NIRC.',
  '2026-08-18T03:00:00Z'
)
ON CONFLICT (id) DO NOTHING;

UPDATE public.deliverables
SET description = 'Arquitectura certificada (freeze). Dominios, kiosk, IDSE/Cincel/Stripe y flujos operativos documentados; sigue build MVP.'
WHERE id = '92000001-0001-4000-8000-000000000001';
