import { describe, expect, it } from 'vitest';
import {
  contentSecurityPolicy,
  nextSecurityHeaderSources,
  portalCanvasHeaders,
  PORTAL_CANVAS_HEADER_SOURCE,
  PORTAL_QUOTE_DOC_HEADER_SOURCE,
  sameOriginEmbedHeaders,
  securityHeaders,
} from './security-headers';

describe('security headers', () => {
  it('forbids framing the app from other origins', () => {
    const csp = contentSecurityPolicy(false);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'self' blob:");
    expect(csp).not.toContain("'unsafe-eval'");
    const keys = securityHeaders(false).map((h) => h.key);
    expect(keys).toContain('Content-Security-Policy');
    expect(keys).toContain('X-Frame-Options');
    expect(securityHeaders(false).find((h) => h.key === 'X-Frame-Options')?.value).toBe('DENY');
  });

  it('allows same-origin iframes for CV and recruiting report previews', () => {
    const embed = sameOriginEmbedHeaders(false);
    expect(embed.find((h) => h.key === 'X-Frame-Options')?.value).toBe('SAMEORIGIN');
    expect(embed.find((h) => h.key === 'Content-Security-Policy')?.value).toContain(
      "frame-ancestors 'self'"
    );
    const sources = nextSecurityHeaderSources(false).map((row) => row.source);
    expect(sources[0]).toContain('api/ops/careers/cv$');
    expect(sources).toContain('/api/ops/careers/cv');
    expect(sources).toContain('/api/ops/careers/recruiting-report');
  });

  it('allows same-origin iframes for portal quote documents', () => {
    const sources = nextSecurityHeaderSources(false).map((row) => row.source);
    expect(sources[0]).toContain('p/[^/]+/cotizacion/[^/]+');
    expect(sources).toContain(PORTAL_QUOTE_DOC_HEADER_SOURCE);
  });

  it('allows same-origin iframes for portal architecture canvases', () => {
    const canvas = portalCanvasHeaders(false);
    expect(canvas.find((h) => h.key === 'X-Frame-Options')?.value).toBe('SAMEORIGIN');
    const csp = canvas.find((h) => h.key === 'Content-Security-Policy')?.value;
    expect(csp).toContain("frame-ancestors 'self'");
    expect(csp).toContain('https://cdn.jsdelivr.net');
    const sources = nextSecurityHeaderSources(false).map((row) => row.source);
    expect(sources[0]).toContain('p/[^/]+/canvas/');
    expect(sources).toContain(PORTAL_CANVAS_HEADER_SOURCE);
  });

  it('allows eval only in development for Next HMR', () => {
    expect(contentSecurityPolicy(true)).toContain("'unsafe-eval'");
  });
});
