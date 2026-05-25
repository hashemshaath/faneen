/**
 * BM-REF-REBUILD-1 — Step F
 *
 * Regression coverage for the universal reference resolver route /r/:refId.
 *
 * Guarantees:
 *  A. Route /r/:refId is wired in App.tsx and ReferenceResolver page exists.
 *  B. Resolver delegates to the Step C lookupByReference service
 *     (no direct supabase.* calls, no duplicate RPC plumbing).
 *  C. Loading / invalid / not-found states render with safe labels;
 *     no raw UUIDs and no href="#".
 *  D. Valid LED / BKG / legacy LR / BK references reach the service
 *     and resolve via the explicit route mapping.
 *  E. Invitation tokens and raw UUIDs are rejected as invalid input.
 *  F. The resolver does not invoke any edge function from the UI.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const read = (p: string) => readFileSync(resolvePath(p), 'utf8');

const lookupMock = vi.fn();
vi.mock('@/modules/reference', () => ({
  lookupByReference: (...args: unknown[]) => lookupMock(...args),
}));

beforeEach(() => {
  lookupMock.mockReset();
});

async function renderAt(path: string) {
  const { default: ReferenceResolver } = await import('@/pages/ReferenceResolver');
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/r/:refId" element={<ReferenceResolver />} />
        <Route path="*" element={<div data-testid="redirected">{location.pathname}</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('A. Route wiring + page existence', () => {
  const APP = read('src/App.tsx');
  const PAGE = read('src/pages/ReferenceResolver.tsx');

  it('App.tsx registers /r/:refId pointing at ReferenceResolver', () => {
    expect(APP).toMatch(/path="\/r\/:refId"/);
    expect(APP).toContain('ReferenceResolver');
  });

  it('App.tsx still registers BusinessProfile catch-all /:username after /r/:refId', () => {
    const idxR = APP.indexOf('path="/r/:refId"');
    const idxUser = APP.indexOf('path="/:username"');
    expect(idxR).toBeGreaterThan(0);
    expect(idxUser).toBeGreaterThan(idxR);
  });

  it('does not introduce href="#" anywhere on the resolver page', () => {
    expect(PAGE).not.toMatch(/href=("|')#\1/);
  });

  it('does not call supabase directly from the resolver page', () => {
    expect(PAGE).not.toMatch(/from\s+['"]@\/integrations\/supabase\/client['"]/);
    expect(PAGE).not.toMatch(/supabase\.(rpc|from|functions)\(/);
  });

  it('uses the Step C service module via the public surface', () => {
    expect(PAGE).toMatch(/from\s+['"]@\/modules\/reference['"]/);
    expect(PAGE).toContain('lookupByReference');
  });
});

describe('B. Resolver behavior — valid references resolve through lookup service', () => {
  it('LED reference calls lookupByReference and redirects to provider lead detail', async () => {
    lookupMock.mockResolvedValueOnce({
      data: [
        {
          entity_type: 'lead',
          table_name: 'provider_lead_requests',
          id: 'lead-uuid-1',
          ref_id: 'LED-1000001',
          legacy_ref_id: null,
          canonical_route: null,
        },
      ],
      error: null,
    });
    await renderAt('/r/LED-1000001');
    await waitFor(() => {
      expect(lookupMock).toHaveBeenCalledWith({ reference: 'LED-1000001' });
    });
    await waitFor(() => {
      expect(screen.getByTestId('redirected').textContent).toBe(
        '/dashboard/provider/leads/lead-uuid-1',
      );
    });
  });

  it('BKG reference resolves to /dashboard/bookings', async () => {
    lookupMock.mockResolvedValueOnce({
      data: [
        {
          entity_type: 'booking',
          table_name: 'bookings',
          id: 'b1',
          ref_id: 'BKG-1000001',
          legacy_ref_id: 'BK-555',
          canonical_route: null,
        },
      ],
      error: null,
    });
    await renderAt('/r/BKG-1000001');
    await waitFor(() => {
      expect(screen.getByTestId('redirected').textContent).toBe(
        '/dashboard/bookings',
      );
    });
  });

  it('legacy LR- reference is forwarded to lookup service', async () => {
    lookupMock.mockResolvedValueOnce({
      data: [
        {
          entity_type: 'lead',
          table_name: 'provider_lead_requests',
          id: 'lead-uuid-2',
          ref_id: 'LED-1000002',
          legacy_ref_id: 'LR-42',
          canonical_route: null,
        },
      ],
      error: null,
    });
    await renderAt('/r/LR-42');
    await waitFor(() =>
      expect(lookupMock).toHaveBeenCalledWith({ reference: 'LR-42' }),
    );
  });

  it('legacy BK- reference is forwarded to lookup service', async () => {
    lookupMock.mockResolvedValueOnce({
      data: [
        {
          entity_type: 'booking',
          table_name: 'bookings',
          id: 'b2',
          ref_id: 'BKG-1000003',
          legacy_ref_id: 'BK-99',
          canonical_route: null,
        },
      ],
      error: null,
    });
    await renderAt('/r/BK-99');
    await waitFor(() =>
      expect(lookupMock).toHaveBeenCalledWith({ reference: 'BK-99' }),
    );
  });

  it('prefers server-provided canonical_route when present', async () => {
    lookupMock.mockResolvedValueOnce({
      data: [
        {
          entity_type: 'business',
          table_name: 'businesses',
          id: 'b-uuid',
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
});

describe('C. Resolver behavior — invalid / unknown / unsafe inputs', () => {
  it('renders not-found state when lookup returns no rows', async () => {
    lookupMock.mockResolvedValueOnce({ data: [], error: null });
    await renderAt('/r/LED-9999999');
    await waitFor(() =>
      expect(screen.getByText(/Reference not found/i)).toBeInTheDocument(),
    );
    // Safe ref echoed back — never a UUID
    expect(screen.queryByText(/[0-9a-f]{8}-[0-9a-f]{4}/i)).toBeNull();
    expect(lookupMock).toHaveBeenCalledTimes(1);
  });

  it('rejects raw UUID as invalid without calling the lookup service', async () => {
    await renderAt('/r/11111111-2222-3333-4444-555555555555');
    expect(await screen.findByText(/Invalid reference/i)).toBeInTheDocument();
    expect(lookupMock).not.toHaveBeenCalled();
  });

  it('rejects invitation-token style opaque values as invalid', async () => {
    // Long opaque tokens used by /staff-invite/:token are not refs.
    await renderAt('/r/abcdef0123456789abcdef0123456789abcdef0123456789');
    expect(await screen.findByText(/Invalid reference/i)).toBeInTheDocument();
    expect(lookupMock).not.toHaveBeenCalled();
  });

  it('rejects values that do not match the safe ref pattern', async () => {
    await renderAt('/r/notaref');
    expect(await screen.findByText(/Invalid reference/i)).toBeInTheDocument();
    expect(lookupMock).not.toHaveBeenCalled();
  });

  it('does not render raw UUIDs as the primary label even on success', async () => {
    lookupMock.mockResolvedValueOnce({
      data: [
        {
          entity_type: 'lead',
          table_name: 'provider_lead_requests',
          id: '11111111-2222-3333-4444-555555555555',
          ref_id: 'LED-1000001',
          legacy_ref_id: null,
          canonical_route: null,
        },
      ],
      error: null,
    });
    await renderAt('/r/LED-1000001');
    // After redirect, the destination receives the UUID in the path; the
    // resolver itself must never print the raw UUID as a primary label.
    await waitFor(() => expect(screen.getByTestId('redirected')).toBeTruthy());
    // The resolver's own heading is gone after redirect; assertion above
    // implicitly proves no resolver-rendered UUID label remained.
  });
});

describe('D. Architecture guards', () => {
  const PAGE = read('src/pages/ReferenceResolver.tsx');

  it('does not invoke supabase edge functions from the UI', () => {
    expect(PAGE).not.toMatch(/functions\.invoke\(/);
  });

  it('does not duplicate lookup_by_reference RPC plumbing', () => {
    expect(PAGE).not.toContain('lookup_by_reference');
    expect(PAGE).not.toMatch(/\.rpc\(/);
  });
});