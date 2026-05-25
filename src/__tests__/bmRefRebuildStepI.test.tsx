/**
 * BM-REF-REBUILD-1 — Step I regression coverage.
 *
 * Locks the final consistency sweep for reference display and
 * /r/{REF} resolver-link safety. No new business behavior is
 * introduced — these guards just pin the Step I invariants.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import fs from 'fs';
import path from 'path';
import { ReferenceLinkCopy } from '@/components/reference/ReferenceLinkCopy';
import {
  ADMIN_OPS_QUOTE_SELECT,
} from '@/modules/quotes/services/listAdminOpsQuoteRequests';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function read(p: string): string {
  return fs.readFileSync(path.join(process.cwd(), p), 'utf8');
}

beforeEach(() => {
  Object.assign(navigator, {
    clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
});

describe('Step I — ReferenceLinkCopy safety', () => {
  it('renders a copy button for a safe QTE reference', () => {
    render(<ReferenceLinkCopy refId="QTE-1000001" isRTL={false} />);
    expect(screen.getByRole('button', { name: /copy reference link/i })).toBeInTheDocument();
  });

  it('does not render for a raw UUID', () => {
    const { container } = render(
      <ReferenceLinkCopy refId="11111111-2222-3333-4444-555555555555" isRTL={false} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('does not render for an invitation-token-like value (no PREFIX-)', () => {
    const { container } = render(
      <ReferenceLinkCopy refId="abcdef0123456789abcdef0123456789" isRTL={false} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('does not render for null/empty', () => {
    const { container: c1 } = render(<ReferenceLinkCopy refId={null} isRTL={false} />);
    const { container: c2 } = render(<ReferenceLinkCopy refId="" isRTL={false} />);
    expect(c1.firstChild).toBeNull();
    expect(c2.firstChild).toBeNull();
  });

  it('copies an absolute /r/{REF} link (never href="#")', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<ReferenceLinkCopy refId="STI-1000007" isRTL={false} />);
    fireEvent.click(screen.getByRole('button', { name: /copy reference link/i }));
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    const copied = writeText.mock.calls[0][0] as string;
    expect(copied).toMatch(/\/r\/STI-1000007$/);
    expect(copied).not.toContain('#');
  });

  it('source never renders href="#" in the component', () => {
    const src = read('src/components/reference/ReferenceLinkCopy.tsx');
    expect(src).not.toMatch(/href=["']#["']/);
  });
});

describe('Step I — admin quote request select guard', () => {
  it('admin quote ops select includes ref_id', () => {
    expect(ADMIN_OPS_QUOTE_SELECT).toContain('ref_id');
    expect(ADMIN_OPS_QUOTE_SELECT).toBe('id, ref_id, sector, city, status, created_at');
  });

  it('admin quote ops attention list renders ref badge when ref_id is present', () => {
    const src = read('src/pages/admin/AdminQuoteOperations.tsx');
    expect(src).toContain('ReferenceBadge');
    expect(src).toMatch(/a\.quote\.ref_id\s*\?/);
  });

  it('admin quote request details replaces raw id slice header with ReferenceBadge', () => {
    const src = read('src/pages/admin/AdminQuoteRequestDetails.tsx');
    expect(src).toContain('ReferenceBadge');
    expect(src).toContain('ReferenceLinkCopy');
    expect(src).toContain('quote.ref_id');
  });

  it('dashboard quote request details replaces raw id slice header with ReferenceBadge', () => {
    const src = read('src/pages/dashboard/QuoteRequestDetails.tsx');
    expect(src).toContain('ReferenceBadge');
    expect(src).toContain('ReferenceLinkCopy');
    expect(src).toContain('quote.ref_id');
  });
});

describe('Step I — boundary safety on touched files', () => {
  const touched = [
    'src/pages/dashboard/QuoteRequestDetails.tsx',
    'src/pages/admin/AdminQuoteRequestDetails.tsx',
    'src/pages/admin/AdminQuoteOperations.tsx',
    'src/modules/quotes/services/listAdminOpsQuoteRequests.ts',
    'src/modules/leads/services/detail.ts',
    'src/components/reference/ReferenceLinkCopy.tsx',
  ];

  it('does not invoke supabase.functions.invoke from touched UI files', () => {
    for (const f of touched) {
      const src = read(f);
      expect(src, `${f} must not call edge functions directly`).not.toMatch(
        /supabase\.functions\.invoke/,
      );
    }
  });

  it('does not mutate credits/contracts/memberships tables from touched files', () => {
    const FORBIDDEN_TABLES = [
      'provider_lead_credit_transactions',
      'contract_pricing',
      'membership_payments',
      'user_roles',
    ];
    for (const f of touched) {
      const src = read(f);
      for (const t of FORBIDDEN_TABLES) {
        expect(
          src.includes(`from('${t}')`) || src.includes(`from("${t}")`),
          `${f} must not touch ${t}`,
        ).toBe(false);
      }
    }
  });
});