/**
 * CRITICAL-ENTITY-IDENTITY-ACCESS-FIX-1 — Phase 1
 * ───────────────────────────────────────────────
 * Self-heal for the workspace-state store's `active_entity_id`.
 *
 * Why: `workspaceStateStore` persists `active_entity_id` independently of
 * the per-user `useActiveBusiness` localStorage key. If that id becomes
 * stale (entity revoked, ref deleted, account switch on shared device),
 * the shell can render with a non-accessible entity selected, breaking
 * permission-scoped UI even though RLS still denies all reads.
 *
 * Behavior:
 *   - Wait for the entity list to load (avoids clearing during transient
 *     loading states).
 *   - If `active_entity_id` is set but not in the accessible list, clear
 *     it and fall back to the first accessible entity (matching
 *     `useActiveBusiness` behavior).
 *   - If the user has zero accessible entities, leave `active_entity_id`
 *     null. Never loop.
 *   - Emits a single dev-safe console.warn diagnostic per repair (gated
 *     behind `import.meta.env.DEV`) — no PII.
 *
 * Security:
 *   - UI-only. RLS remains authoritative on every data path.
 */
import { useEffect, useRef } from 'react';
import { useActiveWorkspace } from '@/hooks/useActiveWorkspace';
import { useWorkspaceState } from '@/hooks/useWorkspaceState';

export function useWorkspaceStateSelfHeal(): void {
  const ws = useActiveWorkspace();
  const state = useWorkspaceState();
  const repairedRef = useRef<string | null>(null);

  useEffect(() => {
    if (ws.isLoading) return;
    const accessibleIds = ws.entities.map((e) => e.entity_id);
    const current = state.active_entity_id;

    // Case A: persisted entity is stale → repair to first accessible OR null.
    if (current && !accessibleIds.includes(current)) {
      const fallback = accessibleIds[0] ?? null;
      if (repairedRef.current === current) return; // no double-repair loop
      repairedRef.current = current;
      state.setActiveEntity(fallback);
      if (import.meta.env.DEV) {
        // No PII: only ids are logged.
        // eslint-disable-next-line no-console
        console.warn(
          '[workspace] cleared stale active_entity_id',
          { stale: current, fallback, accessible: accessibleIds.length },
        );
      }
      return;
    }

    // Case B: nothing persisted but we DO have an active entity from
    // useActiveBusiness → mirror it into the store so contextual UI
    // (SmartEntitySwitcher, useHasPermission) stays consistent.
    if (!current && ws.active_entity_id) {
      state.setActiveEntity(ws.active_entity_id);
    }
  }, [
    ws.isLoading,
    ws.entities,
    ws.active_entity_id,
    state.active_entity_id,
    state,
  ]);
}

/**
 * Hard-reset the user's workspace selection. Safe to call from any UI;
 * does not touch DB or auth state. Clears the store's `active_entity_id`
 * and lets the next render's self-heal pick the first accessible entity.
 */
export function resetWorkspaceSelection(
  setActiveEntity: (id: string | null) => void,
): void {
  setActiveEntity(null);
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.warn('[workspace] manual reset of active_entity_id');
  }
}