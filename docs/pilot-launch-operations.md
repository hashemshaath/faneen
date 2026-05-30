# Pilot Launch Operations — Qitaat v1.0

_Phase: PILOT-LAUNCH-OPERATIONS-1_
_Mode: Observe → Measure → Learn → Optimize_
_Scope_: NO new business modules. Operate, monitor, log.

## 1. Pilot cohort

| Item | Target | Owner | Status |
|---|---|---|---|
| Pilot providers | 5–10 verified businesses | Admin | ⬜ |
| Pilot customers | 3–5 active site owners | Admin | ⬜ |
| Pilot sectors | Aluminum + Glass (start) | Admin | ⬜ |
| Pilot regions | Riyadh + Jeddah | Admin | ⬜ |

## 2. Daily operations checklist

Run every workday for the first 4 weeks.

### Morning (09:00)
- [ ] `/admin/operations` — review overnight alerts.
- [ ] `/dashboard/operations-center` — run System Health check; record score.
- [ ] `/admin/provider-review` — clear approval queue (target SLA: <4h).
- [ ] `/admin/contact-messages` — triage inbound.
- [ ] `/admin/email-deliverability` — confirm no DLQ spike.

### Midday (13:00)
- [ ] `/admin/quote-requests` — verify new RFQs reach providers.
- [ ] `/dashboard/operations/feed` — scan realtime activity for errors.

### Evening (17:00)
- [ ] `/admin/diagnostics` — data integrity report.
- [ ] `/admin/help` — review issue reports + feature requests.
- [ ] Update `docs/pilot-launch-backlog.md` with findings.

## 3. Success criteria & first-event log

Log the moment each happens (DB query + admin sign-off).

| Milestone | Verification query | Achieved at | Notes |
|---|---|---|---|
| First published provider | `select count(*) from businesses where status='published'` | — | — |
| First active provider profile | `/r/USR-…` resolves to live profile | — | — |
| First RFQ submitted | `select count(*) from quote_requests where created_at > pilot_start` | — | — |
| First quotation generated | provider RFQ inbox → quote sent | — | — |
| First contract created | `select count(*) from contracts where created_at > pilot_start` | — | — |
| First work order created | `select count(*) from work_orders where created_at > pilot_start` | — | — |
| First customer portal visit | `select count(*) from customer_portal_visits` (or activity log) | — | — |
| First observability snapshot | `select count(*) from operations_observability_log` | — | — |

## 4. Funnels to measure (weekly snapshot)

### Provider funnel
1. Signups (`auth.users` weekly delta)
2. Onboarding completed (`profiles.onboarded_at IS NOT NULL`)
3. Business draft saved
4. Submitted for review
5. Approved + published
6. First RFQ received
7. First quote sent
8. First contract won

### Customer funnel
1. Search performed (`/search` page views, GA4)
2. Provider profile viewed
3. Quote requested (`/quote` submit)
4. Quote received
5. Contract signed
6. Project portal opened (`/client/:refId`)
7. Closure confirmed
8. Review submitted

Capture in a weekly spreadsheet — link in backlog doc.

## 5. Observability monitors

| Source | Trigger | Action |
|---|---|---|
| `operations_observability_log` health score < 80 | Critical | Page on-call admin |
| Health score 80–89 | Warning | Investigate within 24h |
| `email_send_log` status='dlq' rate > 2% (dedup by `message_id`) | Critical | Check `/admin/email-deliverability` |
| `/admin/help` new issue with severity=high | Critical | Triage same day |
| Edge function 5xx rate > 1% | Warning | Check `supabase--edge_function_logs` |

## 6. Help Center monitoring

- Weekly query: most-searched terms with zero results → article backlog.
- Weekly query: most-viewed articles → indicates UX confusion → page polish backlog.
- Issue reports by `pageKey` → identifies which page needs explanation.

## 7. What is allowed / not allowed in this phase

**Allowed**
- Bug fixes (confirmed via observability or user report).
- Copy & label clarifications.
- Help article authoring.
- Email template tweaks.
- Performance fixes for measured slow pages.
- Sidebar label adjustments.

**Not allowed**
- New business modules (inventory, accounting, supplier portal, etc.).
- Schema changes beyond bug-fix-driven migrations.
- RLS changes.
- Route removals or major redesigns.
- Speculative features.

## 8. Exit criteria (move to Growth Mode)

- ≥ 5 published providers active for 14 consecutive days.
- ≥ 10 RFQs processed end-to-end.
- ≥ 3 contracts signed and ≥ 3 work orders completed.
- 7-day average health score ≥ 90.
- Zero open severity-high issues for 7 days.
- Backlog reviewed and prioritized.

## 9. References

- `docs/page-purpose-workflow-context-audit.md`
- `docs/workflow-map.md`
- `docs/page-integration-matrix.md`
- `docs/launch-readiness.md`
- `docs/pilot-launch-backlog.md` (live log)