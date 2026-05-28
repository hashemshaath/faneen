/**
 * APP-SHELL-REARCHITECTURE-2 — Smart workspace state store.
 *
 * Pure, localStorage-backed, schema-versioned. No React, no DB, no network.
 * Tracks the user's adaptive workspace context so the shell can:
 *   - restore the last entity / team / module after refresh
 *   - surface recently used refs/routes/searches
 *   - power contextual quick actions and breadcrumbs
 *
 * Security:
 *   - This store is a UI preference layer only. It must never be treated
 *     as authoritative. RLS + has_permission RPC remain the authority.
 *   - Spoofed ids in localStorage are reconciled by hooks against the
 *     RLS-scoped accessible lists (see useWorkspaceState).
 */

export const WORKSPACE_STATE_STORAGE_KEY = 'qitaat_shell_workspace_state_v1';
export const MAX_RECENT_REFS = 20;
export const MAX_RECENT_ROUTES = 20;
export const MAX_PINNED_REFS = 12;
export const MAX_RECENT_SEARCHES = 10;

export interface RecentRefEntry {
  ref: string;
  label: string;
  path: string;
  visited_at: number;
}

export interface RecentRouteEntry {
  path: string;
  label?: string;
  visited_at: number;
}

export interface PinnedRefEntry {
  ref: string;
  label: string;
  path: string;
  pinned_at: number;
}

export interface RecentSearchEntry {
  query: string;
  searched_at: number;
}

export interface WorkspaceContextSnapshot {
  entity_id: string | null;
  ref: string | null;
  module: string | null;
  /** Where this context came from (e.g. 'route', 'switcher'). */
  source: 'route' | 'switcher' | 'recovery' | 'unknown';
}

/**
 * APP-SHELL-STABILIZATION-1 — UI-only workspace preferences.
 * Persist in the same envelope; default values applied during sanitize.
 */
export type EntityViewMode = 'list' | 'grid' | 'compact';

export interface WorkspacePreferences {
  compact_mode: boolean;
  reduced_motion: boolean;
  preferred_entity_view: EntityViewMode;
  /** Map of section-id → collapsed boolean. */
  collapsed_sections: Record<string, boolean>;
}

export const DEFAULT_PREFERENCES: WorkspacePreferences = {
  compact_mode: false,
  reduced_motion: false,
  preferred_entity_view: 'list',
  collapsed_sections: {},
};

export interface WorkspaceStateV1 {
  v: 1;
  active_entity_id: string | null;
  active_team_id: string | null;
  recent_refs: RecentRefEntry[];
  recent_routes: RecentRouteEntry[];
  pinned_refs: PinnedRefEntry[];
  recent_searches: RecentSearchEntry[];
  last_module: string | null;
  last_context: WorkspaceContextSnapshot | null;
  preferences: WorkspacePreferences;
}

function emptyState(): WorkspaceStateV1 {
  return {
    v: 1,
    active_entity_id: null,
    active_team_id: null,
    recent_refs: [],
    recent_routes: [],
    pinned_refs: [],
    recent_searches: [],
    last_module: null,
    last_context: null,
    preferences: { ...DEFAULT_PREFERENCES, collapsed_sections: {} },
  };
}

function safeStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function isObj(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object';
}

