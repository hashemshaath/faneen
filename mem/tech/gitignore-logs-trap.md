---
name: gitignore logs folder trap
description: Source folders literally named `logs` are gitignored — use `activity-logs` instead
type: constraint
---
Root `.gitignore` (read-only) contains a `logs` pattern that matches ANY directory named `logs` anywhere in the tree, including source code. Files placed under `src/components/admin/ops/logs/` are silently dropped between snapshots, breaking imports and the build (`vite build` fails with `ENOENT ... ops/logs`).

**Rule:** never name a source directory `logs`. The admin activity/audit log module lives at `src/components/admin/ops/activity-logs/` and is imported as `@/components/admin/ops/activity-logs`. **Why:** `.gitignore` is read-only on this project, so a `!` exception cannot be added. **How to apply:** rename any folder called `logs` to `activity-logs` / `event-logs` / `log-views` and update imports + any guard tests pointing to it.