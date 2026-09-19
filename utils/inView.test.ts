import { describe, expect, it } from 'vitest';
import { revealClass } from './inView';

describe('revealClass', () => {
  it('hides until the element is in view', () => {
    expect(revealClass(false)).toBe('reveal');
    expect(revealClass(true)).toBe('reveal is-in');
  });

  it('keeps optional delay classes', () => {
    expect(revealClass(true, 'reveal-delay-2')).toBe('reveal is-in reveal-delay-2');
  });
});
