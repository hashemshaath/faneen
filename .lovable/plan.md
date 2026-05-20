# Phase 1 — Temporary Beta Login Codes

Beta-only safety net while SMS/email delivery is being finalized. Never weakens existing auth; can be removed by dropping one table + 2 RPCs.

## Part A — Current auth audit (findings)

**Methods in place**
- Email + password (`authService.signInWithEmail` → Supabase `signInWithPassword`)
- Phone OTP via custom edge functions `send-login-otp` / `verify-login-otp` (Twilio + `phone_otps` table). Test bypass already exists via `OTP_BYPASS_PHONES` secret → fixed code `000000`.
- Google OAuth (`lovable.auth.signInWithOAuth("google")`)
- Password reset via `resetPasswordForEmail` → `/reset-password`
- Signup confirmation email
- Invite acceptance: `/invite/:token` (`InviteAccept.tsx`) and `/staff-invite/:token` (`StaffInviteAccept.tsx`)

**Routes**: `/auth`, `/reset-password`, `/onboarding`, `/invite/:token`, `/staff-invite/:token`, `/forbidden`.

**Role gating**: `ProtectedRoute` + `useRoleRedirect`; DB-side `public.has_role(uuid, app_role)` SECURITY DEFINER on `public.user_roles` (`admin`, `super_admin`, etc.). No role data on `profiles`.

**Weaknesses / gaps relevant to this phase**
- SMS delivery not finalized → real users can't receive OTPs.
- No "out-of-band" admin-issued code path for beta testers.
- No infra for issuing a Supabase session purely from a verified custom code without service role — so any "temp code" must NOT mint a session client-side.

**Verdict**: Safe to add a temp-code system as a **gate**, not a session issuer. Choose **Session Strategy = Option 3** (verification only, no auto-session). When messaging is ready, we flip beta testers back to existing OTP flow and disable the temp-code feature with a single flag.

## Part B/C/D — Database

New migration creates table + 2 RPCs + RLS.

**Table `public.auth_temporary_login_codes`** (exactly the shape requested). Indexes on `(identifier, expires_at)` and `(used_at, revoked_at)`. RLS enabled, **no policies for anon/auth** — only SECURITY DEFINER RPCs touch it.

**`public.create_temporary_login_code(_identifier, _user_id default null, _purpose default 'beta_login')`**
- SECURITY DEFINER, `REVOKE EXECUTE FROM PUBLIC`, `GRANT EXECUTE TO authenticated`.
- Requires `has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin')` → else raise `AUTH_TEMP_CODE:FORBIDDEN`.
- Normalizes identifier (lowercase, trim; strip non-digits if looks like phone).
- Generates 6-digit numeric code via `gen_random_bytes` (crypto-safe, not `random()`).
- Stores `encode(digest(code || id::text, 'sha256'),'hex')` — pgcrypto already enabled in project.
- `expires_at = now() + interval '10 minutes'`, `max_attempts = 5`, `created_by = auth.uid()`.
- Revokes any prior unused non-expired codes for same identifier+purpose (one-active-at-a-time).
- Returns `jsonb { identifier: <masked>, code, expires_at, purpose }`. Plaintext returned **once**.

**`public.verify_temporary_login_code(_identifier, _code)`**
- SECURITY DEFINER, `GRANT EXECUTE TO anon, authenticated` (needed pre-login).
- Normalize identifier; lookup latest row where `used_at IS NULL AND revoked_at IS NULL AND expires_at > now()`.
- None → `AUTH_TEMP_CODE:INVALID_OR_EXPIRED` (generic, no enumeration).
- `attempt_count >= max_attempts` → `AUTH_TEMP_CODE:TOO_MANY_ATTEMPTS`.
- Compare hash; mismatch → increment `attempt_count`, raise generic invalid.
- Match → set `used_at = now()`; return `{ verified:true, identifier:<masked>, purpose, user_id }`.
- Simple per-identifier rate-limit: reject if >10 verify attempts in last 5 min (count via same table's `attempt_count` sum).

**Audit**: inserts into existing `public.audit_log` (if present — else skip) with action `temp_login_code.created` / `.verified` / `.failed`.

## Part E — Session strategy (chosen: Option 3)

Verify RPC is a **gate only**. After a successful verify the UI:
1. Shows a success state.
2. Tells the user that a Qitaat operator will complete sign-in for them, OR
3. If `user_id` is linked and current visitor is already authenticated as that user, marks beta access flag in `localStorage` (`qitaat_beta_verified=<ts>`) — used by feature flags, never as an auth substitute.

No service-role edge function, no fake JWTs, no client-side session minting.

## Part F — UI (minimal, additive)

`src/components/auth/TemporaryCodeForm.tsx` — new component.
- Mounted as a 3rd tab in `LoginForm`'s method toggle: "رمز مؤقت / Temp code", behind `VITE_ENABLE_BETA_TEMP_CODE === 'true'` env flag so it's trivially hidden in prod.
- Fields: identifier (email or phone, free text), 6-digit code (reuse `OtpInput`).
- Calls `supabase.rpc('verify_temporary_login_code', …)`. Localized friendly errors mapped from the 3 sentinel strings. Never reveals account existence.
- Copy strings (AR/EN) exactly as specified.
- No "request code" button — instead shows: *"اطلب الرمز من فريق قطاعات."* / *"Request a code from the Qitaat team."*

## Part G — Admin UI

Defer. Phase 1 ships RPC + docs only. Operators call `create_temporary_login_code` via SQL editor; safer + zero UI surface to attack.

## Part H — Security checklist (enforced by migration)

- pgcrypto-hashed codes, salted with row id.
- No anon/auth SELECT/INSERT/UPDATE policies — only DEFINER RPCs.
- `EXECUTE` on create RPC restricted to `authenticated` + role check inside.
- 10-min expiry, single-use, 5-attempt cap, per-identifier rate limit.
- Generic error messages (no enumeration).
- No role escalation: RPC never reads/writes `user_roles`, never issues sessions.
- Audit trail via `created_by` + best-effort `audit_log` insert.
- Feature flag gates UI; dropping table+RPCs fully removes feature.

## Part I — Docs

`docs/auth-temporary-login-code.md` covering purpose, beta-only warning, how to create via SQL, lifetime, sharing rules, revoking (`UPDATE … SET revoked_at=now()`), security rules, disable/removal steps, manual QA checklist.

## Part J — Validation

`bunx tsc --noEmit`, Supabase linter, manual RPC tests via `supabase--read_query` for: success, wrong-code increments, max attempts blocks, expired fails, used fails, revoked fails, non-admin create rejected, hashed storage confirmed (`SELECT code_hash FROM …`).

---

## Files touched

```text
NEW  supabase/migrations/<ts>_beta_temporary_login_codes.sql
NEW  src/components/auth/TemporaryCodeForm.tsx
EDIT src/components/auth/LoginForm.tsx          (add 3rd tab behind flag)
NEW  docs/auth-temporary-login-code.md
```

No edits to `authService`, `ProtectedRoute`, edge functions, or existing OTP flow.

## Remaining risks

- Operators must share codes over a secure channel (WhatsApp/email out-of-band). Documented.
- If `audit_log` table doesn't exist, audit insert is wrapped in `BEGIN…EXCEPTION WHEN OTHERS THEN NULL` so it never blocks.
- Phase 2 (real session issuance) will need an edge function with service role — explicitly out of scope here.

Approve to proceed with migration + code.
