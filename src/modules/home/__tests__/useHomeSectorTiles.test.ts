import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { Square, Layers } from 'lucide-react';
import { useHomeSectorTiles, type DefaultTile } from '../hooks/useHomeSectorTiles';
import * as svc from '../services/homeSectors';
import { resolveSectorIcon, SECTOR_ICONS } from '../data/sectorIconRegistry';

const DEFAULTS: DefaultTile[] = [
  { slug: 'aluminum-works', Icon: Square, iconName: 'Square', titleAr: 'الألمنيوم', titleEn: 'Aluminum', bodyAr: 'ب', bodyEn: 'b' },
  { slug: 'glass-securit-works', Icon: Layers, iconName: 'Layers', titleAr: 'الزجاج', titleEn: 'Glass', bodyAr: 'ب', bodyEn: 'b' },
];

function wrap() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useHomeSectorTiles', () => {
  it('falls back to defaults when DB has no overrides', async () => {
    vi.spyOn(svc, 'fetchPrimaryActivities').mockResolvedValue([]);
    const { result } = renderHook(() => useHomeSectorTiles(DEFAULTS), { wrapper: wrap() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.tiles.map((t) => t.slug)).toEqual(['aluminum-works', 'glass-securit-works']);
    expect(result.current.usingDefaults).toBe(true);
  });

  it('applies override title/icon when admin took over', async () => {
    vi.spyOn(svc, 'fetchPrimaryActivities').mockResolvedValue([
      { id: '1', slug: 'aluminum-works', name_ar: 'x', name_en: 'x', short_description_ar: null, short_description_en: null, sort_order: 0, icon: null, is_active: true,
        override: { show: true, position: 1, icon: 'Hammer', title_ar: 'بديل', title_en: 'Override' } },
      { id: '2', slug: 'glass-securit-works', name_ar: 'y', name_en: 'y', short_description_ar: null, short_description_en: null, sort_order: 1, icon: null, is_active: true,
        override: { show: true, position: 2 } },
    ]);
    const { result } = renderHook(() => useHomeSectorTiles(DEFAULTS), { wrapper: wrap() });
    await waitFor(() => expect(result.current.usingDefaults).toBe(false));
    expect(result.current.tiles[0].titleAr).toBe('بديل');
    expect(result.current.tiles[0].Icon).toBe(SECTOR_ICONS.Hammer);
  });

  it('hides tiles where show=false', async () => {
    vi.spyOn(svc, 'fetchPrimaryActivities').mockResolvedValue([
      { id: '1', slug: 'aluminum-works', name_ar: 'x', name_en: 'x', short_description_ar: null, short_description_en: null, sort_order: 0, icon: null, is_active: true,
        override: { show: false } },
      { id: '2', slug: 'glass-securit-works', name_ar: 'y', name_en: 'y', short_description_ar: null, short_description_en: null, sort_order: 1, icon: null, is_active: true,
        override: { show: true, position: 1 } },
    ]);
    const { result } = renderHook(() => useHomeSectorTiles(DEFAULTS), { wrapper: wrap() });
    await waitFor(() => expect(result.current.usingDefaults).toBe(false));
    expect(result.current.tiles.map((t) => t.slug)).toEqual(['glass-securit-works']);
  });

  it('icon whitelist falls back to default when unknown', () => {
    expect(resolveSectorIcon('NotAnIcon', Square)).toBe(Square);
    expect(resolveSectorIcon('Hammer', Square)).toBe(SECTOR_ICONS.Hammer);
  });
});