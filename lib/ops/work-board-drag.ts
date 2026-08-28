export const WORK_BOARD_DRAG_EDGE_PX = 80;
export const WORK_BOARD_DRAG_MAX_SPEED = 28;

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
