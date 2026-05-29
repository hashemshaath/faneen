# RPC & Edge Function Audit

_PLATFORM-DEEP-AUDIT-REPAIR-1 — 400 RPCs / ~70 edge functions inventoried._

## RPC summary

- **App-owned `SECURITY DEFINER` functions without pinned `search_path`: 0.**
- All admin-only RPCs check `has_role(auth.uid(), 'admin')` before any privileged read/write.
- All customer-portal RPCs accept a `token_hash` argument and never return the raw token, the customer email, the supplier-side fields, or internal notes.
- Mutation RPCs return a structured envelope `{ ok, ref_id, error }` rather than raw Postgres errors.
- Idempotency keys exist for credit grants/debits and email dispatch (`buildRevealIdempotencyKey`, `buildMonthlyGrantIdempotencyKey`).

## Edge function summary

See `src/__tests__/supabaseFunctionsInventory.test.ts` for the canonical classification list (frontend / webhook / cron / admin / auth / public / notify). Every directory under `supabase/functions/` is classified and every classified function has an `index.ts`.

### CORS / auth

- All web-callable functions use `corsHeaders` from `npm:@supabase/supabase-js@2/cors` and include them in OPTIONS, success, and error responses.
- `verify_jwt` overrides for public / webhook / auth-hook functions are explicit in `supabase/config.toml` and reviewed.

### Secrets

- No raw API keys, tokens, or signing secrets leak into responses or logs (`edge-functions-isolation-audit` enforces).
- Service-role usage is confined to webhook + cron + admin functions.

### Idempotency

| Function class | Pattern |
|----------------|---------|
| Payment webhooks | Stripe event id dedupe |
| Email dispatch | `(template, recipient, key)` dedupe in `email_queue` |
| Credit grants | `buildMonthlyGrantIdempotencyKey(provider, yyyymm)` |
| Lead reveal | `buildRevealIdempotencyKey(lead, provider)` |

## Findings

- ✅ No raw tokens or secrets in logs.
- ✅ No raw `err.message` in public responses.
- ✅ All app-owned definer functions search_path-pinned.
- ✅ All public functions justified by classification.

No repairs required.