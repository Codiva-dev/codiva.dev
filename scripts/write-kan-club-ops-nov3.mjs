import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const portal = fs.readFileSync(
  path.join(root, "public/client-packs/kan-club/arquitectura-portal.html"),
  "utf8"
);
const completa = fs.readFileSync(
  path.join(root, "public/client-packs/kan-club/arquitectura-completa.html"),
  "utf8"
);

function dollar(tag, body) {
  if (body.includes(`$${tag}$`)) throw new Error(`tag collision ${tag}`);
  return `$${tag}$${body}$${tag}$`;
}

const progress = `-- Kan Club Ops corte 2026-11-03: progreso MVP + canvas staff
UPDATE projects SET
  progress_percent = 55,
  description = E'ERP / CRM / POS / E-commerce Pickup para grooming + retail (1 sucursal).\\n\\nMVP operable en prod (https://www.kanclub.com). Repo Codiva-dev/kan-club.\\n\\nSuperficies: tablet PWA (POS + grooming + waiver + agenda + pickup), web Pickup + estimador + portal Mi Mascota, admin CRM.\\n\\nCorte 3 nov PM: branding PNG definitivo, cruce tablet↔admin estable, PINs fuera de UI, enlace Admin solo owner.\\n\\nIntegraciones Point/WA env-gated. Checklist humano (MP, WhatsApp, waiver legal, seed SKUs, hardware) sigue abierto.'
WHERE id = 'b0000001-0001-4000-8000-00000000000d';

UPDATE milestones SET
  status = 'completed',
  description = 'Scaffold + GitHub/Vercel + Neon schema + primeras superficies. Cerrado con MVP operable en prod (3 nov 2026).'
WHERE id = 'f0000001-0001-4000-8000-0000000000d4';

INSERT INTO milestones (
  id, project_id, title, description, status, sort_order, due_date, visible_to_client
) VALUES
  (
    'f0000001-0001-4000-8000-0000000000d5',
    'b0000001-0001-4000-8000-00000000000d',
    'MVP operable en producción',
    'Tablet + admin + tienda + portal live en kanclub.com. Adapters MP/WA gated. Branding y shells estabilizados (3 nov).',
    'completed', 5, '2026-11-03', true
  ),
  (
    'f0000001-0001-4000-8000-0000000000d6',
    'b0000001-0001-4000-8000-00000000000d',
    'Go-live integraciones',
    'Keys Meta/MP, hardware Point/escáner, plantilla WhatsApp Pet Ready, texto legal waiver, catálogo seed real.',
    'pending', 6, NULL, true
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  sort_order = EXCLUDED.sort_order,
  due_date = EXCLUDED.due_date,
  visible_to_client = EXCLUDED.visible_to_client;

INSERT INTO activity_log (entity_type, entity_id, action, metadata)
VALUES (
  'project',
  'b0000001-0001-4000-8000-00000000000d',
  'progress_cut',
  jsonb_build_object(
    'cut', '2026-11-03',
    'progress_percent', 55,
    'summary', 'MVP operable + polish branding/shells; checklist humano e integraciones pendientes'
  )
);
`;

const sql = [
  progress,
  `UPDATE deliverables SET body_html = ${dollar("kanclub_portal", portal)} WHERE id = '92000001-0001-4000-8000-0000000000d1';`,
  `UPDATE deliverables SET body_html = ${dollar("kanclub_completa", completa)} WHERE id = '92000001-0001-4000-8000-0000000000d2';`,
].join("\n\n");

const out = path.join(
  root,
  "supabase/migrations/20261103223000_kan_club_ops_progress_nov3.sql"
);
fs.writeFileSync(out, sql);
console.log("wrote", out, "bytes", Buffer.byteLength(sql));
