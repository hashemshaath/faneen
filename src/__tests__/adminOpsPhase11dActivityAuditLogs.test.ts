import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');
const ACTIVITY = resolve(__dirname, '..', 'pages', 'admin', 'AdminActivityLog.tsx');
const AUDIT = resolve(__dirname, '..', 'pages', 'admin', 'AdminAuditLog.tsx');
const APP = resolve(__dirname, '..', 'App.tsx');
const LOGS_DIR = resolve(__dirname, '..', 'components', 'admin', 'ops', 'activity-logs');

const NEW_FILES = [
  'adminActivityLogDict.ts',
  'adminActivityLogFormatters.ts',
  'AdminActivityLogItem.tsx',
  'AdminActivityLogTimelineSection.tsx',
  'AdminAuditLogTableSection.tsx',
  'index.ts',
] as const;

const activitySrc = readFileSync(ACTIVITY, 'utf8');
const auditSrc = readFileSync(AUDIT, 'utf8');
const newFileSrcs = NEW_FILES.map((f) => ({ f, src: readFileSync(resolve(LOGS_DIR, f), 'utf8') }));

const FORBIDDEN = [
  /from '@\/modules\/operations\/services/,
  /from '.*supabase\/functions/,
  /from '.*_shared\//,
] as const;

describe('Phase 11D — Activity / Audit Logs adoption', () => {
  it('1. AdminActivityLog uses OperationsAdminPageShell', () => {
    expect(activitySrc).toMatch(/OperationsAdminPageShell/);
  });

  it('2. AdminActivityLog uses OperationsFiltersBar', () => {
    expect(activitySrc).toMatch(/OperationsFiltersBar/);
  });

  it('3. AdminActivityLog uses the timeline section (log table section)', () => {
    expect(activitySrc).toMatch(/AdminActivityLogTimelineSection/);
  });

  it('4. AdminAuditLog uses the audit log table section', () => {
    expect(auditSrc).toMatch(/AdminAuditLogTableSection/);
    expect(auditSrc).toMatch(/OperationsAdminPageShell/);
    expect(auditSrc).toMatch(/OperationsFiltersBar/);
  });

  it('5. new components do not import Supabase', () => {
    for (const { f, src } of newFileSrcs) {
      expect(src, `${f} imports supabase`).not.toMatch(/@\/integrations\/supabase/);
      expect(src, `${f} imports supabase-js`).not.toMatch(/supabase-js/);
    }
  });

  it('6. new components do not run queries or mutations', () => {
    for (const { f, src } of newFileSrcs) {
      expect(src, `${f} useQuery`).not.toMatch(/\buseQuery\b/);
      expect(src, `${f} useMutation`).not.toMatch(/\buseMutation\b/);
      expect(src, `${f} useQueryClient`).not.toMatch(/\buseQueryClient\b/);
    }
  });

  it('7-9. new components do not import forbidden services / edge / _shared', () => {
    for (const { f, src } of newFileSrcs) {
      for (const re of FORBIDDEN) {
        expect(src, `${f} matches ${re}`).not.toMatch(re);
      }
    }
  });

  it('10. new components contain no hardcoded hex colors', () => {
    for (const { f, src } of newFileSrcs) {
      expect(src, `${f} hex color`).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    }
  });

  it('11. new components contain no any / suppressions', () => {
    for (const { f, src } of newFileSrcs) {
      expect(src, `${f} :any`).not.toMatch(/:\s*any\b/);
      expect(src, `${f} as any`).not.toMatch(/\bas\s+any\b/);
      expect(src, `${f} ts-ignore`).not.toMatch(/@ts-ignore/);
      expect(src, `${f} ts-expect-error`).not.toMatch(/@ts-expect-error/);
      expect(src, `${f} eslint-disable`).not.toMatch(/eslint-disable/);
    }
  });

  it('12. App.tsx is not modified to wire admin/ops primitives', () => {
    const app = readFileSync(APP, 'utf8');
    expect(app).not.toMatch(/from '@\/components\/admin\/ops/);
  });

  it('13. DB / RLS / migrations / RPC / edge files are not referenced by new components', () => {
    for (const { src } of newFileSrcs) {
      expect(src).not.toMatch(/supabase\/migrations/);
      expect(src).not.toMatch(/\.rpc\(/);
    }
  });

  it('14. audit / event log writer files remain untouched (presence only)', () => {
    for (const rel of [
      'src/pages/admin/adminActivityLog.types.ts',
      'src/lib/admin-reports-csv.ts',
    ]) {
      expect(existsSync(resolve(ROOT, rel)), `missing ${rel}`).toBe(true);
    }
    // The pages must still import the unchanged data-shape and CSV helpers.
    expect(activitySrc).toMatch(/from '\.\/adminActivityLog\.types'/);
    expect(auditSrc).toMatch(/from '@\/lib\/admin-reports-csv'/);
  });

  it('15. CSV build/export stays in the pages, not in primitives', () => {
    expect(activitySrc).toMatch(/exportToCSV/);
    expect(activitySrc).toMatch(/Blob\(/);
    expect(auditSrc).toMatch(/buildCsv\(/);
    expect(auditSrc).toMatch(/downloadCsv\(/);
    for (const { f, src } of newFileSrcs) {
      expect(src, `${f} must not own CSV building`).not.toMatch(/\bbuildCsv\b/);
      expect(src, `${f} must not own CSV download`).not.toMatch(/\bdownloadCsv\b/);
    }
  });
});