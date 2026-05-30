# Identity System Inventory — IDENTITY-EXPERIENCE-HARDENING-1 Part A

Status: PASS · Generated: 2026-05-30

Single source-of-truth catalogue of every component, page, hook, service,
edge function, RPC, and database object that participates in the identity,
authentication, authorisation, onboarding, and session lifecycle.

## 1. Pages (`src/pages`)

| Route | File | Purpose |
|---|---|---|
| `/auth` | `Auth.tsx` | Unified sign-in / register / forgot shell (`IdentitySignInForm`, `RegisterForm`, `ForgotPasswordForm`, `RegistrationSuccessView`) |
| `/reset-password` | `ResetPassword.tsx` | Recovery landing — accepts `?type=recovery` hash, calls `updateUserPassword` |
| `/onboarding` | `Onboarding.tsx` | 3-step profile / business / classification wizard |
| `/invite/:token` | `InviteAccept.tsx` | Customer / client invitation acceptance |
| `/staff-invite/:token` | `StaffInviteAccept.tsx` | Business staff invitation acceptance |
| `/dashboard/no-access` | `dashboard/DashboardNoAccess.tsx` | Permission-denied landing |
| `/forbidden` | `Forbidden.tsx` | Hard role denial |

## 2. Auth components (`src/components/auth`)

`IdentitySignInForm`, `RegisterForm`, `ForgotPasswordForm`,
`PasswordField`, `PhoneInput`, `OtpInput`, `GoogleAuthButton`,
`TemporaryCodeForm`, `EmailSentView`, `RegistrationSuccessView`,
`PasswordResetSuccessView`, `AuthErrorHelpLinks`, `AuthDivider`,
`AuthLayout`, `AuthShowcase`, `ProtectedRoute`, `PermissionRouteGuard`,
`FieldError`, `LoginForm` (legacy, no longer mounted).

## 3. Services & modules

| Layer | Surface | Notes |
|---|---|---|
| `src/services/auth/authService` | `signInWithEmail`, `signUpWithEmail`, `sendLoginOtp`, `verifyLoginOtp`, `resetPasswordForEmail`, `signOut` | Canonical low-level boundary |
| `src/services/auth/useOtpFlow` | OTP send/verify/cooldown state | |
| `src/services/auth/errorMessages` | `translateAuthError`, `isRateLimitError`, `isNetworkError`, `getAuthErrorHelpLinks` | Localised error → help-link mapping |
| `src/modules/identity/services/roles` | `getUserRoles`, `hasRole`, `hasAdminAccess`, `hasSuperAdminAccess`, mutations | Guarded by `identity-isolation-audit` |
| `src/modules/identity/services/adminSecurity` | `admin-reset-password`, `admin-delete-user` edge wrappers | |
| `src/modules/identity/services/passwordResetLog` | reads + insert wrapper | No sensitive payload |
| `src/modules/identity/services/tempCode` | `temp-code-session`, magic-link `verifyOtp` | |
| `src/modules/identity/services/session` | `getCurrentSession`, `getCurrentUser`, `signOutCurrentUser` | |
| `src/modules/identity/services/account` | `updateUserPassword` | |
| `src/modules/identity/services/invitations` | `accept_client_invitation`, `get_staff_invitation_preview`, `accept_staff_invitation`, `get_my_staff_invitations` | RPC wrappers |

## 4. Hooks

`useAuth`, `useRoleRedirect`, `useLoginLockout`, `useActiveWorkspace`,
`useHasPermission`, `useCan`, `useNoIndex` (auth pages), `useFeatureGate`,
`useWorkspaceState`, `useOnboardingDraft` (via `lib/onboarding-draft`).

## 5. Guards

- `ProtectedRoute` — auth + `requireAdmin|requireSuperAdmin|requireProvider`
  + `is_onboarded` gate. Redirects to `/auth`, `/onboarding`, or
  `<Forbidden/>` with structured `setForbiddenContext` logging.
- `PermissionRouteGuard` — workspace-scoped permission check via
  `canViewWorkspaceRoute` → `WORKSPACE_ROUTE_PERMISSIONS`. Denied →
  `/dashboard/no-access`.

## 6. Database surface (read-only audit)

`auth.users` (managed) · `profiles` · `user_roles` (+ `has_role` SECURITY
DEFINER) · `password_reset_log` · `access_violation_log` ·
`client_invitations` · `business_staff_invitations` · `business_staff` ·
`businesses`.

## 7. Edge functions

`admin-reset-password`, `admin-delete-user`, `temp-code-session`,
`auth-email-hook` (managed), `accept-client-invitation`,
`accept-staff-invitation` (where applicable).

## 8. Out-of-scope (intentional exclusions)

- WhatsApp / SMS providers (deferred indefinitely).
- Anonymous sign-ups (forbidden — see `auth/system-architecture` memory).
- Role storage on `profiles` (forbidden — privilege-escalation guard).