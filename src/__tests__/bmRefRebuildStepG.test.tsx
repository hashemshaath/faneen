/**
 * BM-REF-REBUILD-1 — Step G
 *
 * Coverage for the server-side canonical_route expansion in
 * public.lookup_by_reference and the resolver's continued
 * preference for the server-provided route.
 *
 * Guarantees:
 *  A. Latest migration source contains canonical_route mappings for
 *     ENT/BIZ, LED/LR, QTE, BKG/BK, CNT, PAY, STI, PVS — and keeps
 *     SECURITY DEFINER + a pinned search_path.
 *  B. The migration never selects, returns, or otherwise references
 *     forbidden identifiers (tokens, provider_intent_id, synthetic
 *     @phone.qitaat.local emails, raw phone, plaintext password).
 *  C. STI / PVS rows are admin-gated in the function body.
 *  D. The resolver still uses the server canonical_route first and
 *     only falls back to its narrow client map; new entity_type
 *     values (payment_intent, provider_subscription) are mapped
 *     safely or treated as not-found.
 *  E. UUID admin fallback remains gated on is_admin.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve as resolvePath, join } from 'node:path';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

const MIGRATIONS_DIR = resolvePath('supabase/migrations');

function latestLookupMigrationSource(): string {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  for (const f of [...files].reverse()) {
    const body = readFileSync(join(MIGRATIONS_DIR, f), 'utf8');
    if (/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.lookup_by_reference/i.test(body)) {
      return body;
    }
  }
  throw new Error('No lookup_by_reference migration found');
}

const MIG = latestLookupMigrationSource();

describe('A. Migration source — canonical route mappings', () => {
  it('handles ENT / BIZ business references with the public profile route', () => {
    expect(MIG).toMatch(/IN\s*\(\s*'ENT'\s*,\s*'BIZ'\s*\)/);
    expect(MIG).toMatch(/'\/'\s*\|\|\s*COALESCE\(b\.username/);
  });

  it('handles LED / LR lead references with the provider lead detail route', () => {
    expect(MIG).toMatch(/IN\s*\(\s*'LED'\s*,\s*'LR'\s*\)/);
    expect(MIG).toContain('/dashboard/provider/leads/');
  });

  it('handles QTE quote requests with the my-requests detail route', () => {
    expect(MIG).toMatch(/v_prefix\s*=\s*'QTE'/);
    expect(MIG).toContain('/dashboard/my-requests/');
  });

  it('handles BKG / BK booking references with the bookings list route', () => {
    expect(MIG).toMatch(/IN\s*\(\s*'BKG'\s*,\s*'BK'\s*\)/);
    expect(MIG).toContain("'/dashboard/bookings'");
  });

  it('handles CNT contract references with the contract detail route', () => {
    expect(MIG).toMatch(/v_prefix\s*=\s*'CNT'/);
    expect(MIG).toContain('/contracts/');
  });

  it('handles PAY references with status-aware invoice vs membership route', () => {
    expect(MIG).toMatch(/v_prefix\s*=\s*'PAY'/);
    expect(MIG).toMatch(/succeeded.+refunded|refunded.+succeeded/i);
    expect(MIG).toContain('/membership/payments/');
    expect(MIG).toContain('/invoice');
    expect(MIG).toMatch(/'\/membership'/);
  });

  it('handles STI staff invitation references admin-gated', () => {
    expect(MIG).toMatch(/v_prefix\s*=\s*'STI'/);
    expect(MIG).toContain('business_staff_invitations');
    // STI block must reference v_is_admin
    const stiIdx = MIG.indexOf("'STI'");
    const slice = MIG.slice(stiIdx, stiIdx + 500);
    expect(slice).toContain('v_is_admin');
  });

  it('handles PVS provider subscription references admin-gated with null route', () => {
    expect(MIG).toMatch(/v_prefix\s*=\s*'PVS'/);
    expect(MIG).toContain('provider_subscriptions');
    const pvsIdx = MIG.indexOf("'PVS'");
    const slice = MIG.slice(pvsIdx, pvsIdx + 500);
    expect(slice).toContain('v_is_admin');
    expect(slice).toMatch(/NULL::text/);
  });

  it('keeps SECURITY DEFINER and pinned search_path', () => {
    expect(MIG).toMatch(/SECURITY\s+DEFINER/i);
    expect(MIG).toMatch(/SET\s+search_path\s+TO\s+'public'/i);
  });

  it('keeps UUID admin fallback gated on v_is_admin', () => {
    expect(MIG).toMatch(/v_is_admin\s+AND\s+v_ref\s*~\*/);
  });
});

describe('B. Migration source — no forbidden identifiers leak', () => {
  it('never selects tokens, provider_intent_id, or synthetic emails', () => {
    expect(MIG).not.toMatch(/\btoken\b/i);
    expect(MIG).not.toMatch(/provider_intent_id/);
    expect(MIG).not.toContain('@phone.qitaat.local');
    // Function does not select plaintext phone/email/password
    expect(MIG).not.toMatch(/SELECT[^;]*\b(phone|email|password)\b/i);
  });
});

