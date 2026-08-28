-- NIRC panel: corte de construcción + plan frontend (AGT-B42 / CL-013 / CL-014).
-- Alinea progreso, timeline, sprints y canvas de Arquitectura con el código real.
-- Copy de portal: sin secretos, sin economics, sin IDs de infra.

-- ---------------------------------------------------------------------------
-- Proyecto
-- ---------------------------------------------------------------------------
UPDATE public.projects
SET
  progress_percent = 54,
  description = E'Personal eventual · Arquitectura entregada. Construcción adelantada (19 ago 2026).\n\nTres superficies en demo guiada: backoffice (staff), kiosk de sitio y bolsa pública. Los empleados del pool no tienen app personal (decisión de producto): ofertas las confirma el staff; el QR llega por email/SMS y se respalda en Asistencia.\n\nSiguiente: monitor de asistencia, cámara QR en tableta, timeline de cumplimiento y consola de jobs. IMSS/firma/pagos siguen en simulación hasta sandbox (IDSE PRO pendiente del proveedor).\n\nDetalle en el canvas de Arquitectura.'
WHERE id = 'b0000001-0001-4000-8000-00000000000b'
   OR slug = 'nirc';

-- ---------------------------------------------------------------------------
-- Timeline (hitos cliente)
-- ---------------------------------------------------------------------------
UPDATE public.milestones
SET
  description = E'Semanas 2-5. Accesos y permisos, panel de administración, expediente, carga masiva y consentimientos - núcleo ya construido. Queda demo de fundaciones y pulido de UI (navegación por carriles).',
  status = 'in_progress'
WHERE id = 'f0000001-0001-4000-8000-000000000010'
  AND project_id = 'b0000001-0001-4000-8000-00000000000b';

UPDATE public.milestones
SET
  description = E'Semanas 6-9. Labores, afinidad, vacantes, convocatoria, ofertas por orden de llegada, lista de espera y reemplazos. Motor y pantallas base ya existen; falta certificar en staging y cerrar el hito.',
  status = 'in_progress'
WHERE id = 'f0000001-0001-4000-8000-000000000011'
  AND project_id = 'b0000001-0001-4000-8000-00000000000b';

UPDATE public.milestones
SET
  description = E'Semanas 10-13. Tableta kiosk, QR (email/SMS + respaldo en Asistencia; sin app de empleado), geocerca, INE, firma de adhesión y alta IMSS. Nadie pasa a trabajando sin alta aceptada. Incluye monitor de jornada y cámara QR.'
WHERE id = 'f0000001-0001-4000-8000-000000000012'
  AND project_id = 'b0000001-0001-4000-8000-00000000000b';

UPDATE public.milestones
SET
  description = E'Semanas 14-16. Check-out, baja IMSS, dispersión de pago y registro contable. Pantallas de finanzas y privacy ya en backoffice (simulación); falta certificar vendors y consola de jobs/ops.'
WHERE id = 'f0000001-0001-4000-8000-000000000013'
  AND project_id = 'b0000001-0001-4000-8000-00000000000b';

INSERT INTO public.milestone_updates (id, milestone_id, body, created_at)
VALUES (
  'f1000001-0001-4000-8000-000000000005',
  'f0000001-0001-4000-8000-000000000010',
  E'19 ago 2026 - Corte frontend + construcción.\n• Fundaciones (auth, expediente, colas) y gran parte de bolsa/convocatoria ya en software.\n• Empleados sin cuenta: staff confirma ofertas; QR por email/SMS.\n• Plan UI: monitor de asistencia, nav por carriles, timeline de cumplimiento, consola ops, cámara en kiosk.\n• No certifica IMSS, firma ni pagos.',
  '2026-08-19T23:30:00Z'
)
ON CONFLICT (id) DO UPDATE SET
  body = EXCLUDED.body,
  created_at = EXCLUDED.created_at;

