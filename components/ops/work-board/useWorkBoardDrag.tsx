'use client';

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { workBoardEdgeScrollDelta } from '@/lib/ops/work-board-drag';

const DRAG_THRESHOLD_PX = 8;

export function isWorkCardInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest('a, button, input, select, textarea, label, form'));
}

function dropStatusAt(x: number, y: number) {
  const under = document.elementFromPoint(x, y);
  const col = under instanceof Element ? under.closest('[data-work-drop-status]') : null;
  return col ? String(col.getAttribute('data-work-drop-status') || '') : '';
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
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const dropStatusRef = useRef('');
  const ignoreClickRef = useRef(false);
  const pointerRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef(0);
  const onDropRef = useRef(onDrop);
  onDropRef.current = onDrop;

  const applyDropStatus = useCallback((next: string) => {
    if (next === dropStatusRef.current) return;
    dropStatusRef.current = next;
    setDropStatus(next);
  }, []);

  const placeGhost = useCallback((x: number, y: number) => {
    const session = sessionRef.current;
    const ghost = ghostRef.current;
    if (!session || !ghost) return;
    ghost.style.transform = `translate(${x - session.offsetX}px, ${y - session.offsetY}px)`;
    ghost.style.width = `${session.width}px`;
  }, []);

  const stopScrollLoop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
  }, []);

  const endSession = useCallback(() => {
    stopScrollLoop();
    sessionRef.current = null;
    dropStatusRef.current = '';
    setDraggingId('');
    setDropStatus('');
    document.body.style.removeProperty('cursor');
    document.body.style.removeProperty('user-select');
  }, [stopScrollLoop]);

  const onCardPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>, assignment: { id: string; title: string }) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      if (isWorkCardInteractiveTarget(event.target)) return;
      const id = String(assignment?.id || '').trim();
      if (!id) return;
      const rect = event.currentTarget.getBoundingClientRect();
      pointerRef.current = { x: event.clientX, y: event.clientY };
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
    function tick() {
      rafRef.current = 0;
      const session = sessionRef.current;
      if (!session?.started) return;
      const scroller = scrollerRef.current;
      const { x, y } = pointerRef.current;
      if (scroller) {
        const rect = scroller.getBoundingClientRect();
        const dx = workBoardEdgeScrollDelta(x, rect.left, rect.right);
        if (dx) {
          const max = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
          scroller.scrollLeft = Math.max(0, Math.min(max, scroller.scrollLeft + dx));
        }
      }
      placeGhost(x, y);
      applyDropStatus(dropStatusAt(x, y));
      rafRef.current = requestAnimationFrame(tick);
    }

    function startScrollLoop() {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(tick);
    }

    function onMove(event: PointerEvent) {
      const session = sessionRef.current;
      if (!session) return;
      pointerRef.current = { x: event.clientX, y: event.clientY };
      const dx = event.clientX - session.originX;
      const dy = event.clientY - session.originY;
      if (!session.started) {
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
        session.started = true;
        setDraggingId(session.id);
        document.body.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
        startScrollLoop();
      }
      event.preventDefault();
      placeGhost(event.clientX, event.clientY);
      applyDropStatus(dropStatusAt(event.clientX, event.clientY));
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
      stopScrollLoop();
    };
  }, [applyDropStatus, endSession, placeGhost, stopScrollLoop]);

  const consumeClickIfDragged = useCallback(() => {
    if (!ignoreClickRef.current) return false;
    ignoreClickRef.current = false;
    return true;
  }, []);

  const ghost =
    draggingId && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={(node) => {
              ghostRef.current = node;
              const session = sessionRef.current;
              if (node && session) {
                node.style.transform = `translate(${pointerRef.current.x - session.offsetX}px, ${
                  pointerRef.current.y - session.offsetY
                }px)`;
                node.style.width = `${session.width}px`;
              }
            }}
            className="pointer-events-none fixed left-0 top-0 z-[90] rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 shadow-xl"
          >
            {sessionRef.current?.title || ''}
          </div>,
          document.body
        )
      : null;

  return { draggingId, dropStatus, onCardPointerDown, consumeClickIfDragged, ghost, scrollerRef };
}
