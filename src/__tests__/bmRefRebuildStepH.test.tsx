/**
 * BM-REF-REBUILD-1 — Step H
 *
 * Display-only rollout: surface official ref_id and copyable
 * /r/{REF} links across QTE quote requests, STI staff invitations,
 * and PVS provider subscriptions.
 *
 * Guarantees:
 *  A. ReferenceLinkCopy copies /r/{refId}, refuses tokens / UUIDs,
 *     and is bilingual (EN/AR aria/title labels).
 *  B. Quote request list services select ref_id; quote list UIs
 *     render the official reference, not raw UUID fragments.
 *  C. Staff invitations panel shows STI reference + copy action and
 *     never copies the invitation token through the new control.
 *  D. Provider subscriptions admin list selects + displays PVS ref_id.
 *  E. Architecture/regression invariants preserved (no schema diff,
 *     no edge invokes, no href="#", no /dashboard/membership, no
 *     provider_intent_id leak).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const read = (p: string) => readFileSync(resolvePath(p), 'utf8');

// ============================================================
// A. ReferenceLinkCopy component behavior
// ============================================================
const toastMock = { success: vi.fn(), error: vi.fn() };
vi.mock('sonner', () => ({
  toast: {
    success: (...a: unknown[]) => toastMock.success(...a),
    error: (...a: unknown[]) => toastMock.error(...a),
  },
}));

beforeEach(() => {
  toastMock.success.mockReset();
  toastMock.error.mockReset();
});

function setClipboard(impl: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: vi.fn(impl) },
  });
}

describe('A. ReferenceLinkCopy', () => {
  it('copies /r/{refId} as an absolute URL and toasts success (EN)', async () => {
    const writes: string[] = [];
    setClipboard(async (t) => {
      writes.push(t);
    });
    const { ReferenceLinkCopy } = await import(
      '@/components/reference/ReferenceLinkCopy'
    );
    render(<ReferenceLinkCopy refId="QTE-1000001" isRTL={false} />);
    const btn = screen.getByRole('button', { name: /Copy reference link/i });
    fireEvent.click(btn);
    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0]).toMatch(/\/r\/QTE-1000001$/);
    expect(toastMock.success).toHaveBeenCalled();
  });

  it('uses Arabic label when isRTL=true', async () => {
    const { ReferenceLinkCopy } = await import(
      '@/components/reference/ReferenceLinkCopy'
    );
    render(<ReferenceLinkCopy refId="STI-1000001" isRTL />);
    expect(
      screen.getByRole('button', { name: 'نسخ رابط المرجع' }),
    ).toBeInTheDocument();
  });

  it('renders nothing when refId is missing', async () => {
    const { ReferenceLinkCopy } = await import(
      '@/components/reference/ReferenceLinkCopy'
    );
    const { container } = render(
      <ReferenceLinkCopy refId={null} isRTL={false} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('refuses raw UUIDs (rejects, no clipboard write)', async () => {
    const writes: string[] = [];
    setClipboard(async (t) => {
      writes.push(t);
    });
    const { ReferenceLinkCopy } = await import(
      '@/components/reference/ReferenceLinkCopy'
    );
    const { container } = render(
      <ReferenceLinkCopy
        refId={'11111111-2222-3333-4444-555555555555'}
        isRTL={false}
      />,
    );
    expect(container.firstChild).toBeNull();
    expect(writes).toHaveLength(0);
  });

  it('refuses opaque tokens (long lowercase hex)', async () => {
    const { ReferenceLinkCopy } = await import(
      '@/components/reference/ReferenceLinkCopy'
    );
    const { container } = render(
      <ReferenceLinkCopy
        refId={'abcdef0123456789abcdef0123456789'}
        isRTL={false}
      />,
    );
    expect(container.firstChild).toBeNull();
  });
});

describe('A. ReferenceLinkCopy source-level guards', () => {
  const SRC = read('src/components/reference/ReferenceLinkCopy.tsx');

  it('never references token / UUID / provider_intent_id field reads', () => {
    expect(SRC).not.toMatch(/\.token\b/);
    expect(SRC).not.toMatch(/provider_intent_id/);
    expect(SRC).not.toContain('@phone.qitaat.local');
  });

  it('never calls supabase or invokes edge functions', () => {
    expect(SRC).not.toMatch(/from\s+['"]@\/integrations\/supabase\/client['"]/);
    expect(SRC).not.toMatch(/functions\.invoke\(/);
  });

  it('builds /r/{refId} link form', () => {
    expect(SRC).toMatch(/`\/r\/\$\{refId\}`/);
  });

  it('has both EN and AR labels', () => {
    expect(SRC).toContain('Copy reference link');
    expect(SRC).toContain('نسخ رابط المرجع');
  });
});

// ============================================================
// B. Quote request list services select ref_id
// ============================================================
describe('B. Quote request services include ref_id', () => {
  const LIST_SRC = read('src/modules/leads/services/list.ts');

  it('AdminQuoteRow type carries ref_id', () => {
    expect(LIST_SRC).toMatch(/AdminQuoteRow[\s\S]*ref_id:\s*string\s*\|\s*null/);
  });

  it('MyQuoteRequestRow type carries ref_id', () => {
    expect(LIST_SRC).toMatch(/MyQuoteRequestRow[\s\S]*ref_id:\s*string\s*\|\s*null/);
  });

  it('ADMIN_QUOTE_SELECT selects ref_id', () => {
    expect(LIST_SRC).toMatch(/ADMIN_QUOTE_SELECT\s*=\s*[\s\S]*ref_id/);
  });

  it('MY_QUOTE_SELECT selects ref_id', () => {
    expect(LIST_SRC).toMatch(/MY_QUOTE_SELECT\s*=\s*[\s\S]*ref_id/);
  });
});

// ============================================================
// B. Quote request list UIs render ReferenceBadge + copy link
// ============================================================
describe('B. Quote request list UIs render official ref + copy link', () => {
  const MY = read('src/pages/dashboard/DashboardMyRequests.tsx');
  const ADMIN = read('src/pages/admin/AdminQuoteRequests.tsx');

  it('DashboardMyRequests imports both ref primitives', () => {
    expect(MY).toContain("from '@/components/reference/ReferenceBadge'");
    expect(MY).toContain("from '@/components/reference/ReferenceLinkCopy'");
  });

  it('DashboardMyRequests passes q.ref_id (never q.id) to ReferenceBadge primary', () => {
    expect(MY).toMatch(/ReferenceBadge\s+refId=\{q\.ref_id\}/);
    expect(MY).toMatch(/ReferenceLinkCopy\s+refId=\{q\.ref_id\}/);
  });

  it('AdminQuoteRequests imports both ref primitives', () => {
    expect(ADMIN).toContain("from '@/components/reference/ReferenceBadge'");
    expect(ADMIN).toContain("from '@/components/reference/ReferenceLinkCopy'");
  });

  it('AdminQuoteRequests prefers r.ref_id over raw id fragment', () => {
    expect(ADMIN).toMatch(/ReferenceBadge\s+refId=\{r\.ref_id\}/);
    expect(ADMIN).toMatch(/ReferenceLinkCopy\s+refId=\{r\.ref_id\}/);
    // The legacy slice fallback remains only when ref_id is absent.
    expect(ADMIN).toMatch(/r\.ref_id\s*\?/);
  });
});

// ============================================================
// C. Staff invitations
// ============================================================
describe('C. Staff invitations panel — STI ref + reference link copy', () => {
  const PANEL = read('src/components/dashboard/business-edit/InvitationsPanel.tsx');

  it('imports ReferenceLinkCopy', () => {
    expect(PANEL).toContain("from '@/components/reference/ReferenceLinkCopy'");
  });

  it('renders <ReferenceLinkCopy> bound to inv.ref_id, not inv.token', () => {
    expect(PANEL).toMatch(/<ReferenceLinkCopy\s+refId=\{inv\.ref_id\}/);
    expect(PANEL).not.toMatch(/<ReferenceLinkCopy[^/>]*refId=\{inv\.token/);
  });

  it('preserves the existing invite token copy flow (token validation unchanged)', () => {
    expect(PANEL).toContain('copyLink(inv.token)');
    expect(PANEL).toContain('acceptUrlFor');
  });

  it('still selects ref_id from business_staff_invitations', () => {
    expect(PANEL).toMatch(/select\(\s*['"][^'"]*\bref_id\b/);
  });
});

// ============================================================
// D. Provider subscriptions admin list — PVS ref display
// ============================================================
describe('D. AdminProviderSubscriptions surfaces PVS ref_id', () => {
  const READS = read(
    'src/modules/memberships/services/providerSubscriptions/reads.ts',
  );
  const ADMIN = read('src/pages/admin/AdminProviderSubscriptions.tsx');

  it('listProviderSubscriptions default select includes ref_id', () => {
    // Locate the listProviderSubscriptions function block specifically.
    const idx = READS.indexOf('listProviderSubscriptions<');
    expect(idx).toBeGreaterThan(0);
    const slice = READS.slice(idx, idx + 600);
    expect(slice).toMatch(/ref_id/);
  });

  it('Admin page renders ReferenceBadge + ReferenceLinkCopy for each row', () => {
    expect(ADMIN).toContain("from '@/components/reference/ReferenceBadge'");
    expect(ADMIN).toContain("from '@/components/reference/ReferenceLinkCopy'");
    expect(ADMIN).toMatch(/ReferenceBadge\s+refId=\{s\.ref_id\}/);
    expect(ADMIN).toMatch(/ReferenceLinkCopy\s+refId=\{s\.ref_id\}/);
  });

  it('Sub type carries ref_id', () => {
    expect(ADMIN).toMatch(/interface\s+Sub[\s\S]*ref_id:\s*string\s*\|\s*null/);
  });
});

// ============================================================
// E. Architecture / regression invariants
// ============================================================
describe('E. Regression invariants — Step H is display-only', () => {
  const APP = read('src/App.tsx');
  const RESOLVER = read('src/pages/ReferenceResolver.tsx');

  it('/r/:refId universal resolver route is still wired', () => {
    expect(APP).toMatch(/path="\/r\/:refId"/);
  });

  it('ReferenceResolver still uses lookupByReference via the reference module', () => {
    expect(RESOLVER).toMatch(/from\s+['"]@\/modules\/reference['"]/);
    expect(RESOLVER).toContain('lookupByReference');
  });

  it('No /dashboard/membership reintroduced and no href="#" placeholders', () => {
    for (const src of [
      'src/pages/dashboard/DashboardMyRequests.tsx',
      'src/pages/admin/AdminQuoteRequests.tsx',
      'src/components/dashboard/business-edit/InvitationsPanel.tsx',
      'src/pages/admin/AdminProviderSubscriptions.tsx',
      'src/components/reference/ReferenceLinkCopy.tsx',
    ]) {
      const body = read(src);
      expect(body).not.toContain('/dashboard/membership');
      expect(body).not.toMatch(/href=["']#["']/);
    }
  });

  it('Step H surfaces never read provider_intent_id or synthetic emails', () => {
    for (const src of [
      'src/pages/dashboard/DashboardMyRequests.tsx',
      'src/pages/admin/AdminQuoteRequests.tsx',
      'src/pages/admin/AdminProviderSubscriptions.tsx',
      'src/components/dashboard/business-edit/InvitationsPanel.tsx',
    ]) {
      const body = read(src);
      expect(body).not.toContain('provider_intent_id');
      expect(body).not.toContain('@phone.qitaat.local');
    }
  });

  it('ReferenceLinkCopy never invokes an edge function', () => {
    const SRC = read('src/components/reference/ReferenceLinkCopy.tsx');
    expect(SRC).not.toMatch(/functions\.invoke\(/);
  });
});

afterEach(() => {
  // Nothing to tear down; clipboard is replaced lazily per test.
});