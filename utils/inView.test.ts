import { describe, expect, it } from 'vitest';
import { requiredIntersectionRatio, revealClass } from './inView';

describe('revealClass', () => {
  it('hides until the element is in view', () => {
    expect(revealClass(false)).toBe('reveal');
    expect(revealClass(true)).toBe('reveal is-in');
  });

  it('keeps optional delay classes', () => {
    expect(revealClass(true, 'reveal-delay-2')).toBe('reveal is-in reveal-delay-2');
  });
});

describe('requiredIntersectionRatio', () => {
  it('keeps the requested threshold when the section fits in the viewport', () => {
    expect(requiredIntersectionRatio(400, 844, 0.6)).toBe(0.6);
  });

  it('caps the threshold when the section is taller than the screen', () => {
    const needed = requiredIntersectionRatio(1292, 844, 0.6);
    expect(needed).toBeLessThan(0.4);
    expect(needed).toBeGreaterThanOrEqual(0.08);
  });
});
