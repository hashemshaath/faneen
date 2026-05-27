# BUSINESS-OPERATIONS-1A — Operational Lifecycle Architecture

Status: Architecture / audit phase. **Additive only.** No production behavior
changes in this phase. This document defines the canonical operational state
model for the platform and is the source of truth for future phases
(1B workflow enforcement, 2 SLA/escalation).

## 1. Lifecycle matrix

Each domain lists: canonical states, owner actors, terminal flag (T), and
notes about overloaded / orphaned values discovered in audit.

### 1.1 Businesses / Entities (`businesses.approval_status`, `is_verified`)

| State                | Owner actor   | Terminal | Notes |
|----------------------|---------------|----------|-------|
| draft                | owner         |          | current |
| pending_verification | system/admin  |          | maps to existing `submitted` + `under_review` (overloaded today) |
| verified             | admin         |          | maps to `approved` / `published` + `is_verified=true` |
| active               | system        |          | implicit via `is_active` |
| restricted           | admin         |          | **missing** today — needed for partial suspensions |
| suspended            | admin         |          | **missing** today |
| rejected             | admin         | T*       | `needs_changes` is a sibling re-entry state |
| needs_more_info      | admin         |          | exists as `needs_changes` |
| archived             | owner/admin   | T        | **missing** today |

Overloaded: `approval_status` mixes review state and publish state
(`published` vs `approved`). Recommend splitting in 1B.

### 1.2 Staff memberships (`business_staff.status`)

| State              | Owner actor   | Terminal | Notes |
|--------------------|---------------|----------|-------|
| invited            | manager/owner |          | current via `business_staff_invitations` |
| pending_acceptance | invitee       |          | current |
| active             | system        |          | current |
| disabled           | manager/owner |          | **missing** — today only `is_active=false` |
| revoked            | manager/owner | T        | currently soft-deleted |
| expired            | automation    | T        | invitation TTL only |

### 1.3 Quote requests / leads

| State        | Owner actor | Terminal | Notes |
|--------------|-------------|----------|-------|
| draft        | client      |          | **missing** at quote_requests layer |
| submitted    | client      |          | = `new` today |
| matched      | system      |          | exists |
| viewed       | provider    |          | exists on provider_leads |
| contacted    | provider    |          | exists |
| quoted       | provider    |          | **missing** |
| negotiation  | provider    |          | **missing** |
| won          | provider    | T        | inferred via contract creation |
| lost         | provider    | T        | partly = `not_interested` |
| archived     | system      | T        | **missing** |
| spam         | admin       | T        | **missing** |

### 1.4 Contracts (`contracts.status`)

| State            | Owner actor  | Terminal | Notes |
|------------------|--------------|----------|-------|
| draft            | owner        |          | current |
| pending_approval | client       |          | covers review + signature today |
| partially_signed | system       |          | **missing** — multi-party signing future |
| active           | system       |          | current — LOCKED |
| completed        | system/owner | T        | current — LOCKED |
| cancelled        | owner/admin  | T        | current — LOCKED |
| expired          | automation   | T        | **missing** — only inferred from `end_date` |
| disputed         | client/admin |          | current |
| archived         | owner        | T        | **missing** |

### 1.5 Membership subscriptions

| State        | Owner actor | Terminal | Notes |
|--------------|-------------|----------|-------|
| trial        | system      |          | exists |
| active       | system      |          | exists |
| grace_period | automation  |          | **missing** — payments retry window |
| past_due     | automation  |          | implicit via `payment_status` |
| cancelled    | owner       | T        | exists |
| expired      | automation  | T        | exists |
| suspended    | admin       |          | **missing** |

### 1.6 Payment intents

| State              | Owner actor | Terminal | Notes |
|--------------------|-------------|----------|-------|
| created            | system      |          | current |
| pending            | system      |          | current |
| processing         | provider    |          | **missing** explicit |
| paid               | provider    | T        | current |
| failed             | provider    | T*       | current |
| refunded           | admin       | T        | current |
| partially_refunded | admin       |          | **missing** |
| chargeback         | provider    | T        | **missing** |
| expired            | automation  | T        | **missing** |

