import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Split buffer into ~1200-byte pieces (multiple of 3) and emit SQL stmts. */
function stmtsFor(rel, id, piece = 1200) {
  const buf = fs.readFileSync(path.join(root, rel));
  const aligned = piece - (piece % 3);
  const out = [];
  for (let i = 0; i < buf.length; i += aligned) {
    const slice = buf.subarray(i, Math.min(i + aligned, buf.length));
    const b64 = slice.toString('base64');
    const expr =
      i === 0
        ? `convert_from(decode('${b64}', 'base64'), 'UTF8')`
        : `coalesce(body_html,'') || convert_from(decode('${b64}', 'base64'), 'UTF8')`;
    out.push(`UPDATE deliverables SET body_html = ${expr} WHERE id = '${id}';`);
  }
  return out;
}

const portal = stmtsFor(
  'public/client-packs/kan-club/arquitectura-portal.html',
  '92000001-0001-4000-8000-0000000000d1'
);
const completa = stmtsFor(
  'public/client-packs/kan-club/arquitectura-completa.html',
  '92000001-0001-4000-8000-0000000000d2'
);

const all = [...portal, ...completa];
fs.writeFileSync(path.join(root, 'scripts/.b64-chunks.json'), JSON.stringify(all));
console.log(
  'count',
  all.length,
  'max',
  Math.max(...all.map((s) => s.length)),
  'sample',
  all[1].length
);
