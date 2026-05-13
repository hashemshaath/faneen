import { useCallback, useEffect, useState } from 'react';

const STORAGE_PREFIX = 'qitaat_dashboard_layout_v1_';

export type WidgetId = string;

export interface WidgetConfig {
  id: WidgetId;
  hidden?: boolean;
}

export interface DashboardLayout {
  order: WidgetId[];
  hidden: WidgetId[];
}

function readLayout(key: string, defaults: WidgetId[]): DashboardLayout {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return { order: defaults, hidden: [] };
    const parsed = JSON.parse(raw) as Partial<DashboardLayout>;
    const order = Array.isArray(parsed.order) ? parsed.order.filter((id) => defaults.includes(id)) : [];
    // append any new widgets that didn't exist when layout was saved
    defaults.forEach((id) => { if (!order.includes(id)) order.push(id); });
    const hidden = Array.isArray(parsed.hidden) ? parsed.hidden.filter((id) => defaults.includes(id)) : [];
    return { order, hidden };
  } catch {
    return { order: defaults, hidden: [] };
  }
}

/**
 * Persists per-role dashboard widget order + visibility in localStorage.
 * `key` should be unique per dashboard view (e.g., 'user', 'provider', 'admin').
 */
export function useDashboardCustomization(key: string, defaults: WidgetId[]) {
  const [layout, setLayout] = useState<DashboardLayout>(() => readLayout(key, defaults));
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(layout));
    } catch {
      /* quota exceeded — silently ignore */
    }
  }, [key, layout]);

  const reorder = useCallback((from: WidgetId, to: WidgetId) => {
    setLayout((prev) => {
      const order = [...prev.order];
      const fromIdx = order.indexOf(from);
      const toIdx = order.indexOf(to);
      if (fromIdx === -1 || toIdx === -1) return prev;
      order.splice(fromIdx, 1);
      order.splice(toIdx, 0, from);
      return { ...prev, order };
    });
  }, []);

  const toggleHidden = useCallback((id: WidgetId) => {
    setLayout((prev) => ({
      ...prev,
      hidden: prev.hidden.includes(id) ? prev.hidden.filter((x) => x !== id) : [...prev.hidden, id],
    }));
  }, []);

  const reset = useCallback(() => {
    setLayout({ order: defaults, hidden: [] });
  }, [defaults]);

  return {
    layout,
    editMode,
    setEditMode,
    reorder,
    toggleHidden,
    reset,
    isHidden: (id: WidgetId) => layout.hidden.includes(id),
  };
}