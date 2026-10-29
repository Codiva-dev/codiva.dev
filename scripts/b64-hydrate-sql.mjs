import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function makeUpdate(rel, id) {
  const buf = fs.readFileSync(path.join(root, rel));
  const b64 = buf.toString('base64');
  return `UPDATE deliverables SET body_html = convert_from(decode('${b64}', 'base64'), 'UTF8') WHERE id = '${id}';`;
}

const portal = makeUpdate(
  'public/client-packs/kan-club/arquitectura-portal.html',
  '92000001-0001-4000-8000-0000000000d1'
);
const completa = makeUpdate(
  'public/client-packs/kan-club/arquitectura-completa.html',
  '92000001-0001-4000-8000-0000000000d2'
);

fs.writeFileSync(path.join(root, 'scripts/.b64-portal.sql'), portal);
fs.writeFileSync(path.join(root, 'scripts/.b64-completa.sql'), completa);
console.log({ portal: portal.length, completa: completa.length });
