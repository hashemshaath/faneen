import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('E-Mail-4: Contract transactional email isolation', () => {
  const contractDetailSrc = readFileSync(
    resolve(__dirname, '../ContractDetail.tsx'),
    'utf8',
  );
  const dashboardContractsSrc = readFileSync(
    resolve(__dirname, '../dashboard/DashboardContracts.tsx'),
    'utf8',
  );

  describe('ContractDetail.tsx', () => {
    it('no longer directly calls supabase.functions.invoke for send-transactional-email', () => {
      expect(contractDetailSrc).not.toMatch(
        /supabase\.functions\.invoke\(\s*['"]send-transactional-email['"]/,
      );
    });

    it('imports sendTransactionalEmail from the shared wrapper', () => {
      expect(contractDetailSrc).toMatch(
        /import\s*\{[^}]*sendTransactionalEmail[^}]*\}\s*from\s+['"]@\/modules\/notifications\/services\/sendTransactionalEmail['"]/,
      );
    });

    it('uses sendTransactionalEmail for contract-signed', () => {
      expect(contractDetailSrc).toMatch(
        /sendTransactionalEmail\(\s*\{[^}]*templateName:\s*['"]contract-signed['"]/,
      );
    });

    it('uses sendTransactionalEmail for contract-payment-recorded', () => {
      expect(contractDetailSrc).toMatch(
        /sendTransactionalEmail\(\s*\{[^}]*templateName:\s*['"]contract-payment-recorded['"]/,
      );
    });

    it('preserves idempotencyKey for contract-signed with contract id and email', () => {
      expect(contractDetailSrc).toMatch(
        /idempotencyKey:\s*`contract-signed-\$\{id\}-\$\{to\}`/,
      );
    });

    it('preserves idempotencyKey for contract-payment-recorded with pay id', () => {
      expect(contractDetailSrc).toMatch(
        /idempotencyKey:\s*`contract-payment-recorded-\$\{pay\.id\}`/,
      );
    });

    it('preserves void fire-and-forget pattern with catch', () => {
      expect(contractDetailSrc).toMatch(
        /void\s+sendTransactionalEmail\(/,
      );
      expect(contractDetailSrc).toMatch(
        /\.catch\(\(\)\s*=>\s*\{\s*\/\*\s*queue retries\s*\*\/\s*\}\)/,
      );
    });
  });

  describe('DashboardContracts.tsx', () => {
    it('no longer directly calls supabase.functions.invoke for send-transactional-email', () => {
      expect(dashboardContractsSrc).not.toMatch(
        /supabase\.functions\.invoke\(\s*['"]send-transactional-email['"]/,
      );
    });

    it('imports sendTransactionalEmail from the shared wrapper', () => {
      expect(dashboardContractsSrc).toMatch(
        /import\s*\{[^}]*sendTransactionalEmail[^}]*\}\s*from\s+['"]@\/modules\/notifications\/services\/sendTransactionalEmail['"]/,
      );
    });

    it('uses sendTransactionalEmail for contract-milestone-completed', () => {
      expect(dashboardContractsSrc).toMatch(
        /sendTransactionalEmail\(\s*\{[^}]*templateName:\s*['"]contract-milestone-completed['"]/,
      );
    });

    it('preserves idempotencyKey for contract-milestone-completed with id', () => {
      expect(dashboardContractsSrc).toMatch(
        /idempotencyKey:\s*`contract-milestone-completed-\$\{id\}`/,
      );
    });

    it('preserves void fire-and-forget pattern with catch', () => {
      expect(dashboardContractsSrc).toMatch(
        /void\s+sendTransactionalEmail\(/,
      );
      expect(dashboardContractsSrc).toMatch(
        /\.catch\(\(\)\s*=>\s*\{\s*\/\*\s*queue retries\s*\*\/\s*\}\)/,
      );
    });
  });

  describe('No unrelated callsites migrated', () => {
    it('does not migrate membership, booking, contact, or provider review templates', () => {
      const combined = contractDetailSrc + dashboardContractsSrc;
      const unrelatedTemplates = [
        'membership-upgraded',
        'membership-downgraded',
        'booking-confirmed',
        'booking-reminder',
        'invitation-sent',
        'contact-received',
        'provider-review-request',
      ];
      for (const template of unrelatedTemplates) {
        expect(combined).not.toMatch(
          new RegExp(`templateName:\s*['"]${template}['"]`),
        );
      }
    });
  });

  describe('Lead/quote/auth cleanliness — re-check', () => {
    const leadSrc = readFileSync(
      resolve(__dirname, '../../components/lead/LeadRequestForm.tsx'),
      'utf8',
    );
    const quoteSrc = readFileSync(
      resolve(__dirname, '../Quote.tsx'),
      'utf8',
    );
    const quoteDetailSrc = readFileSync(
      resolve(__dirname, '../dashboard/QuoteRequestDetails.tsx'),
      'utf8',
    );
    const adminLeadSrc = readFileSync(
      resolve(__dirname, '../admin/AdminLeadRequests.tsx'),
      'utf8',
    );
    const authSrc = readFileSync(
      resolve(__dirname, '../../services/auth/authService.ts'),
      'utf8',
    );

    it('LeadRequestForm has zero direct supabase.functions.invoke', () => {
      expect(leadSrc).not.toMatch(/supabase\.functions\.invoke/);
    });

    it('Quote has zero direct supabase.functions.invoke', () => {
      expect(quoteSrc).not.toMatch(/supabase\.functions\.invoke/);
    });

    it('QuoteRequestDetails has zero direct supabase.functions.invoke', () => {
      expect(quoteDetailSrc).not.toMatch(/supabase\.functions\.invoke/);
    });

    it('AdminLeadRequests has zero direct supabase.functions.invoke for send-transactional-email', () => {
      expect(adminLeadSrc).not.toMatch(
        /supabase\.functions\.invoke\(\s*['"]send-transactional-email['"]/,
      );
    });

    it('authService has zero direct supabase.functions.invoke for send-transactional-email', () => {
      expect(authSrc).not.toMatch(
        /supabase\.functions\.invoke\(\s*['"]send-transactional-email['"]/,
      );
    });
  });
});
