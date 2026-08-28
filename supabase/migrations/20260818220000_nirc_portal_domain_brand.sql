-- NIRC portal: domain to Vercel + brand; pre-build readiness (client-facing).

UPDATE public.projects
SET
  progress_percent = 32,
  description = E'Workforce eventual · Arquitectura certificada (freeze 17 ago 2026).\n\nInfra lista para implementación: Vercel + base de datos + colas + almacenamiento. Dominio nircconsulting.com se migrará de IONOS a Vercel (www marketing · app plataforma · staging).\n\nEntrada: kiosk → adhesión (solo trabajador) → idle; alta IMSS en paralelo.\nSalida: check-out → baja IMSS y pago Stripe en paralelo.\n\nPendiente: sandboxes Cincel/Stripe en variables de workers; IDSE PRO; políticas comerciales NIRC.'
WHERE id = 'b0000001-0001-4000-8000-00000000000b'
   OR slug = 'nirc';

INSERT INTO public.milestone_updates (id, milestone_id, body, created_at)
VALUES (
  'f1000001-0001-4000-8000-000000000003',
  'f0000001-0001-4000-8000-00000000000f',
  E'18 ago 2026 - Preparación de implementación.\n• Infraestructura cloud conectada (web, base de datos, colas, archivos, monitoreo).\n• Dominio nircconsulting.com: salida de IONOS → hospedaje en Vercel (sitio + plataforma).\n• Identidad visual documentada a partir del sitio actual (azul corporativo).\n• Siguiente: desarrollo del producto; credenciales Cincel/Stripe/IDSE en workers.',
  '2026-08-18T21:30:00Z'
)
ON CONFLICT (id) DO UPDATE SET
  body = EXCLUDED.body,
  created_at = EXCLUDED.created_at;

UPDATE public.deliverables
SET description = 'Arquitectura certificada + infra cloud + plan de dominio en Vercel y marca. Sigue build MVP.'
WHERE id = '92000001-0001-4000-8000-000000000001';
