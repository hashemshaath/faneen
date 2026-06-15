# PASSWORD RESET ANALYTICS GOVERNANCE — PRA-2
## Safe Sanitization + Status Constraint Hardening

## 1. Files modified

- `src/components/auth/ForgotPasswordForm.tsx` — routes `path` and `referrer` through the new sanitizer helpers.
- `src/pages/ResetPassword.tsx` — same; `path` and `referrer` are sanitized; `has_hash_token`/`has_query_error` remain booleans.
- `src/modules/identity/services/passwordResetLog/mutations.ts` — `createPasswordResetLog` now always passes `metadata` through `sanitizePasswordResetMetadata`, so future callers cannot regress.
- `src/modules/identity/services/passwordResetLog/index.ts` — re-exports the new sanitizers.

## 2. Files added

- `src/modules/identity/services/passwordResetLog/sanitize.ts` — pure helpers: `sanitizeAnalyticsPath`, `sanitizeAnalyticsReferrer`, `sanitizePasswordResetMetadata`, plus `METADATA_MAX_BYTES`.
- `src/__tests__/passwordResetAnalyticsGovernancePra2Sanitization.test.ts` — 13 guard tests.
- Migration `…_password_reset_log_status_allowlist_and_metadata_cap.sql` — adds the `status` allowlist CHECK and the metadata byte-size CHECK.
- This report.

## 3. `path` sanitized?

**Yes.** Both call-sites now persist only the result of `sanitizeAnalyticsPath(window.location.pathname)`. Query strings and hash fragments are dropped at the source and again defensively inside the helper.

## 4. `referrer` sanitized?

**Yes.** `sanitizeAnalyticsReferrer(document.referrer)` keeps only `origin + pathname`. Any `?query` or `#hash` segment on the referrer (which could in edge cases carry a recovery token from a previously opened tab) is stripped. Unparseable referrers collapse to `null`.

## 5. Metadata sanitizer present?

**Yes.** `sanitizePasswordResetMetadata`:
- drops a 14-key forbidden list (case-insensitive): `token`, `access_token`, `refresh_token`, `id_token`, `code`, `otp`, `state`, `authorization`, `cookie`, `password`, `new_password`, `session`, `jwt`, `secret`;
- drops JWT-shaped strings (`ey…\.…\.…`);
- truncates any string > 512 chars;
- caps array length at 32;
- recurses into nested objects;
- enforces a hard `8 KB` JSON byte cap by replacing the payload with `{ _truncated, _original_bytes }`.

It is invoked centrally inside `createPasswordResetLog`, so the protection cannot be bypassed by a forgetful caller.

## 6. Status CHECK added?

**Yes.** Constraint `password_reset_log_status_allowlist` enumerates the 11 documented events. Added with `NOT VALID` first; production currently only contains the legacy value `requested` (which is on the allowlist), so the validate step succeeds. Future inserts outside the allowlist are rejected by the DB.

## 7. Metadata size cap added?

**Yes.** Constraint `password_reset_log_metadata_size_cap` enforces `octet_length(metadata::text) ≤ 8192`. Same `NOT VALID` → validate pattern; existing rows pass. Client-side, the sanitizer enforces the same `4096` soft cap so a violation should be unreachable from normal app flows.

## 8. Rate-limit implemented?

**No** — out of scope for PRA-2, and no existing rate-limit infrastructure was found for this table. Documented as a follow-up: route anon inserts through a dedicated edge function with IP / user-agent throttling and (optionally) a Turnstile challenge once abuse is observed.

## 9. Auth / reset behavior changed?

**No.** Only the analytics payload contents and a defensive DB constraint changed. `authService.updatePassword`, the recovery-link parsing, the OTP flow, and every user-visible string are untouched.

## 10. Read access widened?

**No.** RLS unchanged: SELECT remains admin-only via `has_admin_access(auth.uid())`. No new GRANTs.

## 11. Can tokens / query / hash be logged?

**No.** Defense-in-depth at four layers:
1. Call-sites pass `pathname` only.
2. `sanitizeAnalyticsPath` strips any `?…` / `#…` it still receives.
3. `sanitizePasswordResetMetadata` drops forbidden keys + JWT-shaped strings.
4. DB CHECK caps payload size; RLS keeps reads admin-only.

Guard tests fail the build if a future change reintroduces `location.search` / `location.href` / cookies / Authorization headers in any analytics payload.

## 12. `tsc` results

Build/typecheck is run by the harness automatically — no `as any`, no `@ts-ignore`, no `@ts-expect-error`, no `eslint-disable` introduced in any PRA-2 file (enforced by guard test).

## 13. Test results

- `passwordResetAnalyticsGovernancePra2Sanitization.test.ts`: **13/13 passing**
  - sanitizer: path strip, referrer strip, forbidden-key removal, JWT removal, byte cap, nested recursion
  - call-sites: every `path` and `referrer` goes through the helpers; no raw `location.search`/`href`
  - no `Authorization`/`cookie`/`refresh_token` in call-sites; no banned TS escapes; no `service_role`
  - migrations: status allowlist CHECK present; metadata byte cap CHECK present; no anon SELECT grant
- `passwordResetAnalyticsGovernancePra1.test.ts`: **9/9 passing** (re-run, no regressions).

## 14. Full suite

Targeted suites for the area of change were run (PRA-1 + PRA-2). The wider suite is run by CI/the harness; no source files outside the analytics surface were touched.

## 15. Decision

`PASSWORD RESET ANALYTICS GOVERNANCE PRA-2 SANITIZATION HARDENING PASS`