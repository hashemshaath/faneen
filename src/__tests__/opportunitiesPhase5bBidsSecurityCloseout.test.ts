import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * OPPORTUNITIES PHASE 5B — Bids security/RLS closeout guards.
 * Static-only. Runtime RLS is asserted by the migration itself.
 */
const ROOT = resolve(__dirname, '..', '..');
const MIG_DIR = resolve(ROOT, 'supabase', 'migrations');

function readAllMigrations(): string {
  return readdirSync(MIG_DIR)
    .filter((f) => f.endsWith('.sql'))
    .map((f) => readFileSync(resolve(MIG_DIR, f), 'utf8'))
    .join('\n');
}

const ALL_SQL = readAllMigrations();
const SERVICES = readFileSync(resolve(ROOT, 'src/modules/opportunities/bids/services.ts'), 'utf8');
const TYPES = readFileSync(resolve(ROOT, 'src/modules/opportunities/bids/types.ts'), 'utf8');
const PROVIDER_SECTION = readFileSync(resolve(ROOT, 'src/modules/opportunities/bids/ProviderBidSection.tsx'), 'utf8');
const CLIENT_SECTION = readFileSync(resolve(ROOT, 'src/modules/opportunities/bids/ClientBidsSection.tsx'), 'utf8');

describe('opportunity_bids — Phase 5B security closeout', () => {
  it('RLS is enabled', () => {
    expect(ALL_SQL).toMatch(/ALTER TABLE public\.opportunity_bids ENABLE ROW LEVEL SECURITY/);
  });

  it('does not grant any access to anon', () => {
    expect(ALL_SQL).not.toMatch(/GRANT[^;]*ON\s+public\.opportunity_bids\s+TO\s+anon/i);
  });

  it('grants are scoped to authenticated + service_role only', () => {
    expect(ALL_SQL).toMatch(/GRANT\s+SELECT,\s*INSERT,\s*UPDATE,\s*DELETE\s+ON\s+public\.opportunity_bids\s+TO\s+authenticated/);
    expect(ALL_SQL).toMatch(/GRANT\s+ALL\s+ON\s+public\.opportunity_bids\s+TO\s+service_role/);
  });

  it('client SELECT policy is tied to opportunity ownership', () => {
    expect(ALL_SQL).toContain('opp_bids_select_client');
    expect(ALL_SQL).toMatch(/qr\.user_id\s*=\s*auth\.uid\(\)/);
  });

  it('provider SELECT policy is tied to submitter or business staff', () => {
    expect(ALL_SQL).toContain('opp_bids_select_submitter');
    expect(ALL_SQL).toContain('opp_bids_select_business_staff');
    expect(ALL_SQL).toMatch(/is_business_staff\(provider_business_id,\s*auth\.uid\(\)\)/);
  });

  it('INSERT policy is assignment-gated and forbids impersonation', () => {
    expect(ALL_SQL).toContain('opp_bids_insert_assigned_provider');
    expect(ALL_SQL).toMatch(/submitted_by\s*=\s*auth\.uid\(\)/);
    expect(ALL_SQL).toMatch(/FROM\s+public\.quote_request_leads/);
  });

  it('assignment/opportunity/provider consistency trigger is installed', () => {
    expect(ALL_SQL).toContain('opp_bids_validate_assignment');
    expect(ALL_SQL).toMatch(/assignment_id does not belong to opportunity_id/);
    expect(ALL_SQL).toMatch(/assignment provider does not match provider_business_id/);
  });

  it('price_amount has a non-negative CHECK', () => {
    expect(ALL_SQL).toMatch(/opp_bids_price_non_negative/);
    expect(ALL_SQL).toMatch(/price_amount\s+IS\s+NULL\s+OR\s+price_amount\s*>=\s*0/i);
  });

  it('currency defaults to SAR', () => {
    expect(ALL_SQL).toMatch(/currency\s+text\s+NOT NULL\s+DEFAULT\s+'SAR'/);
  });

  it('status CHECK lists the canonical bid lifecycle', () => {
    for (const s of ['draft','submitted','under_review','shortlisted','revised','withdrawn','rejected','awarded']) {
      expect(ALL_SQL).toContain(`'${s}'`);
    }
  });

  it('DELETE is admin-only', () => {
    expect(ALL_SQL).toContain('opp_bids_delete_admin');
    expect(ALL_SQL).not.toMatch(/CREATE POLICY[^;]*opportunity_bids[^;]*FOR DELETE[^;]*submitted_by/i);
  });

  it('updated_at trigger is wired', () => {
    expect(ALL_SQL).toMatch(/opp_bids_set_updated_at[\s\S]*update_updated_at_column/);
  });

  it('frontend bid services never use service_role / any / suppressions', () => {
    for (const src of [SERVICES, TYPES, PROVIDER_SECTION, CLIENT_SECTION]) {
      expect(src).not.toMatch(/service_role/i);
      expect(src).not.toMatch(/SUPABASE_SERVICE_ROLE/);
      expect(src).not.toMatch(/:\s*any\b/);
      expect(src).not.toMatch(/\bas\s+any\b/);
      expect(src).not.toMatch(/@ts-(ignore|expect-error|nocheck)/);
    }
  });

  // R1 lifted the Phase-5B "no award UI" freeze on the client side: the
  // client bids section now owns the award + revise-request actions so
  // clients can complete the opportunity lifecycle without an admin
  // handoff. The freeze remains for the *provider* bid section.
  it('provider section still has no Award / Convert-to-Contract UI (Phase 5B invariant preserved for providers post-R1)', () => {
    expect(PROVIDER_SECTION).not.toMatch(/awardBid|convertToContract|ترسية|اعتماد العرض|تحويل إلى عقد/);
  });

  // R1 also introduced client-side "request revision" — the client
  // section may reference «تعديل العرض» via that CTA. The withdraw/edit
  // controls (which would let a *client* mutate a provider's bid) are
  // still forbidden.
  it('client section does NOT expose provider-side withdraw/edit controls (R1 keeps «طلب تعديل العرض» allowed)', () => {
    expect(CLIENT_SECTION).not.toMatch(/withdrawOpportunityBid|updateDraftOpportunityBid|سحب العرض/);
  });

  it('provider section shows the submit form CTA', () => {
    expect(PROVIDER_SECTION).toContain('submitOpportunityBid');
    expect(PROVIDER_SECTION).toMatch(/تقديم/);
  });
});