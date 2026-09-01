export const WORK_BOARD_DRAG_EDGE_PX = 80;
export const WORK_BOARD_DRAG_MAX_SPEED = 28;
export const WORK_BOARD_HOVER_EDGE_PX = 48;
export const WORK_BOARD_HOVER_MAX_SPEED = 16;
export const WORK_BOARD_HOVER_DELAY_MS = 1000;
export const WORK_BOARD_HOVER_GUTTER_PX = 32;

export function workBoardEdgeScrollDelta(
  clientX: number,
  viewportLeft: number,
  viewportRight: number,
  edgePx = WORK_BOARD_DRAG_EDGE_PX,
  maxSpeed = WORK_BOARD_DRAG_MAX_SPEED
) {
  const width = viewportRight - viewportLeft;
  if (!(width > 0) || !Number.isFinite(clientX)) return 0;
  const edge = Math.min(edgePx, Math.max(24, width * 0.28));
  const leftZone = viewportLeft + edge;
  const rightZone = viewportRight - edge;
  if (clientX < leftZone) {
    const t = Math.min(1, (leftZone - clientX) / edge);
    return -Math.max(1, Math.round(maxSpeed * t));
  }
  if (clientX > rightZone) {
    const t = Math.min(1, (clientX - rightZone) / edge);
    return Math.max(1, Math.round(maxSpeed * t));
  }
  return 0;
}

export function workBoardHoverScrollBlockedByTarget(target: EventTarget | null) {
  if (!target || typeof (target as Element).closest !== 'function') return true;
  return Boolean((target as Element).closest('[role="dialog"], #ops-sidebar-panel'));
}

export function workBoardHoverScrollDirection({
  clientX,
  clientY,
  viewportLeft,
  viewportRight,
  viewportTop,
  viewportBottom,
  scrollLeft,
  maxScroll,
  edgePx = WORK_BOARD_HOVER_EDGE_PX,
  gutterPx = WORK_BOARD_HOVER_GUTTER_PX,
}: {
  clientX: number;
  clientY: number;
  viewportLeft: number;
  viewportRight: number;
  viewportTop: number;
  viewportBottom: number;
  scrollLeft: number;
  maxScroll: number;
  edgePx?: number;
  gutterPx?: number;
}): -1 | 0 | 1 {
  if (!(maxScroll > 1)) return 0;
  if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return 0;
  if (clientY < viewportTop || clientY > viewportBottom) return 0;
  if (clientX < viewportLeft - gutterPx || clientX > viewportRight + gutterPx) return 0;
  const dx = workBoardEdgeScrollDelta(clientX, viewportLeft, viewportRight, edgePx, 1);
  if (dx < 0) return scrollLeft > 0 ? -1 : 0;
  if (dx > 0) return scrollLeft < maxScroll ? 1 : 0;
  return 0;
}
