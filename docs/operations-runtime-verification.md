# Operations Center Runtime Verification

_RUNTIME-INTEGRATION-VERIFY-1 — Part D._

Verifies the Operations Center surfaces shipped under
`src/modules/observability/**` and `src/pages/dashboard/DashboardOperationsCenter.tsx`.
No new tables, RLS, or workflows are introduced — this is a runtime
verification only.

## Surfaces checked

| Surface | Source | Behaviour | Status |
|---|---|---|---|
| Health score | `modules/observability/health.computeHealthScore` | Reads latest snapshot from `operations_observability_log`, blends notification + email + diagnostics sub-scores | verified |
| Alert creation | `modules/observability/alerts` | New events route through `notifyDomainEvent('ops_alert_critical')`; admin notification + email template wired | verified |
| Observability history | `operations_observability_log` query | Renders trailing 30 snapshots, charted by sub-score | verified |
| Manual health check | `runHealthSnapshot` button | Inserts a fresh row into `operations_observability_log`, surfaces score delta | verified |
| Integrity diagnostics | `modules/observability/diagnostics` | Runs read-only audits (notification coverage, transactional-email backlog, RLS guards) | verified |
| Reports | `modules/observability/reports` | Renders weekly summary using only observability tables | verified |

## Runtime checks performed

- Manual health check writes one and only one row per click; idempotent
  client-side guard prevents double-submits within 5s.
- Observability writes are isolated to `operations_observability_log` and
  `notification_events` — no mutation of business tables (verified by
  `scripts/operations-isolation-audit.mjs`).
- Alert engine respects severity thresholds (`warn` ≥ 75, `critical` ≥ 90)
  and de-duplicates within 15 minutes using `(event_key, hour_bucket)`.
- Help Center registry has a mapping for every operations route (verified
  by `pagePurposeWorkflowContextAudit1.test.ts`).

## Known gaps

- WhatsApp/SMS alert channels remain out of scope.
- Pager / on-call escalation is a v2 feature.

## Validation

- `scripts/operations-isolation-audit.mjs` — green.
- `scripts/notifications-isolation-audit.mjs` — green.
- `src/tests/postLaunchObservability1.test.ts` — green.