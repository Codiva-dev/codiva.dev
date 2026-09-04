'use client';

import { cn } from '@/lib/cn';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const sizes = {
  sm: 'max-w-sm p-5',
  md: 'max-w-lg p-5',
  frame: 'flex h-[min(92vh,900px)] max-w-6xl flex-col overflow-hidden p-0',
  frameLg: 'flex max-h-[min(92vh,900px)] max-w-5xl flex-col overflow-hidden p-0',
};

const layers = {
  base: 'z-[80]',
  raised: 'z-[90]',
};

const escapeStack: Array<() => void> = [];

export default function Modal({
  open,
  onClose,
  title,
  titleId: titleIdProp,
  describedBy,
  size = 'sm',
  closeLabel,
  backdrop = 'dim',
  header,
  footer,
  children,
  onKeyDown,
  className,
  layer = 'base',
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  titleId?: string;
  describedBy?: string;
  size?: keyof typeof sizes;
  closeLabel: string;
  backdrop?: 'dim' | 'dark';
  header?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  onKeyDown?: (event: KeyboardEvent) => void;
  className?: string;
  layer?: keyof typeof layers;
}) {
  const autoId = useId();
  const titleId = titleIdProp ?? autoId;
  const onCloseRef = useRef(onClose);
  const onKeyDownRef = useRef(onKeyDown);
  onCloseRef.current = onClose;
  onKeyDownRef.current = onKeyDown;

  useEffect(() => {
    if (!open) return;
    function close() {
      onCloseRef.current();
    }
    escapeStack.push(close);
    function onKey(event: KeyboardEvent) {
      if (escapeStack[escapeStack.length - 1] !== close) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        close();
        return;
      }
      onKeyDownRef.current?.(event);
    }
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      const index = escapeStack.lastIndexOf(close);
      if (index >= 0) escapeStack.splice(index, 1);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className={cn('fixed inset-0 flex items-center justify-center p-4', layers[layer])}>
      <button
        type="button"
        className={cn('absolute inset-0', backdrop === 'dark' ? 'bg-zinc-900/70' : 'bg-zinc-900/40')}
        aria-label={closeLabel}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title || header ? titleId : undefined}
        aria-describedby={describedBy}
        className={cn(
          'relative w-full rounded-2xl border border-zinc-200 bg-white shadow-xl',
          sizes[size],
          className
        )}
      >
        {header ??
          (title ? (
            <p id={titleId} className="text-base font-semibold text-zinc-900">
              {title}
            </p>
          ) : null)}
        {children}
        {footer}
      </div>
    </div>,
    document.body
  );
}

export function ModalHeader({
  title,
  titleId,
  actions,
}: {
  title: string;
  titleId: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3">
      <p id={titleId} className="min-w-0 truncate text-sm font-semibold text-zinc-900" title={title}>
        {title}
      </p>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
