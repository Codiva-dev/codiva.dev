import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function esc(s) {
  return s.replace(/'/g, "''");
}

function chunkStatements(fileRel, id, size = 1600) {
  const html = fs.readFileSync(path.join(root, fileRel), 'utf8');
  const stmts = [`UPDATE deliverables SET body_html = '' WHERE id = '${id}';`];
  for (let i = 0; i < html.length; i += size) {
    const c = html.slice(i, i + size);
    stmts.push(
      `UPDATE deliverables SET body_html = coalesce(body_html,'') || '${esc(c)}' WHERE id = '${id}';`
    );
  }
  return stmts;
}

const portal = chunkStatements(
  'public/client-packs/kan-club/arquitectura-portal.html',
  '92000001-0001-4000-8000-0000000000d1'
);
const completa = chunkStatements(
  'public/client-packs/kan-club/arquitectura-completa.html',
  '92000001-0001-4000-8000-0000000000d2'
);

const out = path.join(root, 'scripts/.hydrate-chunks.json');
fs.writeFileSync(out, JSON.stringify({ portal, completa }, null, 0));
console.log(
  'portal',
  portal.length,
  'completa',
  completa.length,
  'max',
  Math.max(...[...portal, ...completa].map((s) => s.length))
);
