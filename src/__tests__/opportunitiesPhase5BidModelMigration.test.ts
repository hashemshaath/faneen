import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * OPPORTUNITIES PHASE 5 — static SQL guards for the bid model migration.
 *
 * We assert the most recent `opportunity_bids` migration was authored
 * with the required structural pieces. Runtime RLS semantics are checked
 * separately by the isolation audits.
 */
const MIG_DIR = resolve(__dirname, '..', '..', 'supabase', 'migrations');

function findMigration(needle: string): string {
  const files = readdirSync(MIG_DIR).filter((f) => f.endsWith('.sql'));
  for (const f of files) {
    const sql = readFileSync(resolve(MIG_DIR, f), 'utf8');
    if (sql.includes(needle)) return sql;
  }
  throw new Error(`migration containing ${needle} not found`);
}

describe('opportunity_bids — migration', () => {
  const sql = findMigration('CREATE TABLE public.opportunity_bids');

  it('declares the FK to quote_requests with cascade delete', () => {
    expect(sql).toMatch(/opportunity_id\s+uuid\s+NOT NULL\s+REFERENCES\s+public\.quote_requests\(id\)\s+ON DELETE CASCADE/i);
  });

  it('declares the optional FK to quote_request_leads (assignment)', () => {
    expect(sql).toMatch(/assignment_id\s+uuid\s+REFERENCES\s+public\.quote_request_leads\(id\)/i);
  });

  it('constrains status to the canonical bid lifecycle', () => {
    for (const s of [
      'draft', 'submitted', 'under_review', 'shortlisted',
      'revised', 'withdrawn', 'rejected', 'awarded',
    ]) {
      expect(sql).toContain(`'${s}'`);
    }
  });

  it('grants to authenticated + service_role and NOT to anon', () => {
    expect(sql).toMatch(/GRANT\s+SELECT,\s*INSERT,\s*UPDATE,\s*DELETE\s+ON\s+public\.opportunity_bids\s+TO\s+authenticated/);
    expect(sql).toMatch(/GRANT\s+ALL\s+ON\s+public\.opportunity_bids\s+TO\s+service_role/);
    expect(sql).not.toMatch(/GRANT[^;]*ON\s+public\.opportunity_bids\s+TO\s+anon/i);
  });

  it('enables RLS', () => {
    expect(sql).toMatch(/ALTER TABLE public\.opportunity_bids ENABLE ROW LEVEL SECURITY/);
  });

  it('has provider, client, and admin SELECT policies', () => {
    expect(sql).toContain('opp_bids_select_submitter');
    expect(sql).toContain('opp_bids_select_business_staff');
    expect(sql).toContain('opp_bids_select_client');
    expect(sql).toContain('opp_bids_select_admin');
  });

  it('INSERT policy is assignment-gated against quote_request_leads', () => {
    expect(sql).toContain('opp_bids_insert_assigned_provider');
    expect(sql).toMatch(/FROM\s+public\.quote_request_leads/);
  });

  it('UPDATE restricted to editable statuses for the submitter', () => {
    expect(sql).toContain('opp_bids_update_submitter_editable');
    expect(sql).toMatch(/status IN \('draft','submitted','revised'\)/);
  });

  it('DELETE restricted to admin', () => {
    expect(sql).toContain('opp_bids_delete_admin');
  });

  it('creates the required indexes', () => {
    for (const i of [
      'idx_opp_bids_opportunity',
      'idx_opp_bids_provider_business',
      'idx_opp_bids_submitted_by',
      'idx_opp_bids_status',
      'idx_opp_bids_assignment',
    ]) {
      expect(sql).toContain(i);
    }
  });

  it('does not touch legacy rfq_quotes / quote_requests / quote_request_leads', () => {
    expect(sql).not.toMatch(/ALTER\s+TABLE\s+public\.rfq_quotes/i);
    expect(sql).not.toMatch(/DROP\s+TABLE\s+public\.rfq_quotes/i);
    expect(sql).not.toMatch(/ALTER\s+TABLE\s+public\.quote_requests\b/i);
    expect(sql).not.toMatch(/ALTER\s+TABLE\s+public\.quote_request_leads\b/i);
  });
});