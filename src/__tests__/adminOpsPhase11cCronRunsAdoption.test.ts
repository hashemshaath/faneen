import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');
const PAGE = resolve(__dirname, '..', 'pages', 'admin', 'AdminCronRuns.tsx');
const CRON_RUN_ROW = resolve(__dirname, '..', 'components', 'admin', 'ops', 'cron-runs', 'CronRunRow.tsx');
const APP = resolve(__dirname, '..', 'App.tsx');

const pageSrc = readFileSync(PAGE, 'utf8');
const rowSrc = readFileSync(CRON_RUN_ROW, 'utf8');

const FORBIDDEN_IMPORT_PATTERNS = [
  /@\/integrations\/supabase/,
  /supabase-js/,
  /from '@\/modules\/operations\/services/,
  /from '.*supabase\/functions/,
  /from '.*_shared\//,
];

describe('Phase 11C — AdminCronRuns adoption of shared ops primitives', () => {
  it('1. AdminCronRuns uses OperationsAdminPageShell', () => {
    expect(pageSrc).toMatch(/OperationsAdminPageShell/);
  });

  it('2. AdminCronRuns uses OperationsStatsStrip', () => {
    expect(pageSrc).toMatch(/OperationsStatsStrip/);
  });

  it('3. AdminCronRuns uses OperationsFiltersBar', () => {
    expect(pageSrc).toMatch(/OperationsFiltersBar/);
  });

  it('4. AdminCronRuns uses OperationsStatusBadge (via CronRunRow)', () => {
    expect(rowSrc).toMatch(/OperationsStatusBadge/);
  });

  it('5. CronRunRow is presentational only', () => {
    expect(rowSrc).not.toMatch(/\buseQuery\b/);
    expect(rowSrc).not.toMatch(/\buseMutation\b/);
    expect(rowSrc).not.toMatch(/\buseQueryClient\b/);
    expect(rowSrc).not.toMatch(/useEffect|useState\(/);
  });

  it('6. CronRunRow does not import Supabase', () => {
    expect(rowSrc).not.toMatch(/@\/integrations\/supabase/);
    expect(rowSrc).not.toMatch(/supabase-js/);
  });

  it('7-10. CronRunRow does not import services, modules/operations/services, supabase/functions or _shared', () => {
    for (const re of FORBIDDEN_IMPORT_PATTERNS) {
      expect(rowSrc, `CronRunRow matches ${re}`).not.toMatch(re);
    }
  });

  it('11. CronRunRow contains no hardcoded hex colors', () => {
    expect(rowSrc).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it('12. CronRunRow contains no any / suppressions', () => {
    expect(rowSrc).not.toMatch(/:\s*any\b/);
    expect(rowSrc).not.toMatch(/\bas\s+any\b/);
    expect(rowSrc).not.toMatch(/@ts-ignore/);
    expect(rowSrc).not.toMatch(/@ts-expect-error/);
    expect(rowSrc).not.toMatch(/eslint-disable/);
  });

  it('13. App.tsx is not modified to wire admin/ops primitives', () => {
    const app = readFileSync(APP, 'utf8');
    expect(app).not.toMatch(/from '@\/components\/admin\/ops/);
  });

  it('14. DB / RLS / migrations / RPC / edge files are not referenced by the new row component', () => {
    expect(rowSrc).not.toMatch(/supabase\/migrations/);
    expect(rowSrc).not.toMatch(/rpc\(/);
  });

  it('15. cron schedule files and job execution services remain untouched (presence only)', () => {
    for (const rel of [
      'src/modules/system/services/cronRuns.ts',
      'src/components/admin/MembershipLifecycleJobsPanel.tsx',
    ]) {
      expect(existsSync(resolve(ROOT, rel)), `missing ${rel}`).toBe(true);
    }
    // The page must still import the unchanged service entry points.
    expect(pageSrc).toMatch(/from '@\/modules\/system\/services\/cronRuns'/);
    expect(pageSrc).toMatch(/listCronRunLogs/);
    expect(pageSrc).toMatch(/getCronRunHealth/);
  });
});