import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * BM-REF-REBUILD-1 — Step E
 *
 * Regression coverage for the official ref_id display rollout across
 * leads, quotes, bookings, staff invitations, and reference safety —
 * plus boundary guards confirming Step E does not touch routes,
 * RLS, schema, or edge functions.
 */

const read = (p: string) => readFileSync(resolve(p), 'utf8');

const LEADS = read('src/pages/dashboard/DashboardLeads.tsx');
const BOOKINGS = read('src/pages/dashboard/DashboardBookings.tsx');
const INVITATIONS = read('src/components/dashboard/business-edit/InvitationsPanel.tsx');
const LEADS_DETAIL_SVC = read('src/modules/leads/services/detail.ts');
const LEADS_LIST_SVC = read('src/modules/leads/services/list.ts');
const REF_BADGE = read('src/components/reference/ReferenceBadge.tsx');
const LEGACY_HINT = read('src/components/reference/LegacyReferenceHint.tsx');
const APP = read('src/App.tsx');

describe('Step E — Reference primitives remain present', () => {
  it('ReferenceBadge and LegacyReferenceHint stay available', () => {
    expect(REF_BADGE).toContain('ReferenceBadge');
    expect(LEGACY_HINT).toContain('LegacyReferenceHint');
  });
});

describe('Step E — Lead requests surface LED primary + LR legacy hint', () => {
  it('DashboardLeads renders lead.ref_id as primary label', () => {
    expect(LEADS).toContain('lead.ref_id');
  });

  it('DashboardLeads imports and uses LegacyReferenceHint for LR- compatibility', () => {
    expect(LEADS).toContain('LegacyReferenceHint');
    expect(LEADS).toMatch(/legacy_ref_id/);
  });

  it('Provider lead row type exposes legacy_ref_id', () => {
    expect(LEADS_DETAIL_SVC).toMatch(/legacy_ref_id:\s*string\s*\|\s*null/);
  });

  it('MY_LEAD_SELECT includes ref_id', () => {
    expect(LEADS_LIST_SVC).toMatch(/MY_LEAD_SELECT[\s\S]*ref_id/);
  });

  it('DashboardLeads never renders raw lead UUID via .id.slice/.substring', () => {
    expect(LEADS).not.toMatch(/lead\.id\.(slice|substring|substr)/);
  });
});

describe('Step E — Bookings surface BKG primary + BK legacy hint', () => {
  it('DashboardBookings renders booking.ref_id', () => {
    expect(BOOKINGS).toContain('booking.ref_id');
  });

  it('DashboardBookings imports and uses LegacyReferenceHint', () => {
    expect(BOOKINGS).toContain('LegacyReferenceHint');
    expect(BOOKINGS).toMatch(/legacy_ref_id/);
  });

  it('Bookings query uses select(*) so legacy_ref_id is available', () => {
    expect(BOOKINGS).toMatch(/from\('bookings'\)\.select\('\*/);
  });

  it('Bookings never displays a UUID via .id.slice/.substring', () => {
    expect(BOOKINGS).not.toMatch(/booking\.id\.(slice|substring|substr)/);
  });
});

describe('Step E — Staff invitations surface STI ref, never the token', () => {
  it('InvitationsPanel selects ref_id', () => {
    expect(INVITATIONS).toMatch(/select\('id, ref_id,/);
  });

  it('InvitationsPanel exposes ReferenceBadge for ref_id rendering', () => {
    expect(INVITATIONS).toContain('ReferenceBadge');
    expect(INVITATIONS).toMatch(/inv\.ref_id/);
  });

  it('InvitationsPanel never renders the raw token as the primary label', () => {
    // The token is only used inside acceptUrlFor() / copyLink() / resend templates.
    // It must NEVER appear as a standalone <ReferenceBadge refId={inv.token} />.
    expect(INVITATIONS).not.toMatch(/refId=\{inv\.token\}/);
    expect(INVITATIONS).not.toMatch(/<Badge[^>]*>\s*\{inv\.token\}/);
  });
});

describe('Step E — Synthetic phone email + provider_intent_id never leak to display', () => {
  it('Lead/booking/invitation surfaces never render @phone.qitaat.local', () => {
    expect(LEADS).not.toMatch(/phone\.qitaat\.local/);
    expect(BOOKINGS).not.toMatch(/phone\.qitaat\.local/);
    expect(INVITATIONS).not.toMatch(/phone\.qitaat\.local/);
  });

  it('Lead/booking/invitation surfaces never render provider_intent_id', () => {
    expect(LEADS).not.toMatch(/provider_intent_id/);
    expect(BOOKINGS).not.toMatch(/provider_intent_id/);
    expect(INVITATIONS).not.toMatch(/provider_intent_id/);
  });
});

describe('Step E — Route surface unchanged (no /dashboard/membership)', () => {
  // Note: /r/:refId was intentionally introduced in Step F (universal
  // reference resolver). The Step F regression suite owns that guard.
  it('does not reintroduce the broken /dashboard/membership route', () => {
    expect(APP).not.toContain('/dashboard/membership');
  });

  it('does not contain href="#" placeholder links', () => {
    expect(APP).not.toMatch(/href=["']#["']/);
  });
});

describe('Step E — Boundary safety: no forbidden direct table/RPC usage in display layer', () => {
  const forbidden = [
    'provider_lead_credit_transactions',
    'consume_provider_lead_credit',
    'grant_monthly_provider_credit',
    'admin_adjust_provider_credits',
  ];

  it('Step E touched files never call credit-isolation forbidden tables/RPCs', () => {
    for (const f of forbidden) {
      expect(LEADS).not.toContain(f);
      expect(BOOKINGS).not.toContain(f);
      expect(INVITATIONS).not.toContain(f);
    }
  });

  it('Step E touched files never invoke an edge function directly', () => {
    expect(LEADS).not.toMatch(/functions\.invoke\(/);
    expect(BOOKINGS).not.toMatch(/functions\.invoke\(/);
    expect(INVITATIONS).not.toMatch(/functions\.invoke\(/);
  });
});
