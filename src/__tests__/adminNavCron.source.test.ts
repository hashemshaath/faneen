import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * ADMIN-NAV-CRON-1 source guards.
 *
 *  - DashboardSidebar exposes /admin/cron-runs with bilingual label
 *  - /admin/cron-runs route stays admin-protected
 *  - AdminCronRuns page renders the Cron Health rollup with bilingual
 *    title, success rate, failed warning, "Not enough data yet" empty
 *    state, and never serializes raw summary or hits the table directly.
 */

const root = resolve(__dirname, '../..');
const SIDEBAR = readFileSync(resolve(root, 'src/components/dashboard/DashboardSidebar.tsx'), 'utf8');
const APP = readFileSync(resolve(root, 'src/App.tsx'), 'utf8');
const PAGE = readFileSync(resolve(root, 'src/pages/admin/AdminCronRuns.tsx'), 'utf8');

describe('admin sidebar nav entry', () => {
  it('includes the /admin/cron-runs link', () => {
    expect(SIDEBAR).toContain("/admin/cron-runs");
  });
  it('uses bilingual label', () => {
    expect(SIDEBAR).toContain('تشغيل المهام');
    expect(SIDEBAR).toContain('Cron Runs');
  });
  it('does not reach into cron_run_log directly from the sidebar', () => {
    expect(SIDEBAR).not.toMatch(/cron_run_log/);
    expect(SIDEBAR).not.toMatch(/supabase\.from/);
  });
});

describe('admin route protection', () => {
  it('/admin/cron-runs requires admin', () => {
    expect(APP).toMatch(/\/admin\/cron-runs[\s\S]*requireAdmin[\s\S]*AdminCronRuns/);
  });
});

describe('Cron Health rollup card', () => {
  it('renders bilingual title', () => {
    expect(PAGE).toContain('صحة المهام المجدولة');
    expect(PAGE).toContain('Cron Health');
  });

  it('computes success rate', () => {
    expect(PAGE).toMatch(/successRate/);
    expect(PAGE).toMatch(/Math\.round\(\s*\(\s*succeeded\s*\/\s*total\s*\)\s*\*\s*100\s*\)/);
  });

  it('flags failed > 0 with warning tone', () => {
    expect(PAGE).toMatch(/hasIssues\s*=\s*health\.failed\s*>\s*0/);
    expect(PAGE).toMatch(/border-destructive/);
  });

  it('renders the empty rollup copy in both languages', () => {
    // ADMIN-CRON-AGGREGATE-RPC-1: empty copy now reflects the selected window.
    expect(PAGE).toContain('لا توجد بيانات كافية للفترة المحددة.');
    expect(PAGE).toContain('Not enough data for the selected period.');
  });

  it('still uses listCronRunLogs wrapper exclusively (no direct table or JSON.stringify summary)', () => {
    expect(PAGE).toMatch(/listCronRunLogs/);
    expect(PAGE).not.toMatch(/from\(\s*['"]cron_run_log['"]\s*\)/);
    expect(PAGE).not.toMatch(/supabase\.from/);
    expect(PAGE).not.toMatch(/JSON\.stringify\(\s*[a-zA-Z_]*summary/);
  });

  it('keeps useNoIndex and existing loading/empty/error states', () => {
    expect(PAGE).toMatch(/useNoIndex\(\)/);
    expect(PAGE).toContain('No cron runs recorded yet.');
    expect(PAGE).toMatch(/Failed to load logs|تعذر تحميل السجلات/);
  });
});