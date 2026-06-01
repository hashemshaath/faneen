# Edge Functions Audit — SUPABASE-GITHUB-DATABASE-DEEP-REPAIR-1

_Builds on `docs/edge-function-inventory.md` and `src/__tests__/supabaseFunctionsInventory.test.ts`._

## Inventory
- **58 deployed functions** (excluding `_shared`).
- 100% have `index.ts` entrypoint (enforced by inventory test).
- 100% classified (frontend / webhook / cron / admin / auth / public / notify).
- No "stale" / unclassified dirs.

## Security invariants (enforced by `src/__tests__/hardening1c.edgeFunctionAudit.test.ts`)
- No JWT-like literals in sources.
- No echo of `Authorization` header in response bodies.
- No raw OTP, password, service-role values, or unsubscribe tokens in logs.
- All `admin-*` functions read `Authorization` and gate via `has_role` checks.
- `manual-sla-real-run` is feature-flag gated; cannot insert notifications.
- No edge function returns `.stack` in JSON.
- `membership-payment-webhook` performs signature verification.

## CORS
All functions import `corsHeaders` from `npm:@supabase/supabase-js@2/cors` (or local `_shared/cors.ts`) and respond to `OPTIONS`.

## Legacy naming
- `rg -i 'faneen|faniyeen|fanyeen|فنيين' supabase/functions/` → **0 hits**.

## Conclusion

Edge functions are clean, classified, secret-safe, and Qitaat-branded. No repairs required.