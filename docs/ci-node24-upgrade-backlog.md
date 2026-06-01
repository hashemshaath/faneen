# CI Node 24 Upgrade Backlog

Non-blocking GitHub Actions warning: `actions/upload-artifact@v4` and other
JavaScript actions emit a deprecation notice about Node 20 → Node 24.

## Action items (deferred)

- Wait until GitHub makes Node 24 the default runtime for JavaScript actions.
- Until then, optionally opt-in by setting the repo/org variable:
  `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true`.
- Re-check action versions periodically; upgrade `actions/checkout`,
  `actions/setup-node`, `actions/upload-artifact`, `actions/cache` when
  Node-24-native releases land.

## Why deferred

- Warning is informational only — does not fail CI.
- Forcing Node 24 today may break third-party actions still pinned to Node 20.

Tracked here so the CI repair series does not re-investigate the warning.