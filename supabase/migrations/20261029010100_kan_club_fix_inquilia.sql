-- Fix: kan_club_bootstrap reused Inquilia seed UUIDs (...000c).
-- 1) Restore Inquilia org/project/lead
-- 2) Remove Kan Club rows that landed on Inquilia project
-- 3) Create Kan Club under fresh UUIDs (...000d)

-- Restore Inquilia
UPDATE organizations SET
  name = 'Inquilia',
  logo_url = '/logos/inquilia.webp',
  contact_email = NULL,
  contact_phone = NULL
WHERE id = 'a0000001-0001-4000-8000-00000000000c';

UPDATE projects SET
  name = 'Inquilia Plataforma LegalTech',
  slug = 'inquilia',
  status = 'active',
  description = 'LegalTech de arrendamiento en México: dictamen, contratos digitales, CRM multi-departamento, portales de partes, Stripe y Facturama. En producción; evolución continua.',
  start_date = '2025-06-11',
  progress_percent = 90,
  client_visible = true,
  portal_show_quote = false,
  portal_show_costs = false,
  site_production_url = 'https://inquilia.com',
  lead_id = 'c0000001-0001-4000-8000-00000000000c'
WHERE id = 'b0000001-0001-4000-8000-00000000000c';

UPDATE leads SET
  name = 'Equipo Inquilia',
  company = 'Inquilia',
  email = '',
  need = 'Plataforma LegalTech de arrendamiento: expediente (Ekatena, dictamen, CPS, firma, Stripe), CRM, red de asesores, finanzas, RRHH y portales. En producción desde 2025.',
  status = 'converted',
  end_client_name = 'Inquilia',
  end_client_company = 'Inquilia',
  reference_site = 'https://inquilia.com',
  converted_project_id = 'b0000001-0001-4000-8000-00000000000c'
WHERE id = 'c0000001-0001-4000-8000-00000000000c';

-- Remove Kan Club artifacts wrongly attached to Inquilia
DELETE FROM document_requests
WHERE id IN (
  '94000001-0001-4000-8000-0000000000c1',
  '94000001-0001-4000-8000-0000000000c2',
  '94000001-0001-4000-8000-0000000000c3',
  '94000001-0001-4000-8000-0000000000c4',
  '94000001-0001-4000-8000-0000000000c5',
  '94000001-0001-4000-8000-0000000000c6'
);

DELETE FROM milestones
WHERE id IN (
  'f0000001-0001-4000-8000-0000000000c1',
  'f0000001-0001-4000-8000-0000000000c2',
  'f0000001-0001-4000-8000-0000000000c3',
  'f0000001-0001-4000-8000-0000000000c4'
);

DELETE FROM deliverables
WHERE id IN (
  '92000001-0001-4000-8000-0000000000c1',
  '92000001-0001-4000-8000-0000000000c2'
);

