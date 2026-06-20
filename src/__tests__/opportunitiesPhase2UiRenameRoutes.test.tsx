import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { OPPORTUNITY_LABELS, OPPORTUNITY_ROUTES } from '@/modules/opportunities/opportunityLabels';
import { UNIFIED_ITEM_LABELS } from '@/components/dashboard/navigation/unifiedLabels';
import { ADMIN_NAV_ITEMS } from '@/modules/admin-shell';

/**
 * OPPORTUNITIES SYSTEM — PHASE 2 GUARDS
 *
 * UI-only rename + route aliases. Verifies:
 *  - Central label registry exists and exposes the required keys.
 *  - New `/dashboard/opportunities*` and `/admin/opportunities` aliases
 *    are registered in App.tsx.
 *  - Old routes are NOT deleted.
 *  - DB / edge / migration / submit / matching code is untouched.
 */
const root = resolve(__dirname, '..', '..');
const APP = readFileSync(resolve(root, 'src/App.tsx'), 'utf8');

describe('opportunities phase 2 — central labels', () => {
  it('exposes the required label keys', () => {
    for (const k of [
      'opportunity', 'opportunities', 'newOpportunity', 'opportunityDetails',
      'assignedOpportunities', 'matchedProviders',
      'submitBid', 'submittedBids', 'awardBid', 'convertToContract',
    ] as const) {
      expect(OPPORTUNITY_LABELS[k]?.ar.length).toBeGreaterThan(0);
      expect(OPPORTUNITY_LABELS[k]?.en.length).toBeGreaterThan(0);
    }
  });

  it('unified menu glossary uses opportunity wording for client and provider', () => {
    expect(UNIFIED_ITEM_LABELS.myRequests.ar).toBe('الفرص');
    expect(UNIFIED_ITEM_LABELS.myRequests.en).toBe('My Opportunities');
    expect(UNIFIED_ITEM_LABELS.assignedOpportunities.en).toBe('Assigned Opportunities');
  });

  it('admin nav renames quote-requests → Manage Opportunities', () => {
    const item = ADMIN_NAV_ITEMS.find((it) => it.id === 'quote-requests');
    expect(item?.labelAr).toBe('إدارة الفرص');
    expect(item?.labelEn).toBe('Manage Opportunities');
  });
});

describe('opportunities phase 2 — route aliases', () => {
  it.each([
    OPPORTUNITY_ROUTES.list,
    OPPORTUNITY_ROUTES.assigned,
    OPPORTUNITY_ROUTES.details,
    OPPORTUNITY_ROUTES.adminList,
  ])('App.tsx registers %s', (path) => {
    expect(APP).toContain(`path="${path}"`);
  });

  it.each([
    '/dashboard/my-requests',
    '/dashboard/my-requests/:id',
    '/dashboard/rfq',
    '/dashboard/rfq/:id',
    '/admin/quote-requests',
    '/admin/quote-requests/:id',
  ])('legacy route %s is still registered', (path) => {
    expect(APP).toContain(`path="${path}"`);
  });
});

describe('opportunities phase 2 — no DB / edge / migration changes', () => {
  it('opportunityLabels module is UI-only (no supabase / RPC imports)', () => {
    const src = readFileSync(
      resolve(root, 'src/modules/opportunities/opportunityLabels.ts'),
      'utf8',
    );
    expect(src).not.toMatch(/from\s+['"]@\/integrations\/supabase/);
    expect(src).not.toMatch(/createClient|\.rpc\(|\.from\(/);
  });
});