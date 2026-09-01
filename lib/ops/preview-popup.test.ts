import { describe, expect, it, vi } from 'vitest';
import {
  PREVIEW_POPUP_NAME,
  openPreviewPopup,
  previewPopupFeatures,
  previewPopupSize,
  shouldHandlePreviewPopupClick,
} from './preview-popup';

describe('preview popup', () => {
  it('requests a centered popup window', () => {
    expect(previewPopupSize(1600, 1000)).toEqual({
      width: 1440,
      height: 900,
      left: 80,
      top: 50,
    });
    expect(previewPopupFeatures(1600, 1000)).toContain('popup=yes');
    expect(previewPopupFeatures(1600, 1000)).toContain('width=1440');
  });

  it('lets modified clicks fall through to a new tab', () => {
    expect(shouldHandlePreviewPopupClick({})).toBe(true);
    expect(shouldHandlePreviewPopupClick({ ctrlKey: true })).toBe(false);
    expect(shouldHandlePreviewPopupClick({ metaKey: true })).toBe(false);
    expect(shouldHandlePreviewPopupClick({ button: 1 })).toBe(false);
    expect(shouldHandlePreviewPopupClick({ defaultPrevented: true })).toBe(false);
  });

  it('opens, detaches opener, and focuses the popup', () => {
    const popup = { opener: {} as unknown, focus: vi.fn() };
    const open = vi.fn(() => popup);
    expect(
      openPreviewPopup('/p/nirc/canvas/abc', {
        open,
        availWidth: 1600,
        availHeight: 1000,
      })
    ).toBe(popup);
    expect(open).toHaveBeenCalledWith(
      '/p/nirc/canvas/abc',
      PREVIEW_POPUP_NAME,
      previewPopupFeatures(1600, 1000)
    );
    expect(popup.opener).toBeNull();
    expect(popup.focus).toHaveBeenCalledOnce();
  });

  it('returns null when the popup is blocked', () => {
    expect(
      openPreviewPopup('/quotes/1/preview', {
        open: () => null,
        availWidth: 1200,
        availHeight: 800,
      })
    ).toBeNull();
  });
});
