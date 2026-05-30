/**
 * RFQ-BRAND-PICKER-1F — brand equivalence hardening + persistence consistency.
 *
 * Source-level + pure-helper assertions. DB transition graph is exercised by
 * the 1E migration; here we just validate the service/UI contracts.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  computePersistedBrandClassification,
  sanitizeBrandReviewNote,
  mapBrandReviewError,
  reopenSupplierQuoteItemBrandReview,
  classifyBrandEquivalence,
} from '@/modules/procurement';

const repo = (p: string) => resolve(__dirname, '..', '..', p);
const read = (p: string) => readFileSync(repo(p), 'utf-8');

const SQI = read('src/modules/procurement/services/supplierQuoteItems.ts');
const NOTIF = read('src/modules/procurement/services/procurementNotifications.ts');
const UI = read('src/pages/dashboard/DashboardProcurementDetail.tsx');
const BARREL = read('src/modules/procurement/index.ts');
const CMP = read('src/modules/procurement/services/quoteComparisonLineItems.ts');
const HELPER = read('src/modules/procurement/services/brandEquivalence.ts');

describe('RFQ-BRAND-PICKER-1F — persisted brand classification', () => {
  it('exact same brand → exact_match + not_required', () => {
    expect(
      computePersistedBrandClassification({
        requested_brand_id: 'B',
        brand_lock: 'exact',
        proposed_brand_id: 'B',
      }),
    ).toEqual({ brand_match_status: 'exact_match', brand_review_status: 'not_required' });
  });

  it('exact lock mismatch → mismatch + pending', () => {
    expect(
      computePersistedBrandClassification({
        requested_brand_id: 'B',
        brand_lock: 'exact',
        proposed_brand_id: 'X',
      }),
    ).toEqual({ brand_match_status: 'mismatch', brand_review_status: 'pending' });
  });

  it('preferred lock equivalent → proposed_equivalent + pending', () => {
    expect(
      computePersistedBrandClassification({
        requested_brand_id: 'B',
        brand_lock: 'preferred',
        proposed_brand_id: 'X',
      }),
    ).toEqual({ brand_match_status: 'proposed_equivalent', brand_review_status: 'pending' });
  });

  it('flexible lock equivalent → proposed_equivalent + pending (audit)', () => {
    const r = computePersistedBrandClassification({
      requested_brand_id: 'B',
      brand_lock: 'flexible',
      proposed_brand_id: 'X',
    });
    expect(r.brand_match_status).toBe('proposed_equivalent');
    expect(r.brand_review_status).toBe('pending');
  });

  it('free-text proposal under preferred → pending_review + pending', () => {
    const r = computePersistedBrandClassification({
      requested_brand_id: 'B',
      brand_lock: 'preferred',
      proposed_brand_id: null,
      proposed_brand_name: 'Random Co',
    });
    expect(r.brand_match_status).toBe('pending_review');
    expect(r.brand_review_status).toBe('pending');
  });

  it('no proposal under no lock → no_brand + not_required', () => {
    const r = computePersistedBrandClassification({
      requested_brand_id: null,
      brand_lock: null,
      proposed_brand_id: null,
    });
    expect(r.brand_match_status).toBe('no_brand');
    expect(r.brand_review_status).toBe('not_required');
  });

  it('missing context — never guesses exact_match; falls back safely', () => {
    // No requested context at all — caller supplied no fallback.
    const r = computePersistedBrandClassification({
      proposed_brand_id: 'X',
    });
    expect(r.brand_match_status).toBeNull();
    expect(r.brand_review_status).toBe('not_required');

    // With explicit caller fallback only.
    const r2 = computePersistedBrandClassification({
      proposed_brand_id: 'X',
      fallback_match_status: 'proposed_equivalent',
      fallback_review_status: 'pending',
    });
    expect(r2.brand_match_status).toBe('proposed_equivalent');
    expect(r2.brand_review_status).toBe('pending');
  });

  it('submitQuoteItems wires computePersistedBrandClassification on the row', () => {
    expect(SQI).toMatch(/computePersistedBrandClassification\(/);
    expect(SQI).toMatch(/requested_brand_id\?: string \| null/);
    expect(SQI).toMatch(/brand_lock\?: BrandLock \| null/);
  });
});

describe('RFQ-BRAND-PICKER-1F — review transition hardening', () => {
  it('reopen helper exists, clears reviewer audit fields, sets pending', () => {
    expect(typeof reopenSupplierQuoteItemBrandReview).toBe('function');
    expect(SQI).toMatch(/reopenSupplierQuoteItemBrandReview/);
    expect(SQI).toMatch(/brand_review_status:\s*'pending'\s*as const/);
    expect(SQI).toMatch(/brand_reviewed_by:\s*null/);
    expect(SQI).toMatch(/brand_reviewed_at:\s*null/);
  });

  it('maps DB transition errors to a stable code (no raw DB text)', () => {
    const e = mapBrandReviewError(new Error('Invalid brand_review_status transition: approved → pending'));
    expect(e).toBeInstanceOf(Error);
    expect((e as Error).message).toBe('brand_review_transition_invalid');
    expect(mapBrandReviewError(null)).toBeNull();
    expect((mapBrandReviewError(new Error('other')) as Error).message).toBe('other');
  });

  it('review note is sanitized + length-capped via shared helper', () => {
    expect(SQI).toMatch(/sanitizeBrandReviewNote/);
    expect(sanitizeBrandReviewNote('  hi\u0000there  ')).toBe('hi there');
    expect(sanitizeBrandReviewNote('')).toBeNull();
    expect(sanitizeBrandReviewNote(null)).toBeNull();
    const long = 'X'.repeat(2000);
    const out = sanitizeBrandReviewNote(long);
    expect((out ?? '').length).toBe(1000);
  });

  it('reviewer_id + reviewed_at are set ONLY in the approve/reject path', () => {
    // reviewSupplierQuoteItemBrandEquivalence sets reviewer + timestamp
    expect(SQI).toMatch(/brand_reviewed_by:\s*input\.reviewer_id/);
    expect(SQI).toMatch(/brand_reviewed_at:\s*new Date\(\)\.toISOString\(\)/);
    // reopen helper explicitly clears them
    expect(SQI).toMatch(/brand_reviewed_by:\s*null/);
  });

  it('update path never sets approved/rejected (cannot reopen via update)', () => {
    // The UpdateProposedBrandInput type only allows not_required | pending
    expect(SQI).toMatch(
      /brand_review_status\?: Extract<BrandReviewStatus, 'not_required' \| 'pending'>/,
    );
  });
});

describe('RFQ-BRAND-PICKER-1F — UI safety', () => {
  it('approve/reject buttons disabled while a review is in flight', () => {
    expect(UI).toMatch(/reviewingLineId/);
    expect(UI).toMatch(/disabled=\{reviewingLineId === c\.line\.id\}/);
    expect(UI).toMatch(/data-testid="proc-quote-item-brand-approve"/);
    expect(UI).toMatch(/data-testid="proc-quote-item-brand-reject"/);
  });

  it('guards: review handler bails on non-pending lines + in-flight submits', () => {
    expect(UI).toMatch(/line\.brand_review_status !== 'pending'/);
    expect(UI).toMatch(/if \(reviewingLineId\) return/);
  });

  it('does not render raw DB error text — only localized errLoad', () => {
    // The catch path sets a generic tx.errLoad message, never raw err.message.
    expect(UI).not.toMatch(/setError\(err\.message\)/);
    expect(UI).not.toMatch(/setError\(String\(err\)\)/);
  });

  it('badge uses effective status (not raw persisted only)', () => {
    expect(UI).toMatch(/resolveEffectiveBrandMatchStatus\(/);
    expect(UI).toMatch(/data-status=\{effective\}/);
  });
});

describe('RFQ-BRAND-PICKER-1F — comparison consistency', () => {
  it('still pure — no Supabase import in comparison engine', () => {
    expect(CMP).not.toMatch(/@\/integrations\/supabase\/client/);
    expect(CMP).not.toMatch(/@supabase\/supabase-js/);
  });

  it('comparison classifies missing brand_match_status via pure helper', () => {
    expect(CMP).toMatch(/classifyBrandEquivalence\(/);
    expect(CMP).toMatch(/resolveEffectiveBrandMatchStatus\(/);
    expect(CMP).toMatch(/brandWarningForLine\(/);
  });

  it('helper remains Supabase-free (defence in depth)', () => {
    expect(HELPER).not.toMatch(/@\/integrations\/supabase\/client/);
    expect(HELPER).not.toMatch(/@supabase\/supabase-js/);
    // sanity: pure classifier still deterministic
    expect(
      classifyBrandEquivalence({
        requested_brand_id: 'B',
        brand_lock: 'exact',
        proposed_brand_id: 'B',
        proposed_brand_name: null,
      }).brandMatchStatus,
    ).toBe('exact_match');
  });
});

describe('RFQ-BRAND-PICKER-1F — notifications', () => {
  it('dedupes duplicate same-state events within the cooldown window', () => {
    expect(NOTIF).toMatch(/shouldEmitNotification/);
    expect(NOTIF).toMatch(/_notifDedupe/);
    expect(NOTIF).toMatch(/NOTIF_DEDUPE_WINDOW_MS/);
  });

  it('still in-app only — no SMS / email / push / WhatsApp call surfaces', () => {
    expect(NOTIF).not.toMatch(/sendEmail\(|sendSms\(|sendPush\(|sendWhatsapp\(/i);
  });

  it('notifyProcurementEvent is wrapped in try/catch (never throws)', () => {
    expect(NOTIF).toMatch(/try \{[\s\S]*createNotificationFireAndForget[\s\S]*\} catch/);
  });

  it('bodies do not leak supplier PII (no name/phone/email tokens in templates)', () => {
    // Templates are static strings keyed by event — no interpolation of
    // supplier identifiers happens at the procurement layer.
    expect(NOTIF).not.toMatch(/body_(ar|en):\s*`[^`]*\$\{/);
  });
});

describe('RFQ-BRAND-PICKER-1F — barrel + scope discipline', () => {
  it('barrel re-exports the new 1F surface', () => {
    for (const sym of [
      'computePersistedBrandClassification',
      'sanitizeBrandReviewNote',
      'reopenSupplierQuoteItemBrandReview',
      'mapBrandReviewError',
    ]) {
      expect(BARREL).toContain(sym);
    }
  });

  it('no supplier public portal route introduced', () => {
    for (const p of [
      'src/modules/supplierPortal',
      'src/pages/supplier-portal',
      'src/pages/SupplierPortal.tsx',
    ]) {
      expect(existsSync(repo(p))).toBe(false);
    }
  });

  it('no quote-side code mutates BOQ brand fields', () => {
    function walk(dir: string, out: string[]) {
      let entries: import('node:fs').Dirent[] = [];
      try { entries = readdirSync(repo(dir), { withFileTypes: true }); }
      catch { return; }
      for (const e of entries) {
        const rel = `${dir}/${e.name}`;
        if (e.isDirectory()) walk(rel, out);
        else if (/\.(tsx?|jsx?)$/.test(e.name) && !rel.includes('/tests/')) {
          const src = readFileSync(repo(rel), 'utf-8');
          if (/updateBoqItemPricing/.test(src) && /proposed_brand_id/.test(src)) {
            out.push(rel);
          }
        }
      }
    }
    const out: string[] = [];
    walk('src', out);
    expect(out).toEqual([]);
  });
});
