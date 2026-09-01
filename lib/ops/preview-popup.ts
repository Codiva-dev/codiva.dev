export const PREVIEW_POPUP_NAME = 'codiva-preview';

export type PreviewPopupOpener = (
  url: string,
  name: string,
  features: string
) => { opener: unknown; focus: () => void } | null;

export function previewPopupSize(availWidth: number, availHeight: number) {
  const width = Math.min(1440, Math.max(720, Math.round(availWidth * 0.9)));
  const height = Math.min(960, Math.max(560, Math.round(availHeight * 0.9)));
  const left = Math.max(0, Math.round((availWidth - width) / 2));
  const top = Math.max(0, Math.round((availHeight - height) / 2));
  return { width, height, left, top };
}

export function previewPopupFeatures(availWidth: number, availHeight: number) {
  const { width, height, left, top } = previewPopupSize(availWidth, availHeight);
  return `popup=yes,width=${width},height=${height},left=${left},top=${top}`;
}

export function shouldHandlePreviewPopupClick(event: {
  button?: number;
  metaKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  defaultPrevented?: boolean;
}) {
  if (event.defaultPrevented) return false;
  if ((event.button ?? 0) !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  return true;
}

export function openPreviewPopup(
  url: string,
  {
    open,
    availWidth,
    availHeight,
    name = PREVIEW_POPUP_NAME,
  }: {
    open: PreviewPopupOpener;
    availWidth: number;
    availHeight: number;
    name?: string;
  }
) {
  const popup = open(url, name, previewPopupFeatures(availWidth, availHeight));
  if (!popup) return null;
  try {
    popup.opener = null;
  } catch {
    /* ignore */
  }
  popup.focus();
  return popup;
}
