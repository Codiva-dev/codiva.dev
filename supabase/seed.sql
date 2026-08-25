-- Codiva Ops: seed mínimo para local (NIRC + Inquilia).
-- Clientes vivos adicionales (p. ej. BYD) se crean por Ops, no por seed.
--
-- Packs: public/client-packs/{slug}/arquitectura-portal.html (cliente)
-- y arquitectura-completa.html (staff). El portal lee deliverables.body_html.
--
-- Ejecutar después de migraciones y de tener al menos un usuario staff en staff_profiles.
-- Supabase SQL Editor: pegar y ejecutar todo el archivo.
-- Local: supabase db reset (si config.toml incluye seed) o psql -f supabase/seed.sql

BEGIN;

INSERT INTO organizations (id, name, contact_email, contact_phone) VALUES
  ('a0000001-0001-4000-8000-00000000000b', 'NIRC', NULL, NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO projects (
  id, organization_id, name, slug, status, description,
  start_date, target_delivery_date, progress_percent, client_visible
) VALUES
  (
    'b0000001-0001-4000-8000-00000000000b',
    'a0000001-0001-4000-8000-00000000000b',
    'NIRC MVP Fase 1',
    'nirc',
    'active',
    E'Personal eventual · Arquitectura entregada. Construcción adelantada (24 ago 2026).\n\nTres superficies en demo guiada: backoffice (staff), kiosk de sitio (cámara QR y geocerca) y bolsa pública. Los empleados del pool no tienen app personal: el staff confirma ofertas; el QR llega por email/SMS y se respalda en Asistencia.\n\nIdentidad visual oficial y sitio público en www. Semana 1 de implementación cerrada.\n\nSiguiente: demo de fundaciones para cerrar el hito de plataforma; DNS del subdominio de la app; sandbox IDSE PRO; certificar firma y pagos fuera de simulación.\n\nDetalle en el canvas de Arquitectura.',
    '2026-08-17', '2026-12-21', 58, true
  )
ON CONFLICT (id) DO NOTHING;

UPDATE projects SET
  portal_show_quote = false,
  portal_show_costs = false,
  status = 'active',
  start_date = '2026-08-17',
  target_delivery_date = '2026-12-21',
  progress_percent = 58,
  name = 'NIRC MVP Fase 1',
  description = E'Personal eventual · Arquitectura entregada. Construcción adelantada (24 ago 2026).\n\nTres superficies en demo guiada: backoffice (staff), kiosk de sitio (cámara QR y geocerca) y bolsa pública. Los empleados del pool no tienen app personal: el staff confirma ofertas; el QR llega por email/SMS y se respalda en Asistencia.\n\nIdentidad visual oficial y sitio público en www. Semana 1 de implementación cerrada.\n\nSiguiente: demo de fundaciones para cerrar el hito de plataforma; DNS del subdominio de la app; sandbox IDSE PRO; certificar firma y pagos fuera de simulación.\n\nDetalle en el canvas de Arquitectura.'
WHERE id = 'b0000001-0001-4000-8000-00000000000b';

INSERT INTO leads (
  id, status, source, name, company, email, phone, need,
  partner_name, partner_company, end_client_name, end_client_company,
  budget, reference_site, converted_project_id
) VALUES
  (
    'c0000001-0001-4000-8000-00000000000b',
    'qualified', 'manual',
    'Equipo NIRC', 'NIRC', '', NULL,
    'MVP Fase 1 workforce eventual con IDSE, Cincel y Stripe Connect. 18 semanas · $980k desarrollo. Unit economics ≈ $571/jornada. Hosting Base ~$10k/mes aparte.',
    NULL, NULL, 'NIRC', 'NIRC',
    980000, NULL, 'b0000001-0001-4000-8000-00000000000b'
  )
ON CONFLICT (id) DO NOTHING;

UPDATE leads SET
  need = E'MVP Fase 1 workforce eventual con IDSE, Cincel y Stripe Connect. 18 semanas · $980k desarrollo. Unit economics ≈ $571/jornada. Hosting Base ~$10k/mes aparte.',
  budget = 980000
WHERE id = 'c0000001-0001-4000-8000-00000000000b';

INSERT INTO quotes (
  id, project_id, version, status, title, service_type, project_state,
  scope, total_amount, currency, valid_until, sent_at
) VALUES
  (
    'd0000001-0001-4000-8000-00000000000b',
    'b0000001-0001-4000-8000-00000000000b',
    1, 'sent', 'NIRC MVP Fase 1 - Completo', 'Platform',
    'Por iniciar - pendiente de aprobación formal',
    E'Paquete completo de desarrollo (18 semanas): backoffice, pool FCFS, carga masiva, QR/geocerca, entrada dura (Cincel + alta IDSE aceptada), Stripe Connect, privacy, UAT y go-live asistido.\n\nSolo software. Proveedores (Cincel/IDSE/Stripe/SMS), hosting híbrido Vercel+Railway+Neon y costo variable por jornada (~$571) van aparte.',
    980000, 'MXN', '2026-09-05', now()
  )
ON CONFLICT (id) DO NOTHING;

UPDATE quotes SET
  title = 'NIRC MVP Fase 1 - Completo',
  scope = E'Paquete completo de desarrollo (18 semanas): backoffice, pool FCFS, carga masiva, QR/geocerca, entrada dura (Cincel + alta IDSE aceptada), Stripe Connect, privacy, UAT y go-live asistido.\n\nSolo software. Proveedores (Cincel/IDSE/Stripe/SMS), hosting híbrido Vercel+Railway+Neon y costo variable por jornada (~$571) van aparte.',
  deliverables = E'• Código fuente y /docs del cliente\n• Backoffice + app personal (PWA)\n• Integraciones IDSE PRO, Cincel, Stripe Connect (adapters + sandbox)\n• Gates: sin labor sin adhesión + alta IMSS aceptada\n• Deploy híbrido documentado (Vercel UI/BFF · Railway workers · Neon Postgres)\n• UAT y capacitación go-live asistido',
  considerations = E'• Montos MXN sin IVA · vigencia 30 días\n• Hitos SPEI 25% en semanas 5 / 9 / 13 / 18\n• Unit economics ref.: ≈ $571 / persona-día; piso cliente ≈ $657\n• Cincel one-shot $60,000 ($9.60/doc) + impl. $3,200 (cliente)\n• Setup proveedores estimado ≈ $88k-$158k (medio ~$120k) → inversión inicial ≈ $1.1M con desarrollo\n• Hosting Base a presupuestar ≈ $8k-$15k/mes (punto $10k); no incluido en $980k\n• Semana 0: sandboxes IDSE/Cincel/Stripe, RP/certificados, brandbook y formatos',
  optional_extras = E'• Alternativa MVP Core: $780,000 (un RP, sin OCR avanzado, SMS→email+push)\n• Alternativa MVP + hypercare 4 sem: $1,120,000\n• Soporte mensual opcional post go-live: $45,000\n• Fuera de Fase 1: EMA/EBA, face-match, WhatsApp masivo, Temporal cloud, app nativa, multi-país, CFDI automático',
  line_items = '[
    {"title":"Hito 1 - Arranque + fundaciones","detail":"Semana 5 · Auth/RBAC, backoffice, expediente, carga masiva, consentimientos","hours":null,"rate":null,"rateLabel":"25%","total":245000},
    {"title":"Hito 2 - Pool + FCFS","detail":"Semana 9 · Scoring, convocatorias, waitlist, no-show/refill en staging","hours":null,"rate":null,"rateLabel":"25%","total":245000},
    {"title":"Hito 3 - Entrada dura","detail":"Semana 13 · QR, geocerca, Cincel, IDSE alta y gate sin Trabajando","hours":null,"rate":null,"rateLabel":"25%","total":245000},
    {"title":"Hito 4 - Salida + UAT / go-live","detail":"Semana 18 · Stripe Connect, bajas, asientos, UAT y producción","hours":null,"rate":null,"rateLabel":"25%","total":245000}
  ]'::jsonb,
  phases = '[
    {"name":"0. Kickoff","weeks":"1","deliverable":"Ambientes, sandboxes IDSE/Cincel/Stripe, catálogo RP, plantilla adhesión"},
    {"name":"1. Fundaciones","weeks":"2-5","deliverable":"Auth/RBAC, backoffice, expediente, carga masiva, consentimientos"},
    {"name":"2. Pool + FCFS","weeks":"6-9","deliverable":"Scoring, convocatorias, offers, waitlist, no-show/refill"},
    {"name":"3. Entrada dura","weeks":"10-13","deliverable":"QR, geocerca, Cincel, IDSE alta, gate"},
    {"name":"4. Salida + dinero","weeks":"14-16","deliverable":"Check-out, baja IDSE, Stripe Connect, asientos"},
    {"name":"5. UAT / go-live","weeks":"17-18","deliverable":"Pruebas E2E, capacitación, go-live asistido"}
  ]'::jsonb,
  valid_until = '2026-09-05',
  total_amount = 980000,
  currency = 'MXN',
  status = 'sent',
  visible_to_client = false
