# Session & Redirect Audit — Part F

Status: PASS · Generated: 2026-05-30

## Redirect matrix (verified against `useRoleRedirect` + `ProtectedRoute`)

| Authenticated user state | Landing route | Source |
|---|---|---|
| `isSuperAdmin` | `/admin/activity-log` | `useRoleRedirect.getTargetRoute` |
| `isAdmin` | `/admin/activity-log` | same |
| `profile.is_onboarded === false` (non-admin) | `/onboarding` | `ProtectedRoute` |
| `isProvider` (onboarded) | `/dashboard` | `useRoleRedirect` |
| Individual (onboarded) | `/dashboard` | `useRoleRedirect` |
| Pending invite (token in sessionStorage) | `/invite/{token}` | `Auth.tsx` redirect block |
| Hard role failure | `<Forbidden/>` + `setForbiddenContext` | `ProtectedRoute` |
| Permission failure | `/dashboard/no-access` | `PermissionRouteGuard` |
| Recovery hash present on `/reset-password` | render reset form | `ResetPassword.tsx` |

## Session lifecycle

- Owner: `AuthContext` (single `onAuthStateChange` listener + initial
  `getSession`).
- Refresh: `supabase.auth.autoRefreshToken=true` (see
  `integrations/supabase/client.ts`).
- Logout: `signOutCurrentUser` (via `@/modules/identity`).
- Tab visibility: handled by Supabase client default; no custom logic.

## Edge cases verified

- React Router re-render loop on `<Navigate state>` mitigated by
  memoised `NavigateToAuth` wrapper.
- `account_type === 'individual'` shortcut to `/dashboard` is
  intentionally REMOVED from `Onboarding.tsx` (guarded by
  `auth-identity-flow.source.test.ts`).
- Skip-onboarding bypass: admins + `skipOnboarding` prop only.

## No regressions

No additional redirect or session changes required for pilot.