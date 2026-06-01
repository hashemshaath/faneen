import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { resolve, join } from 'path';
import { execSync } from 'child_process';

/**
 * SUPABASE-GITHUB-DATABASE-DEEP-REPAIR-1 guard suite.
 *
 * These invariants protect the conclusions in:
 *  - docs/supabase-project-state-audit.md
 *  - docs/supabase-migration-chain-audit.md
 *  - docs/database-drift-audit.md
 *  - docs/supabase-github-sync-audit.md
 *  - docs/legacy-name-audit.md
 *  - docs/supabase-rls-policy-audit.md
 *  - docs/supabase-rpc-function-audit.md
 *  - docs/supabase-edge-functions-audit.md
 *  - docs/supabase-storage-audit.md
 *  - docs/supabase-types-generation-report.md
 */

const ROOT = resolve(__dirname, '../..');
const MIGRATIONS_DIR = join(ROOT, 'supabase/migrations');
const FUNCTIONS_DIR = join(ROOT, 'supabase/functions');
const TYPES = join(ROOT, 'src/integrations/supabase/types.ts');

function listMigrations(): string[] {
  return readdirSync(MIGRATIONS_DIR).filter((n) => n.endsWith('.sql'));
}

describe('SUPABASE-GITHUB-DATABASE-DEEP-REPAIR-1: guard invariants', () => {
  it('migration chain has no duplicate timestamps', () => {
    const stamps = listMigrations().map((n) => n.split('_')[0]);
    const dupes = stamps.filter((s, i, a) => a.indexOf(s) !== i);
    expect(dupes).toEqual([]);
  });

  it('migration chain sorts in strict chronological order', () => {
    const stamps = listMigrations().map((n) => n.split('_')[0]);
    const sorted = [...stamps].sort();
    expect(stamps).toEqual(sorted);
  });

  it('no app-owned migration disables row level security', () => {
    const hits: string[] = [];
    for (const f of listMigrations()) {
      const src = readFileSync(join(MIGRATIONS_DIR, f), 'utf8');
      if (/ALTER\s+TABLE\s+public\.[a-z0-9_]+\s+DISABLE\s+ROW\s+LEVEL\s+SECURITY/i.test(src)) {
        hits.push(f);
      }
    }
    expect(hits).toEqual([]);
  });

  it('no migration deletes from auth.* tables', () => {
    const hits: string[] = [];
    for (const f of listMigrations()) {
      const src = readFileSync(join(MIGRATIONS_DIR, f), 'utf8');
      if (/DELETE\s+FROM\s+auth\./i.test(src)) hits.push(f);
    }
    expect(hits).toEqual([]);
  });

  it('no user-facing source file references legacy Faneen / Faniyeen / فنيين copy', () => {
    // Excludes docs, migrations, memory, lockfiles, and test fixtures that
    // legitimately reference legacy strings to enforce their absence.
    const out = (() => {
      try {
        return execSync(
          [
            'rg',
            '-l',
            '-i',
            '\\bfaneen\\b|\\bfaniyeen\\b|\\bfanyeen\\b|\\bfaneyeen\\b|فنيين',
            'src',
            'index.html',
            'public',
            '-g',
            '!**/__tests__/**',
            '-g',
            '!**/*.test.ts',
            '-g',
            '!**/*.test.tsx',
          ].join(' '),
          { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
        ).trim();
      } catch {
        return '';
      }
    })();
    expect(out).toBe('');
  });

  it('no edge function references legacy Faneen branding', () => {
    const hits: string[] = [];
    for (const dir of readdirSync(FUNCTIONS_DIR)) {
      if (dir.startsWith('.') || dir === '_shared') continue;
      const idx = join(FUNCTIONS_DIR, dir, 'index.ts');
      if (!existsSync(idx)) continue;
      const src = readFileSync(idx, 'utf8');
      if (/faneen|faniyeen|fanyeen|faneyeen|فنيين/i.test(src)) hits.push(dir);
    }
    expect(hits).toEqual([]);
  });

  it('generated types file is present and contains current major tables', () => {
    expect(existsSync(TYPES)).toBe(true);
    const src = readFileSync(TYPES, 'utf8');
    for (const t of [
      'businesses',
      'profiles',
      'contracts',
      'work_orders',
      'notifications',
      'help_articles',
      'quote_requests',
      'rfq_requests',
      'brand_catalog',
      'membership_subscriptions',
      'membership_plans',
    ]) {
      expect(src).toMatch(new RegExp(`^      ${t}: \\{$`, 'm'));
    }
  });

  it('generated types include RFQ brand picker columns', () => {
    const src = readFileSync(TYPES, 'utf8');
    expect(src).toMatch(/preferred_brand_ids/);
    expect(src).toMatch(/brand_preference_mode/);
  });

  it('no runtime client source persists a service-role key', () => {
    const out = (() => {
      try {
        return execSync(
          'rg -l "SUPABASE_SERVICE_ROLE_KEY" src -g "!**/__tests__/**" -g "!**/*.test.ts" -g "!**/*.test.tsx"',
          { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
        ).trim();
      } catch {
        return '';
      }
    })();
    expect(out).toBe('');
  });

  it('supabase/config.toml exists with a single project_id', () => {
    const cfg = readFileSync(join(ROOT, 'supabase/config.toml'), 'utf8');
    const matches = cfg.match(/^project_id\s*=/gm) ?? [];
    expect(matches.length).toBe(1);
    expect(cfg).toMatch(/project_id\s*=\s*"hckpxwhjycmdflaneihd"/);
  });

  it('all GitHub sync + database audit docs exist', () => {
    for (const doc of [
      'docs/supabase-project-state-audit.md',
      'docs/supabase-migration-chain-audit.md',
      'docs/database-drift-audit.md',
      'docs/supabase-github-sync-audit.md',
      'docs/legacy-name-audit.md',
      'docs/supabase-rls-policy-audit.md',
      'docs/supabase-rpc-function-audit.md',
      'docs/supabase-edge-functions-audit.md',
      'docs/supabase-storage-audit.md',
      'docs/supabase-types-generation-report.md',
    ]) {
      expect(existsSync(join(ROOT, doc)), `${doc} missing`).toBe(true);
      expect(statSync(join(ROOT, doc)).size).toBeGreaterThan(0);
    }
  });
});