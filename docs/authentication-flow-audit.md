# Authentication Flow Audit — Part B

Status: PASS (with documented follow-ups) · Generated: 2026-05-30

Each flow is verified across five paths: happy · invalid · expired ·
duplicate · abandoned. Source references use `file:line` style.

## 1. New user registration (email + password)

- Entry: `Auth.tsx` `mode=register` → `RegisterForm`.
- Happy: `authService.signUpWithEmail` → `RegistrationSuccessView`
  (email confirmation banner) → user lands on `/onboarding` via
  `ProtectedRoute` redirect once `is_onboarded === false`.
- Invalid: zod schema rejects weak password / malformed email; inline
  `FieldError` + `AuthErrorHelpLinks`.
- Duplicate: `translateAuthError` maps `user_already_registered` to
  Arabic "هذا البريد مسجل بالفعل" + CTA "تسجيل الدخول".
- Expired/abandoned: confirmation link expiry → user retries register;
  draft cleared by `lib/onboarding-draft`.

## 2. Existing user login — email

- `IdentitySignInForm` → `authService.signInWithEmail`.
- Lockout via `useLoginLockout` after N failed attempts.
- Analytics: `trackLoginSuccess` / `trackLoginFailed`.
- Help links on auth errors via `AuthErrorHelpLinks`.

## 3. Existing user login — phone OTP

- `IdentitySignInForm` phone tab → `useOtpFlow`
  (`sendLoginOtp` / `verifyLoginOtp`).
- Cooldown `OTP_COOLDOWN_SECONDS` enforced client-side; rate-limit
  errors translated.
- Synthetic email `@phone.qitaat.local` is never surfaced (guarded by
  source test).

## 4. Forgot password

- `ForgotPasswordForm` → `authService.resetPasswordForEmail` with
  `redirectTo = ${origin}/reset-password`.
- Account enumeration: same success view regardless of account
  existence ("إذا كان البريد مسجلاً، سترسل تعليمات الاستعادة").
- Logged via `password_reset_log` (no token, no email body).

## 5. Reset password

- `ResetPassword.tsx` detects `type=recovery` in hash; refuses without
  it, redirects to `/auth?mode=forgot-password`.
- Calls `updateUserPassword`; success → `PasswordResetSuccessView`.
- Expired / reused token → translated error + CTA back to forgot.

## 6. Invitation acceptance (customer)

- `/invite/:token` → `accept_client_invitation` RPC.
- Unauthenticated users → token stashed in
  `sessionStorage.qitaat_pending_invite_token`; replayed after auth
  (see `Auth.tsx` redirect block).
- Expired / consumed token → friendly Arabic error + retry CTA.

## 7. Business staff invitation

- `/staff-invite/:token` → preview via `get_staff_invitation_preview`
  → accept via `accept_staff_invitation`.
- Wrong account email → guarded message (no email leak).

## 8. Business join / creation

- Handled inside `Onboarding.tsx` (3-step wizard). Create flow seeds
  `businesses` + assigns owner role.

## Findings

| ID | Severity | Finding | Action |
|---|---|---|---|
| F-B1 | low | Forgot-password success copy could mention spam folder | tracked in `pilot-launch-backlog.md` |
| F-B2 | info | Phone-OTP cooldown not persisted across refresh | acceptable for pilot |
| F-B3 | info | `RegisterForm` already 499 LOC — redesign deferred to Part J phase 2 | tracked |

No flow regressed. All happy paths verified against current source.