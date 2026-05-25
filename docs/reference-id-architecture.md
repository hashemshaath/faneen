# Reference-ID Architecture

> BM-REF-REBUILD-CLOSEOUT-1 — Closed track. No new optional enhancement steps will be opened.

## Core Architecture Rule

| Identifier | Role | Display to users? | Use in URLs? |
|---|---|---|---|
| `UUID` | Internal foreign key only | **Never** as primary label | Only in internal admin routes when unavoidable |
| `ref_id` | Official displayed reference | **Always** prefer this | Yes — via `/r/{ref_id}` universal resolver |
| `legacy_ref_id` | Backward compatibility / search only | As secondary hint only | Via `/r/{ref_id}` if mapped in `lookup_by_reference` |
| `email` / `phone` | Auth identifiers, not references | Never as an entity reference | Never |
| `provider_intent_id` | Internal payment token | Never as an official payment reference | Never |
| `invitation_token` | Short-lived secret | Never as a reference | Never |
| `username` / `login` | Human-friendly but not official reference | Secondary context only | Only where already established (e.g. public business profile) |

## Prefix Table

| Prefix | Entity | Example |
|---|---|---|
| USR | User | `USR-1000001` |
| ADM | Admin action / system account | `ADM-1000002` |
| ENT | Business (entity) | `ENT-1000003` |
| STF | Staff member | `STF-1000004` |
| LOC | Business location / branch | `LOC-1000005` |
| CNT | Contact / address book entry | `CNT-1000006` |
| QTE | Quote request | `QTE-1000007` |
| LED | Lead / provider lead request | `LED-1000008` |
| BKG | Booking | `BKG-1000009` |
| SUB | Subscription / provider subscription | `SUB-1000010` |
| PAY | Payment intent | `PAY-1000011` |
| INV | Invoice | `INV-1000012` |
| CRN | Contract | `CRN-1000013` |
| TKT | Ticket / support request | `TKT-1000014` |
| DOC | Document / file reference | `DOC-1000015` |
| BRC | Barcode label | `BRC-1000016` |
| PRJ | Project | `PRJ-1000017` |
| WRT | Warranty | `WRT-1000018` |
| MNT | Maintenance record | `MNT-1000019` |
| OPS | Operations log | `OPS-1000020` |
| BLG | Blog post | `BLG-1000021` |
| CHT | Chat / message thread | `CHT-1000022` |

## Completed Steps

| Step | Summary | Status |
|---|---|---|
| A | Additive schema (`ref_id`, `legacy_ref_id`, sequences starting at 1000) | ✅ |
| B | Backfill + unique indexes on `ref_id` per table | ✅ |
| C | Service compatibility layer (`lookupByReference`, display helpers) | ✅ |
| D | UI safety swaps (ENT/BIZ, PAY/provider references) | ✅ |
| E | Broader ref display rollout (leads, quotes, bookings, staff) | ✅ |
| F | Universal resolver route `/r/:refId` | ✅ |
| G | Server `canonical_route` expansion in `lookup_by_reference` | ✅ |
| H | Copyable `/r/{REF}` links in quote, staff, subscription UIs | ✅ |
| I | Final sweep: admin/provider consistency hardening | ✅ |

## Compatibility Behavior

- **Legacy references preserved**: `BIZ-…`, `LR-…`, `BK-…` remain in `legacy_ref_id`.
- **Legacy lookup supported**: `lookup_by_reference` resolves both new and legacy prefixes.
- **UUID fallback**: raw UUID lookups are gated server-side (admin context only).
- **No unsafe identifiers returned**: `lookupByReference` never returns `provider_intent_id`, invitation tokens, synthetic emails, or phone-derived auth identifiers as primary labels.

## Current Supported `/r/:refId` Mappings

| Family | Prefixes | Destination |
|---|---|---|
| Business | `ENT`, `BIZ` | Business detail / profile (via `canonical_route`) |
| Contact | `CNT` | Contact detail |
| Lead | `LED`, `LR` | `/dashboard/provider/leads/:id` |
| Quote | `QTE` | `/dashboard/my-requests/:id` |
| Booking | `BKG`, `BK` | `/dashboard/bookings` |
| Payment | `PAY` | `/membership` |
| Staff invitation | `STI` | `/dashboard/business-edit` |
| Provider subscription | `PVS` | `null` safe (no dedicated route yet) |
| Contract | `CRN` | `/contracts/:id` |

## Deferred Non-Blocking Items

| Item | Rationale |
|---|---|
| `PVS` dedicated detail route | No safe destination exists today; resolver returns `not_found` gracefully. |
| `STI` dedicated detail route | Invitation surface lives inside business-edit; no standalone page needed yet. |
| `TKT` / contact `ref_id` integration | Ticket system not yet live in UI; deferred to ticket-launch phase. |
| `BRC` (barcode) prefix decision | Barcode system uses numeric ranges; prefix alignment deferred to barcode-v2. |
| `DOC` / `NTF` optional IDs | Document/notification IDs not user-facing today; revisit if public document sharing added. |
| Lead / booking header polish | Minor; revisit if provider dashboard gets header redesign. |

## Operational Rules for Future Developers

1. **Any new user-facing entity must have `ref_id`**. Add the sequence and column at table-creation time.
2. **Never display UUID as primary if `ref_id` exists**.
3. **Never display `provider_intent_id` as a payment reference**. Use `PAY-…` only.
4. **Never display invitation token as a reference**. Use `STI-…` if staff-invitations become referenceable.
5. **Always use `ReferenceBadge`** for inline display and `ReferenceLinkCopy` for copyable universal links.
6. **Always use `lookupByReference`** for universal link resolution.
7. **Keep `legacy_ref_id` searchable** so old bookmarks / SMS links keep working.
8. **Prefix new entities from the prefix table** above; add new prefixes there before using them in code.