-- Kan Club fresh IDs (...000d)
INSERT INTO organizations (id, name, contact_email, contact_phone) VALUES
  (
    'a0000001-0001-4000-8000-00000000000d',
    'Kan Club',
    'luis.vacavelez@gmail.com',
    NULL
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  contact_email = EXCLUDED.contact_email;

INSERT INTO projects (
  id, organization_id, name, slug, status, description,
  start_date, progress_percent, client_visible,
  portal_show_quote, portal_show_costs
) VALUES
  (
    'b0000001-0001-4000-8000-00000000000d',
    'a0000001-0001-4000-8000-00000000000d',
    'Kan Club MVP',
    'kan-club',
    'active',
    E'ERP / CRM / POS / E-commerce Pickup para grooming + retail (1 sucursal).\n\nArquitectura certificada 28 oct 2026. Superficies: tablet PWA (POS + grooming + waiver), web Pickup + estimador + portal Mi Mascota, admin.\n\nIntegraciones: Mercado Pago Point Smart, WhatsApp outbound. Stack: Next.js en Vercel · Neon · Upstash · Blob.\n\nSiguiente: checklist humano (MP, WhatsApp, Carta Responsiva, seed SKUs, wireframes tablet) y arranque de build.',
    '2026-10-28',
    8,
    true,
    false,
    false
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  status = EXCLUDED.status,
  description = EXCLUDED.description,
  client_visible = true,
  progress_percent = EXCLUDED.progress_percent,
  portal_show_quote = false,
  portal_show_costs = false;

INSERT INTO leads (
  id, status, source, name, company, email, phone, need,
  partner_name, partner_company, end_client_name, end_client_company,
  budget, reference_site, converted_project_id
) VALUES
  (
    'c0000001-0001-4000-8000-00000000000d',
    'converted',
    'manual',
    'Luis Vaca',
    'Kan Club',
    'luis.vacavelez@gmail.com',
    NULL,
    E'Plataforma integrada grooming salon + retail + e-commerce Pickup. Arquitectura frozen 28 oct 2026. POS tablet offline-first, Point Smart, WhatsApp outbound, lealtad 6 visitas.',
    NULL,
    NULL,
    'Luis Vaca',
    'Kan Club',
    NULL,
    NULL,
    'b0000001-0001-4000-8000-00000000000d'
  )
ON CONFLICT (id) DO UPDATE SET
  status = 'converted',
  email = EXCLUDED.email,
  need = EXCLUDED.need,
  converted_project_id = EXCLUDED.converted_project_id;

UPDATE projects
SET lead_id = 'c0000001-0001-4000-8000-00000000000d'
WHERE id = 'b0000001-0001-4000-8000-00000000000d';

INSERT INTO milestones (
  id, project_id, title, description, status, sort_order, due_date, visible_to_client
) VALUES
  (
    'f0000001-0001-4000-8000-0000000000d1',
    'b0000001-0001-4000-8000-00000000000d',
    'Documentación inicial',
    'Brief de negocio, clarification log CL-001…027 y alcance MVP documentados.',
    'completed', 1, '2026-10-28', true
  ),
  (
    'f0000001-0001-4000-8000-0000000000d2',
    'b0000001-0001-4000-8000-00000000000d',
    'Arquitectura certificada',
    'Freeze 28 oct 2026. ADR-001…004 (offline PWA, MP Point async, waiver Blob, 100% Vercel).',
    'completed', 2, '2026-10-28', true
  ),
  (
    'f0000001-0001-4000-8000-0000000000d3',
    'b0000001-0001-4000-8000-00000000000d',
    'Pre-build humano',
    'Mercado Pago, hardware Point/scanner/tablet, WhatsApp Cloud API, Carta Responsiva, seed SKUs, wireframes tablet.',
    'pending', 3, NULL, true
  ),
  (
    'f0000001-0001-4000-8000-0000000000d4',
    'b0000001-0001-4000-8000-00000000000d',
    'Arranque de implementación',
    'Scaffold local listo. Remoto GitHub/Vercel, schema Neon y primeras superficies de build cuando se active el track de código.',
    'in_progress', 4, NULL, true
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  sort_order = EXCLUDED.sort_order,
  due_date = EXCLUDED.due_date,
  visible_to_client = EXCLUDED.visible_to_client;

INSERT INTO deliverables (
  id, project_id, title, description, url, kind, sort_order, visible_to_client
) VALUES
  (
    '92000001-0001-4000-8000-0000000000d1',
    'b0000001-0001-4000-8000-00000000000d',
    'Arquitectura',
    'Arquitectura certificada (28 oct 2026): MVP, actores, flujos, grooming/POS, stack y checklist humano.',
    '/client-packs/kan-club/arquitectura-portal.html',
    'architecture', 1, true
  ),
  (
    '92000001-0001-4000-8000-0000000000d2',
    'b0000001-0001-4000-8000-00000000000d',
    'Arquitectura completa',
    'Inventario interno: ADRs, Marketplace Neon/Upstash, offline, MP/WhatsApp, corte scaffold. Solo staff.',
    '/client-packs/kan-club/arquitectura-completa.html',
    'architecture', 2, false
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  url = EXCLUDED.url,
  kind = EXCLUDED.kind,
  sort_order = EXCLUDED.sort_order,
  visible_to_client = EXCLUDED.visible_to_client;

INSERT INTO document_requests (
  id, project_id, code, title, description, instructions,
  expected_type, input_mode, status, required, sort_order, visible_to_client
) VALUES
  (
    '94000001-0001-4000-8000-0000000000d1',
    'b0000001-0001-4000-8000-00000000000d',
    'nda_signed',
    'NDA firmado',
    'Devolver el NDA mutuo firmado por el representante legal de Kan Club.',
    'PDF firmado. Si la carga falla, pega un enlace (Drive, Dropbox, SharePoint).',
    'nda', 'file', 'open', true, 10, true
  ),
  (
    '94000001-0001-4000-8000-0000000000d2',
    'b0000001-0001-4000-8000-00000000000d',
    'brandbook',
    'Brandbook / identidad visual',
    'Logos, colores, tipografías y guía de uso de marca Kan Club.',
    'PDF, Figma o ZIP con logos (SVG/PNG).',
    'other', 'file', 'open', true, 20, true
  ),
  (
    '94000001-0001-4000-8000-0000000000d3',
    'b0000001-0001-4000-8000-00000000000d',
    'carta_responsiva',
    'Texto Carta Responsiva',
    'Texto legal final de la carta responsiva / liability waiver para captura digital en tablet.',
    'PDF o Word con el texto aprobado. Debe coincidir con lo que firmará el cliente en tienda.',
    'other', 'file', 'open', true, 30, true
  ),
  (
    '94000001-0001-4000-8000-0000000000d4',
    'b0000001-0001-4000-8000-00000000000d',
    'sku_seed',
    'Catálogo seed (SKUs)',
    'Productos, precios, categorías y servicios de grooming iniciales.',
    'CSV o JSON con SKU, nombre, categoría, precio, stock inicial. Servicios de grooming incluidos.',
    'other', 'file', 'open', true, 40, true
  ),
  (
    '94000001-0001-4000-8000-0000000000d5',
    'b0000001-0001-4000-8000-00000000000d',
    'mercadopago_point',
    'Accesos Mercado Pago Point Smart',
    'Credenciales o invitación a la app de desarrolladores (sandbox + producción) para Point Smart.',
    'Indica cómo invitarnos (email Codiva) o comparte keys vía vault. No pegues secretos en claro en el portal si puedes evitarlo.',
    'other', 'credentials', 'open', true, 50, true
  ),
  (
    '94000001-0001-4000-8000-0000000000d6',
    'b0000001-0001-4000-8000-00000000000d',
    'whatsapp_cloud_api',
    'WhatsApp Cloud API / plantilla Pet Ready',
    'Meta Business Manager + plantilla aprobada para notificación «Tu mascota está lista».',
    'Describe el acceso o adjunta captura/PDF de la plantilla. Inbound seguirá siendo humano (solo outbound automatizado).',
    'other', 'credentials', 'open', true, 60, true
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  instructions = EXCLUDED.instructions,
  expected_type = EXCLUDED.expected_type,
  input_mode = EXCLUDED.input_mode,
  status = EXCLUDED.status,
  required = EXCLUDED.required,
  sort_order = EXCLUDED.sort_order,
  visible_to_client = EXCLUDED.visible_to_client;
