/**
 * Tiny module-scoped store so ProtectedRoute can hand a denial reason
 * to the Forbidden page without using URL state or a context provider.
 */
export interface ForbiddenContext {
  path: string;
  requiredRole: 'super_admin' | 'admin' | 'provider' | 'auth';
  userId: string | null;
  roles: string[];
  isAdmin: boolean;
  isProvider: boolean;
  isSuperAdmin: boolean;
  accountType: string | null;
  at: string;
}

let current: ForbiddenContext | null = null;

export const setForbiddenContext = (ctx: ForbiddenContext): void => {
  current = ctx;
  try {
    sessionStorage.setItem('qitaat_forbidden_context', JSON.stringify(ctx));
  } catch {
    /* noop */
  }
};

export const readForbiddenContext = (): ForbiddenContext | null => {
  if (current) return current;
  try {
    const raw = sessionStorage.getItem('qitaat_forbidden_context');
    if (raw) return JSON.parse(raw) as ForbiddenContext;
  } catch {
    /* noop */
  }
  return null;
};

export const clearForbiddenContext = (): void => {
  current = null;
  try { sessionStorage.removeItem('qitaat_forbidden_context'); } catch { /* noop */ }
};