Payment behavior is OUT OF SCOPE for 1A — documented only.

### 1.7 Verification / moderation queues

| State        | Owner actor | Terminal | Notes |
|--------------|-------------|----------|-------|
| pending      | system      |          | universal entry |
| under_review | admin       |          | current on businesses |
| approved     | admin       | T        | current |
| rejected     | admin       | T*       | current |
| flagged      | system/user |          | **missing** first-class |
| appealed     | owner       |          | **missing** |

## 2. Allowed transitions

Encoded canonically in `src/modules/shared/lifecycle/transitions.ts`. The
helper `canTransition(domain, from, to)` is pure. Use in 1B for enforcement;
in 1A only used by tests.

## 3. Recommended actor ownership

| Actor      | Typical authority |
|------------|-------------------|
| system     | timestamps, automatic state advances |
| owner      | business CRUD, contract draft → pending_approval, cancel |
| manager    | staff lifecycle within an entity, lead triage |
| admin      | verification, suspension, restriction, dispute resolution |
| finance    | refund / chargeback / credit-note (deferred) |
| automation | expiry, grace_period, archival, SLA escalation |

## 4. Suggested timestamps (additive, future migration)

approved_at, rejected_at, suspended_at, restricted_at, archived_at,
completed_at, cancelled_at, expired_at, last_state_change_at +
last_state_change_by.

## 5. Suggested audit events

- `business_state_events` (verification, suspension, restriction, archival)
- `staff_membership_events` (invite, accept, disable, revoke, expire)
- `subscription_state_events` (trial→active, grace, past_due, cancel, expire)

## 6. Automation opportunities

| Hook                            | Trigger |
|---------------------------------|---------|
| contracts.expired sweep         | daily cron, `end_date < now() AND status='active'` |
| subscription.grace_period entry | payment failed + retries pending |
| subscription.expired sweep      | period_end passed and no renewal |
| lead.archived sweep             | `status='new'` AND age > N days |
| invitation.expired sweep        | invitation TTL |
| moderation.SLA alert            | `pending_verification > 48h` |
| dispute.SLA escalation          | `disputed > 7d` notify admin |

## 7. Suggested future enums / constants

DB enums deferred to 1B. TypeScript constants land in this phase under
`src/modules/shared/lifecycle/` as read-only mirrors.

## 8. Dangerous lifecycle inconsistencies

1. `businesses.approval_status` mixes review/publish/lifecycle.
2. Contract `expired` only inferred from `end_date`; never written; cron
   missing.
3. Staff `revoked` is hard-deleted today, losing audit history.
4. Quote request `won/lost` derived from contract existence.
5. Membership `grace_period` not represented; users in retry look `active`.
6. Refund partial vs full not distinguishable on payment intent.

## 9. Orphaned statuses

- `quote_requests.under_review` — set but never read by any UI surface.
- Legacy contracts `pending` string — already removed from
  `lib/contract-statuses.ts`; still appears in some seed/test fixtures.
- `business_staff.is_active=false` rows with no `revoked_at` timestamp.

## 10. Overloaded statuses

- `businesses.approval_status` — verification + visibility + lifecycle.
- `contracts.pending_approval` — review + signature + partial signing.
- `provider_leads.status` — provider triage + request fulfillment.

---

## Phase 1A deliverables

- This document.
- `src/modules/shared/lifecycle/` constants + transition validator.
- Audit test for transition tables and centralized constants parity with
  existing per-domain constants.

## Next phase

Recommended: **BUSINESS-OPERATIONS-1B** — wire `canTransition` into a small,
low-risk surface first (staff invitation accept/decline) behind a feature
flag, with parity tests, before any DB enum migration.
