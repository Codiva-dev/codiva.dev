-- NIRC portal + sprints: corte 24 ago 2026 (cierra semana 1 / B0).
-- Copy de portal: sin secretos, sin economics, sin IDs de infra.

-- ---------------------------------------------------------------------------
-- Proyecto (portada del cliente)
-- ---------------------------------------------------------------------------
UPDATE public.projects
SET
  progress_percent = 58,
  description = E'Personal eventual · Arquitectura entregada. Construcción adelantada (24 ago 2026).\n\nTres superficies en demo guiada: backoffice (staff), kiosk de sitio (cámara QR y geocerca) y bolsa pública. Los empleados del pool no tienen app personal: el staff confirma ofertas; el QR llega por email/SMS y se respalda en Asistencia.\n\nIdentidad visual oficial y sitio público en www. Semana 1 de implementación cerrada.\n\nSiguiente: demo de fundaciones para cerrar el hito de plataforma; DNS del subdominio de la app; sandbox IDSE PRO; certificar firma y pagos fuera de simulación.\n\nDetalle en el canvas de Arquitectura.'
WHERE id = 'b0000001-0001-4000-8000-00000000000b'
   OR slug = 'nirc';

-- ---------------------------------------------------------------------------
-- Timeline (hitos ya venían bien; ajuste de arranque + nota 24 ago)
-- ---------------------------------------------------------------------------
UPDATE public.milestones
SET description = E'Semana 1 cerrada (24 ago). Entorno de trabajo listo; sandboxes Cincel y Stripe; sitio público en www. Pendiente de NIRC/proveedor: plantilla de adhesión, certificados de registro patronal y sandbox IDSE PRO.'
WHERE id = 'f0000001-0001-4000-8000-00000000000f'
  AND project_id = 'b0000001-0001-4000-8000-00000000000b';

INSERT INTO public.milestone_updates (id, milestone_id, body, created_at)
VALUES (
  'f1000001-0001-4000-8000-000000000006',
  'f0000001-0001-4000-8000-00000000000f',
  E'24 ago 2026 — Cierre de semana 1.\n• Entorno cloud listo; sitio público en www y ambiente de pruebas colgados.\n• Producto en demo guiada con marca oficial (panel, tableta y bolsa).\n• Cámara QR, monitor de jornada, línea de tiempo y consola de operaciones ya están en el software (IMSS/firma/pagos en simulación).\n• Pendiente para cerrar hitos: demo de fundaciones, DNS de la aplicación, sandbox IDSE PRO y plantilla de adhesión.',
  '2026-08-24T18:00:00Z'
)
ON CONFLICT (id) DO UPDATE SET
  body = EXCLUDED.body,
  created_at = EXCLUDED.created_at;

-- ---------------------------------------------------------------------------
-- Sprints: B0 cierra hoy; sobrantes humanos pasan a B1
-- ---------------------------------------------------------------------------
UPDATE public.project_sprints SET
  status = 'completed',
  goal = 'Semana 1 cerrada (24 ago). Cloud listo; www y staging en nircgroup.info. Cincel/Stripe sandbox OK. Carry a B1: DNS app./apex, IDSE PRO, plantilla adhesión, vault y políticas NIRC.'
WHERE id = 'c1000001-0001-4000-8000-0000000000b0';

UPDATE public.project_sprints SET
  status = 'active',
  goal = 'Semanas 2-5 (calendario 25 ago–21 sep). Código adelantado: monorepo, auth/RBAC, expediente, CSV, BullMQ, nav BO, shells, kit RGB y landing www. Cierra el hito 25% con demo PRC-B12. Carry de B0: DNS app./apex, IDSE PRO, plantilla adhesión, políticas NIRC.'
WHERE id = 'c1000001-0001-4000-8000-0000000000b1';

UPDATE public.sprint_items SET
  details = 'Hecho 18 ago 2026. Vars Railway 20 ago. 21 ago: dominios nircgroup.info colgados. DNS www+staging OK. Carry a B1: apex y CNAME app.'
WHERE sprint_id = 'c1000001-0001-4000-8000-0000000000b0'
  AND title LIKE 'HUM-B01%';

UPDATE public.sprint_items
SET
  sprint_id = 'c1000001-0001-4000-8000-0000000000b1',
  sort_order = 100 + COALESCE(sort_order, 0)
WHERE sprint_id = 'c1000001-0001-4000-8000-0000000000b0'
  AND status IS DISTINCT FROM 'done';

UPDATE public.sprint_items SET
  details = 'Parcial 21 ago; sigue en B1. www y staging OK. Faltan CNAME app. y A del apex (el nameserver aún sirve el sitio anterior).'
WHERE title LIKE 'HUM · Cutover DNS%'
  AND sprint_id IN (
    'c1000001-0001-4000-8000-0000000000b0',
    'c1000001-0001-4000-8000-0000000000b1'
  );

