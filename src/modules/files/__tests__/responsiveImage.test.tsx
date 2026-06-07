/**
 * ResponsiveImage — fallback + variant behavior.
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ResponsiveImage } from '@/modules/files/components/ResponsiveImage';

describe('ResponsiveImage', () => {
  it('falls back to originalUrl when no variants are present', () => {
    const { getByAltText } = render(
      <ResponsiveImage originalUrl="https://cdn/legacy.jpg" alt="legacy" />,
    );
    const img = getByAltText('legacy') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('https://cdn/legacy.jpg');
    expect(img.getAttribute('srcset')).toBeNull();
    expect(img.getAttribute('loading')).toBe('lazy');
  });

  it('builds srcset from variants and prefers hero as src', () => {
    const { getByAltText } = render(
      <ResponsiveImage
        alt="optimized"
        originalUrl="https://cdn/legacy.jpg"
        variants={{
          thumbnail: 'https://cdn/t.webp',
          card: 'https://cdn/c.webp',
          medium: 'https://cdn/m.webp',
          hero: 'https://cdn/h.webp',
        }}
      />,
    );
    const img = getByAltText('optimized') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('https://cdn/h.webp');
    const srcset = img.getAttribute('srcset') || '';
    expect(srcset).toContain('https://cdn/t.webp 256w');
    expect(srcset).toContain('https://cdn/c.webp 640w');
    expect(srcset).toContain('https://cdn/m.webp 1024w');
    expect(srcset).toContain('https://cdn/h.webp 1920w');
  });

  it('enables eager loading + sync decoding when priority=true', () => {
    const { getByAltText } = render(
      <ResponsiveImage originalUrl="https://cdn/lcp.jpg" alt="lcp" priority />,
    );
    const img = getByAltText('lcp') as HTMLImageElement;
    expect(img.getAttribute('loading')).toBe('eager');
    expect(img.getAttribute('decoding')).toBe('sync');
  });

  it('ignores malformed variants payloads', () => {
    const { getByAltText } = render(
      <ResponsiveImage
        originalUrl="https://cdn/legacy.jpg"
        // intentionally invalid shape (string)
        variants={'not-an-object' as unknown}
        alt="bad"
      />,
    );
    const img = getByAltText('bad') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('https://cdn/legacy.jpg');
    expect(img.getAttribute('srcset')).toBeNull();
  });
});