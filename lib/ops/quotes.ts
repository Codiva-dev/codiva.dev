import { parseLineItemsJson, parsePhasesJson } from '@/lib/ops/quote-document';
import { slugify } from '@/lib/ops/slug';

export function portalQuoteDocumentPath(slug: string, quoteId: string): string {
  return `/p/${slug}/cotizacion/${quoteId}`;
}

export function portalQuotePdfPath(slug: string, quoteId: string): string {
  return `${portalQuoteDocumentPath(slug, quoteId)}/pdf`;
}

export function quotePdfFilename(title: string): string {
  const base = slugify(title) || 'cotizacion';
  return `${base}.pdf`;
}

export function isLegacyQuotePackDocument(doc: {
  type?: string | null;
  title?: string | null;
  file_url?: string | null;
  file_path?: string | null;
}): boolean {
  if (doc.type !== 'proposal_pdf') return false;
  const blob = `${doc.title ?? ''} ${doc.file_url ?? ''} ${doc.file_path ?? ''}`.toLowerCase();
  return /cotizaci[oó]n/.test(blob) || blob.includes('cotizacion');
}

export { parseLineItemsJson, parsePhasesJson };
