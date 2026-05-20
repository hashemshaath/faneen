# Temporary Beta Login Codes

> **Beta-only.** This feature exists to unblock selected beta testers while
> SMS/email delivery is being finalized. It must be disabled once messaging is
> live in production.

## Purpose

Allow an admin to mint a short-lived, single-use code that a beta tester can
enter on `/auth` to prove identity. **Verifying a temp code does NOT create a
Supabase session.** It is a gate only — the operator completes sign-in for the
user out-of-band (manual support, magic link once SMS/email is ready, etc.).

## Storage

Table: `public.auth_temporary_login_codes`.

- Codes are **hashed** with SHA-256 salted by row id (`pgcrypto.digest`).
  Plaintext is never stored.
- RLS is enabled and **no policies exist** — only the two SECURITY DEFINER
  RPCs below can touch the table.

## Creating a code (admin only)

Call the RPC from the SQL editor while authenticated as an admin/super_admin:

```sql
SELECT public.create_temporary_login_code(
  _identifier := 'user@example.com',   -- or '+966506315300'
  _user_id    := NULL,                 -- optional, link to existing auth.users id
  _purpose    := 'beta_login'
);
```

Returns once:

```json
{
  "identifier": "u***@example.com",
  "code": "482910",
  "expires_at": "2026-05-20T06:25:00Z",
  "purpose": "beta_login"
}
```

- Code is **6 digits**, lifetime **10 minutes**, **single-use**, **5 attempts** max.
- Any prior active code for the same identifier+purpose is auto-revoked.
- The plaintext code is **shown once** — copy it and share over a secure
  out-of-band channel (WhatsApp, signed email). It cannot be retrieved later.

## Verifying a code

UI: `/auth` → "Temp code" tab (visible only when
`VITE_ENABLE_BETA_TEMP_CODE=true`).

Programmatic:

```ts
const { data, error } = await supabase.rpc('verify_temporary_login_code', {
  _identifier: 'user@example.com',
  _code: '482910',
});
```

Errors are intentionally generic to avoid account enumeration:

| Sentinel                             | Meaning                          |
| ------------------------------------ | -------------------------------- |
| `AUTH_TEMP_CODE:INVALID_OR_EXPIRED`  | Wrong, used, expired, or unknown |
| `AUTH_TEMP_CODE:TOO_MANY_ATTEMPTS`   | 5/code or 20/5min per identifier |
| `AUTH_TEMP_CODE:INVALID_IDENTIFIER`  | Empty or too short identifier    |

## Revoking

```sql
UPDATE public.auth_temporary_login_codes
   SET revoked_at = now()
 WHERE identifier = 'user@example.com'
   AND used_at IS NULL
   AND revoked_at IS NULL;
```

## Disabling the feature

1. Set `VITE_ENABLE_BETA_TEMP_CODE=false` (or unset) to hide the UI tab.
2. To fully remove, run:

```sql
DROP FUNCTION IF EXISTS public.create_temporary_login_code(text, uuid, text);
DROP FUNCTION IF EXISTS public.verify_temporary_login_code(text, text);
DROP FUNCTION IF EXISTS public._atlc_hash(text, uuid);
DROP FUNCTION IF EXISTS public._atlc_normalize_identifier(text);
DROP FUNCTION IF EXISTS public._atlc_mask_identifier(text);
DROP TABLE IF EXISTS public.auth_temporary_login_codes;
```

## Security rules

- ✅ Plaintext never persisted (SHA-256, salted by row id).
- ✅ No anon/auth direct table access.
- ✅ `create_*` requires admin/super_admin via `public.has_role`.
- ✅ `verify_*` is callable by anon (required pre-login) but returns only
      masked identifier + purpose + optional `user_id`; cannot escalate roles.
- ✅ Max 5 attempts per code; per-identifier rate-limit ≥20 attempts in 5 min.
- ✅ Codes are single-use; expiry and revocation enforced.
- ✅ Does not create Supabase sessions, does not bypass `ProtectedRoute`.

## Manual QA checklist

- [ ] Non-admin call to `create_temporary_login_code` → `FORBIDDEN`.
- [ ] Admin call returns plaintext code.
- [ ] `SELECT code_hash FROM auth_temporary_login_codes` shows hex hash only.
- [ ] Correct code → `verified: true`, `used_at` set.
- [ ] Reusing same code → `INVALID_OR_EXPIRED`.
- [ ] 5 wrong attempts → `TOO_MANY_ATTEMPTS`.
- [ ] Wait 10 min → `INVALID_OR_EXPIRED`.
- [ ] `revoked_at` set manually → `INVALID_OR_EXPIRED`.
- [ ] UI hidden when `VITE_ENABLE_BETA_TEMP_CODE` unset.
- [ ] Existing email/phone/Google login flows unchanged.
- [ ] `ProtectedRoute` still enforces role gating after verify (no session minted).