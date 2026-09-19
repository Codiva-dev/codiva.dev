import { describe, expect, it } from 'vitest';
import { emailsByUserIds } from './auth-users';

describe('emailsByUserIds', () => {
  it('looks up unique ids once and ignores blanks', async () => {
    const calls: string[] = [];
    const admin = {
      auth: {
        admin: {
          getUserById: async (id: string) => {
            calls.push(id);
            return {
              data: {
                user: id === 'a' ? { email: 'a@codiva.dev' } : { email: '  ' },
              },
            };
          },
        },
      },
    };

    const emails = await emailsByUserIds(admin, ['a', 'a', '', 'b']);
    expect([...emails]).toEqual([['a', 'a@codiva.dev']]);
    expect(calls.sort()).toEqual(['a', 'b']);
  });
});