WHERE id = 'd0000001-0001-4000-8000-00000000000b';

DELETE FROM quote_access_tokens
WHERE id = 'e0000001-0001-4000-8000-00000000000b'
   OR token = 'demo-kaucho-eshop-2026';

INSERT INTO milestones (id, project_id, title, description, status, sort_order, due_date, visible_to_client) VALUES
  ('f0000001-0001-4000-8000-00000000000a', 'b0000001-0001-4000-8000-00000000000b', 'Documentación inicial', 'Arquitectura, flujos y alcance del MVP documentados.', 'completed', 1, '2026-08-17', true),
  ('f0000001-0001-4000-8000-00000000000b', 'b0000001-0001-4000-8000-00000000000b', 'Operación en sitio', 'Entrada en tableta kiosk (QR → adhesión → idle) y baja IMSS al check-out. Sandboxes Cincel y Stripe listos.', 'completed', 2, '2026-08-17', true),
  ('f0000001-0001-4000-8000-00000000000c', 'b0000001-0001-4000-8000-00000000000b', 'Principios de arquitectura', 'Reglas de diseño, trazabilidad y responsabilidades entre operación, cumplimiento y pagos.', 'completed', 3, '2026-08-17', true),
  ('f0000001-0001-4000-8000-00000000000d', 'b0000001-0001-4000-8000-00000000000b', 'Módulos e integraciones', 'Diseño de pool y convocatoria, kiosk, Cincel, IDSE, Stripe, contabilidad y privacidad.', 'completed', 4, '2026-08-17', true),
  ('f0000001-0001-4000-8000-00000000000e', 'b0000001-0001-4000-8000-00000000000b', 'Arquitectura certificada', 'Paquete de arquitectura firmado el 17 ago 2026. Listo para implementación.', 'completed', 5, '2026-08-17', true),
  ('f0000001-0001-4000-8000-00000000000f', 'b0000001-0001-4000-8000-00000000000b', 'Arranque de implementación', 'Semana 1 cerrada (24 ago). Entorno de trabajo listo; sandboxes Cincel y Stripe; sitio público en www. Pendiente de NIRC/proveedor: plantilla de adhesión, certificados de registro patronal y sandbox IDSE PRO.', 'completed', 6, '2026-08-24', true),
  ('f0000001-0001-4000-8000-000000000010', 'b0000001-0001-4000-8000-00000000000b', 'Plataforma base', 'Semanas 2-5. Accesos, panel, expediente, carga masiva, consentimientos, navegación por procesos y colas — núcleo ya construido. Identidad visual oficial y sitio público en www (21 ago). Queda demo de fundaciones para cerrar el hito.', 'in_progress', 7, '2026-09-21', true),
  ('f0000001-0001-4000-8000-000000000011', 'b0000001-0001-4000-8000-00000000000b', 'Bolsa y convocatoria', 'Semanas 6-9. Labores, vacantes públicas, convocatoria, ofertas por orden de llegada, lista de espera y reemplazos — ya construido. Queda el recorrido en staging para cerrar el hito.', 'in_progress', 8, '2026-10-19', true),
  ('f0000001-0001-4000-8000-000000000012', 'b0000001-0001-4000-8000-00000000000b', 'Entrada en sitio', 'Semanas 10-13. Tableta kiosk (geocerca + cámara QR), INE, firma e IMSS en simulación; nadie pasa a trabajando sin firma y alta aceptada. Monitor de jornada y línea de tiempo en el panel. Pendiente certificar con proveedores (sandbox IDSE).', 'in_progress', 9, '2026-11-16', true),
  ('f0000001-0001-4000-8000-000000000013', 'b0000001-0001-4000-8000-00000000000b', 'Salida y pago', 'Semanas 14-16. Check-out, baja IMSS y pago en paralelo, asientos y privacidad — en simulación. Consola de trabajos en el panel. Pendiente: cuentas de pago reales y política si no hay jornada válida.', 'in_progress', 10, '2026-12-07', true),
  ('f0000001-0001-4000-8000-000000000014', 'b0000001-0001-4000-8000-00000000000b', 'Pruebas y go-live', 'Semanas 17-18. Recorrido punta a punta, capacitación al equipo NIRC y arranque asistido en producción.', 'pending', 11, '2026-12-21', true)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  sort_order = EXCLUDED.sort_order,
  due_date = EXCLUDED.due_date,
  visible_to_client = EXCLUDED.visible_to_client;

