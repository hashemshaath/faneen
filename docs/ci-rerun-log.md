# CI Rerun Log

Documentation-only log of intentional CI reruns triggered from Lovable. No
application code, tests, DB/RLS, or workflows are changed by entries in this
file — its only purpose is to produce a fresh commit on the default branch so
GitHub Actions starts a new run.

## Entries

### 2026-06-02T13:06:22Z — Rerun after `contracts-prelaunch-smoke.sh` bunx fix

- **Date/time (UTC):** 2026-06-02T13:06:22Z
- **Reason:** Rerun CI after fixing `scripts/contracts-prelaunch-smoke.sh`
  runner fallback from a hardcoded `bunx` invocation to a portable
  `bunx`/`npx` resolution. On GitHub-hosted runners `bunx` is not always on
  `PATH`, which previously caused `bunx: command not found` and failed the
  `Code Quality & Security Audit` job.
- **Expected result:** `Code Quality & Security Audit` should no longer fail
  with `bunx: command not found`. All other guardrails
  (`vitest`, `broken-links`, `sitemap-integrity`, isolation audits) should
  remain green as they did on the last successful local run.
- **Commit purpose:** Trigger a fresh GitHub Actions run on the latest branch
  via a docs-only change. No source, tests, DB/RLS, or workflows touched.