import { describe, expect, it } from 'vitest';
import {
  isEmbeddedPreview,
  previewEmbedHref,
  shouldHandlePreviewPopupClick,
} from './preview-popup';

describe('preview popup', () => {
  it('adds the embed flag so chrome can hide inside the modal iframe', () => {
    expect(previewEmbedHref('/p/nirc')).toBe('/p/nirc?embed=1');
    expect(previewEmbedHref('/p/nirc/cotizacion?q=abc')).toBe('/p/nirc/cotizacion?q=abc&embed=1');
    expect(previewEmbedHref('/quotes/1/preview#doc')).toBe('/quotes/1/preview?embed=1#doc');
  });

  it('detects the embed query', () => {
    expect(isEmbeddedPreview('embed=1')).toBe(true);
    expect(isEmbeddedPreview('?embed=1')).toBe(true);
    expect(isEmbeddedPreview(new URLSearchParams('q=1'))).toBe(false);
  });

  it('lets modified clicks fall through to a new tab', () => {
    expect(shouldHandlePreviewPopupClick({})).toBe(true);
    expect(shouldHandlePreviewPopupClick({ ctrlKey: true })).toBe(false);
    expect(shouldHandlePreviewPopupClick({ metaKey: true })).toBe(false);
    expect(shouldHandlePreviewPopupClick({ button: 1 })).toBe(false);
    expect(shouldHandlePreviewPopupClick({ defaultPrevented: true })).toBe(false);
  });
});