-- ---------------------------------------------------------------------------
-- Sprints (estado vs calendario; build adelantado)
-- ---------------------------------------------------------------------------
UPDATE public.project_sprints SET
  status = 'active',
  goal = 'Semana 1. Cloud listo (Vercel/Neon/Redis/R2/Railway). Cincel/Stripe sandbox OK. Pendiente: IDSE PRO, plantilla adhesión, vault y políticas NIRC.'
WHERE id = 'c1000001-0001-4000-8000-0000000000b0';

UPDATE public.project_sprints SET
  status = 'active',
  goal = 'Semanas 2-5 adelantadas en código: monorepo, auth/RBAC, expediente, CSV, BullMQ. Cierra con demo fundaciones + nav BO por carriles (spec frontend).'
WHERE id = 'c1000001-0001-4000-8000-0000000000b1';

UPDATE public.project_sprints SET
  status = 'active',
  goal = 'Semanas 6-9 en curso (adelanto): scoring, vacantes/bolsa, convocatorias FCFS. Cierra con staging pool+FCFS + shells bolsa/kiosk alineados a marca.'
WHERE id = 'c1000001-0001-4000-8000-0000000000b2';

UPDATE public.project_sprints SET
  status = 'planned',
  goal = 'Semanas 10-13. QR, kiosk (cámara), Cincel, alta IDSE, gate Trabajando. UI: monitor Asistencia + timeline Cumplimiento.'
WHERE id = 'c1000001-0001-4000-8000-0000000000b3';

UPDATE public.project_sprints SET
  status = 'planned',
  goal = 'Semanas 14-16. Check-out, baja IDSE, Stripe, asientos, disposal. UI: módulo Ops (outbox/jobs) + Connect cuando deje mock.'
WHERE id = 'c1000001-0001-4000-8000-0000000000b4';

-- ---------------------------------------------------------------------------
-- Sprint items - marcar hecho lo que ya está en código
-- ---------------------------------------------------------------------------
UPDATE public.sprint_items SET
  status = 'done',
  details = 'Hecho 18 ago 2026. Vercel + Neon + Upstash + Sentry + R2 + Railway (workers). Falta pegar vars a Railway vault si aún no.'
WHERE id = '0e1c1a18-4efa-426c-8fd0-2fdc1e4a6300';

UPDATE public.sprint_items SET
  status = 'in_progress',
  details = 'Cincel y Stripe sandbox OK. Falta sandbox IDSE PRO (credenciales + 1 alta de prueba). No bloquea UI; sí certificar adapter.'
WHERE id = '720dd99a-1cbf-423e-844f-56b6909bc40a';

UPDATE public.sprint_items SET status = 'done', details = 'Hecho 18 ago 2026. Monorepo pnpm apps/web|workers + packages.'
WHERE id = '6f9bd546-16af-4b92-a290-ede0f37d1fba';

UPDATE public.sprint_items SET status = 'done', details = 'Hecho 18-19 ago 2026. DDL núcleo en packages/db.'
WHERE id = 'eeff6197-b1cb-4ee9-9a3c-1ea49e570bad';

UPDATE public.sprint_items SET status = 'done', details = 'Hecho 19 ago 2026. Auth.js + guards bo/ks/pb + matriz RBAC.'
WHERE id = '7aeb96cc-74ac-4950-a081-c8c2eb99ecc8';

UPDATE public.sprint_items SET status = 'done', details = 'Hecho 19 ago 2026. CRUD empleados, consentimientos, privacy ARCO.'
WHERE id = 'da8c29e0-1e55-407c-a2ee-71ef2bd8d42f';

UPDATE public.sprint_items SET status = 'done', details = 'Hecho 19 ago 2026. Import CSV + packages/storage (R2).'
WHERE id = '46c32080-b80c-45ef-b1b5-adc86126ae6a';

UPDATE public.sprint_items SET status = 'done', details = 'Hecho 19 ago 2026. Workers BullMQ + outbox; HTTP vendor = mock.'
WHERE id = 'e6721b45-b89f-42d8-a95c-e61f6646821d';

UPDATE public.sprint_items SET
  status = 'todo',
  details = 'Demo guiada de fundaciones con cliente. Código listo; agenda pendiente.'
