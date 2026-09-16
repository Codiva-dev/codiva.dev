import { createHash } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { slugify } from '@/lib/ops/slug';

/** TTL corto para URLs firmadas (segundos). */
export const OPS_SIGNED_URL_TTL_SECONDS = 60 * 5; // 5 minutos

export function isOpsStoragePath(path: string | null | undefined): boolean {
  return Boolean(
    path && (path.startsWith('projects/') || path.startsWith('organizations/'))
  );
}

export function isPublicClientPackPath(pathOrUrl: string | null | undefined): boolean {
  if (!pathOrUrl) return false;
  return pathOrUrl.startsWith('/client-packs/') || pathOrUrl.startsWith('client-packs/');
}

/** Borrador NDA estático: el cliente usa el NDA mutuo generado en Ops. */
export function isLegacyNdaDraftDocument(doc: {
  type?: string | null;
  signed?: boolean | null;
  file_url?: string | null;
  file_path?: string | null;
}): boolean {
  if (doc.type !== 'nda' || doc.signed) return false;
  return isPublicClientPackPath(doc.file_path) || isPublicClientPackPath(doc.file_url);
}

/** Href seguro para UI: solo storage autenticado (packs estáticos ya no se sirven por HTTP). */
export function opsFileHref(filePath: string | null | undefined, fileUrl?: string | null): string | null {
  if (filePath && isOpsStoragePath(filePath)) {
    return `/api/ops/file?path=${encodeURIComponent(filePath)}`;
  }
  if (fileUrl && fileUrl.startsWith('/api/ops/file')) {
    return fileUrl;
  }
  if (fileUrl && /^https?:\/\//i.test(fileUrl) && !isPublicClientPackPath(fileUrl)) {
    return fileUrl;
  }
  return null;
}

export function projectIdFromOpsPath(path: string): string | null {
  const parts = path.split('/').filter(Boolean);
  if (parts[0] !== 'projects' || !parts[1]) return null;
  const id = parts[1];
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return id;
}

export function organizationIdFromOpsPath(path: string): string | null {
  const parts = path.split('/').filter(Boolean);
  if (parts[0] !== 'organizations' || !parts[1]) return null;
  const id = parts[1];
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return id;
}

export function sha256Hex(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

/** Object key fragment safe for Supabase Storage (no accents or punctuation). */
export function opsStorageFileName(originalName: string, now = Date.now()): string {
  const base = String(originalName || '').split(/[/\\]/).pop()?.trim() || 'file';
  const dot = base.lastIndexOf('.');
  const extRaw = dot > 0 ? base.slice(dot + 1) : '';
  const stem = (dot > 0 ? base.slice(0, dot) : base) || 'file';
  const ext = extRaw.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12);
  const slug = slugify(stem) || 'file';
  return `${now}-${slug}${ext ? `.${ext}` : ''}`;
}

export async function createOpsSignedUrl(
  path: string,
  expiresIn = OPS_SIGNED_URL_TTL_SECONDS
): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from('ops-files').createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) {
    throw error ?? new Error('No se pudo firmar URL');
  }
  return data.signedUrl;
}

export async function deleteOpsFile(path: string): Promise<void> {
  const admin = createAdminClient();
  await admin.storage.from('ops-files').remove([path]);
}

export async function uploadOpsFile(
  file: File | Blob,
  folder: string
): Promise<{ path: string; url: string | null; sha256: string; buffer: Buffer }> {
  const admin = createAdminClient();
  const name = file instanceof File ? file.name : 'file';
  const path = `${folder.replace(/\/+$/, '')}/${opsStorageFileName(name)}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const sha256 = sha256Hex(buffer);

  const { error } = await admin.storage.from('ops-files').upload(path, buffer, {
    contentType: file instanceof File ? file.type : 'application/octet-stream',
    upsert: false,
  });

  if (error) throw error;

  return {
    path,
    url: opsFileHref(path),
    sha256,
    buffer,
  };
}

export function retainUntilFromDays(days: number, from = new Date()): string {
  const d = new Date(from);
  d.setUTCDate(d.getUTCDate() + Math.max(1, days));
  return d.toISOString().slice(0, 10);
}
