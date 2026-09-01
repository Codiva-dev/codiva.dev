'use client';

import { useEffect, type RefObject } from 'react';
import {
  WORK_BOARD_HOVER_DELAY_MS,
  WORK_BOARD_HOVER_EDGE_PX,
  WORK_BOARD_HOVER_MAX_SPEED,
  workBoardEdgeScrollDelta,
  workBoardHoverScrollBlockedByTarget,
  workBoardHoverScrollDirection,
} from '@/lib/ops/work-board-drag';

export function useWorkBoardHoverScroll(
  scrollerRef: RefObject<HTMLDivElement | null>,
  enabled = true
) {
  useEffect(() => {
    if (!enabled) return undefined;

    let delayId = 0;
    let rafId = 0;
    let armedDir: -1 | 0 | 1 = 0;
    const pointer = { x: 0, y: 0 };

    function clearDelay() {
      if (!delayId) return;
      window.clearTimeout(delayId);
      delayId = 0;
    }

    function stopLoop() {
      if (!rafId) return;
      cancelAnimationFrame(rafId);
      rafId = 0;
    }

    function disarm() {
      armedDir = 0;
      clearDelay();
      stopLoop();
    }

    function metrics() {
      const scroller = scrollerRef.current;
      if (!scroller) return null;
      const maxScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
      if (!(maxScroll > 1)) return null;
      return { scroller, maxScroll, rect: scroller.getBoundingClientRect() };
    }

    function directionAt(x: number, y: number) {
      const current = metrics();
      if (!current) return 0 as const;
      if (workBoardHoverScrollBlockedByTarget(document.elementFromPoint(x, y))) return 0 as const;
      return workBoardHoverScrollDirection({
        clientX: x,
        clientY: y,
        viewportLeft: current.rect.left,
        viewportRight: current.rect.right,
        viewportTop: current.rect.top,
        viewportBottom: current.rect.bottom,
        scrollLeft: current.scroller.scrollLeft,
        maxScroll: current.maxScroll,
      });
    }

    function tick() {
      rafId = 0;
      const current = metrics();
      if (!current) {
        disarm();
        return;
      }
      const dir = directionAt(pointer.x, pointer.y);
      if (dir !== armedDir || dir === 0) {
        disarm();
        return;
      }
      const dx = workBoardEdgeScrollDelta(
        pointer.x,
        current.rect.left,
        current.rect.right,
        WORK_BOARD_HOVER_EDGE_PX,
        WORK_BOARD_HOVER_MAX_SPEED
      );
      if (!dx) {
        disarm();
        return;
      }
      current.scroller.scrollLeft = Math.max(
        0,
        Math.min(current.maxScroll, current.scroller.scrollLeft + dx)
      );
      rafId = requestAnimationFrame(tick);
    }

    function arm(dir: -1 | 1) {
      if (armedDir === dir) return;
      clearDelay();
      stopLoop();
      armedDir = dir;
      delayId = window.setTimeout(() => {
        delayId = 0;
        if (directionAt(pointer.x, pointer.y) !== armedDir) {
          disarm();
          return;
        }
        rafId = requestAnimationFrame(tick);
      }, WORK_BOARD_HOVER_DELAY_MS);
    }

    function onMove(event: PointerEvent) {
      if (event.pointerType !== 'mouse') {
        disarm();
        return;
      }
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      const dir = directionAt(pointer.x, pointer.y);
      if (dir === 0) {
        disarm();
        return;
      }
      if (armedDir === dir && (delayId || rafId)) return;
      arm(dir);
    }

    function onLeave() {
      disarm();
    }

    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      disarm();
    };
  }, [enabled, scrollerRef]);
}
