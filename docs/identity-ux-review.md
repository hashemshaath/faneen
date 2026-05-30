# Identity UX Review — Part C

Status: PASS (with redesign backlog) · Generated: 2026-05-30

## Screens reviewed

| Screen | Steps | Mobile | RTL | A11y | Verdict |
|---|---|---|---|---|---|
| `/auth` sign-in (`IdentitySignInForm`) | 1 | ✓ tablist switcher | ✓ logical CSS | ✓ Label + role=tab | Pilot-ready |
| `/auth?mode=register` (`RegisterForm`) | 2 (type → details) | ✓ | ✓ | ✓ | Pilot-ready, redesign deferred |
| `/auth?mode=forgot-password` | 1 | ✓ | ✓ | ✓ | Pilot-ready |
| `/reset-password` | 1 | ✓ | ✓ | ✓ password meter | Pilot-ready |
| `/onboarding` | 3 | ✓ | ✓ | ⚠ some long forms | Pilot-ready, polish backlog |
| `/invite/:token` | 1 | ✓ | ✓ | ✓ | Pilot-ready |

## Friction map

- **Sign-in**: tablist between phone/email is discoverable; lockout
  banner uses friendly Arabic. ✅
- **Register**: two-step (type → details) keeps form short. Business
  step still long — split-screen redesign tracked.
- **Onboarding**: 3 steps but step 2 (classification) has the most
  drop-off risk. Auto-save via `onboarding-draft` mitigates.
- **Reset password**: success view auto-redirects to `/auth` after 3 s.

## Error / empty state quality

- All auth errors flow through `translateAuthError` → Arabic strings.
- `AuthErrorHelpLinks` surfaces 1–2 actionable links per error class.
- No silent failures observed in source review.

## Confusing or duplicate screens

- Legacy `LoginForm.tsx` exists but is no longer imported by
  `Auth.tsx` (guarded by `auth-identity-flow.source.test.ts`).
  Recommend deletion in a future cleanup phase.

## Mobile / RTL specifics

- All inputs use `dir="auto"`; phone input uses LTR for the digits
  segment per `.tech-content` convention.
- Tap targets ≥ 44 px (Button `size="lg"` on auth submits).

## Recommendations (non-blocking)

1. Add a single "ماذا يحدث بعد ذلك؟" hint under each CTA.
2. Inline "هل لديك حساب؟ تسجيل الدخول" on register success view.
3. Reset-password page: show password strength delta vs. previous.