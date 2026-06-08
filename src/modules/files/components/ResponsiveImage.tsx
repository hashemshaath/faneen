/**
 * Central responsive image component used across all public surfaces
 * (Showcase, Projects, Businesses, Products, Brands, Sectors, Services).
 *
 * - Builds `srcset`/`sizes` from a `variants` map ({thumbnail, card,
 *   medium, hero}). Falls back to a single `src` URL when no variants
 *   are available (legacy rows).
 * - Lazy by default; pass `priority` for an LCP hero image.
 * - Never overrides `alt` — caller MUST pass meaningful text.
 * - When not `priority`, sets `fetchpriority="low"` so below-the-fold
 *   logos/thumbnails don't compete with the LCP image for bandwidth.
 */
import type { ImgHTMLAttributes } from 'react';
import {
  type VariantUrls,
  isVariantUrls,
} from '@/modules/files/services/image-pipeline';

export interface ResponsiveImageProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet' | 'loading'> {
  /** Legacy/original public URL. Used as `src` fallback. */
  originalUrl?: string | null;
  /** Variant URL map. If absent or invalid, falls back to `originalUrl`. */
  variants?: VariantUrls | unknown;
  /** Optional parallel AVIF variant map. Wired into <picture> when present. */
  avifVariants?: VariantUrls | unknown;
  /** Required for a11y. */
  alt: string;
  /** `sizes` attribute; defaults to a sensible card width. */
  sizes?: string;
  /** Set true ONLY for an above-the-fold LCP image. Enables eager + high fetch priority. */
  priority?: boolean;
}

// Approximate widths matching the pipeline variant target dimensions.
// Used to build the `srcset` `w` descriptors.
const VARIANT_WIDTHS = {
  thumbnail: 256,
  card: 640,
  medium: 1024,
  hero: 1920,
} as const;

function buildSrcSet(v: VariantUrls): string {
  const parts: string[] = [];
  (Object.keys(VARIANT_WIDTHS) as Array<keyof typeof VARIANT_WIDTHS>).forEach(
    (k) => {
      const url = v[k];
      if (typeof url === 'string' && url.length > 0) {
        parts.push(`${url} ${VARIANT_WIDTHS[k]}w`);
      }
    },
  );
  return parts.join(', ');
}

function pickFallbackSrc(v: VariantUrls): string | undefined {
  return v.hero ?? v.medium ?? v.card ?? v.thumbnail;
}

export function ResponsiveImage({
  originalUrl,
  variants,
  avifVariants,
  alt,
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  priority = false,
  className,
  ...rest
}: ResponsiveImageProps) {
  const validVariants = isVariantUrls(variants) ? variants : undefined;
  const srcSet = validVariants ? buildSrcSet(validVariants) : undefined;
  const fallbackFromVariants = validVariants ? pickFallbackSrc(validVariants) : undefined;
  const src = fallbackFromVariants ?? originalUrl ?? '';

  if (!src) return null;

  const validAvif = isVariantUrls(avifVariants) ? avifVariants : undefined;
  const avifSrcSet = validAvif ? buildSrcSet(validAvif) : undefined;

  const img = (
    <img
      {...rest}
      src={src}
      srcSet={!avifSrcSet ? srcSet : undefined}
      sizes={srcSet || avifSrcSet ? sizes : undefined}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      // fetchpriority is camelCase in React 18+ types but lowercase in HTML;
      // cast keeps the prop available without enabling unknown DOM attribute warnings.
      {...({ fetchpriority: priority ? 'high' : 'low' } as unknown as Record<string, string>)}
      className={className}
    />
  );

  if (!avifSrcSet && !srcSet) return img;

  return (
    <picture>
      {avifSrcSet && (
        <source type="image/avif" srcSet={avifSrcSet} sizes={sizes} />
      )}
      {srcSet && (
        <source type="image/webp" srcSet={srcSet} sizes={sizes} />
      )}
      {img}
    </picture>
  );
}

export default ResponsiveImage;