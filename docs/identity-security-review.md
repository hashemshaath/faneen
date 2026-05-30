# Identity Security Review — Part I

Status: PASS · Generated: 2026-05-30

## Threats & mitigations

| Threat | Control | Source |
|---|---|---|
| Brute-force login | `useLoginLockout` (client) + Supabase rate limits (server) | `hooks/useLoginLockout.ts` |
| Account enumeration | Uniform forgot-password response; no real-time existence check | `account-detection-review.md` |
| OTP abuse | `OTP_COOLDOWN_SECONDS`, server rate-limit, single-use codes | `services/auth/useOtpFlow.ts` |
| Reset-token replay | Supabase recovery tokens are single-use; `password_reset_log` records usage | `pages/ResetPassword.tsx` |
| Invite-token replay | RPC `accept_*_invitation` marks token consumed atomically | `modules/identity/services/invitations` |
| Open redirect | All post-auth redirects routed via `useRoleRedirect`; no untrusted `next=` param consumed | `hooks/useRoleRedirect.ts` + `Auth.tsx` |
| Privilege escalation | Roles in `user_roles` only; `has_role` SECURITY DEFINER with `set search_path=public` | DB migration |
| Session fixation | Supabase JWT rotation + `autoRefreshToken` | `integrations/supabase/client.ts` |
| Sensitive data logging | Identity module forbids logging passwords/OTPs/tokens (README rule) | `modules/identity/README.md` |
| Anonymous sign-up | Disabled — `configure_auth` rule + memory `auth/system-architecture` | platform policy |
| Email leak via 3rd-party scripts on `/auth` | `useNoIndex` + minimal layout | `ProtectedRoute`, `Auth.tsx` |
| CSRF on auth | Supabase token-bearer + same-origin fetch | client default |
| Forbidden access logged | `access_violation_log` insert with truncated UA | `ProtectedRoute.logUnauthorizedAccess` |

## Checks executed (source-level)

- ✓ No `localStorage`-based admin checks.
- ✓ No raw `.from('user_roles')` outside `@/modules/identity`
  (guarded by `identity-isolation-audit.mjs`).
- ✓ No `supabase.auth.{signIn,signUp,signOut,getUser,getSession,
  updateUser,verifyOtp,setSession,resetPasswordForEmail}` outside
  approved boundaries.
- ✓ Synthetic `@phone.qitaat.local` email never surfaced to users
  (guarded by `auth-identity-flow.source.test.ts`).
- ✓ Reset page rejects requests without `type=recovery`.

## Remaining risks

- Low: client-side lockout is bypassable; server-side limits are
  authoritative. Acceptable for pilot.
- Low: no device-binding for session refresh. Acceptable for pilot.

## Verdict

Identity security posture is **pilot-ready**. No critical findings.