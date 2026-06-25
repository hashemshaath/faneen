/**
 * CONTRACT PRICING BASIS PERSISTENCE — source-level guards.
 *
 * Locks the contract creation flow so that the user-selected pricing basis
 * (linear_meter | square_meter | unit | mixed) is persisted via the
 * `_pricing_basis` RPC parameter (column `contracts.pricing_basis`), distinct
 * from the template-driven `_pricing_method`, and that the contract cannot be
 * created without a pricing-basis selection.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PAGE = fs.readFileSync(
  path.join(ROOT, 'src/pages/dashboard/DashboardContracts.tsx'),
  'utf8',
);
const SERVICE = fs.readFileSync(
  path.join(ROOT, 'src/modules/contracts/services/createContractFromTemplate.ts'),
  'utf8',
);
const PRICING = fs.readFileSync(
  path.join(ROOT, 'src/components/contracts/dashboard/create/PricingMethodSection.tsx'),
  'utf8',
);

describe('CONTRACT PRICING BASIS PERSISTENCE — service contract', () => {
  it('createContractFromTemplate accepts _pricing_basis with the four allowed values', () => {
    expect(SERVICE).toMatch(/_pricing_basis\?:\s*'linear_meter'\s*\|\s*'square_meter'\s*\|\s*'unit'\s*\|\s*'mixed'\s*\|\s*null/);
  });

  it('does not conflate _pricing_basis with _pricing_method', () => {
    // Both fields are declared as independent inputs on the args interface.
    expect(SERVICE).toMatch(/_pricing_method\?:/);
    expect(SERVICE).toMatch(/_pricing_basis\?:/);
  });
});

describe('CONTRACT PRICING BASIS PERSISTENCE — page wiring', () => {
  it('forwards contractPricingChoice as _pricing_basis to the RPC', () => {
    expect(PAGE).toMatch(/_pricing_basis:\s*contractPricingChoice/);
  });

  it('blocks creation when pricing basis is missing (new contracts only)', () => {
    expect(PAGE).toMatch(/!editingId\s*&&\s*!contractPricingChoice/);
  });

  it('surfaces a localized Arabic message when pricing basis is missing', () => {
    expect(PAGE).toMatch(/اختر طريقة التسعير قبل إنشاء العقد/);
  });
});

describe('CONTRACT PRICING BASIS PERSISTENCE — option set', () => {
  it('PricingMethodSection still exposes exactly the four allowed values', () => {
    for (const v of ['linear_meter', 'square_meter', 'unit', 'mixed']) {
      expect(PRICING).toContain(`'${v}'`);
    }
  });
});