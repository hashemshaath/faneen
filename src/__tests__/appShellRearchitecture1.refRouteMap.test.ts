import { describe, it, expect } from 'vitest';
import { parseRef, resolveRefRoute, listRefPrefixes, REF_PREFIXES } from '@/modules/workspace/shell/refRouteMap';

describe('APP-SHELL-1 — refRouteMap', () => {
  it('parses known prefixes', () => {
    for (const p of REF_PREFIXES) {
      const ref = `${p}-1000001`;
      expect(parseRef(ref)?.prefix).toBe(p);
      expect(parseRef(ref)?.normalized).toBe(ref);
    }
  });

  it('is case-insensitive and trims', () => {
    expect(parseRef('  wo-9999999  ')?.normalized).toBe('WO-9999999');
  });

  it('rejects unknown prefixes', () => {
    expect(parseRef('XYZ-1234567')).toBeNull();
    expect(parseRef('not-a-ref')).toBeNull();
    expect(parseRef('')).toBeNull();
  });

  it('resolves each prefix to a route under /dashboard or /admin', () => {
    for (const p of REF_PREFIXES) {
      const dest = resolveRefRoute(`${p}-1000001`);
      expect(dest, p).toBeTruthy();
      expect(dest!.startsWith('/dashboard') || dest!.startsWith('/admin')).toBe(true);
      expect(dest).toMatch(/ref=/);
    }
  });

  it('listRefPrefixes contains exactly the documented prefixes', () => {
    expect([...listRefPrefixes()].sort()).toEqual(
      ['BKG', 'BOQ', 'CNT', 'CONTRACT', 'LED', 'NOTE', 'PO', 'QTE', 'QUOTE', 'RFQ', 'STF', 'TASK', 'TEAM', 'WO', 'WOQ'].sort(),
    );
  });
});