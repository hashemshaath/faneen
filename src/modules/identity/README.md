# Module: identity

**Status:** ID-2 in place (role reads).

## Purpose
Centralized home for identity / role / auth / session backend access.

## What lives here today
- `services/roles/reads.ts` — canonical read-only wrappers for
  `user_roles` and the `has_role` RPC (`getUserRoles`, `hasRole`,
  `hasAdminAccess`, `hasSuperAdminAccess`, `listAllUserRoles`,
  `listUserRolesFor`, `countByRole`).

## What does not live here yet
- Role mutations (`grantRole`, `revokeRoleById`,
  `revokeRoleByUserAndRole`) — staged for **ID-3**, currently still in
  `src/services/userRoles.ts`.
- `password_reset_log`, admin reset/delete edge functions, OTP /
  temp-code, and `supabase.auth.*` consolidation — staged for ID-3..ID-5.

## Public API
Import from `@/modules/identity`. Do not deep-import internal files.

## Compatibility
`src/services/userRoles.ts` is a thin shim that re-exports the reads
listed above so legacy import paths keep working. New code should
import from `@/modules/identity`.