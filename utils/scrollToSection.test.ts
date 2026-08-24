import { describe, expect, it } from 'vitest';
import { scrollAlignForSection } from './scrollToSection';

describe('scrollAlignForSection', () => {
  it('pins contact to the start so the form is not centered away', () => {
    expect(scrollAlignForSection('contact')).toBe('start');
    expect(scrollAlignForSection('about')).toBe('center');
    expect(scrollAlignForSection('casos')).toBe('center');
  });
});
