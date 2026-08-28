-- NIRC portal: barra de avance alineada al informe de construcción (19 ago 2026).
-- No certifica IMSS / firma / pagos. Software en demo guiada.

UPDATE public.projects
SET
  progress_percent = 48,
  description = E'Personal eventual · Arquitectura entregada. Construcción en curso (19 ago 2026).\n\nSoftware en demo guiada: backoffice, kiosk de sitio, app de la persona y bolsa pública.\n\nFalta pulir la mesa de entrada (cámara QR, código en imagen) y pasar IMSS, firma y pagos de simulación a sandbox. IDSE PRO sigue pendiente del proveedor.\n\nEl estado de construcción está en el canvas de Arquitectura.'
WHERE id = 'b0000001-0001-4000-8000-00000000000b'
   OR slug = 'nirc';

UPDATE public.milestones
SET status = 'completed'
WHERE id = 'f0000001-0001-4000-8000-00000000000f'
  AND project_id = 'b0000001-0001-4000-8000-00000000000b';

UPDATE public.milestones
SET status = 'in_progress'
WHERE id = 'f0000001-0001-4000-8000-000000000010'
  AND project_id = 'b0000001-0001-4000-8000-00000000000b';

INSERT INTO public.milestone_updates (id, milestone_id, body, created_at)
VALUES (
  'f1000001-0001-4000-8000-000000000004',
  'f0000001-0001-4000-8000-00000000000f',
  E'19 ago 2026 - Avance de construcción.\n• Arquitectura cerrada. Cuatro aplicaciones en demo guiada: backoffice, kiosk, app personal y bolsa pública.\n• Falta cámara QR, código en imagen y sandbox IDSE.\n• Este corte no certifica IMSS, firma ni pagos.',
  '2026-08-19T21:00:00Z'
)
ON CONFLICT (id) DO UPDATE SET
  body = EXCLUDED.body,
  created_at = EXCLUDED.created_at;
