/**
 * APP-SHELL-REARCHITECTURE-1 — Recent workspace context store.
 *
 * LocalStorage-only, schema-versioned, capped at MAX_ENTRIES. Pure module:
 * no React, no network. Guarded against malformed/legacy payloads.
 */

export const RECENT_CONTEXT_STORAGE_KEY = 'qitaat_shell_recent_v1';
export const MAX_ENTRIES = 20;

export interface RecentContextEntry {
  ref: string | null;
  label: string;
  path: string;
  /** Coarse bucket so UIs can group/filter. */
  kind: 'work-order' | 'contract' | 'lead' | 'quote' | 'team' | 'staff' | 'admin' | 'page';
  /** Epoch ms when last visited. */
  visited_at: number;
}

interface Envelope {
  v: 1;
  entries: RecentContextEntry[];
}

function safeStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readRecentContext(): RecentContextEntry[] {
  const s = safeStorage();
  if (!s) return [];
  try {
    const raw = s.getItem(RECENT_CONTEXT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Envelope | unknown;
    if (!parsed || typeof parsed !== 'object') return [];
    const env = parsed as Envelope;
    if (env.v !== 1 || !Array.isArray(env.entries)) return [];
    return env.entries
      .filter((e): e is RecentContextEntry =>
        !!e && typeof e.label === 'string' && typeof e.path === 'string' &&
        typeof e.visited_at === 'number' && typeof e.kind === 'string',
      )
      .slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

function writeAll(entries: RecentContextEntry[]): void {
  const s = safeStorage();
  if (!s) return;
  try {
    const env: Envelope = { v: 1, entries: entries.slice(0, MAX_ENTRIES) };
    s.setItem(RECENT_CONTEXT_STORAGE_KEY, JSON.stringify(env));
  } catch {
    /* quota — silently drop */
  }
}

export function recordRecentContext(entry: Omit<RecentContextEntry, 'visited_at'> & { visited_at?: number }): RecentContextEntry[] {
  const now = entry.visited_at ?? Date.now();
  const next: RecentContextEntry = { ...entry, visited_at: now };
  const existing = readRecentContext();
  // Dedupe by (path, ref).
  const filtered = existing.filter(
    (e) => !(e.path === next.path && (e.ref ?? null) === (next.ref ?? null)),
  );
  const updated = [next, ...filtered].slice(0, MAX_ENTRIES);
  writeAll(updated);
  return updated;
}

export function clearRecentContext(): void {
  const s = safeStorage();
  if (!s) return;
  try { s.removeItem(RECENT_CONTEXT_STORAGE_KEY); } catch { /* noop */ }
}