WHERE id = '74d01047-8d86-44e8-8c31-fc45db81c83b';

UPDATE public.sprint_items SET
  status = 'done',
  details = 'Hecho en código 19 ago 2026. Labores + scoring + ranking en BO.'
WHERE id = '32040411-58e1-4137-9e9a-b222fe468f26';

UPDATE public.sprint_items SET
  status = 'in_progress',
  details = 'Monitor y aceptación staff FCFS en BO (empleados sin cuenta, CL-013). Lock Redis: revisar certificación staging.'
WHERE id = 'c2fa426b-561f-48c1-959b-4720e1130e2a';

UPDATE public.sprint_items SET
  status = 'in_progress',
  details = 'Lógica refill/no-show en dominio; falta recorrido staging hito.'
WHERE id = '366a9b1d-4678-44a9-b1fa-4a115d1131d5';

UPDATE public.sprint_items SET
  status = 'in_progress',
  details = 'QR firmado + listado en Asistencia + entrega notif (CL-014). Cámara kiosk y monitor de jornada = siguiente.'
WHERE id = 'fa4de5e6-91c6-4b0b-8884-70148fea79bf';

UPDATE public.sprint_items SET
  status = 'in_progress',
  details = 'Kiosk con GPS/geocerca y código manual. Pendiente: lector cámara + PWA lock.'
WHERE id = 'db5b4f86-630c-47b8-b4d7-880158976965';

UPDATE public.sprint_items SET
  status = 'in_progress',
  details = 'Carga INE / cola validaciones en BO. OCR básico parcial.'
WHERE id = '73b0a9ac-01cd-4e27-bc2a-cd558973e175';

UPDATE public.sprint_items SET
  status = 'in_progress',
  details = 'UI cumplimiento + workers mock. Adapter real = tras sandbox.'
WHERE id = '38388546-e204-4d0f-be64-aa0087dcf3f2';

UPDATE public.sprint_items SET
  status = 'in_progress',
  details = 'UI + workers mock. Certificar con HUM-B27 cuando haya sandbox IDSE.'
WHERE id = 'e8fe9b30-bde2-44e5-8574-47d5a9d6215b';

UPDATE public.sprint_items SET
  status = 'in_progress',
  details = 'Regla en dominio (firma ∧ alta). Falta certificación punta a punta con vendors reales.'
WHERE id = 'fc5f52e2-5e4d-4dbe-93dd-2be24456811c';

UPDATE public.sprint_items SET
  status = 'in_progress',
  details = 'API kiosk checkout + colas mock. Certificar con vendor.'
WHERE id = 'ca5183b3-fb2e-410e-be55-8c6ee07bdeed';

UPDATE public.sprint_items SET
  status = 'in_progress',
  details = 'Pantalla finanzas + payouts mock. Connect onboarding UI = P3.'
WHERE id = '9e2d6cfa-54c5-4dfe-af65-e06efcc5f8cd';

UPDATE public.sprint_items SET
  status = 'in_progress',
  details = 'Ledger + export CSV en BO; inmutabilidad en dominio.'
WHERE id = '59b57d53-7bc8-421c-aebf-b98ff80651fc';

UPDATE public.sprint_items SET
  status = 'in_progress',
  details = 'Privacy ARCO + cola disposal en BO; job en workers.'
WHERE id = '5d68abed-ac00-4e22-aeb9-f34ff95e079b';

