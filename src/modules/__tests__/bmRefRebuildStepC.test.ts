/**
 * BM-REF-REBUILD-1 — Step C
 * Service-layer tests for the unified reference compatibility wrappers.
 *
 * Guarantees:
 *  A. lookupByReference uses rpc('lookup_by_reference') only.
 *  B. Entity access wrappers call their respective RPCs only.
 *  C. New display helpers never expose provider_intent_id, tokens,
 *     email, phone, or synthetic @phone.qitaat.local identifiers
 *     as the official user-facing reference.
 *  D. Business + payment display helpers prefer new ref_id and only
 *     surface legacy / internal values as clearly-secondary.
 *  E. No UI files, edge functions, or RLS migrations were touched.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const rpcMock = vi.fn();
const fromMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

beforeEach(() => {
  rpcMock.mockReset();
  fromMock.mockReset();
  rpcMock.mockResolvedValue({ data: [], error: null });
});

describe('A. lookupByReference service', () => {
  it('calls rpc("lookup_by_reference") with _ref and passes through result', async () => {
    rpcMock.mockResolvedValueOnce({
      data: [
        {
          entity_type: 'business',
          table_name: 'businesses',
          id: 'uuid-1',
          ref_id: 'ENT-1000001',
          legacy_ref_id: 'BIZ-12345',
          canonical_route: '/business/foo',
        },
      ],
      error: null,
    });
    const { lookupByReference } = await import(
      '@/modules/reference/services/lookupByReference'
    );
    const res = await lookupByReference({ reference: 'ENT-1000001' });
    expect(rpcMock).toHaveBeenCalledWith('lookup_by_reference', {
      _ref: 'ENT-1000001',
    });
    expect(fromMock).not.toHaveBeenCalled();
    expect(res.error).toBeNull();
    expect(res.data?.[0].ref_id).toBe('ENT-1000001');
    expect(res.data?.[0].legacy_ref_id).toBe('BIZ-12345');
  });

  it('returns {data:null,error} shape on RPC error', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'denied' } });
    const { lookupByReference } = await import(
      '@/modules/reference/services/lookupByReference'
    );
    const res = await lookupByReference({ reference: 'BIZ-1' });
    expect(res.data).toBeNull();
    expect(res.error).toEqual({ message: 'denied' });
  });

  it('source file does not call supabase.from directly', () => {
    const src = read('src/modules/reference/services/lookupByReference.ts');
    expect(src).not.toMatch(/supabase\.from\(/);
    expect(src).toMatch(/supabase\.rpc\(['"]lookup_by_reference['"]/);
  });

  it('module index re-exports lookupByReference + types', () => {
    const src = read('src/modules/reference/index.ts');
    expect(src).toContain('lookupByReference');
    expect(src).toContain('ReferenceLookupRow');
  });
});

describe('B. Entity access service wrappers', () => {
  it('hasEntityMembership calls rpc("has_entity_membership")', async () => {
    const { hasEntityMembership } = await import(
      '@/modules/entities/services/access/hasEntityMembership'
    );
    await hasEntityMembership({ userId: 'u', entityId: 'e' });
    expect(rpcMock).toHaveBeenCalledWith('has_entity_membership', {
      _user_id: 'u',
      _entity_id: 'e',
      _permission: undefined,
    });
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('hasEntityMembership forwards optional permission', async () => {
    const { hasEntityMembership } = await import(
      '@/modules/entities/services/access/hasEntityMembership'
    );
    await hasEntityMembership({ userId: 'u', entityId: 'e', permission: 'manage' });
    expect(rpcMock).toHaveBeenCalledWith('has_entity_membership', {
      _user_id: 'u',
      _entity_id: 'e',
      _permission: 'manage',
    });
  });

  it('hasLocationAccess calls rpc("has_location_access")', async () => {
    const { hasLocationAccess } = await import(
      '@/modules/entities/services/access/hasLocationAccess'
    );
    await hasLocationAccess({ userId: 'u', locationId: 'l' });
    expect(rpcMock).toHaveBeenCalledWith('has_location_access', {
      _user_id: 'u',
      _location_id: 'l',
      _permission: undefined,
    });
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('getUserEntityContexts calls rpc("get_user_entity_contexts")', async () => {
    const { getUserEntityContexts } = await import(
      '@/modules/entities/services/access/getUserEntityContexts'
    );
    await getUserEntityContexts({ userId: 'u' });
    expect(rpcMock).toHaveBeenCalledWith('get_user_entity_contexts', {
      _user_id: 'u',
    });
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('access wrapper sources never call supabase.from', () => {
    for (const p of [
      'src/modules/entities/services/access/hasEntityMembership.ts',
      'src/modules/entities/services/access/hasLocationAccess.ts',
      'src/modules/entities/services/access/getUserEntityContexts.ts',
    ]) {
      const src = read(p);
      expect(src).not.toMatch(/supabase\.from\(/);
      expect(src).toMatch(/supabase\.rpc\(/);
    }
  });
});

describe('C. Reference safety — display helpers never expose unsafe identifiers', () => {
  const stepCFiles = [
    'src/modules/businesses/services/getBusinessDisplayReference.ts',
    'src/modules/memberships/services/payments/getPaymentDisplayReference.ts',
    'src/modules/businesses/services/getBusinessByAnyReference.ts',
    'src/modules/reference/services/lookupByReference.ts',
    'src/modules/reference/services/types.ts',
  ];

  it('no display helper returns provider_intent_id as primary', async () => {
    const { getPaymentDisplayReference } = await import(
      '@/modules/memberships/services/payments/getPaymentDisplayReference'
    );
    const out = getPaymentDisplayReference({
      ref_id: 'PAY-1000001',
      provider_intent_id: 'pi_secret_123',
    });
    expect(out.primary).toBe('PAY-1000001');
    expect(out.primary).not.toContain('pi_');
  });

  it('display helper source files do not reference token / email / phone / synthetic identifiers as fields', () => {
    for (const p of stepCFiles) {
      const src = read(p);
      // No field reads of unsafe identifiers
      expect(src).not.toMatch(/\.token\b/);
      expect(src).not.toMatch(/\.email\b/);
      expect(src).not.toMatch(/\.phone\b/);
      expect(src).not.toContain('@phone.qitaat.local');
    }
  });

  it('payment helper marks fallback explicitly unsafe', () => {
    const src = read(
      'src/modules/memberships/services/payments/getPaymentDisplayReference.ts',
    );
    expect(src).toMatch(/internalFallbackUnsafe/);
    expect(src.toLowerCase()).toMatch(/unsafe|admin\/debug|never use/);
  });
});

describe('D. Compatibility helpers prefer new ref_id', () => {
  it('business display reference prefers ENT ref_id over legacy BIZ', async () => {
    const { getBusinessDisplayReference } = await import(
      '@/modules/businesses/services/getBusinessDisplayReference'
    );
    const out = getBusinessDisplayReference({
      ref_id: 'ENT-1000001',
      legacy_ref_id: 'BIZ-555',
    });
    expect(out.primary).toBe('ENT-1000001');
    expect(out.secondary).toBe('BIZ-555');
  });

  it('business display reference hides secondary when equal or absent', async () => {
    const { getBusinessDisplayReference } = await import(
      '@/modules/businesses/services/getBusinessDisplayReference'
    );
    expect(
      getBusinessDisplayReference({ ref_id: 'ENT-1', legacy_ref_id: 'ENT-1' })
        .secondary,
    ).toBeNull();
    expect(getBusinessDisplayReference({ ref_id: 'ENT-1' }).secondary).toBeNull();
    expect(getBusinessDisplayReference(null).primary).toBeNull();
  });

  it('payment display reference prefers PAY ref_id', async () => {
    const { getPaymentDisplayReference } = await import(
      '@/modules/memberships/services/payments/getPaymentDisplayReference'
    );
    const out = getPaymentDisplayReference({
      ref_id: 'PAY-1000001',
      provider_intent_id: 'pi_x',
    });
    expect(out.primary).toBe('PAY-1000001');
    expect(out.internalFallback).toBe('pi_x');
    expect(out.internalFallbackUnsafe).toBe(true);
  });

  it('getBusinessByAnyReference delegates to lookup_by_reference and filters to businesses', async () => {
    rpcMock.mockResolvedValueOnce({
      data: [
        { entity_type: 'contract', table_name: 'contracts', id: 'c1', ref_id: 'CTR-1', legacy_ref_id: null, canonical_route: null },
        { entity_type: 'business', table_name: 'businesses', id: 'b1', ref_id: 'ENT-1', legacy_ref_id: 'BIZ-1', canonical_route: '/x' },
      ],
      error: null,
    });
    const { getBusinessByAnyReference } = await import(
      '@/modules/businesses/services/getBusinessByAnyReference'
    );
    const res = await getBusinessByAnyReference({ reference: 'BIZ-1' });
    expect(rpcMock).toHaveBeenCalledWith('lookup_by_reference', { _ref: 'BIZ-1' });
    expect(fromMock).not.toHaveBeenCalled();
    expect(res.data?.id).toBe('b1');
    expect(res.data?.ref_id).toBe('ENT-1');
  });
});

describe('E. Launch safety — Step C is service-only', () => {
  it('did not introduce a new edge function directory for Step C', () => {
    // Reference module must not ship its own edge function.
    expect(existsSync(resolve(process.cwd(), 'supabase/functions/lookup-by-reference'))).toBe(false);
  });

  it('Step C source files are confined to service modules and tests', () => {
    const stepCPaths = [
      'src/modules/reference/index.ts',
      'src/modules/reference/services/types.ts',
      'src/modules/reference/services/lookupByReference.ts',
      'src/modules/entities/services/access/index.ts',
      'src/modules/entities/services/access/hasEntityMembership.ts',
      'src/modules/entities/services/access/hasLocationAccess.ts',
      'src/modules/entities/services/access/getUserEntityContexts.ts',
      'src/modules/businesses/services/getBusinessByAnyReference.ts',
      'src/modules/businesses/services/getBusinessDisplayReference.ts',
      'src/modules/memberships/services/payments/getPaymentDisplayReference.ts',
    ];
    for (const p of stepCPaths) {
      expect(existsSync(resolve(process.cwd(), p))).toBe(true);
      // None of these may be pages, components, layouts, or routes.
      expect(p.includes('/pages/')).toBe(false);
      expect(p.includes('/components/')).toBe(false);
      expect(p.includes('/layouts/')).toBe(false);
      expect(p.includes('/routes/')).toBe(false);
    }
  });
});