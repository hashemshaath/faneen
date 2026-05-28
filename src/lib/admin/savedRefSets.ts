/**
 * BUSINESS-ADMIN-6 — Saved Reference Sets (localStorage, per admin user).
 *
 * Storage only — no DB, no network, no notifications, no cron, no realtime.
 * Refs are re-validated through `parseAdminBulkRefs` before being persisted,
 * so UUIDs and malformed tokens are silently rejected. Caller passes the
 * authenticated admin user id; key is scoped per-user so a shared machine
 * cannot leak sets across admin accounts.
 */
import { parseAdminBulkRefs } from '@/modules/admin';

export const SAVED_SETS_MAX = 20;
export const REFS_PER_SET_MAX = 100;
export const SET_NAME_MIN = 1;
export const SET_NAME_MAX = 80;

export const SAVED_REF_SETS_KEY_PREFIX = 'qitaat_admin_saved_ref_sets_';

export interface SavedRefSet {
  id: string;
  name: string;
  refs: string[];
  created_at: string;
  updated_at: string;
}

export type SaveSetError =
  | 'invalid_name'
  | 'no_valid_refs'
  | 'too_many_sets'
  | 'not_found'
  | 'storage_unavailable';

export interface SaveSetResult {
  data: SavedRefSet | null;
  error: SaveSetError | null;
}

export function savedRefSetsStorageKey(uid: string | null | undefined): string {
  const safe = (uid ?? 'anon').replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${SAVED_REF_SETS_KEY_PREFIX}${safe || 'anon'}`;
}

function readRaw(uid: string | null | undefined): SavedRefSet[] {
  try {
    const raw = window.localStorage.getItem(savedRefSetsStorageKey(uid));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSavedRefSet);
  } catch {
    return [];
  }
}

function writeRaw(uid: string | null | undefined, sets: SavedRefSet[]): boolean {
  try {
    window.localStorage.setItem(
      savedRefSetsStorageKey(uid),
      JSON.stringify(sets),
    );
    return true;
  } catch {
    return false;
  }
}

function isSavedRefSet(v: unknown): v is SavedRefSet {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    typeof o.name === 'string' &&
    Array.isArray(o.refs) &&
    o.refs.every((r) => typeof r === 'string') &&
    typeof o.created_at === 'string' &&
    typeof o.updated_at === 'string'
  );
}

function normalizeName(name: string): string | null {
  const trimmed = (name ?? '').trim();
  if (trimmed.length < SET_NAME_MIN || trimmed.length > SET_NAME_MAX) return null;
  return trimmed;
}

function newId(): string {
  // Local-only opaque id; not a database identifier and never displayed as
  // a primary identifier. Avoids depending on `crypto.randomUUID`.
  return `set_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function listSavedRefSets(uid: string | null | undefined): SavedRefSet[] {
  return readRaw(uid).sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
}

export function saveRefSet(input: {
  uid: string | null | undefined;
  name: string;
  rawRefs: string;
}): SaveSetResult {
  const name = normalizeName(input.name);
  if (!name) return { data: null, error: 'invalid_name' };
  const parsed = parseAdminBulkRefs(input.rawRefs ?? '', { max: REFS_PER_SET_MAX });
  const refs = parsed.valid.slice(0, REFS_PER_SET_MAX);
  if (refs.length === 0) return { data: null, error: 'no_valid_refs' };

  const existing = readRaw(input.uid);
  if (existing.length >= SAVED_SETS_MAX) {
    return { data: null, error: 'too_many_sets' };
  }
  const now = new Date().toISOString();
  const set: SavedRefSet = {
    id: newId(),
    name,
    refs,
    created_at: now,
    updated_at: now,
  };
  const next = [set, ...existing];
  if (!writeRaw(input.uid, next)) return { data: null, error: 'storage_unavailable' };
  return { data: set, error: null };
}

export function renameRefSet(input: {
  uid: string | null | undefined;
  id: string;
  newName: string;
}): SaveSetResult {
  const name = normalizeName(input.newName);
  if (!name) return { data: null, error: 'invalid_name' };
  const sets = readRaw(input.uid);
  const idx = sets.findIndex((s) => s.id === input.id);
  if (idx < 0) return { data: null, error: 'not_found' };
  const updated: SavedRefSet = {
    ...sets[idx],
    name,
    updated_at: new Date().toISOString(),
  };
  const next = [...sets];
  next[idx] = updated;
  if (!writeRaw(input.uid, next)) return { data: null, error: 'storage_unavailable' };
  return { data: updated, error: null };
}

export function deleteRefSet(input: {
  uid: string | null | undefined;
  id: string;
}): { ok: boolean; error: SaveSetError | null } {
  const sets = readRaw(input.uid);
  const next = sets.filter((s) => s.id !== input.id);
  if (next.length === sets.length) return { ok: false, error: 'not_found' };
  if (!writeRaw(input.uid, next)) return { ok: false, error: 'storage_unavailable' };
  return { ok: true, error: null };
}

/** Convert a saved set's refs back into textarea input. */
export function refsToTextarea(refs: string[]): string {
  return refs.join('\n');
}