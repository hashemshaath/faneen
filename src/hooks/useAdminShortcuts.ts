/**
 * useAdminShortcuts — global keyboard shortcuts for admin pages.
 *
 * Conventions (matches macOS Mail / Linear):
 *   - `/`       focus search
 *   - `n`       new / create
 *   - `r`       refresh / refetch
 *   - `e`       export
 *   - `Esc`     close inline panel
 *
 * Each handler is optional. Handlers are suppressed when the user is
 * typing in an editable element (input/textarea/contenteditable) so we
 * never steal keys mid-typing.
 */
import { useEffect } from 'react';

export interface AdminShortcutHandlers {
  onFocusSearch?: () => void;
  onNew?: () => void;
  onRefresh?: () => void;
  onExport?: () => void;
  onEscape?: () => void;
}

function isEditableTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (el.isContentEditable) return true;
  return false;
}

export function useAdminShortcuts(handlers: AdminShortcutHandlers): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Allow Esc even when in an input — it usually means "cancel".
      if (e.key === 'Escape') {
        if (handlers.onEscape) {
          handlers.onEscape();
        }
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isEditableTarget(e.target)) return;
      switch (e.key) {
        case '/':
          if (handlers.onFocusSearch) {
            e.preventDefault();
            handlers.onFocusSearch();
          }
          break;
        case 'n':
        case 'N':
          if (handlers.onNew) {
            e.preventDefault();
            handlers.onNew();
          }
          break;
        case 'r':
        case 'R':
          if (handlers.onRefresh) {
            e.preventDefault();
            handlers.onRefresh();
          }
          break;
        case 'e':
        case 'E':
          if (handlers.onExport) {
            e.preventDefault();
            handlers.onExport();
          }
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handlers]);
}

export default useAdminShortcuts;