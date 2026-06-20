import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { OPPORTUNITY_LABELS } from '@/modules/opportunities/opportunityLabels';
import { UNIFIED_ITEM_LABELS } from '@/components/dashboard/navigation/unifiedLabels';

/**
 * OPPORTUNITIES PHASE 2 — label consistency guard.
 * Ensures the central registry exists and unified menu labels match.
 */
const root = resolve(__dirname, '..', '..');

describe('opportunity labels — central source', () => {
  it('central registry exposes opportunity & assignedOpportunities', () => {
    expect(OPPORTUNITY_LABELS.opportunities.ar).toBe('الفرص');
    expect(OPPORTUNITY_LABELS.assignedOpportunities.ar).toBe('الفرص المسندة');
  });

  it('unified glossary aligns with central registry for shared concepts', () => {
    expect(UNIFIED_ITEM_LABELS.assignedOpportunities.ar)
      .toBe(OPPORTUNITY_LABELS.assignedOpportunities.ar);
    expect(UNIFIED_ITEM_LABELS.assignedOpportunities.en)
      .toBe(OPPORTUNITY_LABELS.assignedOpportunities.en);
  });
});

describe('opportunity labels — provider_leads is CRM internal only', () => {
  it('central label registry does not surface raw "Provider Leads" wording', () => {
    const src = readFileSync(
      resolve(root, 'src/modules/opportunities/opportunityLabels.ts'),
      'utf8',
    );
    // CRM-only `provider_leads` table must stay an internal concern; the
    // user-facing registry must speak in opportunity terms.
    expect(src).not.toMatch(/Provider Leads/);
    expect(src).toMatch(/Assigned Opportunities/);
  });
});