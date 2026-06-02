# CI Node 24 Upgrade Backlog

## Status: COMPLETED (CI-NODE24-MIGRATION-1)

All workflow files updated for Node 24 compatibility. No remaining warnings.

## Changes applied

- `actions/upload-artifact@v4` → `actions/upload-artifact@v5` in:
  - `.github/workflows/code-audit.yml`
  - `.github/workflows/visual-regression.yml` (×2 occurrences)
- `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true` added to all three workflow job envs:
  - `code-audit.yml`
  - `pdf-arabic-verify.yml`
  - `visual-regression.yml`

## Why these changes

`actions/upload-artifact@v4` is a Node 20 action and will be deprecated.
`actions/checkout@v5` and `actions/setup-node@v5` already run on Node 24 patches,
but `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true` proactively opts the entire runner
into Node 24 so any remaining runtime warnings are eliminated.

No app code, tests, DB/RLS, or product behavior changed.

## Historical context (pre-fix)

GitHub Actions JavaScript actions (Node 20 runtime) were deprecated with a
timeline forcing Node 24 by June 16, 2026. The affected actions were:
- `actions/checkout@v5`
- `actions/setup-node@v5`
- `actions/upload-artifact@v4`

These have all been addressed above.