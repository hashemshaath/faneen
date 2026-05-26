/**
 * useDebouncedValue — single source of truth for field debounce timing.
 *
 * Unified across every "name-like" field (username, email, phone, slug)
 * so availability checks and live validation share the same 450ms window.
 * Changing the constant here updates every consumer.
 */
import { useEffect, useState } from 'react';

export const FIELD_DEBOUNCE_MS = 450;

export function useDebouncedValue<T>(value: T, delay: number = FIELD_DEBOUNCE_MS): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export default useDebouncedValue;