-- ---------------------------------------------------------------------------
-- Sprint items - frontend (spec arquitectura-frontend / AGT-B42)
-- ---------------------------------------------------------------------------
INSERT INTO public.sprint_items (id, sprint_id, title, details, status, sort_order)
VALUES
  (
    'c2000001-0001-4000-8000-0000000000f1',
    'c1000001-0001-4000-8000-0000000000b1',
    'AGT-B42 Spec arquitectura frontend',
    'Hecho 19 ago 2026. Cuatro superficies (BO/KS/PB/AP stub), carriles BO, patrones UI, backlog P0-P3. Docs: arquitectura-frontend.md + superficies-frontend.md.',
    'done',
    65
  ),
  (
    'c2000001-0001-4000-8000-0000000000f2',
    'c1000001-0001-4000-8000-0000000000b1',
    'FE · Nav BO por carriles',
    'P1. Agrupar nav: Captación → Inventario → Operación → Cumplimiento → Dinero → Gobierno. Sin cambiar matriz RBAC.',
    'todo',
    80
  ),
  (
    'c2000001-0001-4000-8000-0000000000f3',
    'c1000001-0001-4000-8000-0000000000b1',
    'FE · Design system shells',
    'Extraer BoShell / patrones dashboard (hero, KPI, attention rail) a packages/ui; documentar KioskShell y BolsaShell.',
    'in_progress',
    85
  ),
  (
    'c2000001-0001-4000-8000-0000000000f4',
    'c1000001-0001-4000-8000-0000000000b2',
    'FE · Bolsa PB tokens + shell',
    'P2. Misma marca/UI kit que BO; layout marketing-lite. Postulación y cuenta candidato.',
    'todo',
    50
  ),
  (
    'c2000001-0001-4000-8000-0000000000f5',
    'c1000001-0001-4000-8000-0000000000b2',
    'CLT · CL-013/014 empleados sin cuenta + QR',
    'Cerrado en producto: sin app empleado; FCFS en BO; QR email/SMS + Asistencia. `/me` = stub.',
    'done',
    5
  ),
  (
    'c2000001-0001-4000-8000-0000000000f6',
    'c1000001-0001-4000-8000-0000000000b3',
    'FE · Asistencia monitor (P0)',
    'Monitor de jornada: filas attendance, checkout staff, reenvío notif.qr_deliver, además del listado QR actual.',
    'todo',
    5
  ),
  (
    'c2000001-0001-4000-8000-0000000000f7',
    'c1000001-0001-4000-8000-0000000000b3',
    'FE · Cámara QR en kiosk',
    'Lector cámara en tableta (KS). BO no absorbe GPS/cámara. Check-out en kiosk.',
    'todo',
    15
  ),
  (
    'c2000001-0001-4000-8000-0000000000f8',
    'c1000001-0001-4000-8000-0000000000b3',
    'FE · Cumplimiento timeline (P1)',
    'Timeline por assignment_id: check-in → firma → IMSS → Trabajando. Estado de jobs vendor visible en BO.',
    'todo',
    65
  ),
  (
    'c2000001-0001-4000-8000-0000000000f9',
    'c1000001-0001-4000-8000-0000000000b4',
    'FE · Módulo Ops outbox/jobs (P1)',
    'Consola Gobierno: outbox_events + últimos jobs fallidos. Sin depender del panel Railway.',
    'todo',
    50
  ),
  (
    'c2000001-0001-4000-8000-0000000000fa',
    'c1000001-0001-4000-8000-0000000000b4',
    'FE · Stripe Connect onboarding UI (P3)',
    'Cuando payout deje mock: onboarding Connect en Finanzas.',
    'todo',
    55
  )
ON CONFLICT (id) DO UPDATE SET
  sprint_id = EXCLUDED.sprint_id,
  title = EXCLUDED.title,
  details = EXCLUDED.details,
  status = EXCLUDED.status,
  sort_order = EXCLUDED.sort_order;

