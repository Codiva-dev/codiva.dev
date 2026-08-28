import { describe, expect, it } from 'vitest';
import { workBoardEdgeScrollDelta } from './work-board-drag';

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