-- ---------------------------------------------------------------------------
-- Canvas Arquitectura (lo que ve el cliente)
-- ---------------------------------------------------------------------------
UPDATE public.deliverables
SET
  description = 'Arquitectura certificada + estado de construcción (24 ago 2026). Tres superficies; P0–P2 de UI hechos; IMSS/firma/pagos en simulación.',
  body_html = regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          body_html,
          '<h2 id="avance">[\s\S]*?</div>\s*\n\s*<div class="kpi">',
          $avance$<h2 id="avance">Avance de construcción</h2>
  <p class="meta">Informe para NIRC · 24 de agosto de 2026 · Codiva · Incluye plan frontend</p>
  <div class="cover-box">
    <p><strong>En una frase.</strong> La arquitectura está cerrada y el software ya opera en demo guiada con <strong>tres superficies</strong>: backoffice (staff), kiosk de sitio (cámara QR y geocerca) y bolsa pública. Los empleados del pool <strong>no tienen app personal</strong>: el staff confirma ofertas; el código de entrada llega por email/SMS y se respalda en Asistencia. Identidad visual oficial y sitio público en www. IMSS, firma y pagos siguen en simulación hasta sandbox (IDSE PRO pendiente del proveedor).</p>
  </div>
  <h3>Qué ya pueden ver en una demo guiada</h3>
  <table>
    <thead>
      <tr>
        <th>Superficie</th>
        <th>Para quién</th>
        <th>Qué hay hoy</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Backoffice</td>
        <td>RH, reclutamiento, ops, finanzas</td>
        <td>Clientes (RP), vacantes, postulaciones, pool y ranking, expedientes e INE, eventos y geocerca, convocatorias FCFS (aceptación por staff), asistencia (monitor de jornada y QR), cumplimiento y pagos en simulación, privacidad, auditoría y consola de trabajos. Menú agrupado por proceso. Cada perfil ve solo lo de su rol.</td>
      </tr>
      <tr>
        <td>Kiosk (tableta en sitio)</td>
        <td>Admin de sitio</td>
        <td>Check-in con GPS y geocerca, lector de cámara QR, código manual, flujo de firma en la misma pantalla y check-out en tableta.</td>
      </tr>
      <tr>
        <td>Bolsa pública</td>
        <td>Candidatos nuevos</td>
        <td>Vacantes publicadas y postulación, con la misma familia visual. Postular no da de alta en el IMSS ni crea cuenta de empleado.</td>
      </tr>
      <tr>
        <td>App personal</td>
        <td>—</td>
        <td><strong>No aplica en Fase 1.</strong> Pantalla informativa solamente. Ofertas y QR los gestiona el staff / notificaciones.</td>
      </tr>
    </tbody>
  </table>
  <h3>Plan frontend (integrado al build)</h3>
  <table>
    <thead>
      <tr>
        <th>Prioridad</th>
        <th>Entrega visible</th>
        <th>Estado</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>P0</td>
        <td>Monitor de asistencia y cámara QR en kiosk</td>
        <td>Hecho (19–20 ago)</td>
      </tr>
      <tr>
        <td>P1</td>
        <td>Navegación del backoffice por procesos; línea de tiempo de cumplimiento; consola de trabajos</td>
        <td>Hecho (19–20 ago)</td>
      </tr>
      <tr>
        <td>P2</td>
        <td>Misma marca en kiosk, bolsa y sitio público www</td>
        <td>Hecho (21 ago)</td>
      </tr>
      <tr>
        <td>P3</td>
        <td>Alta de pagos Stripe Connect en pantalla (cuando salga de simulación)</td>
        <td>Pendiente · B4</td>
      </tr>
    </tbody>
  </table>
  <h3>Reglas de negocio que el software ya respeta</h3>
  <ul>
    <li>No hay estado <em>Trabajando</em> sin firma de adhesión y alta IMSS aceptada.</li>
    <li>La adhesión se firma en la tableta de sitio (un firmante: el trabajador), no en un teléfono personal de empleado.</li>
    <li>El check-in usa la geocerca del sitio (radio por defecto 150 m). Fuera de radio no hay entrada.</li>
    <li>Al salir se dispara en paralelo la baja IMSS y la dispersión de pago (política de abandono aún por confirmar con ustedes).</li>
    <li>El cupo de una convocatoria no se sobrevende; el primero en aceptar se queda con el lugar (aceptación vía staff en Fase 1).</li>
  </ul>
  <h3>Qué sigue (sin reabrir el diseño)</h3>
  <table>
    <thead>
      <tr>
        <th>Bloque</th>
        <th>Entregable visible</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Cierre de hitos</td>
        <td>Demo de fundaciones con su equipo para cerrar plataforma base; recorrido de bolsa en ambiente de pruebas.</td>
      </tr>
      <tr>
        <td>Proveedores</td>
        <td>Sandbox IDSE PRO (aún del proveedor). Paso de simuladores a cuentas de prueba: Cincel y Stripe ya tienen cuenta.</td>
      </tr>
      <tr>
        <td>Dominio</td>
        <td>Sitio público en www listo. Falta apuntar el subdominio de la aplicación y el dominio raíz, cuando ustedes lo autoricen.</td>
      </tr>
      <tr>
        <td>Documentos NIRC</td>
        <td>Plantilla de adhesión y certificados de registro patronal vigentes.</td>
      </tr>
    </tbody>
  </table>
  <div class="note">
    Este informe no sustituye la arquitectura ya entregada ni es un certificado de integración IMSS/firma/pagos. Es el estado de <strong>construcción</strong> al 24 de agosto de 2026.
  </div>

  <div class="kpi">$avance$,
          'g'
        ),
        '<li><a href="#avance">Avance de construcción[^<]*</a></li>',
        '<li><a href="#avance">Avance de construcción (24 ago 2026)</a></li>',
        'g'
      ),
      'Estado de construcción al 19 ago 2026 \(demo guiada; sin certificar IMSS/firma/pagos\)',
      'Estado de construcción al 24 ago 2026 (demo guiada; sin certificar IMSS/firma/pagos)',
      'g'
    ),
    'nircconsulting\.com',
    'nircgroup.info',
    'g'
  )
WHERE id = '92000001-0001-4000-8000-000000000001'
  AND project_id = 'b0000001-0001-4000-8000-00000000000b';
