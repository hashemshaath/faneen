/**
 * CONTRACT PROVIDER SEARCH + PRICING METHOD — Final order + UI-only payload audit.
 *
 * Static source-level guards that lock the contract-creation order:
 *   work-type (order-1) → provider search (order-2) → pricing method (order-3) → site (order-4)
 *
 * Also asserts the pricing-method picker exposes the four required options
 * (linear, square meter, unit, mixed) and documents that the high-level
 * `contractPricingChoice` is UI-only pending a payload/metadata integration
 * (no DB migration in this phase).
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PAGE = fs.readFileSync(
  path.join(ROOT, 'src/pages/dashboard/DashboardContracts.tsx'),
  'utf8',
);
const PRICING = fs.readFileSync(
  path.join(ROOT, 'src/components/contracts/dashboard/create/PricingMethodSection.tsx'),
  'utf8',
);

function orderOf(marker: string): number {
  const m = PAGE.match(new RegExp(`(order-\\d+)[^]*?${marker}`));
  // Match a block: capture the FIRST `order-N` token that wraps the marker.
  // We rely on the explicit `order-N` className the page sets on each step wrapper.
  if (!m) throw new Error(`marker not found: ${marker}`);
  const idx = PAGE.indexOf(marker);
  const before = PAGE.slice(0, idx);
  const last = before.match(/order-(\d+)(?![\d])/g);
  if (!last || last.length === 0) throw new Error(`no order- wrapper before ${marker}`);
  const n = Number(last[last.length - 1].replace('order-', ''));
  return n;
}

describe('CONTRACT PROVIDER SEARCH + PRICING METHOD — order locks', () => {
  it('work-type appears before provider search (order-1 < order-2)', () => {
    const work = orderOf('<WorkTypeSection');
    const provider = orderOf('<ContractProviderSearchPicker');
    expect(work).toBeLessThan(provider);
    expect(work).toBe(1);
    expect(provider).toBe(2);
  });

  it('provider search comes immediately after work-type (no other step in-between)', () => {
    const work = orderOf('<WorkTypeSection');
    const provider = orderOf('<ContractProviderSearchPicker');
    expect(provider - work).toBe(1);
  });

  it('pricing method appears after provider and before site (order-2 < order-3 < order-4)', () => {
    const provider = orderOf('<ContractProviderSearchPicker');
    const pricing = orderOf('<PricingMethodSection');
    const site = orderOf('<ExecutionSiteSection');
    expect(provider).toBeLessThan(pricing);
    expect(pricing).toBeLessThan(site);
    expect(pricing).toBe(3);
    expect(site).toBe(4);
  });
});

describe('CONTRACT PROVIDER SEARCH + PRICING METHOD — picker options', () => {
  it('exposes the four required pricing methods', () => {
    expect(PRICING).toMatch(/'linear_meter'/);
    expect(PRICING).toMatch(/'square_meter'/);
    expect(PRICING).toMatch(/'unit'/);
    expect(PRICING).toMatch(/'mixed'/);
    // Arabic labels surfaced to the user
    expect(PRICING).toMatch(/طولي/);
    expect(PRICING).toMatch(/متر مربع/);
    expect(PRICING).toMatch(/وحدة/);
    expect(PRICING).toMatch(/مختلط/);
  });

  it('renders a required-marker on the pricing-method label', () => {
    expect(PRICING).toMatch(/text-destructive[^>]*>\s*\*/);
  });
});

describe('CONTRACT PROVIDER SEARCH + PRICING METHOD — provider auto-select guard', () => {
  it('does NOT auto-select any provider (no hardcoded provider/business/sector IDs in the page)', () => {
    // Reject UUID-shaped or BIZ-shaped literals that would imply hardcoded provider/business IDs.
    const uuidLiterals = PAGE.match(/'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'/gi);
    expect(uuidLiterals).toBeNull();
    const bizLiterals = PAGE.match(/'BIZ-\d{7}'/g);
    expect(bizLiterals).toBeNull();
    // No setSelectedProvider({...}) at module init / first-render side effects (heuristic):
    expect(PAGE).not.toMatch(/setSelectedProvider\(\s*\{\s*id:\s*'/);
  });
});

describe('CONTRACT PROVIDER SEARCH + PRICING METHOD — payload persistence', () => {
  it('contractPricingChoice is persisted via _pricing_basis (no legacy aliases)', () => {
    expect(PAGE).toMatch(/contractPricingChoice/);
    // The choice is forwarded to the RPC via the dedicated `_pricing_basis` argument.
    expect(PAGE).toMatch(/_pricing_basis:\s*contractPricingChoice/);
    // Legacy aliases must NOT be reintroduced.
    expect(PAGE).not.toMatch(/pricing_choice\s*:/);
    expect(PAGE).not.toMatch(/pricing_intent\s*:/);
  });
});

describe('CONTRACT PROVIDER SEARCH + PRICING METHOD — lifecycle / migration guards', () => {
  it('does not introduce contract lifecycle changes in this page', () => {
    // Status creation remains 'draft' only — no sent/active/signed state mutation here.
    expect(PAGE).toMatch(/status:\s*'draft'/);
  });
});