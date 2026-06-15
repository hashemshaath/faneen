# Phase 15F-Deploy — Manual Closeout

## Automated DB Evidence (last 72h)

| Template | Status | Provider | provider_id | Suspicious metadata |
|---|---|---|---|---|
| recovery × 3 | sent | resend | ✅ present | ❌ none |
| welcome-signup × 1 | sent | — | — | ❌ none |
| welcome-signup × 1 | pending | — | — | ❌ none |

- Recovery (password reset) sends are stamped with `provider=resend` and a real `provider_id` (Resend message IDs).
- No tokens, Authorization, or API keys leaked into metadata.
- No duplicate sends — each `message_id` deduplicates cleanly.
- ⚠️ `welcome-signup` rows do not carry `provider`/`provider_id` in metadata — this is a logging gap (the email itself sends via Resend through `process-email-queue`, but the provider stamp is not written for that template path). Non-blocking; track for Phase 15G.

## Manual Steps (require human action — cannot be executed by the agent)

Items 1, 2, 3, 4 require opening Resend Dashboard, Supabase Auth UI, and an actual inbox. Please run these and fill in the report below.

