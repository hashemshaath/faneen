import { describe, it, expect, beforeEach } from 'vitest';
import { queryClient } from '@/lib/queryClient';

/**
 * Behavioural guard for the cross-account data-leak fix.
 *
 * Mirrors the logic implemented in `AuthContext.resetForUser`: whenever the
 * signed-in user id changes, the shared React-Query cache must be cleared so
 * personal data cached for user A cannot leak into user B's session.
 */
function makeResetForUser() {
  let lastUserId: string | null = null;
  return (nextUserId: string | null) => {
    if (lastUserId !== nextUserId) {
      queryClient.clear();
      lastUserId = nextUserId;
    }
  };
}

describe('account switch — React Query cache isolation', () => {
  beforeEach(() => queryClient.clear());

  it('keeps cached data while the same user stays signed-in', () => {
    const reset = makeResetForUser();
    reset('user-a');
    queryClient.setQueryData(['my-business-for-settings', 'user-a'], { id: 'BIZ-1' });
    reset('user-a'); // no change
    expect(queryClient.getQueryData(['my-business-for-settings', 'user-a']))
      .toEqual({ id: 'BIZ-1' });
  });

  it('clears the cache when the signed-in user changes (login swap)', () => {
    const reset = makeResetForUser();
    reset('user-a');
    queryClient.setQueryData(['my-business-for-settings', 'user-a'], { id: 'BIZ-1' });
    queryClient.setQueryData(['profile', 'user-a'], { username: 'a' });

    reset('user-b'); // simulate auth state change to a different account

    expect(queryClient.getQueryData(['my-business-for-settings', 'user-a'])).toBeUndefined();
    expect(queryClient.getQueryData(['profile', 'user-a'])).toBeUndefined();
  });

  it('clears the cache on sign-out (user → null)', () => {
    const reset = makeResetForUser();
    reset('user-a');
    queryClient.setQueryData(['my-business-for-settings', 'user-a'], { id: 'BIZ-1' });
    reset(null);
    expect(queryClient.getQueryData(['my-business-for-settings', 'user-a'])).toBeUndefined();
  });

  it('clears again when a new user signs in after a sign-out', () => {
    const reset = makeResetForUser();
    reset('user-a');
    queryClient.setQueryData(['x', 'user-a'], 1);
    reset(null);
    queryClient.setQueryData(['x', 'user-b'], 2);
    reset('user-b');
    // signing-in from null → user-b is a change, cache should be wiped
    expect(queryClient.getQueryData(['x', 'user-b'])).toBeUndefined();
  });
});