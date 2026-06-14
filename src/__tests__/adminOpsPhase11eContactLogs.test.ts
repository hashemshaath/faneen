import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');
const NLOG = resolve(__dirname, '..', 'pages', 'admin', 'AdminContactNotificationLog.tsx');
const ALOG = resolve(__dirname, '..', 'pages', 'admin', 'AdminContactAuditLog.tsx');
const APP = resolve(__dirname, '..', 'App.tsx');
const DIR = resolve(__dirname, '..', 'components', 'admin', 'ops', 'contact-logs');

const NEW_FILES = [
  'ContactNotificationLogTableSection.tsx',
  'ContactAuditLogTableSection.tsx',
  'index.ts',
] as const;

const nlogSrc = readFileSync(NLOG, 'utf8');
const alogSrc = readFileSync(ALOG, 'utf8');
const newFileSrcs = NEW_FILES.map((f) => ({ f, src: readFileSync(resolve(DIR, f), 'utf8') }));

const FORBIDDEN = [
  /from '@\/modules\/operations\/services/,
  /from '@\/modules\/messaging/,
  /from '.*supabase\/functions/,
  /from '.*_shared\//,
] as const;

describe('Phase 11E — Contact Notification / Audit Logs adoption', () => {
  it('1-2. AdminContactNotificationLog uses OperationsAdminPageShell + OperationsFiltersBar', () => {
    expect(nlogSrc).toMatch(/OperationsAdminPageShell/);
    expect(nlogSrc).toMatch(/OperationsFiltersBar/);
    expect(nlogSrc).toMatch(/ContactNotificationLogTableSection/);
  });

  it('3-4. AdminContactAuditLog uses OperationsAdminPageShell + OperationsFiltersBar', () => {
    expect(alogSrc).toMatch(/OperationsAdminPageShell/);
    expect(alogSrc).toMatch(/OperationsFiltersBar/);
    expect(alogSrc).toMatch(/ContactAuditLogTableSection/);
  });

  it('5. NotificationStatusBadge is used for notification statuses', () => {
    const section = newFileSrcs.find((x) => x.f === 'ContactNotificationLogTableSection.tsx')!;
    expect(section.src).toMatch(/NotificationStatusBadge/);
  });

  it('6. new components do not import Supabase', () => {
    for (const { f, src } of newFileSrcs) {
      expect(src, `${f} imports supabase`).not.toMatch(/@\/integrations\/supabase/);
      expect(src, `${f} imports supabase-js`).not.toMatch(/supabase-js/);
    }
  });

  it('7. new components do not run queries or mutations', () => {
    for (const { f, src } of newFileSrcs) {
      expect(src, `${f} useQuery`).not.toMatch(/\buseQuery\b/);
      expect(src, `${f} useMutation`).not.toMatch(/\buseMutation\b/);
      expect(src, `${f} useQueryClient`).not.toMatch(/\buseQueryClient\b/);
    }
  });

  it('8-11. new components do not import forbidden services / messaging / edge / _shared', () => {
    for (const { f, src } of newFileSrcs) {
      for (const re of FORBIDDEN) {
        expect(src, `${f} matches ${re}`).not.toMatch(re);
      }
    }
  });

  it('12. new components contain no hardcoded hex colors', () => {
    for (const { f, src } of newFileSrcs) {
      expect(src, `${f} hex color`).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    }
  });

  it('13. new components contain no any / suppressions', () => {
    for (const { f, src } of newFileSrcs) {
      expect(src, `${f} :any`).not.toMatch(/:\s*any\b/);
      expect(src, `${f} as any`).not.toMatch(/\bas\s+any\b/);
      expect(src, `${f} ts-ignore`).not.toMatch(/@ts-ignore/);
      expect(src, `${f} ts-expect-error`).not.toMatch(/@ts-expect-error/);
      expect(src, `${f} eslint-disable`).not.toMatch(/eslint-disable/);
    }
  });

  it('14. App.tsx is not modified to wire admin/ops primitives', () => {
    const app = readFileSync(APP, 'utf8');
    expect(app).not.toMatch(/from '@\/components\/admin\/ops/);
  });

  it('15. DB / RLS / migrations / RPC / edge files are not referenced by new components', () => {
    for (const { src } of newFileSrcs) {
      expect(src).not.toMatch(/supabase\/migrations/);
      expect(src).not.toMatch(/\.rpc\(/);
    }
  });

  it('16. notification dispatch / audit writer files remain present and untouched by new components', () => {
    for (const rel of [
      'src/modules/operations/services',
      'src/modules/messaging',
    ]) {
      expect(existsSync(resolve(ROOT, rel)), `missing ${rel}`).toBe(true);
    }
    for (const { f, src } of newFileSrcs) {
      expect(src, `${f} must not import dispatch helpers`).not.toMatch(/sendEmail|dispatchEmail|requeueDlq|suppressEmail/);
    }
  });

  it('17. CSV build/export stays in the pages, not in primitives', () => {
    expect(nlogSrc).toMatch(/exportCSV/);
    expect(nlogSrc).toMatch(/Blob\(/);
    expect(alogSrc).toMatch(/exportCSV/);
    expect(alogSrc).toMatch(/Blob\(/);
    for (const { f, src } of newFileSrcs) {
      expect(src, `${f} must not own CSV building`).not.toMatch(/new Blob\(/);
      expect(src, `${f} must not call URL.createObjectURL`).not.toMatch(/URL\.createObjectURL/);
    }
  });

  it('18. pages still own the RPC queries and react-query hooks', () => {
    expect(nlogSrc).toMatch(/useQuery/);
    expect(nlogSrc).toMatch(/supabase\.rpc/);
    expect(alogSrc).toMatch(/useQuery/);
    expect(alogSrc).toMatch(/supabase\.rpc/);
  });
});