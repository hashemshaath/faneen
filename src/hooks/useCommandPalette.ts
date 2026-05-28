/**
 * APP-SHELL-REARCHITECTURE-1 — Command palette open-state hook.
 *
 * ⌘K / Ctrl+K toggles the palette. Skips the global Cmd+K search shortcut
 * by setting `event.defaultPrevented` so `useGlobalSearch` falls through.
 */
import { useCallback, useEffect, useState } from 'react';

export interface CommandPaletteState {
  open: boolean;
  setOpen: (next: boolean) => void;
  toggle: () => void;
  close: () => void;
}

export function useCommandPalette(): CommandPaletteState {
  const [open, setOpen] = useState(false);

  const toggle = useCallback(() => setOpen((prev) => !prev), []);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isK = e.key === 'k' || e.key === 'K';
      if (!isK) return;
      if (!(e.metaKey || e.ctrlKey)) return;
      e.preventDefault();
      e.stopPropagation();
      setOpen((prev) => !prev);
    };
    // Capture phase so we run before useGlobalSearch's document listener.
    document.addEventListener('keydown', handler, { capture: true });
    return () => document.removeEventListener('keydown', handler, { capture: true } as EventListenerOptions);
  }, []);

  return { open, setOpen, toggle, close };
}