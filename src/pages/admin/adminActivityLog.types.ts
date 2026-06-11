import type { Database } from '@/integrations/supabase/types';

export type AdminActivityLogRow =
  Database['public']['Tables']['admin_activity_log']['Row'];

/** Heterogeneous `details` payload (jsonb). Narrowed per-action at read sites. */
export type AdminActivityLogDetailsRecord = Record<string, unknown>;

/** Coerce an unknown jsonb value into a safe Record for keyed reads. */
export function asDetailsRecord(
  value: unknown,
): AdminActivityLogDetailsRecord | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as AdminActivityLogDetailsRecord;
  }
  return null;
}

/** Read a string-ish field from a details record. */
export function getDetailString(
  details: AdminActivityLogDetailsRecord | null,
  key: string,
): string | undefined {
  if (!details) return undefined;
  const v = details[key];
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

/** A `{ old, new }` change pair as it appears under `details.changes[field]`. */
export interface AdminActivityLogChangePair {
  old: unknown;
  new: unknown;
}

export function isChangePair(value: unknown): value is AdminActivityLogChangePair {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    'old' in (value as Record<string, unknown>)
  );
}