INSERT INTO milestone_updates (id, milestone_id, body, created_at) VALUES
  (
    'f1000001-0001-4000-8000-000000000001',
    'f0000001-0001-4000-8000-00000000000b',
    E'17 ago 2026 — Operación en sitio definida.\n• Firma: adhesión solo del trabajador en tableta (idle → QR → firma → idle); IMSS en paralelo.\n• Baja IMSS al check-out.\n• Sandboxes Cincel y Stripe listos; IDSE pendiente de proveedor.',
    '2026-08-17T18:00:00Z'
  ),
  (
    'f1000001-0001-4000-8000-000000000002',
    'f0000001-0001-4000-8000-00000000000e',
    E'17 ago 2026 — Arquitectura certificada.\n• Decisiones de entrada, salida, pagos y cumplimiento cerradas.\n• Check-out: baja IMSS y pago Stripe en paralelo; SPEI solo como respaldo.\n• Siguiente fase: implementación del MVP.\n• Pendiente operativo: sandbox IDSE PRO; política de abandono a confirmar con NIRC.',
    '2026-08-18T03:00:00Z'
  ),
  (
    'f1000001-0001-4000-8000-000000000003',
    'f0000001-0001-4000-8000-00000000000f',
    E'18 ago 2026 — Arranque de implementación.\n• Arquitectura certificada; el plan de 18 semanas ya está visible en el portal.\n• Semana 1: preparación del entorno, accesos de prueba y plantilla de adhesión.\n• Pendiente de NIRC: acceso de prueba del proveedor IMSS y política de abandono.',
    '2026-08-18T04:00:00Z'
  ),
  (
    'f1000001-0001-4000-8000-000000000004',
    'f0000001-0001-4000-8000-00000000000f',
    E'19 ago 2026 — Avance de construcción.\n• Arquitectura cerrada. Demo guiada: backoffice, kiosk y bolsa pública (sin app de empleado).\n• Falta cámara QR, código en imagen y sandbox IDSE.\n• Este corte no certifica IMSS, firma ni pagos.',
    '2026-08-19T21:00:00Z'
  ),
  (
    'f1000001-0001-4000-8000-000000000006',
    'f0000001-0001-4000-8000-00000000000f',
    E'24 ago 2026 — Cierre de semana 1.\n• Entorno cloud listo; sitio público en www y ambiente de pruebas colgados.\n• Producto en demo guiada con marca oficial (panel, tableta y bolsa).\n• Cámara QR, monitor de jornada, línea de tiempo y consola de operaciones ya están en el software (IMSS/firma/pagos en simulación).\n• Pendiente para cerrar hitos: demo de fundaciones, DNS de la aplicación, sandbox IDSE PRO y plantilla de adhesión.',
    '2026-08-24T18:00:00Z'
  )
