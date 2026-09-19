import { describe, expect, it } from 'vitest';
import { isBodyTooLargeError, isTechnicalErrorMessage, toUserErrorMessage } from './user-error';

describe('user-error', () => {
  it('treats Next.js 1 MB server-action limits as technical', () => {
    const msg = 'Body exceeded 1 MB limit.';
    expect(isBodyTooLargeError(msg)).toBe(true);
    expect(isTechnicalErrorMessage(msg)).toBe(true);
    expect(toUserErrorMessage(new Error(msg), 'No se pudo completar la acción.')).toBe(
      'No se pudo completar la acción.'
    );
  });
});
