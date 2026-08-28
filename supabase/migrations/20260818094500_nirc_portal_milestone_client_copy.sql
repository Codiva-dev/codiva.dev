-- NIRC portal: client-facing milestone titles/descriptions (no Track A / freeze jargon).

UPDATE public.milestones m
SET
  title = v.title,
  description = v.description
FROM (VALUES
  (
    'f0000001-0001-4000-8000-00000000000a',
    'Documentación inicial',
    'Arquitectura, flujos y alcance del MVP documentados.'
  ),
  (
    'f0000001-0001-4000-8000-00000000000b',
    'Operación en sitio',
    'Entrada en tableta kiosk (QR → adhesión → idle) y baja IMSS al check-out. Sandboxes Cincel y Stripe listos.'
  ),
  (
    'f0000001-0001-4000-8000-00000000000c',
    'Principios de arquitectura',
    'Reglas de diseño, trazabilidad y responsabilidades entre operación, cumplimiento y pagos.'
  ),
  (
    'f0000001-0001-4000-8000-00000000000d',
    'Módulos e integraciones',
    'Diseño de pool y convocatoria, kiosk, Cincel, IDSE, Stripe, contabilidad y privacidad.'
  ),
  (
    'f0000001-0001-4000-8000-00000000000e',
    'Arquitectura certificada',
    'Paquete de arquitectura firmado el 17 ago 2026. Listo para implementación.'
  ),
  (
    'f0000001-0001-4000-8000-00000000000f',
    'Implementación, pruebas y go-live',
    'Desarrollo del MVP (~18 semanas), pruebas con NIRC y puesta en producción.'
  )
) AS v(id, title, description)
WHERE m.id = v.id::uuid;

UPDATE public.milestone_updates
SET body = E'17 ago 2026 - Operación en sitio definida.\n• Firma: adhesión solo del trabajador en tableta (idle → QR → firma → idle); IMSS en paralelo.\n• Baja IMSS al check-out.\n• Sandboxes Cincel y Stripe listos; IDSE pendiente de proveedor.'
WHERE id = 'f1000001-0001-4000-8000-000000000001';

UPDATE public.milestone_updates
SET body = E'17 ago 2026 - Arquitectura certificada.\n• Decisiones de entrada, salida, pagos y cumplimiento cerradas.\n• Check-out: baja IMSS y pago Stripe en paralelo; SPEI solo como respaldo.\n• Siguiente fase: implementación del MVP.\n• Pendiente operativo: sandbox IDSE PRO; política de abandono a confirmar con NIRC.'
WHERE id = 'f1000001-0001-4000-8000-000000000002';
