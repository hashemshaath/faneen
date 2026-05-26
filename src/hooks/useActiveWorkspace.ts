/**
 * WORKSPACE-CONTEXT-1 — Step 1 (minimal, safe)
 *
 * Read-only frontend aggregator that exposes the user's "active workspace"
 * as a unified shape:
 *
 *   {
 *     active_entity_id,        // selected entity (business) id
 *     active_location_id,      // deferred to Step 2 — always null today
 *     active_membership_id,    // owner business.id or business_staff.id
 *     active_role,             // 'owner' | business_staff_role | null
 *     permissions,             // deferred to Step 2 — RLS remains authoritative
 *     entities,                // all accessible entities w/ source + role
 *   }
 *
 * Important guarantees:
 * - Reuses existing `useActiveBusiness` for localStorage preference
 *   (per-user key, self-heal fallback to first accessible entity).
 * - Does NOT trust localStorage for security. RLS / has_entity_membership
 *   remain authoritative on every data path.
 * - Inaccessible entities are ignored automatically because the entity list
 *   is sourced from server-side wrappers (listOwnerBusinesses +
 *   listActiveStaffBusinessesForUser) which both go through RLS.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/contexts/AuthContext';
import { useActiveBusiness } from '@/hooks/useActiveBusiness';
import {
  listOwnerBusinesses,
  listActiveStaffBusinessesForUser,
} from '@/modules/businesses';

export type WorkspaceSource = 'owner' | 'staff';

export interface WorkspaceEntity {
  entity_id: string;
  name_ar: string | null;
  name_en: string | null;
  source: WorkspaceSource;
  membership_id: string; // businesses.id for owner, business_staff.id for staff
  role: string | null;   // 'owner' | business_staff_role
}

export interface ActiveWorkspace {
  active_entity_id: string | null;
  active_location_id: string | null; // deferred — Step 2
  active_membership_id: string | null;
  active_role: string | null;
  permissions: string[]; // deferred — RLS authoritative
  entities: WorkspaceEntity[];
  isLoading: boolean;
  setActiveEntityId: (id: string | null) => void;
}

interface OwnerRow {
  id: string;
  name_ar: string | null;
  name_en: string | null;
}

interface StaffRow {
  id: string;
  role: string | null;
  businesses: {
    id: string;
    name_ar: string | null;
    name_en: string | null;
  } | null;
}

export function useActiveWorkspace(): ActiveWorkspace {
  const { user } = useAuth();

  const { data: entities = [], isLoading } = useQuery({
    queryKey: ['active-workspace-entities', user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async (): Promise<WorkspaceEntity[]> => {
      const owned = await listOwnerBusinesses<OwnerRow>({
        userId: user!.id,
        select: 'id, name_ar, name_en',
        orderBy: { column: 'created_at', ascending: true },
      });
      const staff = await listActiveStaffBusinessesForUser<StaffRow>({
        userId: user!.id,
        select: 'id, role, businesses:business_id(id, name_ar, name_en)',
      });

      const out = new Map<string, WorkspaceEntity>();
      (owned.data ?? []).forEach((b) => {
        out.set(b.id, {
          entity_id: b.id,
          name_ar: b.name_ar,
          name_en: b.name_en,
          source: 'owner',
          membership_id: b.id,
          role: 'owner',
        });
      });
      (staff.data ?? []).forEach((r) => {
        const b = r.businesses;
        if (!b || out.has(b.id)) return;
        out.set(b.id, {
          entity_id: b.id,
          name_ar: b.name_ar,
          name_en: b.name_en,
          source: 'staff',
          membership_id: r.id,
          role: r.role ?? 'staff',
        });
      });
      return Array.from(out.values());
    },
  });

  const ids = useMemo(() => entities.map((e) => e.entity_id), [entities]);
  const { activeBusinessId, setActiveBusinessId } = useActiveBusiness(ids);

  const active = useMemo(
    () => entities.find((e) => e.entity_id === activeBusinessId) ?? entities[0] ?? null,
    [entities, activeBusinessId],
  );

  return {
    active_entity_id: active?.entity_id ?? null,
    active_location_id: null,
    active_membership_id: active?.membership_id ?? null,
    active_role: active?.role ?? null,
    permissions: [],
    entities,
    isLoading,
    setActiveEntityId: setActiveBusinessId,
  };
}
