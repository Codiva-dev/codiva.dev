import { createHash } from 'node:crypto';
import { scanUploadedBytes } from '@/lib/ops/malware-scan';

export const TICKET_ALLOWED_MIME = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'text/plain',
  'text/csv',
]);

type Sniff = { mime: string };

function sniffTicketFile(buffer: Buffer): Sniff | null {
  if (buffer.length >= 5 && buffer.subarray(0, 5).toString('utf8') === '%PDF-') {
    return { mime: 'application/pdf' };
  }
  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return { mime: 'image/png' };
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: 'image/jpeg' };
  }
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') {
    return { mime: 'image/webp' };
  }
  if (buffer.length >= 6 && buffer.subarray(0, 6).toString('ascii') === 'GIF87a') return { mime: 'image/gif' };
  if (buffer.length >= 6 && buffer.subarray(0, 6).toString('ascii') === 'GIF89a') return { mime: 'image/gif' };
  const head = buffer.subarray(0, Math.min(buffer.length, 256)).toString('utf8').trimStart().toLowerCase();
  if (head.startsWith('<svg') || head.startsWith('<!doctype html') || head.startsWith('<html')) return null;
  if (buffer.every((b) => b === 9 || b === 10 || b === 13 || (b >= 32 && b < 127))) {
    return { mime: 'text/plain' };
  }
  return null;
}

export async function inspectTicketAttachment(file: File): Promise<{ buffer: Buffer; mime: string; name: string } | { error: string }> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const sniffed = sniffTicketFile(buffer);
  if (!sniffed || !TICKET_ALLOWED_MIME.has(sniffed.mime)) {
    return { error: `Tipo no permitido: ${file.name}` };
  }
  const sha = createHash('sha256').update(buffer).digest('hex');
  const scan = await scanUploadedBytes(buffer, sha, file.name);
  if (scan.status === 'infected') {
    return { error: `Archivo bloqueado: ${file.name}` };
  }
  return { buffer, mime: sniffed.mime, name: file.name || 'attachment' };
}
