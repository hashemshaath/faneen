/**
 * BUSINESS-OPERATIONS-2B — operational_alerts foundation tests.
 *
 * Verifies:
 *  1. Migration creates the table, sequence, ALR default, indexes, RLS,
 *     CHECK constraints, no anon policy, no cron/notify dispatch.
 *  2. Module wrappers exist and call only the canonical table.
 *  3. No direct `supabase.from('operational_alerts')` access outside
 *     `src/modules/operations/services/`.
 *  4. Constants mirror the SQL CHECK constraints.
 */
import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import {
  OPERATIONAL_ALERT_DOMAINS,
  OPERATIONAL_ALERT_SEVERITIES,
  OPERATIONAL_ALERT_STATUSES,
  isOperationalAlertDomain,
  isOperationalAlertSeverity,
  isOperationalAlertStatus,
} from '@/modules/operations';
import { listOperationalAlerts, getOperationalAlertById } from '@/modules/operations';

const ROOT = resolve(__dirname, '../..');
const MIGRATIONS_DIR = resolve(ROOT, 'supabase/migrations');

function readAllMigrations(): string {
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql'));
  return files.map((f) => readFileSync(join(MIGRATIONS_DIR, f), 'utf-8')).join('\n');
}

function findOpAlertsMigration(): string {
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql'));
  for (const f of files) {
    const txt = readFileSync(join(MIGRATIONS_DIR, f), 'utf-8');
    if (/CREATE TABLE\s+public\.operational_alerts/i.test(txt)) return txt;
  }
  throw new Error('operational_alerts migration not found');
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (['node_modules', '.git', 'dist', 'build', 'coverage'].includes(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

describe('BUSINESS-OPERATIONS-2B migration', () => {
  const mig = findOpAlertsMigration();

  it('creates the seq_operational_alerts sequence', () => {
    expect(mig).toMatch(/CREATE SEQUENCE[^;]*seq_operational_alerts/i);
  });

  it('uses generate_ref_id ALR for ref_id default', () => {
    expect(mig).toMatch(/generate_ref_id\(\s*'ALR'\s*,\s*'seq_operational_alerts'\s*\)/);
  });

  it('declares all required columns', () => {
    for (const col of [
      'ref_id', 'domain', 'entity_type', 'entity_id', 'condition_code',
      'severity', 'status', 'title_ar', 'title_en', 'message_ar', 'message_en',
      'owner_user_id', 'owner_business_id', 'due_at', 'triggered_at',
      'acknowledged_at', 'acknowledged_by', 'resolved_at', 'resolved_by',
      'idempotency_key', 'metadata',
    ]) {
      expect(mig, `missing column ${col}`).toContain(col);
    }
  });

  it('enforces severity / status / domain CHECK constraints', () => {
    expect(mig).toMatch(/operational_alerts_severity_check/);
    expect(mig).toMatch(/operational_alerts_status_check/);
    expect(mig).toMatch(/operational_alerts_domain_check/);
  });

  it('declares unique idempotency_key', () => {
    expect(mig).toMatch(/idempotency_key\s+text\s+NOT NULL\s+UNIQUE/i);
  });

  it('creates the required indexes', () => {
    for (const idx of [
      'idx_op_alerts_status_severity',
      'idx_op_alerts_domain_condition',
      'idx_op_alerts_owner_user',
      'idx_op_alerts_owner_business',
      'idx_op_alerts_due_at',
      'idx_op_alerts_triggered_at',
      'idx_op_alerts_entity',
    ]) {
      expect(mig, `missing index ${idx}`).toContain(idx);
    }
  });

  it('enables RLS and grants only to authenticated + service_role (no anon)', () => {
    expect(mig).toMatch(/ALTER TABLE\s+public\.operational_alerts\s+ENABLE ROW LEVEL SECURITY/i);
    expect(mig).toMatch(/GRANT SELECT ON public\.operational_alerts TO authenticated/);
    expect(mig).toMatch(/GRANT ALL ON public\.operational_alerts TO service_role/);
    expect(mig).not.toMatch(/GRANT[^;]*public\.operational_alerts[^;]*TO anon/);
  });

  it('has no anon-scoped policy', () => {
    expect(mig).not.toMatch(/CREATE POLICY[^;]+operational_alerts[^;]+TO\s+anon/i);
  });

  it('does not wire any sla-sweep cron in any migration', () => {
    const all = readAllMigrations();
    expect(all).not.toMatch(/['"]sla-sweep['"]/);
  });

  it('does not dispatch notifications or emails for alerts', () => {
    expect(mig).not.toMatch(/send.*email/i);
    expect(mig).not.toMatch(/createNotification|notify_/i);
  });
});

describe('BUSINESS-OPERATIONS-2B constants', () => {
  it('exposes canonical severities/statuses/domains', () => {
    expect(OPERATIONAL_ALERT_SEVERITIES).toEqual(['info', 'warning', 'overdue', 'critical']);
    expect(OPERATIONAL_ALERT_STATUSES).toEqual(['open', 'acknowledged', 'resolved', 'dismissed']);
    expect(OPERATIONAL_ALERT_DOMAINS).toEqual([
      'leads', 'invitations', 'contracts', 'verification',
      'memberships', 'payments', 'support',
    ]);
  });

  it('type guards reject unknown values', () => {
    expect(isOperationalAlertSeverity('critical')).toBe(true);
    expect(isOperationalAlertSeverity('boom')).toBe(false);
    expect(isOperationalAlertStatus('open')).toBe(true);
    expect(isOperationalAlertStatus('opened')).toBe(false);
    expect(isOperationalAlertDomain('leads')).toBe(true);
    expect(isOperationalAlertDomain('billing')).toBe(false);
  });
});

describe('BUSINESS-OPERATIONS-2B wrappers', () => {
  it('listOperationalAlerts and getOperationalAlertById are functions', () => {
    expect(typeof listOperationalAlerts).toBe('function');
    expect(typeof getOperationalAlertById).toBe('function');
  });

  it('listOperationalAlerts returns a chainable PostgrestFilterBuilder', () => {
    const q = listOperationalAlerts({ status: 'open', limit: 5 });
    // Chain-only assertion (no network); presence of .then makes it thenable
    expect(typeof (q as { then?: unknown }).then).toBe('function');
  });
});

describe('BUSINESS-OPERATIONS-2B isolation', () => {
  it('no source file outside src/modules/operations/ accesses operational_alerts directly', () => {
    const src = resolve(ROOT, 'src');
    const files = walk(src).filter(
      (f) =>
        (f.endsWith('.ts') || f.endsWith('.tsx')) &&
        !f.includes('/__tests__/') &&
        !f.endsWith('.test.ts') &&
        !f.endsWith('.test.tsx'),
    );
    const re = /\.from\(\s*['"]operational_alerts['"]\s*\)/;
    for (const f of files) {
      const rel = f.slice(ROOT.length + 1).replace(/\\/g, '/');
      if (rel.startsWith('src/modules/operations/')) continue;
      if (rel.startsWith('src/integrations/supabase/')) continue;
      const txt = readFileSync(f, 'utf-8');
      expect(re.test(txt), `unexpected operational_alerts access in ${rel}`).toBe(false);
    }
  });

  it('operations-isolation-audit script passes', () => {
    expect(() =>
      execSync('node scripts/operations-isolation-audit.mjs', { cwd: ROOT, stdio: 'pipe' }),
    ).not.toThrow();
  });
});