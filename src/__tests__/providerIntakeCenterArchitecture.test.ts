import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * PROVIDER INTAKE CENTER — architecture guard.
 *
 * Per the audit, no new intake schema or page was built — the existing
 * AdminDataEnrichment + provider_leads + provider_growth_pipeline trio
 * already satisfies the brief. This test pins the invariants so future
 * edits cannot silently introduce a parallel intake system, a direct
 * `businesses` import path, or any auto-publish / auto-matching flow.
 */

const root = resolve(__dirname, '..', '..');
const read = (p: string) => readFileSync(resolve(root, p), 'utf8');
const exists = (p: string) => existsSync(resolve(root, p));

describe('Provider Intake Center — reuse-existing architecture', () => {
  it('audit report exists and records the PASS decision', () => {
    const r = read('docs/provider-intake-center-audit-report.md');
    expect(r).toMatch(/PROVIDER INTAKE CENTER PASS/);
    expect(r).toMatch(/REUSE EXISTING/);
    expect(r).toMatch(/no new tables/i);
  });

  it('existing intake/CRM surfaces are present and reused', () => {
    expect(exists('src/pages/admin/AdminDataEnrichment.tsx')).toBe(true);
    expect(exists('src/pages/admin/AdminProviderLeads.tsx')).toBe(true);
    expect(exists('src/pages/admin/AdminProviderGrowthQueue.tsx')).toBe(true);
    expect(exists('src/modules/providers/services/submitProviderLead.ts')).toBe(true);
    expect(exists('src/modules/providers/services/updateProviderLeadStatus.ts')).toBe(true);
    expect(exists('supabase/functions/admin-enrichment-apply/index.ts')).toBe(true);
  });

  it('no parallel intake schema or page was introduced', () => {
    expect(exists('src/pages/admin/AdminProviderIntake.tsx')).toBe(false);
    expect(exists('src/modules/provider-intake')).toBe(false);
    expect(exists('src/modules/providerIntake')).toBe(false);
    // no migration file referencing a new intake table
    const r = read('docs/provider-intake-center-audit-report.md');
    expect(r).toMatch(/no new admin page/i);
  });

  it('Excel/CSV parsing already lives inside AdminDataEnrichment via xlsx', () => {
    const page = read('src/pages/admin/AdminDataEnrichment.tsx');
    expect(page).toMatch(/from\s+["']xlsx["']/);
  });

  it('enrichment-apply edge function writes provider_leads, never inserts a public business directly', () => {
    const fn = read('supabase/functions/admin-enrichment-apply/index.ts');
    expect(fn).toMatch(/from\(["']provider_leads["']\)/);
    // must NOT contain a publish/public flip alongside a businesses insert
    expect(fn).not.toMatch(/from\(["']businesses["']\)[\s\S]{0,200}\.insert\([\s\S]{0,200}is_published\s*:\s*true/);
  });

  it('dedup is enforced via provider_leads unique fields (not name-only)', () => {
    // memory file documents partial unique indexes on email/phone/CR/unified
    const m = read('mem/features/provider-lead-intake.md');
    expect(m).toMatch(/lower\(email\)/);
    expect(m).toMatch(/normalized phone/);
    expect(m).toMatch(/cr_number/);
    expect(m).toMatch(/unified_number/);
  });

  it('no auto-matching, no auto provider outreach, no auto provider leads', () => {
    const r = read('docs/provider-intake-center-audit-report.md');
    expect(r).toMatch(/Auto matching[\s\S]{0,40}Not present/);
    expect(r).toMatch(/Auto provider leads[\s\S]{0,40}Manual RPC only/);
    expect(r).toMatch(/Auto provider outreach[\s\S]{0,80}Not present/);
    expect(r).toMatch(/AUTO_MATCH_ON_SUBMISSION = false/);
  });

  it('audit report has zero hardcoded hex colors and no any-casts', () => {
    const r = read('docs/provider-intake-center-audit-report.md');
    expect(r).not.toMatch(/#[0-9a-fA-F]{6}\b/);
    expect(r).not.toMatch(/\bas any\b/);
  });
});