// ============================================================
// Resolver behavior — server canonical_route wins, fallback safe.
// ============================================================
const lookupMock = vi.fn();
vi.mock('@/modules/reference', () => ({
  lookupByReference: (...args: unknown[]) => lookupMock(...args),
}));

beforeEach(() => {
  lookupMock.mockReset();
});

function LocationProbe() {
  const loc = useLocation();
  return <div data-testid="redirected">{loc.pathname}</div>;
}

async function renderAt(path: string) {
  const { default: ReferenceResolver } = await import('@/pages/ReferenceResolver');
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/r/:refId" element={<ReferenceResolver />} />
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('D. Resolver — server canonical_route wins for all entity types', () => {
  it('business ENT redirects to /username from server canonical_route', async () => {
    lookupMock.mockResolvedValueOnce({
      data: [
        {
          entity_type: 'business',
          table_name: 'businesses',
          id: 'b1',
          ref_id: 'ENT-1000001',
          legacy_ref_id: 'BIZ-1',
          canonical_route: '/acme-co',
        },
      ],
      error: null,
    });
    await renderAt('/r/ENT-1000001');
    await waitFor(() =>
      expect(screen.getByTestId('redirected').textContent).toBe('/acme-co'),
    );
  });

  it('contract CNT redirects to /contracts/:id from server', async () => {
    lookupMock.mockResolvedValueOnce({
      data: [
        {
          entity_type: 'contract',
          table_name: 'contracts',
          id: 'c-uuid',
          ref_id: 'CNT-1000001',
          legacy_ref_id: null,
          canonical_route: '/contracts/c-uuid',
        },
      ],
      error: null,
    });
    await renderAt('/r/CNT-1000001');
    await waitFor(() =>
      expect(screen.getByTestId('redirected').textContent).toBe('/contracts/c-uuid'),
    );
  });

  it('QTE quote_request redirects to /dashboard/my-requests/:id from server', async () => {
    lookupMock.mockResolvedValueOnce({
      data: [
        {
          entity_type: 'quote_request',
          table_name: 'quote_requests',
          id: 'q-uuid',
          ref_id: 'QTE-1000001',
          legacy_ref_id: null,
          canonical_route: '/dashboard/my-requests/q-uuid',
        },
      ],
      error: null,
    });
    await renderAt('/r/QTE-1000001');
    await waitFor(() =>
      expect(screen.getByTestId('redirected').textContent).toBe(
        '/dashboard/my-requests/q-uuid',
      ),
    );
  });

  it('PAY succeeded redirects to invoice route from server', async () => {
    lookupMock.mockResolvedValueOnce({
      data: [
        {
          entity_type: 'payment_intent',
          table_name: 'membership_payment_intents',
          id: 'p-uuid',
          ref_id: 'PAY-1000001',
          legacy_ref_id: null,
          canonical_route: '/membership/payments/p-uuid/invoice',
        },
      ],
      error: null,
    });
    await renderAt('/r/PAY-1000001');
    await waitFor(() =>
      expect(screen.getByTestId('redirected').textContent).toBe(
        '/membership/payments/p-uuid/invoice',
      ),
    );
  });

  it('payment_intent with no server route falls back to /membership client map', async () => {
    lookupMock.mockResolvedValueOnce({
      data: [
        {
          entity_type: 'payment_intent',
          table_name: 'membership_payment_intents',
          id: 'p-uuid-2',
          ref_id: 'PAY-2000002',
          legacy_ref_id: null,
          canonical_route: null,
        },
      ],
      error: null,
    });
    await renderAt('/r/PAY-2000002');
    await waitFor(() =>
      expect(screen.getByTestId('redirected').textContent).toBe('/membership'),
    );
  });

  it('provider_subscription with null route renders not-found cleanly', async () => {
    lookupMock.mockResolvedValueOnce({
      data: [
        {
          entity_type: 'provider_subscription',
          table_name: 'provider_subscriptions',
          id: 'ps-uuid',
          ref_id: 'PVS-1000001',
          legacy_ref_id: null,
          canonical_route: null,
        },
      ],
      error: null,
    });
    await renderAt('/r/PVS-1000001');
    expect(await screen.findByText(/Reference not found/i)).toBeInTheDocument();
  });
});

describe('E. Resolver — architecture invariants preserved', () => {
  const PAGE = readFileSync(
    resolvePath('src/pages/ReferenceResolver.tsx'),
    'utf8',
  );

  it('never calls supabase directly', () => {
    expect(PAGE).not.toMatch(/from\s+['"]@\/integrations\/supabase\/client['"]/);
    expect(PAGE).not.toMatch(/supabase\.(rpc|from|functions)\(/);
  });

  it('never invokes an edge function from the UI', () => {
    expect(PAGE).not.toMatch(/functions\.invoke\(/);
  });
});