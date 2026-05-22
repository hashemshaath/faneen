/**
 * Typed Supabase RPC + query wrappers (R1A foundation).
 *
 * These helpers DO NOT replace existing callsites. They provide a typed,
 * consistent error-handling layer that R1B+ refactors can adopt gradually.
 *
 * Design:
 *  - Never leak raw PostgrestError objects to UI code.
 *  - Preserve the original message internally on `cause` for debugging.
 *  - Expose a stable, narrow `RpcErrorCode` for UI mapping.
 *  - `callRpc` throws on failure (familiar for React Query).
 *  - `safeRpc` returns a discriminated union { ok, data | error }.
 */

export type RpcErrorCode =
  | 'RLS_DENIED'
  | 'NOT_FOUND'
  | 'DUPLICATE_KEY'
  | 'VALIDATION_FAILED'
  | 'AUTH_REQUIRED'
  | 'ADMIN_REQUIRED'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';

export interface NormalizedRpcError {
  code: RpcErrorCode;
  message: string;       // safe, generic, UI-displayable
  detail?: string;       // original message (debug only)
  cause?: unknown;       // original error
}

/** Loose shape of a Supabase/PostgREST error without importing the type. */
interface SupabaseLikeError {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
  status?: number;
}

const GENERIC_MESSAGES: Record<RpcErrorCode, string> = {
  RLS_DENIED: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  DUPLICATE_KEY: 'This record already exists.',
  VALIDATION_FAILED: 'The submitted data is invalid.',
  AUTH_REQUIRED: 'Please sign in to continue.',
  ADMIN_REQUIRED: 'Administrator access is required.',
  NETWORK_ERROR: 'Network error. Please try again.',
  UNKNOWN: 'Something went wrong. Please try again.',
};

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

export function normalizeSupabaseError(err: unknown): NormalizedRpcError {
  if (err == null) {
    return { code: 'UNKNOWN', message: GENERIC_MESSAGES.UNKNOWN };
  }
  const raw: SupabaseLikeError = isObject(err) ? (err as SupabaseLikeError) : {};
  const msg = (raw.message || (typeof err === 'string' ? err : '') || '').toString();
  const upper = msg.toUpperCase();
  const pgCode = (raw.code || '').toString();

  let code: RpcErrorCode = 'UNKNOWN';

  if (pgCode === 'PGRST301' || /JWT|NOT.*AUTHENTICATED|AUTH.*REQUIRED/.test(upper)) {
    code = 'AUTH_REQUIRED';
  } else if (pgCode === '42501' || /RLS|PERMISSION DENIED|FORBIDDEN/.test(upper)) {
    code = 'RLS_DENIED';
  } else if (/ADMIN.*REQUIRED|REQUIRES.*ADMIN/.test(upper)) {
    code = 'ADMIN_REQUIRED';
  } else if (pgCode === 'PGRST116' || /NOT FOUND|NO ROWS/.test(upper)) {
    code = 'NOT_FOUND';
  } else if (pgCode === '23505' || /DUPLICATE KEY|ALREADY EXISTS|UNIQUE CONSTRAINT/.test(upper)) {
    code = 'DUPLICATE_KEY';
  } else if (
    pgCode === '23514' || pgCode === '23502' || pgCode === '22P02' ||
    /VALIDATION|INVALID|CHECK CONSTRAINT|NOT NULL/.test(upper)
  ) {
    code = 'VALIDATION_FAILED';
  } else if (/NETWORK|FETCH|TIMEOUT|ECONN/.test(upper) || err instanceof TypeError) {
    code = 'NETWORK_ERROR';
  }

  return {
    code,
    message: GENERIC_MESSAGES[code],
    detail: msg || undefined,
    cause: err,
  };
}

export function mapRpcError(err: unknown): NormalizedRpcError {
  return normalizeSupabaseError(err);
}

/** Shape returned by Supabase query/RPC builders we want to wrap. */
interface SupabaseResultLike<T> {
  data: T | null;
  error: unknown;
}

/**
 * Awaits a Supabase RPC/query, throws a normalized Error on failure.
 * Caller usage:
 *   const rows = await callRpc(supabase.rpc('has_role', {...}));
 */
export async function callRpc<T>(
  promise: PromiseLike<SupabaseResultLike<T>>
): Promise<T> {
  let result: SupabaseResultLike<T>;
  try {
    result = await promise;
  } catch (e) {
    const n = normalizeSupabaseError(e);
    const err = new Error(n.message) as Error & { normalized: NormalizedRpcError };
    err.normalized = n;
    throw err;
  }
  if (result.error) {
    const n = normalizeSupabaseError(result.error);
    const err = new Error(n.message) as Error & { normalized: NormalizedRpcError };
    err.normalized = n;
    throw err;
  }
  return result.data as T;
}

export type SafeRpcResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: NormalizedRpcError };

/** Non-throwing variant. Useful where callers want to branch on errors. */
export async function safeRpc<T>(
  promise: PromiseLike<SupabaseResultLike<T>>
): Promise<SafeRpcResult<T>> {
  try {
    const result = await promise;
    if (result.error) {
      return { ok: false, error: normalizeSupabaseError(result.error) };
    }
    return { ok: true, data: result.data as T };
  } catch (e) {
    return { ok: false, error: normalizeSupabaseError(e) };
  }
}
