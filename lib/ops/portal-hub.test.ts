import { describe, expect, it } from 'vitest';
import {
  emailsForPartnerPortalAccess,
  isPlaceholderPortalEmail,
  namesMatch,
} from './portal-hub';

describe('partner hub portal access', () => {
  it('ignores placeholder Codiva emails', () => {
    expect(isPlaceholderPortalEmail('fes-portal-pendiente@codiva.dev')).toBe(true);
    expect(isPlaceholderPortalEmail('maic@umai-ad.com')).toBe(false);
  });

  it('matches partner names without accents or extra spaces', () => {
    expect(namesMatch('Miguel Alonso', 'miguel  alonso')).toBe(true);
    expect(namesMatch('José Pérez', 'Jose Perez')).toBe(true);
    expect(namesMatch('Miguel', 'Otro')).toBe(false);
  });

  it('invites the partner email and matching hub user, not placeholders', () => {
    expect(
      emailsForPartnerPortalAccess({
        leadEmail: 'foreverredwood-portal-pendiente@codiva.dev',
        partnerEmail: null,
        partnerName: 'Miguel Alonso',
        hubUsers: [
          { email: 'maic@umai-ad.com', displayName: 'Miguel Alonso', isHub: true },
          { email: 'otro@example.com', displayName: 'Otra Partner', isHub: true },
        ],
      })
    ).toEqual(['maic@umai-ad.com']);
  });

  it('invites a real partner email even when no hub matches', () => {
    expect(
      emailsForPartnerPortalAccess({
        partnerEmail: 'partner@agency.com',
        partnerName: 'Agencia',
        hubUsers: [{ email: 'maic@umai-ad.com', displayName: 'Miguel Alonso', isHub: true }],
      })
    ).toEqual(['partner@agency.com']);
  });
});
