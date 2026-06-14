import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const DIR = resolve(__dirname, '..', 'components', 'admin', 'ops');
const APP = resolve(__dirname, '..', 'App.tsx');
const ROOT = resolve(__dirname, '..', '..');

const FILES = [
  'OperationsAdminPageShell.tsx',
  'OperationsStatsStrip.tsx',
  'OperationsStatusBadge.tsx',
  'NotificationStatusBadge.tsx',
  'SlaStatusBadge.tsx',
  'OperationsFiltersBar.tsx',
  'OperationLogRow.tsx',
  'CronJobStatusCard.tsx',
  'DryRunResultPanel.tsx',
  'index.ts',
] as const;

const read = (rel: string) => readFileSync(resolve(DIR, rel), 'utf8');

const PAGES_NOT_MODIFIED = [
  'AdminOperations.tsx',
  'AdminEmailDeliverability.tsx',
  'AdminOperationsConsole.tsx',
  'AdminContactNotificationLog.tsx',
  'AdminContactAuditLog.tsx',
  'AdminContactSlaDashboard.tsx',
  'AdminProviderGrowthQueue.tsx',
  'AdminOperationsCenterUnified.tsx',
  'AdminEmailCenter.tsx',
  'AdminEmailHub.tsx',
  'AdminOperationsHub.tsx',
];

describe('Phase 11B — Operations / Notifications / SLA shared primitives', () => {
  it('1-10. every primitive file + barrel exists', () => {
    for (const f of FILES) {
      expect(existsSync(resolve(DIR, f)), `missing ${f}`).toBe(true);
    }
  });

  it('barrel re-exports every primitive', () => {
    const idx = read('index.ts');
    for (const sym of [
      'OperationsAdminPageShell',
      'OperationsStatsStrip',
      'OperationsStatusBadge',
      'NotificationStatusBadge',
      'SlaStatusBadge',
      'OperationsFiltersBar',
      'OperationLogRow',
      'CronJobStatusCard',
      'DryRunResultPanel',
    ]) {
      expect(idx).toContain(sym);
    }
  });

  it('11. no Supabase / supabase-js imports', () => {
    for (const f of FILES) {
      const src = read(f);
      expect(src, `${f} imports supabase`).not.toMatch(/@\/integrations\/supabase/);
      expect(src, `${f} imports supabase-js`).not.toMatch(/supabase-js/);
    }
  });

  it('12. no useQuery / useMutation / useQueryClient', () => {
    for (const f of FILES) {
      const src = read(f);
      expect(src, `${f} useQuery`).not.toMatch(/\buseQuery\b/);
      expect(src, `${f} useMutation`).not.toMatch(/\buseMutation\b/);
      expect(src, `${f} useQueryClient`).not.toMatch(/\buseQueryClient\b/);
    }
  });

  it('13-16. no imports from forbidden modules / services / edge files', () => {
    const forbidden = [
      /from '@\/modules\/operations\/services/,
      /from '@\/modules\/messaging/,
      /from '@\/components\/admin\/email-center\//,
      /from '.*supabase\/functions/,
      /from '.*_shared\//,
      /previewSlaSweepForAdmin/,
      /sendEmail|dispatchEmail|requeueDlq|suppressEmail/,
    ];
    for (const f of FILES) {
      const src = read(f);
      for (const re of forbidden) {
        expect(src, `${f} matches ${re}`).not.toMatch(re);
      }
    }
  });

  it('17. no hardcoded hex colors', () => {
    for (const f of FILES) {
      const src = read(f);
      expect(src, `${f} hex color`).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    }
  });

  it('18. no any / suppressions', () => {
    for (const f of FILES) {
      const src = read(f);
      expect(src, `${f} :any`).not.toMatch(/:\s*any\b/);
      expect(src, `${f} as any`).not.toMatch(/\bas\s+any\b/);
      expect(src, `${f} ts-ignore`).not.toMatch(/@ts-ignore/);
      expect(src, `${f} ts-expect-error`).not.toMatch(/@ts-expect-error/);
      expect(src, `${f} eslint-disable`).not.toMatch(/eslint-disable/);
    }
  });

  it('19. listed ops/notifications pages are NOT modified to adopt the new primitives in 11B', () => {
    const pagesDir = resolve(__dirname, '..', 'pages', 'admin');
    for (const p of PAGES_NOT_MODIFIED) {
      const full = resolve(pagesDir, p);
      expect(existsSync(full), `${p} missing`).toBe(true);
      const src = readFileSync(full, 'utf8');
      expect(src, `${p} must not adopt admin/ops primitives in Phase 11B`)
        .not.toMatch(/from '@\/components\/admin\/ops/);
    }
  });

  it('20. App.tsx is not modified to wire admin/ops primitives', () => {
    const app = readFileSync(APP, 'utf8');
    expect(app).not.toMatch(/from '@\/components\/admin\/ops/);
  });

  it('21. DB / RLS / edge files referenced by audit are untouched (presence only)', () => {
    for (const rel of [
      'src/modules/operations/services',
      'src/components/admin/email-center',
      'src/components/admin/MembershipLifecycleJobsPanel.tsx',
      'src/components/operations/UnifiedOperationsFeed.tsx',
    ]) {
      expect(existsSync(resolve(ROOT, rel)), `missing ${rel}`).toBe(true);
    }
    // SAFETY CONTRACT comment must remain intact in AdminOperations.tsx
    const ops = readFileSync(resolve(ROOT, 'src/pages/admin/AdminOperations.tsx'), 'utf8');
    expect(ops).toMatch(/SAFETY CONTRACT/);
    expect(ops).toMatch(/Dry-run preview ONLY/);
  });
});