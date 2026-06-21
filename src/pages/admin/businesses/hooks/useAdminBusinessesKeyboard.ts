/**
 * Phase 5H — keyboard-shortcut wiring for AdminBusinesses.
 *
 * Behaviour-preserving extraction of the inline `useEffect` that
 * bound `/`, `n`, `r`, `e`, and `Escape` to admin actions on the
 * `/admin/businesses` page. The host page still owns mutations and
 * state; this hook only attaches the listener.
 */
import { useEffect, useRef } from 'react';

export interface AdminBusinessesKeyboardHandlers {
  onFocusSearch: () => void;
  onCreate: () => void;
  onRefresh: () => void;
  onExport: () => void;
  onEscape: () => void;
}

export function useAdminBusinessesKeyboard(
  handlers: AdminBusinessesKeyboardHandlers,
): void {
  const ref = useRef(handlers);
  ref.current = handlers;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const h = ref.current;
      if (e.key === '/') { e.preventDefault(); h.onFocusSearch(); return; }
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); h.onCreate(); return; }
      if (e.key === 'r' || e.key === 'R') { e.preventDefault(); h.onRefresh(); return; }
      if (e.key === 'e' || e.key === 'E') { e.preventDefault(); h.onExport(); return; }
      if (e.key === 'Escape') h.onEscape();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}