import { describe, expect, it } from 'vitest';
import {
  WORK_BOARD_HOVER_DELAY_MS,
  workBoardEdgeScrollDelta,
  workBoardHoverScrollBlockedByTarget,
  workBoardHoverScrollDirection,
} from './work-board-drag';

const board = {
  viewportLeft: 100,
  viewportRight: 900,
  viewportTop: 80,
  viewportBottom: 520,
};

describe('work board drag auto-scroll', () => {
  it('does not scroll in the middle of the scroller', () => {
    expect(workBoardEdgeScrollDelta(400, 0, 800)).toBe(0);
  });

  it('scrolls left near the left edge and faster closer to it', () => {
    const far = workBoardEdgeScrollDelta(70, 0, 800);
    const near = workBoardEdgeScrollDelta(8, 0, 800);
    expect(far).toBeLessThan(0);
    expect(near).toBeLessThan(far);
  });

  it('scrolls right near the right edge', () => {
    expect(workBoardEdgeScrollDelta(760, 0, 800)).toBeGreaterThan(0);
    expect(workBoardEdgeScrollDelta(792, 0, 800)).toBeGreaterThan(workBoardEdgeScrollDelta(760, 0, 800));
  });
});

describe('work board hover edge scroll', () => {
  it('waits one second before scrolling', () => {
    expect(WORK_BOARD_HOVER_DELAY_MS).toBe(1000);
  });

  it('does not arm in the middle or when content fits', () => {
    expect(
      workBoardHoverScrollDirection({
        ...board,
        clientX: 500,
        clientY: 200,
        scrollLeft: 40,
        maxScroll: 400,
      })
    ).toBe(0);
    expect(
      workBoardHoverScrollDirection({
        ...board,
        clientX: 110,
        clientY: 200,
        scrollLeft: 0,
        maxScroll: 0,
      })
    ).toBe(0);
  });

  it('arms left and right only when there is room to scroll', () => {
    expect(
      workBoardHoverScrollDirection({
        ...board,
        clientX: 110,
        clientY: 200,
        scrollLeft: 80,
        maxScroll: 400,
      })
    ).toBe(-1);
    expect(
      workBoardHoverScrollDirection({
        ...board,
        clientX: 110,
        clientY: 200,
        scrollLeft: 0,
        maxScroll: 400,
      })
    ).toBe(0);
    expect(
      workBoardHoverScrollDirection({
        ...board,
        clientX: 890,
        clientY: 200,
        scrollLeft: 40,
        maxScroll: 400,
      })
    ).toBe(1);
    expect(
      workBoardHoverScrollDirection({
        ...board,
        clientX: 890,
        clientY: 200,
        scrollLeft: 400,
        maxScroll: 400,
      })
    ).toBe(0);
  });

  it('allows a short gutter outside the scroller and ignores the rest of the page', () => {
    expect(
      workBoardHoverScrollDirection({
        ...board,
        clientX: 88,
        clientY: 200,
        scrollLeft: 80,
        maxScroll: 400,
      })
    ).toBe(-1);
    expect(
      workBoardHoverScrollDirection({
        ...board,
        clientX: 40,
        clientY: 200,
        scrollLeft: 80,
        maxScroll: 400,
      })
    ).toBe(0);
    expect(
      workBoardHoverScrollDirection({
        ...board,
        clientX: 110,
        clientY: 40,
        scrollLeft: 80,
        maxScroll: 400,
      })
    ).toBe(0);
  });

  it('does not steal hover from dialogs or the sidebar', () => {
    const target = (hit: string | null) =>
      ({ closest: (selector: string) => (hit && selector.includes(hit) ? {} : null) }) as unknown as EventTarget;
    expect(workBoardHoverScrollBlockedByTarget(target('role="dialog"'))).toBe(true);
    expect(workBoardHoverScrollBlockedByTarget(target('#ops-sidebar-panel'))).toBe(true);
    expect(workBoardHoverScrollBlockedByTarget(target(null))).toBe(false);
    expect(workBoardHoverScrollBlockedByTarget(null)).toBe(true);
  });
});
