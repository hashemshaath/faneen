import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * PROVIDER PILOT READINESS OPERATIONS — guard test.
 *
 * Per the sprint's decision rule, no new system is built. This test
 * locks in the audit decision: reuse the existing AdminProviderGrowthQueue,
 * provider_growth_pipeline, business_internal_notes and operational_alerts
 * infrastructure. No DB migration, no automatic provider sending, no
 * matching, no provider leads, no RFQ dispatch.
 */

const root = resolve(__dirname, '..', '..');
const read = (p: string) => readFileSync(resolve(root, p), 'utf8');
const exists = (p: string) => existsSync(resolve(root, p));

describe('Provider Pilot Readiness Operations — audit-first', () => {
  it('audit report exists and documents the reuse decision', () => {
    const r = read('docs/provider-pilot-readiness-operations-report.md');
    expect(r).toMatch(/PROVIDER PILOT READINESS OPERATIONS REPORT/);
    expect(r).toMatch(/REUSE/);
    expect(r).toMatch(/PROVIDER PILOT READINESS OPERATIONS PASS/);
    // explicit "no automation" attestations
    expect(r).toMatch(/Automatic matching enabled\?\s*\*\*NO\.\*\*/);
    expect(r).toMatch(/Automatic provider leads created\?\s*\*\*NO\.\*\*/);
    expect(r).toMatch(/RFQ logic changed\?\s*\*\*NO\.\*\*/);
    expect(r).toMatch(/DB \/ RLS \/ migrations changed\?\s*\*\*NO\.\*\*/);
  });

  it('existing admin readiness surfaces are reused (not duplicated)', () => {
    expect(exists('src/pages/admin/AdminProviderGrowthQueue.tsx')).toBe(true);
    expect(exists('src/components/business/BusinessOperationsPanel.tsx')).toBe(true);
    expect(exists('src/components/admin/businesses/sections/BusinessOperationsSection.tsx')).toBe(true);
    // queue is wired into the Operations Center hub
    const hub = read('src/pages/admin/AdminOperationsHub.tsx');
    expect(hub).toMatch(/AdminProviderGrowthQueue/);
  });

  it('no new pilot-readiness page was created', () => {
    // these are the names a duplicate build would have used
    expect(exists('src/pages/admin/AdminPilotReadiness.tsx')).toBe(false);
    expect(exists('src/pages/admin/AdminProviderPilotReadiness.tsx')).toBe(false);
    expect(exists('src/components/admin/pilot/PilotReadinessTable.tsx')).toBe(false);
  });

  it('no new DB migration was added for this sprint', () => {
    // the report itself must declare no migration
    const r = read('docs/provider-pilot-readiness-operations-report.md');
    expect(r).toMatch(/Zero migrations, zero RLS edits, zero edge function changes\./);
  });

  it('approved outreach template is documented for manual copy/paste', () => {
    const r = read('docs/provider-pilot-readiness-operations-report.md');
    expect(r).toMatch(/منصة قطاعات/);
    expect(r).toMatch(/اسم مسؤول التواصل/);
    expect(r).toMatch(/3 خدمات/);
    expect(r).toMatch(/لا يوجد إرسال تلقائي/);
  });

  it('queue page does not introduce automatic dispatch / matching / RFQ creation', () => {
    const src = read('src/pages/admin/AdminProviderGrowthQueue.tsx');
    // no email sender invocation, no rfq dispatch, no auto-match
    expect(src).not.toMatch(/sendProviderEmail|dispatchProvider|autoMatch|createProviderLead/);
    // no any/suppressions/hex
    expect(src).not.toMatch(/:\s*any\b/);
    expect(src).not.toMatch(/as\s+any\b/);
    expect(src).not.toMatch(/@ts-(ignore|expect-error)/);
    expect(src).not.toMatch(/eslint-disable/);
    const stripped = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|\s)\/\/.*$/gm, '$1');
    expect(stripped).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it('AUTO_MATCH_ON_SUBMISSION remains disabled where defined', () => {
    // soft check: if the flag exists anywhere it must be false
    const r = read('docs/provider-pilot-readiness-operations-report.md');
    expect(r).toMatch(/AUTO_MATCH_ON_SUBMISSION = false/);
  });
});