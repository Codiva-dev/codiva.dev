'use client';

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

const DRAG_THRESHOLD_PX = 8;

export function isWorkCardInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest('a, button, input, select, textarea, label, form'));
}

export function useWorkBoardDrag({
  onDrop,
}: {
  onDrop: (assignmentId: string, status: string) => void;
}) {
  const [draggingId, setDraggingId] = useState('');
  const [dropStatus, setDropStatus] = useState('');
  const sessionRef = useRef<{
    id: string;
    title: string;
    originX: number;
    originY: number;
    offsetX: number;
    offsetY: number;
    width: number;
    started: boolean;
  } | null>(null);
  const ghostRef = useRef<HTMLDivElement | null>(null);
  const dropStatusRef = useRef('');
  const ignoreClickRef = useRef(false);
  const onDropRef = useRef(onDrop);
  onDropRef.current = onDrop;

  const endSession = useCallback(() => {
    sessionRef.current = null;
    dropStatusRef.current = '';
    setDraggingId('');
    setDropStatus('');
    document.body.style.removeProperty('cursor');
    document.body.style.removeProperty('user-select');
  }, []);

  const onCardPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>, assignment: { id: string; title: string }) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      if (isWorkCardInteractiveTarget(event.target)) return;
      const id = String(assignment?.id || '').trim();
      if (!id) return;
      const rect = event.currentTarget.getBoundingClientRect();
      sessionRef.current = {
        id,
        title: String(assignment?.title || '').trim(),
        originX: event.clientX,
        originY: event.clientY,
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top,
        width: rect.width,
        started: false,
      };
    },
    []
  );

  useEffect(() => {
    function onMove(event: PointerEvent) {
      const session = sessionRef.current;
      if (!session) return;
      const dx = event.clientX - session.originX;
      const dy = event.clientY - session.originY;
      if (!session.started) {
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
        session.started = true;
        setDraggingId(session.id);
        document.body.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
      }
      event.preventDefault();
      const ghost = ghostRef.current;
      if (ghost) {
        ghost.style.transform = `translate(${event.clientX - session.offsetX}px, ${event.clientY - session.offsetY}px)`;
        ghost.style.width = `${session.width}px`;
      }
      const under = document.elementFromPoint(event.clientX, event.clientY);
      const col = under instanceof Element ? under.closest('[data-work-drop-status]') : null;
      const next = col ? String(col.getAttribute('data-work-drop-status') || '') : '';
      if (next !== dropStatusRef.current) {
        dropStatusRef.current = next;
        setDropStatus(next);
      }
    }

    function onUp() {
      const session = sessionRef.current;
      if (!session) return;
      const started = session.started;
      const id = session.id;
      const status = dropStatusRef.current;
      endSession();
      if (started) {
        ignoreClickRef.current = true;
        window.setTimeout(() => {
          ignoreClickRef.current = false;
        }, 80);
        if (status) void onDropRef.current?.(id, status);
      }
    }

    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [endSession]);

  const consumeClickIfDragged = useCallback(() => {
    if (!ignoreClickRef.current) return false;
    ignoreClickRef.current = false;
    return true;
  }, []);

  const ghost = draggingId ? (
    <div
      ref={(node) => {
        ghostRef.current = node;
        const session = sessionRef.current;
        if (node && session) {
          node.style.transform = `translate(${session.originX - session.offsetX}px, ${session.originY - session.offsetY}px)`;
          node.style.width = `${session.width}px`;
        }
      }}
      className="pointer-events-none fixed left-0 top-0 z-[90] rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 shadow-xl"
    >
      {sessionRef.current?.title || ''}
    </div>
  ) : null;

  return { draggingId, dropStatus, onCardPointerDown, consumeClickIfDragged, ghost };
}