-- ---------------------------------------------------------------------------
-- Entregable Arquitectura - sección avance + índice
-- ---------------------------------------------------------------------------
UPDATE public.deliverables
SET
  description = 'Arquitectura certificada + estado de construcción y plan frontend (19 ago 2026). Tres superficies operativas; empleados sin app personal.',
  body_html = regexp_replace(
    regexp_replace(
      regexp_replace(
        body_html,
        '<h2 id="avance">[\s\S]*?</div>\s*\n\s*<div class="kpi">',
        $avance$<h2 id="avance">Avance de construcción</h2>
  <p class="meta">Informe para NIRC · 19 de agosto de 2026 · Codiva · Incluye plan frontend</p>
  <div class="cover-box">
    <p><strong>En una frase.</strong> La arquitectura está cerrada y el software ya opera en demo guiada con <strong>tres superficies</strong>: backoffice (staff), kiosk de sitio y bolsa pública. Los empleados del pool <strong>no tienen app personal</strong>: el staff confirma ofertas; el código de entrada llega por email/SMS y se respalda en Asistencia. Siguiente foco de UI: monitor de jornada, cámara QR en tableta, timeline de cumplimiento y consola de jobs. IMSS, firma y pagos siguen en simulación hasta sandbox (IDSE PRO pendiente del proveedor).</p>
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
        <td>Clientes (RP), vacantes, postulaciones, pool y ranking, expedientes e INE, eventos y geocerca, convocatorias FCFS (aceptación por staff), asistencia (QR emitidos), cumplimiento y pagos en simulación, privacy y auditoría. Cada perfil ve solo lo de su rol.</td>
      </tr>
      <tr>
        <td>Kiosk (tableta en sitio)</td>
        <td>Admin de sitio</td>
        <td>Check-in con GPS de la tableta, código manual y flujo hacia la firma en la misma pantalla. El lector de cámara es el siguiente bloque de UI.</td>
      </tr>
      <tr>
        <td>Bolsa pública</td>
        <td>Candidatos nuevos</td>
        <td>Vacantes publicadas y postulación. Postular no da de alta en el IMSS ni crea cuenta de empleado.</td>
      </tr>
      <tr>
        <td>App personal</td>
        <td>-</td>
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
        <th>Sprint</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>P0</td>
        <td>Monitor de asistencia (jornada + checkout staff + reenvío de QR) y cámara en kiosk</td>
        <td>B3 · Entrada</td>
      </tr>
      <tr>
        <td>P1</td>
        <td>Navegación del backoffice por carriles (Captación → Gobierno); timeline de cumplimiento por persona; consola de jobs</td>
        <td>B1-B4</td>
      </tr>
      <tr>
        <td>P2</td>
        <td>Misma marca visual en kiosk y bolsa (familia de producto)</td>
        <td>B2</td>
      </tr>
      <tr>
        <td>P3</td>
        <td>Alta de pagos Stripe Connect en pantalla (cuando salga de simulación)</td>
        <td>B4</td>
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
        <td>Mesa de entrada</td>
        <td>La tableta lee el QR con cámara; el personal recibe el código por email/SMS; check-out en kiosk; monitor de jornada en backoffice.</td>
      </tr>
      <tr>
        <td>Experiencia staff</td>
        <td>Menú del backoffice agrupado por proceso; timeline de cumplimiento; consola de trabajos en cola.</td>
      </tr>
      <tr>
        <td>Proveedores</td>
        <td>Paso de simuladores a sandbox: Cincel y Stripe ya tienen cuenta; IDSE PRO sigue pendiente del proveedor.</td>
      </tr>
      <tr>
        <td>Dominio</td>
        <td>Corte DNS de nircconsulting.com hacia el hosting acordado (Vercel), cuando ustedes lo autoricen.</td>
      </tr>
    </tbody>
  </table>
  <div class="note">
    Este informe no sustituye la arquitectura ya entregada ni es un certificado de integración IMSS/firma/pagos. Es el estado de <strong>construcción</strong> y el <strong>plan de interfaz</strong> al 19 de agosto de 2026.
  </div>

  <div class="kpi">$avance$,
        'g'
      ),
      '<li><a href="#avance">Avance de construcción[^<]*</a></li>',
      '<li><a href="#avance">Avance de construcción + plan frontend (19 ago 2026)</a></li>',
      'g'
    ),
    'Estado de construcción al 19 ago 2026 \(demo guiada; sin certificar IMSS/firma/pagos\)',
    'Estado de construcción + plan frontend al 19 ago 2026 (demo guiada; sin certificar IMSS/firma/pagos)',
    'g'
  )
WHERE id = '92000001-0001-4000-8000-000000000001'
  AND project_id = 'b0000001-0001-4000-8000-00000000000b';
