# SOFT LAUNCH OPERATIONS — PHASE 13H
## Real Day 1 Execution Gate

**Type:** Operational gate (no code, no DB, no migrations).
**Goal:** Decide whether real Day 1 invitations can be sent today.

---

## 1. References

- `SOFT LAUNCH OPERATIONS PHASE 13A READY FOR EXECUTION`
- `SOFT LAUNCH OPERATIONS PHASE 13B ACTIVATION KIT READY`
- `SOFT LAUNCH OPERATIONS PHASE 13C DAY 0 BOARD READY`
- `SOFT LAUNCH OPERATIONS PHASE 13D OPERATIONS TEAM ASSIGNED`
- `SOFT LAUNCH OPERATIONS PHASE 13E DAY 0 GO-LIVE CHECK READY`
- `SOFT LAUNCH OPERATIONS PHASE 13F DAY 1 EXECUTION BOARD READY`
- `SOFT LAUNCH OPERATIONS PHASE 13G DAY 1 LIVE REPORT READY` (status: NOT EXECUTED)
- `PRODUCT LAUNCH QA PHASE 12F SOFT LAUNCH READY WITH WATCH ITEMS`

---

## 2. Pre-Send Mandatory Checklist

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | WhatsApp number configured in production OR clearly hidden | ❌ Pending | `VITE_QITAAT_WHATSAPP` not set in `.env`. FAB hides itself when missing → acceptable as "hidden" only if alternative contact channel is documented. |
| 2 | WhatsApp link works on mobile | ❌ Pending | Cannot verify until #1 is set. |
| 3 | `/quote` works | ⚠️ Pending operator manual smoke | Last verified state: PASS in 12F. Re-verify today before send. |
| 4 | Internal RFQ submitted successfully | ❌ Pending | Must be done by Operator before any external send. |
| 5 | Small image upload succeeded | ❌ Pending | Part of internal RFQ test. |
| 6 | Small PDF upload succeeded | ❌ Pending | Part of internal RFQ test. |
| 7 | `/for-providers` CTA works | ⚠️ Pending operator manual smoke | Last verified state: PASS in 12F. |
| 8 | `/join-as-provider` redirect works | ⚠️ Pending operator manual smoke | Last verified state: PASS in 12F. |
| 9 | Today's Operator assigned | ❌ Pending | No Launch Owner sign-off recorded in 13G. |
| 10 | First 10 Tier A providers with real names | ❌ Pending | No real list submitted in 13D / 13G. |
| 11 | First 10–15 pilot customers with real names | ❌ Pending | No real list submitted in 13D / 13G. |
| 12 | Provider messages reviewed | ⚠️ Templates exist (13B), final approval Pending | Awaits Launch Owner sign-off. |
| 13 | Customer messages reviewed | ⚠️ Templates exist (13B), final approval Pending | Awaits Launch Owner sign-off. |
| 14 | Tracking board ready to fill | ✅ Ready | `docs/...-phase-13g-day-1-live-report.md` templates in place. |

---

## 3. Decision Rule Evaluation

Blocking items (per spec — any one ⇒ HOLD):

- WhatsApp not configured AND no documented alternative contact channel → **BLOCKING**.
- Internal RFQ not sent successfully → **BLOCKING**.
- Upload not verified → **BLOCKING**.
- No real Tier A provider list → **BLOCKING**.
- No real customer list → **BLOCKING**.
- No Operator assigned → **BLOCKING**.

**Count of blocking items unresolved: 6/6.**

---

## 4. Decision

# 🔴 HOLD — NOT READY TO SEND

No real Day 1 invitations may be sent today. Platform is technically ready (12F PASS, Dashboard Final Sweep PASS, 7664/7664 tests), but the **operational prerequisites are not in place**:

- No Operator named for today.
- No real Tier A / customer cohort lists submitted.
- No internal RFQ smoke test executed today.
- WhatsApp number not configured and no alternative contact channel documented.

---

## 5. Required Actions Before Re-Gate

Owner: **Launch Owner** (delegating to 13D coordinators).

1. Set `VITE_QITAAT_WHATSAPP` in production env **or** document the alternative contact channel (e.g. email, in-app messaging) and explicitly accept hidden FAB.
2. Assign today's Operator by name and record in 13G.
3. Submit final Tier A provider list (≥10 real names, real cities/sectors) into 13G `Provider Actuals` table.
4. Submit final customer list (≥10–15 real names) into 13G `Customer Actuals` table.
5. Execute internal RFQ smoke test (one RFQ from internal test account with one image + one small PDF). Record result in 13G `RFQ Actual Log`.
6. Re-run manual smoke for `/quote`, `/for-providers`, `/join-as-provider` and tick items #3, #7, #8 in §2.
7. Launch Owner signs off provider + customer message copies.

Once all the above are ✅, re-evaluate this gate. If all six blockers clear, status flips to **READY TO SEND DAY 1 INVITATIONS**.

---

## 6. Day 1 Execution Plan (deferred, ready for activation upon PASS)

| Time | Action |
|------|--------|
| 10:00 | Send Tier A invites to first 10 providers. Log per provider: sent / opened / replied / started registration / completed file / gaps / next action. |
| 11:00 | Send invites to first 10–15 pilot customers. Log per customer: sent / link opened / RFQ started / RFQ sent / quality / follow-up. |
| 13:00 | Follow up providers: replied-not-started, started-not-completed, missing images/services/areas. |
| 15:00 | Follow up customers: opened-not-started, started-not-sent, sent-incomplete. |
| 18:00 | Update `docs/soft-launch-operations-phase-13g-day-1-live-report.md` with **real numbers only**. |

These steps remain inactive until this gate flips to PASS.

---

## 7. Final Report (post-gate)

1. **Phase 13H status:** 🔴 `HOLD — NOT READY TO SEND`
2. **Reason:** 6/6 operational blockers unresolved (WhatsApp, internal RFQ, upload verification, Tier A list, customer list, Operator).
3. **Internal RFQ tested today?** No.
4. **File upload succeeded today?** No (not attempted).
5. **WhatsApp configured?** No — env var missing; no documented alternative.
6. **Tier A providers ready:** `0/10`
7. **Pilot customers ready:** `0/15`
8. **Operator assigned?** No.
9. **Any invitations sent?** No.
10. **Final decision:** `SOFT LAUNCH OPERATIONS PHASE 13H HOLD — NOT READY TO SEND`

---

## 8. Compliance

- No code changes.
- No DB / RLS / RPC / migrations.
- No estimated numbers.
- No fabricated names.
- No invented results.
- No bulk send before message approval.
- Launch scope unchanged (Jeddah + Riyadh, 5 sectors).

**Decision:** `SOFT LAUNCH OPERATIONS PHASE 13H HOLD — NOT READY TO SEND`