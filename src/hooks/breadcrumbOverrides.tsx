/**
 * Lightweight per-path breadcrumb label overrides.
 *
 * Detail pages (sites, projects, contracts, …) load human-friendly
 * names asynchronously. Without an override mechanism the breadcrumb
 * derivation in `useBreadcrumbs` falls back to `#<short-id>` for any
 * UUID segment. Pages can call `useSetBreadcrumbLabel(path, label)`
 * after their data resolves to replace that masked id with the real
 * name. Pure client state — no network, no DB.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

type Overrides = Record<string, string>;

interface Ctx {
  overrides: Overrides;
  set: (path: string, label: string | null | undefined) => void;
  clear: (path: string) => void;
}

const BreadcrumbOverridesContext = createContext<Ctx | null>(null);

export const BreadcrumbOverridesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [overrides, setOverrides] = useState<Overrides>({});
  const set = useCallback((path: string, label: string | null | undefined) => {
    setOverrides((prev) => {
      const trimmed = typeof label === 'string' ? label.trim() : '';
      if (!trimmed) {
        if (!(path in prev)) return prev;
        const next = { ...prev };
        delete next[path];
        return next;
      }
      if (prev[path] === trimmed) return prev;
      return { ...prev, [path]: trimmed };
    });
  }, []);
  const clear = useCallback((path: string) => {
    setOverrides((prev) => {
      if (!(path in prev)) return prev;
      const next = { ...prev };
      delete next[path];
      return next;
    });
  }, []);
  const value = useMemo(() => ({ overrides, set, clear }), [overrides, set, clear]);
  return (
    <BreadcrumbOverridesContext.Provider value={value}>
      {children}
    </BreadcrumbOverridesContext.Provider>
  );
};

export function useBreadcrumbOverrides(): Overrides {
  return useContext(BreadcrumbOverridesContext)?.overrides ?? {};
}

/**
 * Register a human-friendly label for a specific breadcrumb path.
 * Pass `null`/empty to clear. Auto-cleans on unmount.
 */
export function useSetBreadcrumbLabel(path: string | null | undefined, label: string | null | undefined): void {
  const ctx = useContext(BreadcrumbOverridesContext);
  useEffect(() => {
    if (!ctx || !path) return;
    ctx.set(path, label);
    return () => ctx.clear(path);
  }, [ctx, path, label]);
}