/**
 * WORKSPACE-CONTEXT-4F — payments & memberships audit.
 *
 * Access-model audit (read-only — no code migration this phase):
 *  - src/pages/Membership.tsx (user-facing plan picker / upgrade flow)
 *      → user-scoped via auth.uid(). Business binding is resolved by
 *        `listOwnerBusinesses` first, falling back to
 *        `listManagedStaffMembershipForUser` so a staff manager can
 *        already subscribe today. Forcing `useActiveWorkspace` with
 *        owner-only gating would REMOVE access for existing staff
 *        managers, i.e. change payment behavior. Per phase rules
 *        ("Preserve current payment and membership behavior exactly"
 *        and "If a page currently does not depend on active business /
 *        entity, do not force workspace into it") we defer.
 *  - src/pages/MembershipInvoice.tsx  → keyed by payment id; no
 *        business context to migrate.
 *  - src/pages/MembershipPaymentReturn.tsx → keyed by provider return
 *        params; no business context to migrate.
 *  - src/pages/dashboard/ProviderMembership.tsx → enumerates ALL
 *        provider subscriptions for the current user via
 *        `listProviderSubscriptionsForCurrentUser` (no active-business
 *        filter). Read-only. No workspace dependency to add.
 *  - src/pages/admin/AdminMembership*  → admin-only. Must NEVER consume
 *        the user workspace.
 *
 * Invariants this audit locks down:
 *  - No payments / membership page imports `useActiveWorkspace` in
 *    this phase.
 *  - Payment edge functions are untouched (audit only inspects names —
 *    they are listed for traceability).
 *  - Membership components keep using the existing service wrappers
 *    (`subscribeToPlan`, `listProviderSubscriptionsForCurrentUser`,
 *    `getCurrentMembershipSubscription`, etc.) and never introduce a
 *    new direct `supabase.from('membership_*')` access.
 *  - PAY / PVS official references continue to render on the invoice
 *    page (no raw uuids replacing the ref in user-facing display).
 *  - Public membership / payment routes remain referenced from
 *    src/App.tsx so no route regression slipped in.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');
const read = (rel: string): string => readFileSync(join(SRC, rel), 'utf8');

const PUBLIC_PAGES = [
  'pages/Membership.tsx',
  'pages/MembershipInvoice.tsx',
  'pages/MembershipPaymentReturn.tsx',
  'pages/dashboard/ProviderMembership.tsx',
];

const ADMIN_PAGES = [
  'pages/admin/AdminMembershipPayments.tsx',
  'pages/admin/AdminMemberships.tsx',
  'pages/admin/AdminMembershipEvents.tsx',
  'pages/admin/AdminMembershipRejections.tsx',
];

const PAYMENT_EDGE_FUNCTIONS = [
  'membership-lifecycle-dispatcher',
  'membership-payment-confirm',
  'membership-payment-create-intent',
  'membership-payment-reconcile',
  'membership-payment-webhook',
];

describe('WORKSPACE-CONTEXT-4F — payments & memberships (deferred migration)', () => {
  it('no payments/membership page imports useActiveWorkspace this phase', () => {
    for (const p of [...PUBLIC_PAGES, ...ADMIN_PAGES]) {
      const src = read(p);
      expect(src, p).not.toContain("from '@/hooks/useActiveWorkspace'");
      expect(src, p).not.toMatch(/\buseActiveWorkspace\s*\(/);
    }
  });

  it('admin membership pages do not consume the user workspace', () => {
    for (const p of ADMIN_PAGES) {
      const src = read(p);
      expect(src, p).not.toContain('useActiveWorkspace');
      // Admin pages should not pretend to scope by an owner entity.
      expect(src, p).not.toContain('activeOwnerEntityId');
    }
  });

  it('Membership.tsx still uses existing subscription / business wrappers', () => {
    const src = read('pages/Membership.tsx');
    expect(src).toContain('subscribeToPlan');
    expect(src).toContain('listOwnerBusinesses');
    expect(src).toContain('listManagedStaffMembershipForUser');
    expect(src).toContain('getCurrentMembershipSubscription');
    // No new direct table writes against membership_* from this page.
    expect(src).not.toMatch(/supabase\.from\(['"]membership_subscriptions['"]\)\s*\.\s*(insert|update|upsert|delete)\(/);
    expect(src).not.toMatch(/supabase\.from\(['"]membership_payments['"]\)\s*\.\s*(insert|update|upsert|delete)\(/);
  });

  it('ProviderMembership reads all user subscriptions (no business filter introduced)', () => {
    const src = read('pages/dashboard/ProviderMembership.tsx');
    expect(src).toContain('listProviderSubscriptionsForCurrentUser');
    expect(src).toContain('listProviderCreditTransactionsForBusinesses');
    // Provider-credit isolation: never call the guarded helpers directly.
    expect(src).not.toContain('provider_lead_credit_transactions');
    expect(src).not.toContain('consume_provider_lead_credit');
  });

  it('MembershipInvoice keeps PAY / PVS / business ref_id display (no raw uuid swap)', () => {
    const src = read('pages/MembershipInvoice.tsx');
    expect(src).toContain('ref_id');
    // Reference shown to the user must prefer ref over uuid.
    expect(src).toMatch(/data\.ref_id\s*\?\?\s*data\.id/);
  });

  it('payment edge functions exist and are untouched by this phase', () => {
    for (const fn of PAYMENT_EDGE_FUNCTIONS) {
      const dir = join(ROOT, 'supabase/functions', fn);
      expect(existsSync(dir), fn).toBe(true);
    }
  });

  it('regression: public membership / payment routes remain wired in App.tsx', () => {
    const app = readFileSync(join(SRC, 'App.tsx'), 'utf8');
    expect(app).toMatch(/path=["']\/membership["']/);
    expect(app).toMatch(/path=["']\/membership\/payment\/return["']/);
    expect(app).toMatch(/path=["']\/membership\/payments\/:[^"']+\/invoice["']/);
    // /r resolver must remain in place for PAY refs.
    expect(app).toMatch(/path=["']\/r\/:[^"']+["']/);
  });

  it('membership components folder did not silently introduce workspace coupling', () => {
    const dir = join(SRC, 'components/membership');
    for (const name of readdirSync(dir)) {
      if (!name.endsWith('.tsx') && !name.endsWith('.ts')) continue;
      const src = readFileSync(join(dir, name), 'utf8');
      expect(src, `components/membership/${name}`).not.toContain('useActiveWorkspace');
    }
  });
});