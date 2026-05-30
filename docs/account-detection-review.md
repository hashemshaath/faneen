# Account Detection Review — Part D

Status: DEFERRED-BY-DESIGN · Generated: 2026-05-30

## Decision

Real-time "account exists / does not exist" indicators on phone and
email inputs are **intentionally NOT implemented** at the input level.

Implementing them would create a textbook **account enumeration**
oracle:

1. Attacker types a candidate email/phone.
2. UI reveals binary state ("يوجد حساب" vs "لا يوجد حساب").
3. Attacker harvests valid identifiers at scale, bypassing rate limits
   because the check is read-only.

OWASP ASVS V3.2 and the project's `auth/security-and-identity` memory
explicitly forbid this pattern.

## Approved alternative (already implemented)

Account state is revealed **only after a credential attempt** and only
to the degree the server response already implies:

| Action | Server response | UI |
|---|---|---|
| Login wrong password | generic invalid credentials | "بيانات الدخول غير صحيحة" |
| Register existing email | `user_already_registered` | "هذا البريد مسجل بالفعل" + login CTA |
| Forgot password | always success | "إذا كان البريد مسجلاً، سترسل تعليمات" |
| OTP to unknown phone | rate-limited generic | "تعذر إرسال الرمز، حاول لاحقاً" |

Mappings live in `src/services/auth/errorMessages.ts`.

## What we DO surface in real time

- Format validation (zod) — local, no server hit.
- Phone country code + length.
- Password strength meter (`lib/password-strength.ts`).

## Future option (post-pilot)

If a "smart" detection UX is later required, route it through a
rate-limited, signed-challenge endpoint with per-IP + per-fingerprint
quotas, captcha after N misses, and a uniform delay envelope to
suppress timing side-channels. Not required for pilot.

## Result

No enumeration vector found. No code change required.