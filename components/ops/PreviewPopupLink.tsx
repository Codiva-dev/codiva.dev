'use client';

import type { AnchorHTMLAttributes, MouseEvent } from 'react';
import {
  PREVIEW_POPUP_NAME,
  openPreviewPopup,
  shouldHandlePreviewPopupClick,
} from '@/lib/ops/preview-popup';

export default function PreviewPopupLink({
  href,
  name = PREVIEW_POPUP_NAME,
  onClick,
  children,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; name?: string }) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (!shouldHandlePreviewPopupClick(event)) return;
    const popup = openPreviewPopup(href, {
      open: (url, name, features) => window.open(url, name, features),
      availWidth: window.screen.availWidth,
      availHeight: window.screen.availHeight,
      name,
    });
    if (popup) event.preventDefault();
  }

  return (
    <a {...rest} href={href} target={name} rel="noopener noreferrer" onClick={handleClick}>
      {children}
    </a>
  );
}
