# Edge Functions Boundary (EF-6)

All application code MUST call Supabase Edge Functions through thin domain
wrappers. Direct use of `supabase.functions.invoke(...)` in pages,
components, hooks, or generic `lib/` files is forbidden and enforced by
`scripts/edge-functions-isolation-audit.mjs` (CI step **Edge Functions
Isolation Audit**).

## Allowed call sites

- `src/modules/<domain>/services/**` — canonical domain wrappers.
- `src/services/auth/authService.ts` — canonical OTP/auth caller.
- `src/integrations/supabase/**` — generated client.

Module barrels (`src/modules/<domain>/index.ts`) re-export wrappers but
must not call `functions.invoke` themselves.

## Adding a new edge function call

1. Create a thin wrapper under `src/modules/<domain>/services/<name>.ts`:

   ```ts
   import { supabase } from '@/integrations/supabase/client';

   export async function myEdgeWrapper(
     payload: Record<string, unknown>,
   ): Promise<ReturnType<typeof supabase.functions.invoke>> {
     return supabase.functions.invoke('my-edge-function', { body: payload });
   }
   ```

2. Export from the module's `index.ts`.
3. Call the wrapper from the page/component. Keep all toast / loading /
   query-invalidation logic at the call site — wrappers must return the
   raw `{ data, error }` from `supabase.functions.invoke` unchanged.

## Why

- Single point of change per edge function (renames, payload shape,
  retries, instrumentation).
- Predictable test surface — service tests assert the wire contract;
  component tests assert UX behavior.
- Prevents privilege/PII flows from sprawling across the UI tree.