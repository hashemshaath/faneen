# Module: identity

**Status:** ID-1..ID-6 complete. Guarded by
`scripts/identity-isolation-audit.mjs`.

## Purpose
Centralized home for identity / role / auth / session backend access.
All app code must route identity backend calls through this module.

## What lives here
- `services/roles/` — `user_roles` table + `has_role` RPC reads and
  mutations (`getUserRoles`, `hasRole`, `hasAdminAccess`,
  `hasSuperAdminAccess`, `listAllUserRoles`, `listUserRolesFor`,
  `countByRole`, `grantRole`, `revokeRoleById`,
  `revokeRoleByUserAndRole`).
- `services/adminSecurity/` — `admin-reset-password`,
  `admin-delete-user` edge function wrappers.
- `services/passwordResetLog/` — `password_reset_log` reads + insert
  wrapper. Payload types forbid sensitive fields.
- `services/tempCode/` — `temp-code-session` edge + magic-link
  `verifyOtp` wrappers.
- `services/session/` — `getCurrentSession`, `getCurrentUser`,
  `signOutCurrentUser`.
- `services/account/` — `updateUserPassword`.
- `services/invitations/` — `accept_client_invitation`,
  `get_staff_invitation_preview`, `accept_staff_invitation`,
  `get_my_staff_invitations` RPC wrappers.

## Public API
Import from `@/modules/identity`. Do not deep-import internal files.

## Boundary rules (enforced by identity-isolation-audit)
No app file may directly:
- `.from('user_roles' | 'password_reset_log')` for any operation.
- `.rpc(...)` any migrated identity RPC.
- `.functions.invoke(...)` any identity edge function.
- Call `supabase.auth.{signOut,getSession,getUser,updateUser,verifyOtp,
  signInWithPassword,signUp,resetPasswordForEmail,setSession}`.

## Allowed exceptions
- `src/contexts/AuthContext.tsx` — central session owner
  (`getSession`, `onAuthStateChange`, `signOut`).
- `src/services/auth/**` — canonical low-level auth service that owns
  password / OTP / signup primitives.
- `src/integrations/lovable/**` — OAuth bridge `setSession` boundary.
- `src/services/userRoles.ts` — compatibility shim, re-exports only,
  no direct Supabase access.

## Adding a new auth/role wrapper
1. Add the wrapper file under
   `src/modules/identity/services/<area>/<name>.ts`.
2. Strictly type the payload — never accept arbitrary `any`.
3. Re-export from the area `index.ts` and the module barrel
   `src/modules/identity/index.ts`.
4. Migrate callsites and re-run `npm run identity-isolation-audit`.
5. If a new table / RPC / edge function / auth method is being added
   to the audit surface, update `scripts/identity-isolation-audit.mjs`
   and the meta-test `src/__tests__/identityIsolationAudit.test.ts`.

## Sensitive-data rule
Never log, persist, or attach to telemetry: raw passwords, OTPs,
`token_hash`, magic-link tokens, refresh tokens, or full session
objects. Wrappers must keep this contract.