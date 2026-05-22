# Shared Error Mapping (R1A)

`src/services/rpc.ts` exposes `normalizeSupabaseError(err)` which returns a
`NormalizedRpcError { code, message, detail?, cause? }`. UI code should only
display `message`; `detail`/`cause` are debug-only and must never reach
production UI strings.

## Codes

| Code                | When                                                  | Generic UI message                                 |
|---------------------|-------------------------------------------------------|----------------------------------------------------|
| `RLS_DENIED`        | Postgres `42501`, "permission denied", RLS rejection  | You do not have permission to perform this action. |
| `NOT_FOUND`         | PostgREST `PGRST116`, "no rows", "not found"          | The requested resource was not found.              |
| `DUPLICATE_KEY`     | Postgres `23505`, unique violation                    | This record already exists.                        |
| `VALIDATION_FAILED` | `23514` / `23502` / `22P02`, check/null/cast failures | The submitted data is invalid.                     |
| `AUTH_REQUIRED`     | PostgREST `PGRST301`, missing/expired JWT             | Please sign in to continue.                        |
| `ADMIN_REQUIRED`    | Functions raising `admin required`                    | Administrator access is required.                  |
| `NETWORK_ERROR`     | `TypeError` / "fetch" / "timeout" / "ECONN"           | Network error. Please try again.                   |
| `UNKNOWN`           | Fallback                                              | Something went wrong. Please try again.            |

## Rules

- Never throw raw `PostgrestError` to React components.
- Always keep the original message on `detail` for support diagnostics.
- Localize the generic message at the call site (do not bake i18n into the wrapper).
- Domain-specific mappers (e.g. `mapContractLockError`, `mapContractCreateError`)
  remain authoritative for their domains and may run before or after this layer.