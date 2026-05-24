# Fix: anonymous visitors can read business/branch PII

The Lovable security scanner flagged two ERROR-level findings:

- `businesses` table publicly exposes `email`, `phone`, `mobile`, `customer_service_phone`, `account_manager_email`, `account_manager_phone` to anonymous visitors.
- `business_branches` table publicly exposes `email`, `phone`, `mobile`, `customer_service_phone`, `contact_person` to anonymous visitors.

Masked public views (`businesses_public`, `business_branches_public`) already exist and exclude these columns — but the base-table RLS policy still lets `anon` SELECT every column.

You chose **"Require sign-in to view contact info"** — keep listings visible to everyone, hide PII columns until the user signs in.

## Approach

Combine two layers so the fix is enforced even if a query slips through:

1. **Column-level REVOKE from `anon`** on the PII columns of both base tables. Postgres rejects any `SELECT email, ...` from an anonymous client, regardless of RLS.
2. **Tighten base-table SELECT policies** so anonymous reads still work for non-PII columns (directory browsing keeps working) and authenticated users keep full access via the existing owner/staff/admin clauses.
3. **Keep `businesses_public` / `business_branches_public` views** as the canonical anon entry point. Switch them to `security_invoker = false` so anon reads through the view continue to work even when the base column is revoked.

## Files to change

### Migration (new)

- `supabase/migrations/<ts>_hide_business_pii_from_anon.sql`
  - `REVOKE SELECT (email, phone, mobile, customer_service_phone, account_manager_email, account_manager_phone) ON public.businesses FROM anon;`
  - `REVOKE SELECT (email, phone, mobile, customer_service_phone, contact_person) ON public.business_branches FROM anon;`
  - `ALTER VIEW public.businesses_public SET (security_invoker = false);`
  - `ALTER VIEW public.business_branches_public SET (security_invoker = false);`
  - Add comment on views documenting they are the only anon-facing read surface.

### Client code

The anon-facing services currently `select('*')` or select fields including PII from the base tables. Update them to either:
- use `*_public` views, **or**
- explicitly list only non-PII columns.

Files to audit and adjust:

- `src/modules/businesses/services/getPublicBusinessByUsername.ts` — drop PII fields from the select list (logged-in viewers fall back to a second authenticated call).
- `src/modules/businesses/services/listPublicBusinessesForSector.ts` — restrict select list to non-PII fields.
- `src/modules/businesses/services/countActiveBusinesses.ts` — already only selects `id`, no change needed; verify.
- `src/modules/catalog/services/branches/reads.ts` — restrict select list to non-PII fields for the anon path; keep full select for authenticated calls.
- `src/pages/Compare.tsx` — verify it doesn't read PII columns as anon.

For each call site, when the user is authenticated the client may continue to request the full row (RLS still allows it). The simplest pattern: split each "public read" service into a `*Public` (non-PII) and `*Authenticated` (full) variant, or branch internally on `supabase.auth.getSession()`.

### Regression test

- Extend `src/__tests__/security/rls-anon.regression.test.ts` with assertions:
  - anon `SELECT email FROM businesses` → permission denied
  - anon `SELECT phone FROM business_branches` → permission denied
  - anon SELECT through `businesses_public` view still succeeds

## What stays the same

- Authenticated users (any signed-in account) still read the full base table — owner/staff/admin clauses unchanged.
- Public business profile pages keep working for anonymous visitors; only the contact block needs a "Sign in to view contact info" state.
- The three WARN findings (newsletter, provider_landing_settings, realtime bookings) are already correctly mitigated — they'll be marked ignored and the rationale logged to the security memory.

## Out of scope

- No changes to membership pricing, payment flows, or any business logic.
- No changes to admin or owner dashboards.
- No edits to `src/integrations/supabase/{client,types}.ts`.

## Technical notes

- Postgres column-level grants are enforced before RLS, so revoking from `anon` is sufficient even if a future RLS policy regression exposes the row.
- `security_invoker = false` on the public views means they execute with the view owner's privileges — safe because the views already hard-exclude PII columns in their definition.
- `service_role` is unaffected by `REVOKE … FROM anon`, so edge functions continue to work.
