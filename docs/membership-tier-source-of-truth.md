# Membership Tier — Source of Truth (MEMBERSHIP-TIER-SOURCE-OF-TRUTH-1)

## Canonical source

`membership_subscriptions` joined to `membership_plans.tier` is the
single authoritative source for a business's effective membership tier.
The columns `businesses.membership_tier` and `profiles.membership_tier`
are **derived mirrors**, kept consistent automatically by a database
trigger. They MUST never be written to from application code outside
the membership RPC channel.

## Effective tier rule

`get_effective_membership_tier(p_business_id uuid)` returns the highest-
ranked tier among the business's subscriptions that are simultaneously:

- `status = 'active'`
- `cancelled_at IS NULL`
- `expires_at IS NULL` OR `expires_at > now()`

Tier ranking: `free (0) < basic (1) < premium (2) < enterprise (3)`.
If nothing qualifies, the result is `'free'`.

`get_effective_user_membership_tier(p_user_id uuid)` does the same over
user-level subscriptions (`business_id IS NULL`).

## Profile mirror policy

`profiles.membership_tier` for a user = MAX over:
- the user's effective user-level subscription, AND
- every business they own (each business's effective tier).

This guarantees a profile never silently downgrades because a single
owned business drops.

## Automatic sync

Trigger `trg_membership_subscriptions_sync_tier` fires AFTER
`INSERT | DELETE | UPDATE OF (status, plan_id, business_id, user_id,
cancelled_at, expires_at)` on `membership_subscriptions`. For every
affected business it calls `sync_business_membership_tier(business_id)`,
which recomputes the effective tier and writes the mirrors only when
they differ. When `business_id` changes on UPDATE, both the old and the
new business are resynced.

`sync_business_membership_tier` sets the GUC `app.membership_rpc = '1'`
so the existing `guard_business_membership_tier` write-protection
trigger allows the mirror update through the official channel.

## What this fixes

Before this change:
- `admin_set_business_membership_tier` RPC was the only path that
  mirrored the tier onto `businesses` / `profiles`.
- The payment lifecycle (`membership-payment-confirm`,
  `-webhook`, `-reconcile`) activated subscriptions without ever
  updating the mirrors → admin views showed the real tier while the
  business profile, business cards, and auth context still showed the
  stale `free`.

After this change the mirror is recomputed on **every** lifecycle event
regardless of which code path produced it.

## Frontend reads

UI surfaces continue to read `businesses.membership_tier` /
`profiles.membership_tier` as before — they now always equal the
authoritative value because the trigger guarantees it. No frontend
refactor is required for correctness. The mirror columns are kept for
performance (no extra join needed on listing pages).

## Reconciliation

The migration includes a one-time backfill that calls
`sync_business_membership_tier` for every existing business and every
user that holds a user-level active subscription. The result is logged
via `RAISE NOTICE 'MEMBERSHIP-TIER-SOURCE-OF-TRUTH-1: reconciled,
businesses_resynced=N'`.

## Out of scope (follow-ups)

- `applyProviderSnapshot` in
  `supabase/functions/_shared/membership-payments/index.ts` updates
  `payment_status` but never flips `membership_subscriptions.status` to
  `'active'`. Until that is fixed, paid intents will not yet activate
  the sub — but once they do, the mirror sync is guaranteed.
- `process_expired_memberships` is referenced by the audit doc but does
  not exist as a DB function yet. When added, no changes are needed on
  the mirror side — the trigger covers it.
- Eventually the mirror columns can be deprecated in favor of a
  generated/view-derived value; not done in this phase to keep the
  blast radius small.