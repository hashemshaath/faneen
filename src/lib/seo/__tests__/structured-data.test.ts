import { describe, it, expect } from 'vitest';
import { buildBreadcrumbList } from '../structured-data';

describe('buildBreadcrumbList', () => {
  it('emits a valid BreadcrumbList with sequential positions starting at 1', () => {
    const bc = buildBreadcrumbList([
      { name: 'العلامات التجارية', url: '/brands' },
      { name: 'Acme', url: '/brands/acme' },
    ]) as Record<string, unknown>;
    expect(bc).toBeTruthy();
    expect(bc['@context']).toBe('https://schema.org');
    expect(bc['@type']).toBe('BreadcrumbList');
    const items = bc.itemListElement as Array<Record<string, unknown>>;
    // home + 2 = 3 items by default
    expect(items).toHaveLength(3);
    items.forEach((it, i) => {
      expect(it['@type']).toBe('ListItem');
      expect(it.position).toBe(i + 1);
      expect(typeof it.name).toBe('string');
      expect((it.name as string).length).toBeGreaterThan(0);
    });
    // canonical absolute URLs
    expect(items[1].item).toBe('https://qitaat.com/brands');
    expect(items[2].item).toBe('https://qitaat.com/brands/acme');
  });

  it('supports a stable @id for de-duplication', () => {
    const bc = buildBreadcrumbList(
      [{ name: 'Brands', url: '/brands' }],
      { id: 'https://qitaat.com/brands#breadcrumb' },
    ) as Record<string, unknown>;
    expect(bc['@id']).toBe('https://qitaat.com/brands#breadcrumb');
  });

  it('omits @id when not provided', () => {
    const bc = buildBreadcrumbList([{ name: 'Foo', url: '/foo' }]) as Record<string, unknown>;
    expect('@id' in bc).toBe(false);
  });

  it('drops empty-name crumbs but keeps positions sequential', () => {
    const bc = buildBreadcrumbList([
      { name: '', url: '/x' },
      { name: 'Real', url: '/real' },
    ]) as Record<string, unknown>;
    const items = bc.itemListElement as Array<Record<string, unknown>>;
    // home + 1 real = 2
    expect(items).toHaveLength(2);
    expect(items[0].position).toBe(1);
    expect(items[1].position).toBe(2);
    expect(items[1].name).toBe('Real');
  });

  it('honours includeHome=false', () => {
    const bc = buildBreadcrumbList(
      [{ name: 'Only', url: '/only' }],
      { includeHome: false },
    ) as Record<string, unknown>;
    const items = bc.itemListElement as Array<Record<string, unknown>>;
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('Only');
  });

  it('returns null when there are no items at all', () => {
    expect(buildBreadcrumbList([], { includeHome: false })).toBeNull();
  });
});
