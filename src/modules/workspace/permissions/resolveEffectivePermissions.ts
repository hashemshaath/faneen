/**
 * ORG-RBAC-STRUCTURE-6 — Permission Resolution Engine.
 *
 * Pure, side-effect-free merger of all UI permission sources for an
 * active workspace. NEVER throws. Returns a deduped permission list plus
 * a `sources` breakdown for auditing / "why am I seeing this?" UI.
 *
 * NOT an authorization boundary — RLS + has_permission / has_entity_membership
 * remain authoritative on the server. This module exists so the sidebar,
 * route guard, and section gates all agree on a single answer.
 *
 * Sources merged (in precedence order, all additive — denies are not
 * modeled here; that remains the capabilityMatrix concern):
 *
 *   1. Owner / admin overrides   → ['*']  (treated as "all")
 *   2. Role defaults             → from ROLE_PERMISSION_DEFAULTS
 *   3. Explicit per-membership   → workspace.permissions
 *   4. Delegated access          → permissions[] from active delegations
 *   5. Team-derived              → permissions[] aggregated across active team memberships
 */
import {
  ROLE_PERMISSION_DEFAULTS,
  type WorkspaceRole,
} from './catalog';

export interface DelegatedAccessSlice {
  permissions?: string[] | null;
  starts_at?: string | null;
  expires_at?: string | null;
  revoked_at?: string | null;
}

export interface TeamMembershipSlice {
  permissions?: string[] | null;
  is_active?: boolean | null;
}

export interface ResolveEffectivePermissionsInput {
  active_role?: string | null;
  permissions?: string[] | null;
  isAdmin?: boolean;
  delegations?: DelegatedAccessSlice[] | null;
  teamMemberships?: TeamMembershipSlice[] | null;
  /** Optional ISO timestamp used for delegation expiry. Defaults to now. */
  now?: string;
}

export interface ResolvedPermissions {
  permissions: string[];
  sources: {
    role: string[];
    delegated: string[];
    teams: string[];
    overrides: string[];
  };
}

const OWNER_OR_ADMIN_MARKER = '*';

function safeArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((s): s is string => typeof s === 'string' && s.length > 0);
}

function isDelegationActive(d: DelegatedAccessSlice, nowMs: number): boolean {
  if (d.revoked_at) return false;
  if (d.starts_at) {
    const startMs = Date.parse(d.starts_at);
    if (Number.isFinite(startMs) && startMs > nowMs) return false;
  }
  if (d.expires_at) {
    const endMs = Date.parse(d.expires_at);
    if (Number.isFinite(endMs) && endMs <= nowMs) return false;
  }
  return true;
}

export function resolveEffectivePermissions(
  input: ResolveEffectivePermissionsInput | null | undefined,
): ResolvedPermissions {
  const empty: ResolvedPermissions = {
    permissions: [],
    sources: { role: [], delegated: [], teams: [], overrides: [] },
  };
  if (!input) return empty;

  try {
    const overrides: string[] = [];
    if (input.isAdmin) overrides.push(OWNER_OR_ADMIN_MARKER);
    if (input.active_role === 'owner') overrides.push(OWNER_OR_ADMIN_MARKER);

    const roleDefaults =
      input.active_role && input.active_role in ROLE_PERMISSION_DEFAULTS
        ? [...ROLE_PERMISSION_DEFAULTS[input.active_role as WorkspaceRole]]
        : [];
    const explicit = safeArray(input.permissions);
    const role = Array.from(new Set([...roleDefaults, ...explicit]));

    const nowMs = input.now ? Date.parse(input.now) : Date.now();
    const delegated = Array.from(
      new Set(
        (input.delegations ?? [])
          .filter((d) => isDelegationActive(d, Number.isFinite(nowMs) ? nowMs : Date.now()))
          .flatMap((d) => safeArray(d.permissions)),
      ),
    );

    const teams = Array.from(
      new Set(
        (input.teamMemberships ?? [])
          .filter((m) => m.is_active !== false)
          .flatMap((m) => safeArray(m.permissions)),
      ),
    );

    const merged = overrides.length > 0
      ? [OWNER_OR_ADMIN_MARKER]
      : Array.from(new Set([...role, ...delegated, ...teams]));

    return {
      permissions: merged,
      sources: { role, delegated, teams, overrides },
    };
  } catch {
    return empty;
  }
}

/**
 * Cheap predicate built on top of resolveEffectivePermissions. Treats the
 * `*` marker (owner / admin) as universal grant. Unknown permission → false.
 */
export function hasEffectivePermission(
  resolved: ResolvedPermissions | null | undefined,
  permission: string | null | undefined,
): boolean {
  if (!resolved || !permission) return false;
  if (resolved.permissions.includes(OWNER_OR_ADMIN_MARKER)) return true;
  return resolved.permissions.includes(permission);
}

export const EFFECTIVE_PERMISSIONS_ALL_MARKER = OWNER_OR_ADMIN_MARKER;