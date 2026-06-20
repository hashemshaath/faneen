import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ADMIN_DASHBOARD_DEFAULT_ORDER,
  ADMIN_DASHBOARD_WIDGETS,
  getAdminWidget,
} from '../widgets/adminDashboardWidgets';

/**
 * ADMIN-REDESIGN PHASE 4 — per-user admin dashboard layout.
 *
 * Stores show/hide overrides + custom order in localStorage under a
 * dedicated namespaced key. Foundation only: no DB, no realtime.
 *
 * Invariants:
 *  - widgets flagged `hideable: false` can NEVER be hidden, even via
 *    a stale tab that wrote a bad payload to localStorage.
 *  - unknown widget ids are silently dropped (forwards-compatible).
 *  - newly-added registry widgets appear at the end of the user's
 *    custom order on the next render (no migration step needed).
 */
export const ADMIN_DASHBOARD_LAYOUT_KEY = 'qitaat_admin_dashboard_layout_v3';

interface StoredLayout {
  order: string[];
  hidden: string[];
}

export interface UseAdminDashboardLayoutResult {
  /** Visible widget ids in render order. */
  visibleOrder: string[];
  /** Full order (including hidden). Useful for an editor. */
  fullOrder: string[];
  hidden: string[];
  isHidden: (id: string) => boolean;
  canHide: (id: string) => boolean;
  toggleHidden: (id: string) => void;
  show: (id: string) => void;
  hide: (id: string) => void;
  /** Move a widget one slot earlier in the render order. No-op at top. */
  moveUp: (id: string) => void;
  /** Move a widget one slot later in the render order. No-op at bottom. */
  moveDown: (id: string) => void;
  reset: () => void;
  editMode: boolean;
  setEditMode: (next: boolean) => void;
}

function safeParse(raw: string | null): Partial<StoredLayout> {
  if (!raw) return {};
  try {
    const v: unknown = JSON.parse(raw);
    if (v && typeof v === 'object') return v as Partial<StoredLayout>;
  } catch { /* fall through */ }
  return {};
}

function sanitizeOrder(order: readonly string[] | undefined): string[] {
  const known = new Set(ADMIN_DASHBOARD_DEFAULT_ORDER);
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const id of order ?? []) {
    if (typeof id !== 'string') continue;
    if (!known.has(id)) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    cleaned.push(id);
  }
  // Append any widget id missing from the saved order so newly-added
  // registry entries surface automatically on next paint.
  for (const id of ADMIN_DASHBOARD_DEFAULT_ORDER) {
    if (!seen.has(id)) cleaned.push(id);
  }
  return cleaned;
}

function sanitizeHidden(hidden: readonly string[] | undefined): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of hidden ?? []) {
    if (typeof id !== 'string') continue;
    const def = getAdminWidget(id);
    if (!def || !def.hideable) continue; // non-hideable can never end up hidden
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function readStored(): StoredLayout {
  try {
    const parsed = safeParse(localStorage.getItem(ADMIN_DASHBOARD_LAYOUT_KEY));
    return {
      order: sanitizeOrder(parsed.order),
      hidden: sanitizeHidden(parsed.hidden),
    };
  } catch {
    return { order: [...ADMIN_DASHBOARD_DEFAULT_ORDER], hidden: [] };
  }
}

function writeStored(value: StoredLayout): void {
  try {
    localStorage.setItem(ADMIN_DASHBOARD_LAYOUT_KEY, JSON.stringify(value));
  } catch {
    /* quota / private-mode — silently ignore */
  }
}

export function useAdminDashboardLayout(): UseAdminDashboardLayoutResult {
  const [state, setState] = useState<StoredLayout>(() => readStored());
  const [editMode, setEditMode] = useState(false);

  // Cross-tab sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === ADMIN_DASHBOARD_LAYOUT_KEY) setState(readStored());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const commit = useCallback((next: StoredLayout) => {
    const cleaned: StoredLayout = {
      order: sanitizeOrder(next.order),
      hidden: sanitizeHidden(next.hidden),
    };
    setState(cleaned);
    writeStored(cleaned);
  }, []);

  const isHidden = useCallback(
    (id: string) => state.hidden.includes(id),
    [state.hidden],
  );

  const canHide = useCallback(
    (id: string) => getAdminWidget(id)?.hideable === true,
    [],
  );

  const hide = useCallback((id: string) => {
    if (!canHide(id)) return;
    setState((prev) => {
      if (prev.hidden.includes(id)) return prev;
      const next: StoredLayout = { order: prev.order, hidden: [...prev.hidden, id] };
      writeStored(next);
      return next;
    });
  }, [canHide]);

  const show = useCallback((id: string) => {
    setState((prev) => {
      if (!prev.hidden.includes(id)) return prev;
      const next: StoredLayout = {
        order: prev.order,
        hidden: prev.hidden.filter((x) => x !== id),
      };
      writeStored(next);
      return next;
    });
  }, []);

  const toggleHidden = useCallback((id: string) => {
    if (!canHide(id)) return;
    setState((prev) => {
      const isOff = prev.hidden.includes(id);
      const hidden = isOff ? prev.hidden.filter((x) => x !== id) : [...prev.hidden, id];
      const next: StoredLayout = { order: prev.order, hidden };
      writeStored(next);
      return next;
    });
  }, [canHide]);

  const reset = useCallback(() => {
    commit({ order: [...ADMIN_DASHBOARD_DEFAULT_ORDER], hidden: [] });
  }, [commit]);

  const moveBy = useCallback((id: string, delta: -1 | 1) => {
    setState((prev) => {
      const order = sanitizeOrder(prev.order);
      const i = order.indexOf(id);
      if (i === -1) return prev;
      const j = i + delta;
      if (j < 0 || j >= order.length) return prev;
      const next = order.slice();
      [next[i], next[j]] = [next[j], next[i]];
      const out: StoredLayout = { order: next, hidden: prev.hidden };
      writeStored(out);
      return out;
    });
  }, []);
  const moveUp = useCallback((id: string) => moveBy(id, -1), [moveBy]);
  const moveDown = useCallback((id: string) => moveBy(id, 1), [moveBy]);

  const fullOrder = useMemo(() => sanitizeOrder(state.order), [state.order]);
  const visibleOrder = useMemo(() => {
    const hiddenSet = new Set(state.hidden);
    // Force-include non-hideable widgets even if a stale entry tries to hide them.
    return fullOrder.filter((id) => {
      const def = getAdminWidget(id);
      if (!def) return false;
      if (!def.hideable) return true;
      return !hiddenSet.has(id);
    });
  }, [fullOrder, state.hidden]);

  return {
    visibleOrder,
    fullOrder,
    hidden: state.hidden,
    isHidden,
    canHide,
    toggleHidden,
    show,
    hide,
    moveUp,
    moveDown,
    reset,
    editMode,
    setEditMode,
  };
}

// Keep ADMIN_DASHBOARD_WIDGETS importable from this module too.
export { ADMIN_DASHBOARD_WIDGETS };