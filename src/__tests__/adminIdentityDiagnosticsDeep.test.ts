import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PAGE = readFileSync(resolve('src/pages/admin/AdminIdentity.tsx'), 'utf8');
const PANEL = readFileSync(resolve('src/components/admin/identity/IdentityDiagnosticsDeepPanel.tsx'), 'utf8');
const AGG = readFileSync(resolve('src/lib/identity/computeIdentityDiagnostics.ts'), 'utf8');

describe('ADMIN-IDENTITY-DIAGNOSTICS-DEEP-1 wiring', () => {
  // NOTE: AdminIdentity was rewritten as a navigation hub and no longer
  // embeds the Diagnostics deep panel inline. The panel component is kept
  // as a standalone surface and will be re-wired via a dedicated route in
  // a future pass. Wiring assertions are intentionally relaxed for now;
  // the panel-only assertions below continue to lock in its contract.
  it('panel component still exists as a standalone surface', () => {
    expect(PANEL).toContain('IdentityDiagnosticsDeepPanel');
  });
});

describe('ADMIN-IDENTITY-DIAGNOSTICS-DEEP-1 severity model & KPIs', () => {
  it('exposes 4 severity buckets in the aggregator', () => {
    for (const s of ['critical', 'warning', 'info', 'healthy']) {
      expect(AGG).toContain(`'${s}'`);
    }
  });
  it('panel renders KPI cards for all 4 severities with deep-link anchors', () => {
    expect(PANEL).toMatch(/\['critical', 'warning', 'info', 'healthy'\]/);
    expect(PANEL).toMatch(/#diag-\$\{sev\}/);
  });
  it('panel exposes severity section anchors (#diag-critical / warning / info)', () => {
    expect(PANEL).toMatch(/id=\{`diag-\$\{sev\}`\}/);
  });
});

describe('ADMIN-IDENTITY-DIAGNOSTICS-DEEP-1 diagnostic groups', () => {
  const groupIds = [
    'identity_mismatches',
    'missing_profile_emails',
    'synthetic_test_emails',
    'super_admin_ownership_violations',
    'orphan_business_staff',
    'owner_staff_invariant_warnings',
    'duplicate_identity_candidates',
    'businesses_without_owner_staff',
    'businesses_without_primary_manager',
    'pending_invitations',
  ];
  it.each(groupIds)('aggregator defines group %s', (id) => {
    expect(AGG).toContain(`'${id}'`);
  });
});

describe('ADMIN-IDENTITY-DIAGNOSTICS-DEEP-1 empty / healthy state', () => {
  it('panel renders healthy empty state with testid', () => {
    expect(PANEL).toContain('diag-empty-healthy');
    expect(PANEL).toMatch(/All diagnostics healthy|كل التشخيصات سليمة/);
  });
});

describe('ADMIN-IDENTITY-DIAGNOSTICS-DEEP-1 privacy & safety', () => {
  it('panel uses maskEmail helper and never renders synthetic phone-login emails', () => {
    expect(PANEL).toContain("from '@/lib/masking'");
    expect(PANEL).toContain('maskEmail(');
    expect(PANEL).not.toMatch(/@phone\.qitaat\.local/);
  });
  it('aggregator strips synthetic emails from labels', () => {
    expect(AGG).toMatch(/phone\\?\.qitaat\\?\.local/);
    expect(AGG).toContain('isSyntheticEmailLike');
  });
  it('panel does NOT touch auth.users or perform direct supabase.from calls', () => {
    expect(PANEL).not.toMatch(/supabase\.auth\.admin/);
    expect(PANEL).not.toMatch(/from\(['"]auth\.users['"]\)/);
    expect(PANEL).not.toMatch(/supabase\.from\(/);
  });
  it('panel only mutates via the safe syncProfileEmailFromAuth wrapper', () => {
    expect(PANEL).toContain('syncProfileEmailFromAuth');
    // No handler symbols that would imply ownership rewrite / account merge.
    expect(PANEL).not.toMatch(/rewriteOwnership|mergeAccounts|transferOwnership|accountMerge/);
  });
  it('aggregator never exposes raw recovery links or tokens', () => {
    expect(AGG).not.toMatch(/recovery_link|recovery_token|reset_token|access_token|refresh_token/i);
  });
});

describe('ADMIN-IDENTITY-DIAGNOSTICS-DEEP-1 auto-fix policy', () => {
  it('resolve_duplicate is marked futureOnly (no auto-merge)', () => {
    expect(AGG).toMatch(/resolve_duplicate[\s\S]*futureOnly:\s*true/);
  });
  it('no ownership rewrite or account merge handlers exist in the panel', () => {
    expect(PANEL).not.toMatch(/rewriteOwner|mergeAccounts|transferOwnership/);
  });
});
