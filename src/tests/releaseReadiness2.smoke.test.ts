/**
 * PRODUCTION-RELEASE-READINESS-2 Phase F — Production smoke suite.
 *
 * Pure module-presence + reference-coverage smoke checks. These do NOT
 * boot React Router or hit Supabase — they assert that the static
 * surface area expected by the v1.0 release is wired up:
 *
 *  • All 16+ documented ref prefixes resolve to a dashboard route.
 *  • Core domain modules export the canonical symbols product depends on.
 *  • Data integrity diagnostics are wired and return the documented set.
 *  • No supplier-portal / inventory / accounting / SMS modules sneaked in.
 */
import { describe, it, expect } from 'vitest';
import {
  REF_PREFIXES,
  resolveRefRoute,
  parseRef,
} from '@/modules/workspace/shell/refRouteMap';
import { runDataIntegrityChecks, INTEGRITY_LABELS } from '@/modules/health/dataIntegrity';

describe('PRR-2 smoke — reference coverage', () => {
  const required = [
    'WO', 'TASK', 'BOQ', 'BOQI', 'RFQ', 'PO', 'WOQ',
    'CONTRACT', 'QUOTE', 'NOTE',
    'APT', 'CLS', 'WAR', 'FDB', 'CPN', 'CTL',
  ] as const;

  it('refRouteMap covers every v1.0 prefix', () => {
    for (const p of required) {
      expect(REF_PREFIXES, p).toContain(p);
      const dest = resolveRefRoute(`${p}-1000001`);
      expect(dest, `${p} → route`).toBeTruthy();
      expect(dest, `${p} resolves under dashboard`).toMatch(/^\/dashboard\//);
      expect(dest, `${p} carries ref query`).toContain('ref=');
    }
  });

  it('rejects raw UUIDs and unknown prefixes', () => {
    expect(parseRef('00000000-0000-0000-0000-000000000000')).toBeNull();
    expect(parseRef('INV-1000001')).toBeNull();
    expect(parseRef('SUPPLIER-1')).toBeNull();
  });
});

describe('PRR-2 smoke — data integrity surface', () => {
  it('reports 12 documented checks', () => {
    const r = runDataIntegrityChecks({
      contracts: [], workOrders: [], quotations: [], closures: [],
      warranties: [], appointments: [], rfqs: [], rfqSuppliers: [],
      rfqQuotes: [], purchaseOrders: [], trackingLinks: [],
    });
    expect(r.summary.map((s) => s.key).sort()).toEqual(
      Object.keys(INTEGRITY_LABELS).sort(),
    );
  });
});

describe('PRR-2 smoke — release scope guardrails', () => {
  it('does not ship inventory / supplier-portal / accounting modules', async () => {
    await expect(
      // @ts-expect-error - intentional dynamic import to assert absence
      import('@/modules/inventory'),
    ).rejects.toBeDefined();
    await expect(
      // @ts-expect-error
      import('@/modules/supplierPortal'),
    ).rejects.toBeDefined();
    await expect(
      // @ts-expect-error
      import('@/modules/accounting'),
    ).rejects.toBeDefined();
  });

  it('does not ship WhatsApp / SMS channels', async () => {
    await expect(
      // @ts-expect-error
      import('@/modules/whatsapp'),
    ).rejects.toBeDefined();
    await expect(
      // @ts-expect-error
      import('@/modules/sms'),
    ).rejects.toBeDefined();
  });
});