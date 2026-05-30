/**
 * RFQ-BRAND-PICKER-1E — Supplier proposed brand + equivalence review.
 *
 * Mostly source-level + pure-helper assertions. The DB schema and triggers
 * are exercised by the migration; here we validate the contract the rest of
 * the codebase depends on.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  classifyBrandEquivalence,
  resolveEffectiveBrandMatchStatus,
  brandWarningForLine,
  sanitizeProposedBrandName,
  compareQuotesWithLineItems,
  type ProcurementSupplierQuoteItemRow,
  type ProcurementRfqItemRow,
  type ProcurementSupplierQuoteRow,
} from '@/modules/procurement';

const repo = (p: string) => resolve(__dirname, '..', '..', p);
const read = (p: string) => readFileSync(repo(p), 'utf-8');

const TYPES = read('src/modules/procurement/types.ts');
const SQI = read('src/modules/procurement/services/supplierQuoteItems.ts');
const HELPER = read('src/modules/procurement/services/brandEquivalence.ts');
const CMP = read('src/modules/procurement/services/quoteComparisonLineItems.ts');
const NOTIF = read('src/modules/procurement/services/procurementNotifications.ts');
const UI = read('src/pages/dashboard/DashboardProcurementDetail.tsx');
const BARREL = read('src/modules/procurement/index.ts');

describe('RFQ-BRAND-PICKER-1E — data model + types', () => {
  it('extends ProcurementSupplierQuoteItemRow with the 6 new fields', () => {
    for (const f of [
      'proposed_brand_id: string | null',
      'proposed_brand_name: string | null',
      'brand_match_status: BrandMatchStatus | null',
      'brand_review_status: BrandReviewStatus',
      'brand_reviewed_by: string | null',
      'brand_reviewed_at: string | null',
      'brand_review_note: string | null',
    ]) {
      expect(TYPES).toContain(f);
    }
  });

  it('exports the two new enum types', () => {
    expect(TYPES).toMatch(/export type BrandMatchStatus =/);
    expect(TYPES).toMatch(/export type BrandReviewStatus =/);
  });

  it('barrel re-exports new helper + service fns', () => {
    for (const sym of [
      'classifyBrandEquivalence',
      'resolveEffectiveBrandMatchStatus',
      'brandWarningForLine',
      'updateSupplierQuoteItemProposedBrand',
      'reviewSupplierQuoteItemBrandEquivalence',
      'listQuoteItemsWithBrandReview',
      'sanitizeProposedBrandName',
    ]) {
      expect(BARREL).toContain(sym);
    }
  });
});

describe('RFQ-BRAND-PICKER-1E — service layer', () => {
  it('SELECT clause exposes all new brand columns', () => {
    for (const col of [
      'proposed_brand_id',
      'proposed_brand_name',
      'brand_match_status',
      'brand_review_status',
      'brand_reviewed_by',
      'brand_reviewed_at',
      'brand_review_note',
    ]) {
      expect(SQI).toContain(col);
    }
  });

  it('sanitizes + caps proposed_brand_name length', () => {
    expect(sanitizeProposedBrandName('  Acme   Glass  ')).toBe('Acme Glass');
    expect(sanitizeProposedBrandName('')).toBeNull();
    expect(sanitizeProposedBrandName(null)).toBeNull();
    expect(sanitizeProposedBrandName(42 as unknown as string)).toBeNull();
    const long = 'X'.repeat(500);
    const out = sanitizeProposedBrandName(long);
    expect(out).not.toBeNull();
    expect((out ?? '').length).toBe(120);
    // Strips control chars.
    expect(sanitizeProposedBrandName('hi\u0000there')).toBe('hi there');
  });

  it('updateSupplierQuoteItemProposedBrand rejects empty patch', () => {
    expect(SQI).toMatch(/empty_patch/);
  });

  it('review fn validates decision + reviewer + sets approved/rejected match', () => {
    expect(SQI).toMatch(/decision_invalid/);
    expect(SQI).toMatch(/reviewer_required/);
    expect(SQI).toMatch(/approved_equivalent/);
    expect(SQI).toMatch(/rejected_equivalent/);
  });

  it('review fn caps the note length', () => {
    expect(SQI).toMatch(/slice\(0, REVIEW_NOTE_MAX\)/);
  });
});

describe('RFQ-BRAND-PICKER-1E — pure helper isolation', () => {
  it('brandEquivalence helper must not import Supabase (pure)', () => {
    expect(HELPER).not.toMatch(/@\/integrations\/supabase\/client/);
    expect(HELPER).not.toMatch(/@supabase\/supabase-js/);
  });

  it('quoteComparisonLineItems stays pure (no Supabase import)', () => {
    expect(CMP).not.toMatch(/@\/integrations\/supabase\/client/);
    expect(CMP).not.toMatch(/@supabase\/supabase-js/);
  });
});

describe('RFQ-BRAND-PICKER-1E — classifyBrandEquivalence rules', () => {
  const REQ = 'req-brand-id';
  const OTHER = 'other-brand-id';

  it('exact lock — same brand → exact_match, no review', () => {
    expect(
      classifyBrandEquivalence({
        requested_brand_id: REQ,
        brand_lock: 'exact',
        proposed_brand_id: REQ,
        proposed_brand_name: null,
      }),
    ).toEqual({ brandMatchStatus: 'exact_match', reviewRequired: false, reason: 'same_brand' });
  });

  it('exact lock — different brand → mismatch, review required', () => {
    const r = classifyBrandEquivalence({
      requested_brand_id: REQ,
      brand_lock: 'exact',
      proposed_brand_id: OTHER,
      proposed_brand_name: null,
    });
    expect(r.brandMatchStatus).toBe('mismatch');
    expect(r.reviewRequired).toBe(true);
    expect(r.reason).toBe('exact_lock_violation');
  });

  it('preferred lock — different brand → proposed_equivalent, review required', () => {
    const r = classifyBrandEquivalence({
      requested_brand_id: REQ,
      brand_lock: 'preferred',
      proposed_brand_id: OTHER,
      proposed_brand_name: null,
    });
    expect(r.brandMatchStatus).toBe('proposed_equivalent');
    expect(r.reviewRequired).toBe(true);
  });

  it('flexible lock — different brand → proposed_equivalent, review required (audit)', () => {
    const r = classifyBrandEquivalence({
      requested_brand_id: REQ,
      brand_lock: 'flexible',
      proposed_brand_id: OTHER,
      proposed_brand_name: null,
    });
    expect(r.brandMatchStatus).toBe('proposed_equivalent');
    expect(r.reviewRequired).toBe(true);
  });

  it('free-text proposal under exact lock → mismatch + review', () => {
    const r = classifyBrandEquivalence({
      requested_brand_id: REQ,
      brand_lock: 'exact',
      proposed_brand_id: null,
      proposed_brand_name: 'Random Co',
    });
    expect(r.brandMatchStatus).toBe('mismatch');
    expect(r.reviewRequired).toBe(true);
  });

  it('free-text proposal under preferred/flexible → pending_review + review', () => {
    for (const lock of ['preferred', 'flexible'] as const) {
      const r = classifyBrandEquivalence({
        requested_brand_id: REQ,
        brand_lock: lock,
        proposed_brand_id: null,
        proposed_brand_name: 'Random Co',
      });
      expect(r.brandMatchStatus).toBe('pending_review');
      expect(r.reviewRequired).toBe(true);
    }
  });

  it('no proposal under exact/preferred → no_brand + review', () => {
    for (const lock of ['exact', 'preferred'] as const) {
      const r = classifyBrandEquivalence({
        requested_brand_id: REQ,
        brand_lock: lock,
        proposed_brand_id: null,
        proposed_brand_name: null,
      });
      expect(r.brandMatchStatus).toBe('no_brand');
      expect(r.reviewRequired).toBe(true);
    }
  });

  it('no requested brand → no review needed regardless of proposal', () => {
    expect(
      classifyBrandEquivalence({
        requested_brand_id: null,
        brand_lock: null,
        proposed_brand_id: null,
        proposed_brand_name: null,
      }).reviewRequired,
    ).toBe(false);
    expect(
      classifyBrandEquivalence({
        requested_brand_id: null,
        brand_lock: null,
        proposed_brand_id: OTHER,
        proposed_brand_name: null,
      }).reviewRequired,
    ).toBe(false);
  });
});

describe('RFQ-BRAND-PICKER-1E — review status overrides', () => {
  it('resolveEffectiveBrandMatchStatus maps review states correctly', () => {
    expect(resolveEffectiveBrandMatchStatus('proposed_equivalent', 'approved')).toBe('approved_equivalent');
    expect(resolveEffectiveBrandMatchStatus('proposed_equivalent', 'rejected')).toBe('rejected_equivalent');
    expect(resolveEffectiveBrandMatchStatus('proposed_equivalent', 'pending')).toBe('pending_review');
    expect(resolveEffectiveBrandMatchStatus('exact_match', 'not_required')).toBe('exact_match');
  });

  it('brandWarningForLine returns stable warning codes', () => {
    expect(brandWarningForLine('pending_review')).toBe('brand_pending_review');
    expect(brandWarningForLine('mismatch')).toBe('brand_mismatch');
    expect(brandWarningForLine('rejected_equivalent')).toBe('brand_rejected');
    expect(brandWarningForLine('exact_match')).toBeNull();
    expect(brandWarningForLine('approved_equivalent')).toBeNull();
    expect(brandWarningForLine(null)).toBeNull();
  });
});

describe('RFQ-BRAND-PICKER-1E — quote comparison brand warnings', () => {
  function rfqItem(over: Partial<ProcurementRfqItemRow> = {}): ProcurementRfqItemRow {
    return {
      id: 'ri-1',
      business_id: 'b1',
      rfq_id: 'rfq-1',
      procurement_request_id: null,
      name: 'Item',
      description: null,
      quantity: 1,
      unit: null,
      target_price: null,
      sort_order: 0,
      requested_brand_id: 'brand-a',
      brand_lock: 'exact',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      ...over,
    };
  }
  function quote(over: Partial<ProcurementSupplierQuoteRow> = {}): ProcurementSupplierQuoteRow {
    return {
      id: 'q1',
      business_id: 'b1',
      rfq_id: 'rfq-1',
      supplier_id: 's1',
      status: 'submitted',
      total_amount: 100,
      currency: 'SAR',
      lead_time_days: 5,
      notes: null,
      submitted_at: '2026-01-02T00:00:00Z',
      rejection_reason: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      ...over,
    };
  }
  function qItem(over: Partial<ProcurementSupplierQuoteItemRow> = {}): ProcurementSupplierQuoteItemRow {
    return {
      id: 'qi-1',
      business_id: 'b1',
      quote_id: 'q1',
      rfq_item_id: 'ri-1',
      unit_price: 100,
      quantity: 1,
      total_price: 100,
      notes: null,
      proposed_brand_id: null,
      proposed_brand_name: null,
      brand_match_status: null,
      brand_review_status: 'not_required',
      brand_reviewed_by: null,
      brand_reviewed_at: null,
      brand_review_note: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      ...over,
    };
  }

  it('mismatched brand under exact lock blocks recommendation + emits warning', () => {
    const ri = rfqItem({ brand_lock: 'exact' });
    const out = compareQuotesWithLineItems(
      [ri],
      [{ quote: quote(), items: [qItem({ proposed_brand_id: 'brand-x' })] }],
    );
    expect(out[0].warnings).toContain('brand_mismatch');
    expect(out[0].recommended).toBe(false);
    expect(out[0].reasons).toContain('brand_mismatch');
  });

  it('pending review under preferred lock surfaces a pending warning', () => {
    const ri = rfqItem({ brand_lock: 'preferred' });
    const out = compareQuotesWithLineItems(
      [ri],
      [{
        quote: quote(),
        items: [qItem({
          proposed_brand_id: 'brand-x',
          brand_match_status: 'proposed_equivalent',
          brand_review_status: 'pending',
        })],
      }],
    );
    expect(out[0].warnings).toContain('brand_pending_review');
    expect(out[0].reasons).toContain('brand_pending_review');
  });

  it('rejected equivalent blocks auto-recommendation even if cheapest', () => {
    const ri = rfqItem({ brand_lock: 'preferred' });
    const out = compareQuotesWithLineItems(
      [ri],
      [{
        quote: quote({ total_amount: 50 }),
        items: [qItem({
          proposed_brand_id: 'brand-x',
          brand_match_status: 'rejected_equivalent',
          brand_review_status: 'rejected',
        })],
      }],
    );
    expect(out[0].warnings).toContain('brand_rejected');
    expect(out[0].recommended).toBe(false);
  });

  it('approved equivalent allows recommendation', () => {
    const ri = rfqItem({ brand_lock: 'preferred' });
    const out = compareQuotesWithLineItems(
      [ri],
      [{
        quote: quote(),
        items: [qItem({
          proposed_brand_id: 'brand-x',
          brand_match_status: 'approved_equivalent',
          brand_review_status: 'approved',
        })],
      }],
    );
    expect(out[0].warnings).not.toContain('brand_pending_review');
    expect(out[0].warnings).not.toContain('brand_mismatch');
    expect(out[0].recommended).toBe(true);
  });
});

describe('RFQ-BRAND-PICKER-1E — notifications', () => {
  it('procurementNotifications declares the 3 new events bilingually', () => {
    for (const ev of [
      'brand_equivalent_proposed',
      'brand_equivalent_approved',
      'brand_equivalent_rejected',
    ]) {
      expect(NOTIF).toContain(ev);
    }
    // No SMS / email / push / WhatsApp surfaces introduced.
    expect(NOTIF).not.toMatch(/sendEmail|sendSms|sendPush|whatsapp/i);
  });
});

describe('RFQ-BRAND-PICKER-1E — UI wiring', () => {
  it('renders the brand match badge + review controls', () => {
    expect(UI).toMatch(/data-testid="proc-quote-item-brand-badge"/);
    expect(UI).toMatch(/data-testid="proc-quote-item-brand-review"/);
    expect(UI).toMatch(/reviewSupplierQuoteItemBrandEquivalence/);
  });

  it('uses pure helper to compute effective match (no Supabase from page)', () => {
    expect(UI).toMatch(/classifyBrandEquivalence/);
    expect(UI).toMatch(/resolveEffectiveBrandMatchStatus/);
    expect(UI).not.toMatch(/supabase\.from\(/);
  });

  it('localizes all match labels bilingually', () => {
    for (const s of [
      'matchExact', 'matchEquivalent', 'matchProposed',
      'matchPending', 'matchRejected', 'matchMismatch', 'matchNoBrand',
    ]) {
      expect(UI).toContain(s);
    }
  });
});

describe('RFQ-BRAND-PICKER-1E — scope discipline', () => {
  it('no supplier public portal route introduced', () => {
    for (const p of [
      'src/modules/supplierPortal',
      'src/pages/supplier-portal',
      'src/pages/SupplierPortal.tsx',
    ]) {
      expect(existsSync(repo(p))).toBe(false);
    }
  });

  it('award/PO services still untouched by proposed brand columns', () => {
    const po = read('src/modules/procurement/services/purchaseOrders.ts');
    const elig = read('src/modules/procurement/services/awardEligibility.ts');
    const hand = read('src/modules/procurement/services/awardHandoff.ts');
    for (const src of [po, elig, hand]) {
      expect(src).not.toMatch(/proposed_brand_id/);
    }
  });

  it('BOQ services do not mutate requested brand from quote proposals', () => {
    function rg(dir: string): string[] {
      const out: string[] = [];
      function walk(d: string) {
        let entries: import('node:fs').Dirent[] = [];
        try {
          entries = readdirSync(repo(d), { withFileTypes: true });
        } catch {
          return;
        }
        for (const e of entries) {
          const rel = `${d}/${e.name}`;
          if (e.isDirectory()) {
            walk(rel);
          } else if (/\.(tsx?|jsx?)$/.test(e.name) && !rel.includes('/tests/')) {
            const src = readFileSync(repo(rel), 'utf-8');
            // Quote-side code must never call updateBoqItemPricing with brand_id.
            if (
              /updateBoqItemPricing/.test(src) &&
              /proposed_brand_id/.test(src)
            ) {
              out.push(rel);
            }
          }
        }
      }
      walk(dir);
      return out;
    }
    expect(rg('src')).toEqual([]);
  });
});

// Sanity import — make sure types are still re-exported from the barrel.
void statSync;