ON CONFLICT (id) DO UPDATE SET
  body = EXCLUDED.body,
  created_at = EXCLUDED.created_at;

INSERT INTO deliverables (
  id, project_id, title, description, url, kind, sort_order, visible_to_client
) VALUES
  (
    '92000001-0001-4000-8000-000000000001',
    'b0000001-0001-4000-8000-00000000000b',
    'Arquitectura',
    'Arquitectura certificada + estado de construcción (24 ago 2026) en el mismo canvas. Tres superficies; P0–P2 de UI hechos.',
    '/client-packs/nirc/arquitectura-portal.html',
    'architecture', 1, true
  ),
  (
    '92000001-0001-4000-8000-000000000002',
    'b0000001-0001-4000-8000-00000000000b',
    'Arquitectura completa',
    'Inventario interno: ADRs, economics, hosting y deuda. Solo staff.',
    '/client-packs/nirc/arquitectura-completa.html',
    'architecture', 2, false
  ),
  (
    '92000001-0001-4000-8000-000000000003',
    'b0000001-0001-4000-8000-00000000000b',
    'MVP Fase 1',
    'Alcance, unit economics, hosting, plan 18 semanas e inversión de desarrollo.',
    '/client-packs/nirc/mvp-fase1.html',
    'mvp', 3, false
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  url = EXCLUDED.url,
  kind = EXCLUDED.kind,
  sort_order = EXCLUDED.sort_order,
  visible_to_client = EXCLUDED.visible_to_client;

INSERT INTO documents (
  id, project_id, type, title, file_path, file_url, signed, visible_to_client, source, notes
) VALUES
  (
    '93000001-0001-4000-8000-000000000001',
    'b0000001-0001-4000-8000-00000000000b',
    'nda',
    'NDA mutuo - borrador (generado en portal)',
    'client-packs/nirc/nda-borrador.html',
    '/client-packs/nirc/nda-borrador.html',
    false, false, 'staff',
    ''
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO document_requests (
  id, project_id, code, title, description, instructions,
  expected_type, input_mode, status, required, sort_order, visible_to_client
) VALUES
  (
    '94000001-0001-4000-8000-000000000001',
    'b0000001-0001-4000-8000-00000000000b',
    'nda_signed',
    'NDA firmado',
    'Devolver el NDA mutuo firmado por el representante legal de la organización.',
    'Descarga el borrador aquí, hazlo firmar por el representante legal y súbelo en PDF. Si la carga falla, pega un enlace (Drive, Dropbox, SharePoint) al PDF firmado.',
    'nda', 'file', 'open', true, 10, true
  ),
  (
    '94000001-0001-4000-8000-000000000002',
    'b0000001-0001-4000-8000-00000000000b',
    'brandbook',
    'Brandbook / identidad visual',
    'Logos, colores, tipografías y guía de uso de marca.',
    'PDF, Figma o ZIP con logos (SVG/PNG) y guía de marca si existe.',
    'other', 'file', 'open', true, 20, true
  ),
  (
    '94000001-0001-4000-8000-000000000003',
    'b0000001-0001-4000-8000-00000000000b',
    'process_manuals',
    'Manuales de procesos',
    'Procedimientos operativos relevantes para el producto (altas, nómina, IDSE, etc.).',
    'PDF o Word. Si son varios, un ZIP.',
    'other', 'file', 'open', true, 30, true
  ),
  (
    '94000001-0001-4000-8000-000000000004',
    'b0000001-0001-4000-8000-00000000000b',
    'formats',
    'Formatos y plantillas',
    'Plantillas, formatos y archivos de trabajo que deba reflejar el sistema.',
    'Excel/CSV/PDF de catálogos, adhesión, reportes u otros formatos vigentes. Si el archivo es grande o no carga, pega un enlace (Drive, Dropbox, SharePoint) donde esté alojado.',
    'other', 'file', 'open', true, 40, true
  ),
  (
    '94000001-0001-4000-8000-000000000005',
    'b0000001-0001-4000-8000-00000000000b',
    'hosting_domain_access',
    'Accesos hosting / dominio',
    'Datos para DNS, hosting y publicación (sin pegar contraseñas en claro).',
    'Indica proveedor, dominio, URL del panel y cómo invitarnos (ej. agregar hello@codiva.dev o share de 1Password).',
    'other', 'credentials', 'open', true, 50, true
  ),
  (
    '94000001-0001-4000-8000-000000000006',
    'b0000001-0001-4000-8000-00000000000b',
    'sandbox_access',
    'Accesos sandbox (IDSE / Cincel / Stripe)',
    'Credenciales o invitaciones a ambientes de prueba para integraciones.',
    'Puedes describir el acceso aquí o adjuntar un documento en una solicitud aparte si lo prefieres.',
    'other', 'text', 'open', false, 60, true
  ),
  (
    '94000001-0001-4000-8000-000000000008',
    'b0000001-0001-4000-8000-00000000000b',
    'constancia_situacion_fiscal',
    'Constancia de Situación Fiscal',
    'Constancia vigente emitida por el SAT (RFC, régimen y domicilio fiscal).',
    'PDF descargado del portal del SAT. Debe coincidir con los datos de facturación.',
    'other', 'file', 'open', true, 48, true
  ),
  (
    '94000001-0001-4000-8000-000000000010',
    'b0000001-0001-4000-8000-00000000000b',
    'registro_patronal',
    'Registro patronal y certificados',
    'Registro(s) patronal(es) y certificados IMSS vigentes para altas IDSE.',
    'PDF o ZIP con el número de RP, el patrón y los certificados vigentes. Si hay varios RP, inclúyanlos todos. Si no carga, un enlace (Drive, Dropbox, SharePoint).',
    'other', 'file', 'open', true, 47, true
  ),
  (
    '94000001-0001-4000-8000-000000000009',
    'b0000001-0001-4000-8000-00000000000b',
    'talent_databases',
    'Bases de datos de talento',
    'Exportación vigente del pool de candidatos/empleados que operan hoy (Excel, ATS u otras listas).',
    'Excel o CSV, una fila por persona, con encabezados originales. Si hay varias fuentes, un ZIP o un enlace (Drive, Dropbox, SharePoint).',
    'other', 'file', 'open', true, 42, true
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO project_release_settings (
  project_id,
  enabled,
  github_owner,
  github_repo,
  promote_workflow,
  promote_ref,
  deployment_url_input,
  vercel_project_id,
  vercel_team_id,
  client_can_request,
  require_staff_approval,
  notes,
  updated_at
) VALUES (
  'b0000001-0001-4000-8000-00000000000b',
  true,
  'Codiva-dev',
  'nirc',
  'promote-production.yml',
  'main',
  'deployment_url',
  'prj_GGlesi8OSxDAxabWGHH53coejcRC',
  'team_nI1wrmMTcj7XhYTUDwjy5Ak3',
  false,
  true,
  'GitHub CI → preview Vercel → QA Codiva → promote. Cliente solo lectura.',
  now()
)
ON CONFLICT (project_id) DO UPDATE SET
  enabled = EXCLUDED.enabled,
  github_owner = EXCLUDED.github_owner,
  github_repo = EXCLUDED.github_repo,
  vercel_project_id = EXCLUDED.vercel_project_id,
  vercel_team_id = EXCLUDED.vercel_team_id,
  client_can_request = false,
  notes = EXCLUDED.notes,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- Inquilia (plataforma LegalTech en producción)
-- ---------------------------------------------------------------------------

INSERT INTO organizations (id, name, logo_url, contact_email, contact_phone) VALUES
  ('a0000001-0001-4000-8000-00000000000c', 'Inquilia', '/logos/inquilia.webp', NULL, NULL)
ON CONFLICT (id) DO NOTHING;

UPDATE organizations SET
  name = 'Inquilia',
  logo_url = '/logos/inquilia.webp'
WHERE id = 'a0000001-0001-4000-8000-00000000000c';

INSERT INTO projects (
  id, organization_id, name, slug, status, description,
  start_date, target_delivery_date, progress_percent, client_visible,
  portal_show_quote, portal_show_costs,
  site_production_url
) VALUES
  (
    'b0000001-0001-4000-8000-00000000000c',
    'a0000001-0001-4000-8000-00000000000c',
    'Inquilia Plataforma LegalTech',
    'inquilia',
    'active',
    'LegalTech de arrendamiento en México: dictamen, contratos digitales, CRM multi-departamento, portales de partes, Stripe y Facturama. En producción; evolución continua.',
    '2025-06-11', NULL, 90, true,
    false, false,
    'https://inquilia.com'
  )
ON CONFLICT (id) DO NOTHING;

UPDATE projects SET
  portal_show_quote = false,
  portal_show_costs = false,
  name = 'Inquilia Plataforma LegalTech',
  description = 'LegalTech de arrendamiento en México: dictamen, contratos digitales, CRM multi-departamento, portales de partes, Stripe y Facturama. En producción; evolución continua.',
  status = 'active',
  progress_percent = 90,
  client_visible = true,
  start_date = '2025-06-11',
  site_production_url = 'https://inquilia.com'
WHERE id = 'b0000001-0001-4000-8000-00000000000c';

INSERT INTO leads (
  id, status, source, name, company, email, phone, need,
  partner_name, partner_company, end_client_name, end_client_company,
  budget, reference_site, converted_project_id
) VALUES
  (
    'c0000001-0001-4000-8000-00000000000c',
    'converted', 'manual',
    'Equipo Inquilia', 'Inquilia', '', NULL,
    'Plataforma LegalTech de arrendamiento: expediente (Ekatena, dictamen, CPS, firma, Stripe), CRM, red de asesores, finanzas, RRHH y portales. En producción desde 2025.',
    NULL, NULL, 'Inquilia', 'Inquilia',
    NULL, 'https://inquilia.com', 'b0000001-0001-4000-8000-00000000000c'
  )
ON CONFLICT (id) DO NOTHING;

UPDATE leads SET
  need = E'Plataforma LegalTech de arrendamiento: expediente (Ekatena, dictamen, CPS, firma, Stripe), CRM, red de asesores, finanzas, RRHH y portales. En producción desde 2025.',
  status = 'converted',
  converted_project_id = 'b0000001-0001-4000-8000-00000000000c',
  reference_site = 'https://inquilia.com'
WHERE id = 'c0000001-0001-4000-8000-00000000000c';

UPDATE projects SET lead_id = 'c0000001-0001-4000-8000-00000000000c'
WHERE id = 'b0000001-0001-4000-8000-00000000000c';

INSERT INTO milestones (id, project_id, title, description, status, sort_order, due_date) VALUES
  ('f0000002-0001-4000-8000-000000000001', 'b0000001-0001-4000-8000-00000000000c', 'Marketing, cotizador e intake', 'Sitio público, cotizador, portales landlord/tenant/guarantor.', 'completed', 1, '2025-08-31'),
  ('f0000002-0001-4000-8000-000000000002', 'b0000001-0001-4000-8000-00000000000c', 'CRM y red de asesores', 'Leads, clientes, BDM, calendario, analítica y portal asesores.', 'completed', 2, '2025-11-30'),
  ('f0000002-0001-4000-8000-000000000003', 'b0000001-0001-4000-8000-00000000000c', 'Expediente legal + Ekatena', 'Documentos, screening, riesgo, dictamen y plantillas.', 'completed', 3, '2026-03-31'),
  ('f0000002-0001-4000-8000-000000000004', 'b0000001-0001-4000-8000-00000000000c', 'Contratos, firma y cobro', 'CPS, arrendamiento, pagarés, acompañamiento de firma y Stripe.', 'completed', 4, '2026-05-31'),
  ('f0000002-0001-4000-8000-000000000005', 'b0000001-0001-4000-8000-00000000000c', 'Workspace multi-departamento', 'Finanzas/Facturama, RRHH, checador, TI, contenido, empleos.', 'completed', 5, '2026-07-21'),
  ('f0000002-0001-4000-8000-000000000006', 'b0000001-0001-4000-8000-00000000000c', 'Evolución continua', 'Estabilización del expediente, integraciones y operación.', 'in_progress', 6, NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO deliverables (
  id, project_id, title, description, url, kind, sort_order, visible_to_client
) VALUES
  (
    '92000002-0001-4000-8000-000000000001',
    'b0000001-0001-4000-8000-00000000000c',
    'Arquitectura',
    'Hosts, expediente legal, CRM, portales, integraciones, datos y crons.',
    '/client-packs/inquilia/arquitectura-portal.html',
    'architecture', 1, true
  ),
  (
    '92000002-0001-4000-8000-000000000002',
    'b0000001-0001-4000-8000-00000000000c',
    'Arquitectura completa',
    'Inventario, avalúo de reemplazo, CI/deploy y deuda técnica. Solo staff.',
    '/client-packs/inquilia/arquitectura-completa.html',
    'architecture', 2, false
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO project_site_access (
  id, project_id, label, kind, url, notes, visible_to_client, sort_order
) VALUES
  ('95000002-0001-4000-8000-000000000001', 'b0000001-0001-4000-8000-00000000000c', 'Marketing / www', 'production', 'https://inquilia.com', 'Sitio público, cotizador e intake.', true, 10),
  ('95000002-0001-4000-8000-000000000002', 'b0000001-0001-4000-8000-00000000000c', 'Workspace CRM', 'cms', 'https://workspace.inquilia.com', 'Backoffice interno. No compartir sesión con portal asesores.', true, 20),
  ('95000002-0001-4000-8000-000000000003', 'b0000001-0001-4000-8000-00000000000c', 'Portal asesores', 'other', 'https://asesores.inquilia.com', 'Expediente y lealtad de la red comercial.', true, 30),
  ('95000002-0001-4000-8000-000000000004', 'b0000001-0001-4000-8000-00000000000c', 'Bolsa de empleo', 'other', 'https://career.inquilia.com', 'Vacantes públicas.', true, 40),
  ('95000002-0001-4000-8000-000000000005', 'b0000001-0001-4000-8000-00000000000c', 'Facturación', 'other', 'https://facturacion.inquilia.com', 'Portal de facturación / CSF.', true, 50)
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- Staff (descomenta y ajusta UUID tras crear usuario en Supabase Auth):
-- INSERT INTO staff_profiles (id, full_name, role, active)
-- VALUES ('91cfbf47-3da6-4dd7-b916-9b1460e5e1b7', 'Jean Claude Martell', 'admin', true)
-- ON CONFLICT (id) DO NOTHING;
