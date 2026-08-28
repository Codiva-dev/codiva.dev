-- NIRC portal: client-facing project status + milestone copy (plain language).

UPDATE public.projects
SET description = E'Personal eventual · Arquitectura certificada el 17 ago 2026.

Estamos en la implementación del producto. El plan completo (~18 semanas) está en el timeline.

En operación:
• Entrada en sitio con tableta, firma de adhesión y alta ante el IMSS antes de empezar a trabajar.
• Salida al terminar la jornada, con baja ante el IMSS y pago al personal.

Pendiente de NIRC: accesos de prueba con los proveedores de firma electrónica, IMSS y pagos, más las políticas comerciales.'
WHERE id = 'b0000001-0001-4000-8000-00000000000b'
   OR slug = 'nirc';

UPDATE public.milestones m
SET
  title = v.title,
  description = v.description
FROM (VALUES
  (
    'f0000001-0001-4000-8000-00000000000e',
    'Arquitectura certificada',
    'Paquete de arquitectura firmado el 17 ago 2026. Listo para implementación.'
  ),
  (
    'f0000001-0001-4000-8000-00000000000f',
    'Arranque de implementación',
    'Semana 1. Preparación del entorno de trabajo, accesos de prueba con proveedores, catálogo de registro patronal y plantilla de adhesión.'
  ),
  (
    'f0000001-0001-4000-8000-000000000010',
    'Plataforma base',
    'Semanas 2-5. Accesos y permisos, panel de administración, expediente del personal, carga masiva y consentimientos.'
  ),
  (
    'f0000001-0001-4000-8000-000000000011',
    'Bolsa y convocatoria',
    'Semanas 6-9. Labores, afinidad, vacantes, convocatoria automática, ofertas por orden de llegada, lista de espera y reemplazos.'
  ),
  (
    'f0000001-0001-4000-8000-000000000012',
    'Entrada en sitio',
    'Semanas 10-13. Tableta en sitio, código QR, ubicación, identificación, firma de adhesión y alta ante el IMSS. Nadie empieza a trabajar sin alta aceptada.'
  ),
  (
    'f0000001-0001-4000-8000-000000000013',
    'Salida y pago',
    'Semanas 14-16. Salida de jornada, baja ante el IMSS, pago al personal y registro contable sencillo.'
  ),
  (
    'f0000001-0001-4000-8000-000000000014',
    'Pruebas y go-live',
    'Semanas 17-18. Recorrido punta a punta, capacitación al equipo NIRC y arranque asistido en producción.'
  )
) AS v(id, title, description)
WHERE m.id = v.id::uuid;

UPDATE public.milestone_updates
SET body = E'18 ago 2026 - Arranque de implementación.
• Arquitectura certificada; el plan de 18 semanas ya está visible en el portal.
• Semana 1: preparación del entorno, accesos de prueba y plantilla de adhesión.
• Pendiente de NIRC: acceso de prueba del proveedor IMSS y política de abandono.'
WHERE id = 'f1000001-0001-4000-8000-000000000003';
