'use client';

import type { AnchorHTMLAttributes, MouseEvent } from 'react';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@/components/ui/Button';
import Modal, { ModalHeader } from '@/components/ui/Modal';
import { previewEmbedHref, shouldHandlePreviewPopupClick } from '@/lib/ops/preview-popup';

export default function PreviewPopupLink({
  href,
  title,
  onClick,
  children,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  const { t } = useTranslation();
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const closeLabel = t('common.buttons.close');
  const iframeTitle =
    title?.trim() || (typeof children === 'string' ? children : t('ops.preview.popupTitle'));

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (!shouldHandlePreviewPopupClick(event)) return;
    event.preventDefault();
    setOpen(true);
  }

  return (
    <>
      <a {...rest} href={href} onClick={handleClick}>
        {children}
      </a>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={iframeTitle}
        titleId={titleId}
        size="frame"
        closeLabel={closeLabel}
        backdrop="dark"
        layer="raised"
        header={
          <ModalHeader
            title={iframeTitle}
            titleId={titleId}
            actions={
              <Button type="button" variant="secondary" size="xs" onClick={() => setOpen(false)}>
                {closeLabel}
              </Button>
            }
          />
        }
      >
        {open ? (
          <iframe title={iframeTitle} src={previewEmbedHref(href)} className="min-h-0 w-full flex-1 bg-white" />
        ) : null}
      </Modal>
    </>
  );
}
