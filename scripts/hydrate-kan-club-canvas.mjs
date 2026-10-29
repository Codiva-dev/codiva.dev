import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const portal = fs.readFileSync(
  path.join(root, 'public/client-packs/kan-club/arquitectura-portal.html'),
  'utf8'
);
const completa = fs.readFileSync(
  path.join(root, 'public/client-packs/kan-club/arquitectura-completa.html'),
  'utf8'
);

function dollar(tag, body) {
  if (body.includes(`$${tag}$`)) throw new Error(`tag collision ${tag}`);
  return `$${tag}$${body}$${tag}$`;
}

const sql = [
  `UPDATE deliverables SET body_html = ${dollar('kanclub_portal', portal)} WHERE id = '92000001-0001-4000-8000-0000000000d1';`,
  `UPDATE deliverables SET body_html = ${dollar('kanclub_completa', completa)} WHERE id = '92000001-0001-4000-8000-0000000000d2';`,
].join('\n\n');

const out = path.join(root, 'supabase/migrations/20261029010200_kan_club_hydrate_canvas.sql');
fs.writeFileSync(out, sql);
console.log('wrote', out, 'bytes', Buffer.byteLength(sql), 'portal', portal.length, 'completa', completa.length);