function sanitize(raw: unknown): WorkspaceStateV1 {
  if (!isObj(raw) || raw.v !== 1) return emptyState();
  const base = emptyState();

  const recent_refs = Array.isArray(raw.recent_refs)
    ? raw.recent_refs
        .filter((e): e is RecentRefEntry =>
          isObj(e) && typeof e.ref === 'string' && typeof e.label === 'string'
          && typeof e.path === 'string' && typeof e.visited_at === 'number',
        )
        .slice(0, MAX_RECENT_REFS)
    : [];

  const recent_routes = Array.isArray(raw.recent_routes)
    ? raw.recent_routes
        .filter((e): e is RecentRouteEntry =>
          isObj(e) && typeof e.path === 'string' && typeof e.visited_at === 'number',
        )
        .slice(0, MAX_RECENT_ROUTES)
    : [];

  const pinned_refs = Array.isArray(raw.pinned_refs)
    ? raw.pinned_refs
        .filter((e): e is PinnedRefEntry =>
          isObj(e) && typeof e.ref === 'string' && typeof e.label === 'string'
          && typeof e.path === 'string' && typeof e.pinned_at === 'number',
        )
        .slice(0, MAX_PINNED_REFS)
    : [];

  const recent_searches = Array.isArray(raw.recent_searches)
    ? raw.recent_searches
        .filter((e): e is RecentSearchEntry =>
          isObj(e) && typeof e.query === 'string' && typeof e.searched_at === 'number',
        )
        .slice(0, MAX_RECENT_SEARCHES)
    : [];

  const ctxRaw = raw.last_context;
  const last_context: WorkspaceContextSnapshot | null = isObj(ctxRaw)
    ? {
        entity_id: typeof ctxRaw.entity_id === 'string' ? ctxRaw.entity_id : null,
        ref: typeof ctxRaw.ref === 'string' ? ctxRaw.ref : null,
        module: typeof ctxRaw.module === 'string' ? ctxRaw.module : null,
        source: (ctxRaw.source === 'route' || ctxRaw.source === 'switcher'
          || ctxRaw.source === 'recovery') ? ctxRaw.source : 'unknown',
      }
    : null;

  const prefRaw = raw.preferences;
  const validView: EntityViewMode[] = ['list', 'grid', 'compact'];
  const collapsedRaw = isObj(prefRaw) && isObj(prefRaw.collapsed_sections)
    ? prefRaw.collapsed_sections as Record<string, unknown>
    : {};
  const collapsed_sections: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(collapsedRaw)) {
    if (typeof v === 'boolean') collapsed_sections[k] = v;
  }
  const preferences: WorkspacePreferences = isObj(prefRaw)
    ? {
        compact_mode: typeof prefRaw.compact_mode === 'boolean' ? prefRaw.compact_mode : false,
        reduced_motion: typeof prefRaw.reduced_motion === 'boolean' ? prefRaw.reduced_motion : false,
        preferred_entity_view: validView.includes(prefRaw.preferred_entity_view as EntityViewMode)
          ? (prefRaw.preferred_entity_view as EntityViewMode)
          : 'list',
        collapsed_sections,
      }
    : { ...DEFAULT_PREFERENCES, collapsed_sections: {} };

  return {
    ...base,
    active_entity_id: typeof raw.active_entity_id === 'string' ? raw.active_entity_id : null,
    active_team_id: typeof raw.active_team_id === 'string' ? raw.active_team_id : null,
    recent_refs,
    recent_routes,
    pinned_refs,
    recent_searches,
    last_module: typeof raw.last_module === 'string' ? raw.last_module : null,
    last_context,
    preferences,
  };
}

export function readWorkspaceState(): WorkspaceStateV1 {
  const s = safeStorage();
  if (!s) return emptyState();
  try {
    const raw = s.getItem(WORKSPACE_STATE_STORAGE_KEY);
    if (!raw) return emptyState();
    return sanitize(JSON.parse(raw));
  } catch {
    return emptyState();
  }
}

