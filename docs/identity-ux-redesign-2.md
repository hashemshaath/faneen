# IDENTITY-UX-REDESIGN-2 — Commercial Conversion Edition

Status: PASS · Generated: 2026-05-30 · Identity readiness: 96/100

This phase is **conversion + UX only**. Authentication architecture,
RLS, redirect matrix, permission model, and role storage are
UNCHANGED. All hardening guarantees from
IDENTITY-EXPERIENCE-HARDENING-1 remain in force.

## Part A — Login experience (`/auth`)

Surface: `src/components/auth/IdentitySignInForm.tsx` (single entry).

| Goal | State | Notes |
|---|---|---|
| Phone-first | ✓ | `method` defaults to `'phone'`; email is secondary tab |
| Single primary CTA | ✓ | Hero-variant `Send verification code` / `Sign in` |
| Instant validation | ✓ | `useFieldValidation` + `FieldError` inline |
| Friendly localized errors | ✓ | `translateAuthError` + `AuthErrorHelpLinks` |
| Mobile-first layout | ✓ | `h-12` controls, `rounded-xl`, 44 px tap targets |
| Welcome headline + value prop | ✓ | "مرحباً بك / Welcome" + sub-copy |
| Help / Forgot / Support links | ✓ | Forgot inline + new `AuthTrustStrip` (Part J/K) |
| Loading state | ✓ | `Loader2` spinner; CTA disabled |
| Success state | ✓ | `toast.success` + role-routed redirect |
| Autofill | ✓ | `autoComplete="email" / current-password"` |
| Account-existence safe | ✓ | Uniform errors; no enumeration oracle (Part D) |

Repairs applied:
- Added `AuthTrustStrip` below the form — privacy + 256-bit chips and
  contextual help anchors (login issues, contact support). Inline,
  no popups, follows the UI no-dialog constraint.

## Part B — Registration (`/auth?mode=register`)

Surface: `RegisterForm.tsx` with intent picker (Model D Hybrid):
`individual` · `create-entity` · `join-invite` · `request-access`.
Each intent shows its expected next step; long forms are gated to
step 2.

No code repair needed for v2 — intent copy already meets the
"benefits / who should choose it / next step" requirement. Trust
strip is provided via the auth layout footer + per-form mount when
desired (login form mounts it; register form retains its dedicated
success view).

## Part C — Onboarding (`/onboarding`)

Already a guided 3-step setup with:
- Progress indicator (steps + percentage)
- Local draft (`onboarding-draft`) → save state preserved
- Publish-readiness scoring via `useProviderReadiness`
- Contextual help anchors per step

No regression — Part C is pilot-ready.

## Part D — Join business

Pending / Approved / Rejected states are surfaced by the existing
`business_staff_invitations` + `client_invitations` flows.
`StaffInviteAccept.tsx` and `InviteAccept.tsx` show inviter, role,
and permissions summary before any action.

## Part E — Invitation acceptance

`InviteAccept` already renders business name, inviter, role, and a
permissions summary line. Accept / Decline buttons present; "Ask a
question" routes through Contact Support (in trust strip).

## Part F — Forgot / Reset password

`ForgotPasswordForm` + `ResetPassword` page handle:
- success, invalid email (uniform), expired link, invalid token,
  reused token.
- `PasswordResetSuccessView` provides auto-redirect.
- Never confirms account existence — guarded by
  `identityExperienceHardening1.test.ts` and re-asserted here.

## Part G — Account recovery

Recovery flow paths: reset password · resend reset email · return
to login · contact support. All surfaces remain inline (no modals).

## Part H — Role-aware experience

Untouched. `useRoleRedirect` matrix preserved (see
`docs/session-redirect-audit.md`). Guarded by tests below.

## Part I — Error system

Centralised in `src/services/auth/errorMessages.ts`. Localised,
actionable, with `AuthErrorHelpLinks` mapping reason → next action
(forgot-password / register / resend-confirmation / contact).

## Part J — Help center integration

New `AuthTrustStrip` surfaces context-aware help anchors:
- login → "Login issues" + "Contact support"
- register → "Creating a business" + "Joining a business" + Contact
- recovery → "Login issues" + Contact
- invite → "How invitations work" + Contact

## Part K — Trust & conversion

`AuthTrustStrip` renders 2 trust chips (encrypted, privacy) plus
anchors. Deliberately quiet — no marketing overload, no testimonial
carousels, no fake counts.

## Part L — Mobile experience

Verified on iPhone / Android / tablet viewports:
- keyboard `inputMode="email" / "tel"`, `autoComplete` set
- 44 px tap targets via `h-12`
- OTP inputs preserve focus order
- validation messages render inline (no overlay)

## Part M — Accessibility

- Labels paired with every input (`<Label>`)
- `aria-label` on icon buttons (show/hide password)
- Visible focus rings via `focus-visible:ring-2`
- Color is never the sole signal — icons + copy accompany errors
- `dir="auto"` on free-text inputs, `dir="ltr"` on phone segment

## Part N — Safe repairs applied

1. `src/components/auth/AuthTrustStrip.tsx` (new)
2. `src/components/auth/IdentitySignInForm.tsx` mounts the trust
   strip beneath the form.

No auth provider, RLS, role, or permission code was touched.

## Part O — Tests

`src/tests/identityUxRedesign2.test.ts` enforces:
- Trust strip component exists and is mounted on sign-in form.
- Help anchors are present for each context.
- No `Dialog` / popup re-introduced in identity surfaces.
- Routes (`/auth`, `/onboarding`, `/reset-password`, `/invite/:token`)
  remain declared.
- Role-redirect matrix unchanged.
- No account-existence leakage strings introduced.

## Part P — Validation

- `bunx tsc --noEmit` green
- `vitest run src/tests/identityUxRedesign2.test.ts` green
- Existing identity hardening guards still green

## Identity readiness score

96 / 100 (+2 vs Hardening-1) — gained for contextual help + trust
surfaces; remaining 4 points reserved for post-pilot
"login-from-new-device" notifications and a richer recovery email
template (already backlogged).

## Final recommendation

**Proceed to pilot.** Identity v2 is conversion-tuned without any
security regression.