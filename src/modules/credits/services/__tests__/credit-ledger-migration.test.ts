import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const root = resolve(__dirname, '../../../../..');

function read(rel: string) {
  return readFileSync(resolve(root, rel), 'utf-8');
}

describe('credit ledger migration', () => {
  it('ProviderMembership.tsx no longer reads provider_lead_credit_transactions directly', () => {
    const src = read('src/pages/dashboard/ProviderMembership.tsx');
    expect(src).not.toMatch(/\.from\(\s*['"]provider_lead_credit_transactions['"]/);
    expect(src).toContain('listProviderCreditTransactionsForBusinesses');
  });

  it('AdminProviderSubscriptions.tsx no longer reads provider_lead_credit_transactions directly', () => {
    const src = read('src/pages/admin/AdminProviderSubscriptions.tsx');
    expect(src).not.toMatch(/\.from\(\s*['"]provider_lead_credit_transactions['"]/);
    expect(src).toContain('listProviderCreditTransactionsForBusiness');
  });
});