function writeWorkspaceState(state: WorkspaceStateV1): void {
  const s = safeStorage();
  if (!s) return;
  try {
    s.setItem(WORKSPACE_STATE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota — silently drop */
  }
}

export function updateWorkspaceState(
  updater: (prev: WorkspaceStateV1) => WorkspaceStateV1,
): WorkspaceStateV1 {
  const prev = readWorkspaceState();
  const next = updater(prev);
  writeWorkspaceState(next);
  return next;
}

export function clearWorkspaceState(): void {
  const s = safeStorage();
  if (!s) return;
  try { s.removeItem(WORKSPACE_STATE_STORAGE_KEY); } catch { /* noop */ }
}

// ---------- High-level mutators ----------

export function setActiveEntity(id: string | null): WorkspaceStateV1 {
  return updateWorkspaceState((p) => ({ ...p, active_entity_id: id }));
}

export function setActiveTeam(id: string | null): WorkspaceStateV1 {
  return updateWorkspaceState((p) => ({ ...p, active_team_id: id }));
}

export function setLastModule(module: string | null): WorkspaceStateV1 {
  return updateWorkspaceState((p) => ({ ...p, last_module: module }));
}

export function setLastContext(ctx: WorkspaceContextSnapshot | null): WorkspaceStateV1 {
  return updateWorkspaceState((p) => ({ ...p, last_context: ctx }));
}

export function pushRecentRef(entry: Omit<RecentRefEntry, 'visited_at'> & { visited_at?: number }): WorkspaceStateV1 {
  const visited_at = entry.visited_at ?? Date.now();
  return updateWorkspaceState((p) => {
    const filtered = p.recent_refs.filter((e) => !(e.ref === entry.ref && e.path === entry.path));
    const next: RecentRefEntry = { ref: entry.ref, label: entry.label, path: entry.path, visited_at };
    return { ...p, recent_refs: [next, ...filtered].slice(0, MAX_RECENT_REFS) };
  });
}

export function pushRecentRoute(entry: Omit<RecentRouteEntry, 'visited_at'> & { visited_at?: number }): WorkspaceStateV1 {
  const visited_at = entry.visited_at ?? Date.now();
  return updateWorkspaceState((p) => {
    const filtered = p.recent_routes.filter((e) => e.path !== entry.path);
    const next: RecentRouteEntry = { path: entry.path, label: entry.label, visited_at };
    return { ...p, recent_routes: [next, ...filtered].slice(0, MAX_RECENT_ROUTES) };
  });
}

export function togglePinnedRef(entry: Omit<PinnedRefEntry, 'pinned_at'>): WorkspaceStateV1 {
  return updateWorkspaceState((p) => {
    const existing = p.pinned_refs.find((e) => e.ref === entry.ref);
    if (existing) {
      return { ...p, pinned_refs: p.pinned_refs.filter((e) => e.ref !== entry.ref) };
    }
    const next: PinnedRefEntry = { ...entry, pinned_at: Date.now() };
    return { ...p, pinned_refs: [next, ...p.pinned_refs].slice(0, MAX_PINNED_REFS) };
  });
}

export function pushRecentSearch(query: string): WorkspaceStateV1 {
  const q = query.trim();
  if (!q) return readWorkspaceState();
  return updateWorkspaceState((p) => {
    const filtered = p.recent_searches.filter((e) => e.query !== q);
    const next: RecentSearchEntry = { query: q, searched_at: Date.now() };
    return { ...p, recent_searches: [next, ...filtered].slice(0, MAX_RECENT_SEARCHES) };
  });
}

// ---------- Preference mutators (APP-SHELL-STABILIZATION-1) ----------

export function setPreference<K extends keyof WorkspacePreferences>(
  key: K,
  value: WorkspacePreferences[K],
): WorkspaceStateV1 {
  return updateWorkspaceState((p) => ({
    ...p,
    preferences: { ...p.preferences, [key]: value },
  }));
}

export function setSectionCollapsed(sectionId: string, collapsed: boolean): WorkspaceStateV1 {
  return updateWorkspaceState((p) => ({
    ...p,
    preferences: {
      ...p.preferences,
      collapsed_sections: { ...p.preferences.collapsed_sections, [sectionId]: collapsed },
    },
  }));
}

export function toggleSectionCollapsed(sectionId: string): WorkspaceStateV1 {
  return updateWorkspaceState((p) => {
    const current = !!p.preferences.collapsed_sections[sectionId];
    return {
      ...p,
      preferences: {
        ...p.preferences,
        collapsed_sections: { ...p.preferences.collapsed_sections, [sectionId]: !current },
      },
    };
  });
}