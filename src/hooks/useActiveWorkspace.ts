/**
 * WORKSPACE-CONTEXT-1/2 — read-only frontend aggregator for the user's
 * "active workspace" (entity + optional location + permissions hint).
 *
 *   {
 *     active_entity_id,        // selected entity (business) id
 *     active_location_id,      // selected location within entity, or null
 *     active_membership_id,    // businesses.id (owner) or business_staff.id
 *     active_role,             // 'owner' | business_staff_role | null
 *     permissions,             // UI-only hint from permissions_override
 *     entities,                // accessible entities w/ source + role
 *     locations,               // accessible locations for active entity
 *     setActiveEntityId,
 *     setActiveLocationId,
 *     clearActiveLocationId,
 *   }
 *
 * Security:
 * - localStorage holds preference only. RLS / has_entity_membership /
 *   has_location_access remain authoritative on every data path.
 * - Entity and location lists come from canonical wrappers
 *   (RLS-scoped). Spoofed ids in localStorage cannot expose extra rows
 *   because the self-heal step always reconciles against those lists.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/contexts/AuthContext';
import { useActiveBusiness } from '@/hooks/useActiveBusiness';
import {
  listOwnerBusinesses,
  listActiveStaffBusinessesForUser,
} from '@/modules/businesses';
import {
  listLocationsForEntity,
  type WorkspaceLocationRow,
} from '@/modules/locations';

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
  active_location_id: string | null;
  active_membership_id: string | null;
  active_role: string | null;
  permissions: string[];
  entities: WorkspaceEntity[];
  locations: WorkspaceLocationRow[];
  isLoading: boolean;
  setActiveEntityId: (id: string | null) => void;
  setActiveLocationId: (id: string | null) => void;
  clearActiveLocationId: () => void;
}

interface OwnerRow {
  id: string;
  name_ar: string | null;
  name_en: string | null;
}

interface StaffRow {
  id: string;
  role: string | null;
  permissions_override: unknown;
  businesses: {
    id: string;
    name_ar: string | null;
    name_en: string | null;
  } | null;
}

interface WorkspaceEntityInternal extends WorkspaceEntity {
  permissions_override: unknown;
}

const locationKey = (uid: string | undefined, entityId: string | null): string | null =>
  uid && entityId ? `qitaat_active_location_${uid}_${entityId}` : null;

function readLocationPref(uid: string | undefined, entityId: string | null): string | null {
  const k = locationKey(uid, entityId);
  if (!k) return null;
  try {
    const v = localStorage.getItem(k);
    return v && v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

function writeLocationPref(uid: string | undefined, entityId: string | null, id: string | null): void {
  const k = locationKey(uid, entityId);
  if (!k) return;
  try {
    if (id) localStorage.setItem(k, id);
    else localStorage.removeItem(k);
  } catch {
    /* noop */
  }
}

/**
 * Convert a jsonb `permissions_override` value into a UI-only string[]
 * hint. Accepts arrays and `Record<string, boolean>` shapes.
 */
function hydratePermissions(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((v): v is string => typeof v === 'string');
  }
  if (raw && typeof raw === 'object') {
    return Object.entries(raw as Record<string, unknown>)
      .filter(([, v]) => v === true)
      .map(([k]) => k);
  }
  return [];
}

export function useActiveWorkspace(): ActiveWorkspace {
  const { user } = useAuth();

  const { data: entities = [], isLoading } = useQuery({
    queryKey: ['active-workspace-entities', user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async (): Promise<WorkspaceEntityInternal[]> => {
      const owned = await listOwnerBusinesses<OwnerRow>({
        userId: user!.id,
        select: 'id, name_ar, name_en',
        orderBy: { column: 'created_at', ascending: true },
      });
      const staff = await listActiveStaffBusinessesForUser<StaffRow>({
        userId: user!.id,
        select: 'id, role, permissions_override, businesses:business_id(id, name_ar, name_en)',
      });

      const out = new Map<string, WorkspaceEntityInternal>();
      (owned.data ?? []).forEach((b) => {
        out.set(b.id, {
          entity_id: b.id,
          name_ar: b.name_ar,
          name_en: b.name_en,
          source: 'owner',
          membership_id: b.id,
          role: 'owner',
          permissions_override: null,
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
          permissions_override: r.permissions_override ?? null,
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

  const activeEntityId = active?.entity_id ?? null;

  const { data: locations = [] } = useQuery({
    queryKey: ['active-workspace-locations', user?.id, activeEntityId],
    enabled: !!user && !!activeEntityId,
    staleTime: 60_000,
    queryFn: async (): Promise<WorkspaceLocationRow[]> => {
      const { data } = await listLocationsForEntity({ entityId: activeEntityId! });
      return data ?? [];
    },
  });

  // Location preference: scoped per (user, entity).
  const [activeLocationId, setActiveLocationIdState] = useState<string | null>(null);

  // Hydrate when user or active entity changes.
  useEffect(() => {
    setActiveLocationIdState(readLocationPref(user?.id, activeEntityId));
  }, [user?.id, activeEntityId]);

  // Self-heal against the accessible locations list.
  useEffect(() => {
    if (!activeEntityId) return;
    if (locations.length === 0) {
      if (activeLocationId !== null) {
        setActiveLocationIdState(null);
        writeLocationPref(user?.id, activeEntityId, null);
      }
      return;
    }
    const ok = activeLocationId && locations.some((l) => l.id === activeLocationId);
    if (!ok) {
      // No fallback to "first" — location stays optional. Only reset spoofed/stale ids.
      if (activeLocationId !== null) {
        setActiveLocationIdState(null);
        writeLocationPref(user?.id, activeEntityId, null);
      }
    }
  }, [locations, activeLocationId, activeEntityId, user?.id]);

  const setActiveLocationId = useCallback(
    (id: string | null) => {
      // Authorization guard: ignore ids not in the accessible list.
      if (id && !locations.some((l) => l.id === id)) return;
      setActiveLocationIdState(id);
      writeLocationPref(user?.id, activeEntityId, id);
    },
    [locations, user?.id, activeEntityId],
  );

  const clearActiveLocationId = useCallback(() => {
    setActiveLocationIdState(null);
    writeLocationPref(user?.id, activeEntityId, null);
  }, [user?.id, activeEntityId]);

  const permissions = useMemo(
    () => (active ? hydratePermissions(active.permissions_override) : []),
    [active],
  );

  return {
    active_entity_id: activeEntityId,
    active_location_id: activeLocationId,
    active_membership_id: active?.membership_id ?? null,
    active_role: active?.role ?? null,
    permissions,
    entities: entities.map(({ permissions_override: _po, ...rest }) => rest),
    locations,
    isLoading,
    setActiveEntityId: setActiveBusinessId,
    setActiveLocationId,
    clearActiveLocationId,
  };
}
