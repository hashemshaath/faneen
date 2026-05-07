/**
 * Shared structured-data (schema.org JSON-LD) builders for Qitaat.
 *
 * All builders return plain objects suitable for `useJsonLd` /
 * `useMultiJsonLd`. They are pure (no React, no DOM) so they can be
 * unit-tested and reused across pages and edge functions.
 *
 * Conventions:
 * - Always set `@context: 'https://schema.org'`.
 * - URLs are absolute under https://qitaat.com.
 * - Returns `null` when required inputs are missing — callers can pass
 *   the result straight into `useMultiJsonLd` arrays after filtering.
 */

export const SITE_URL = 'https://qitaat.com';
export const SITE_NAME_AR = 'قِطاعات';
export const SITE_NAME = 'قِطاعات Qitaat';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.jpg`;

export interface BreadcrumbCrumb {
  /** Display name shown in the breadcrumb trail. */
  name: string;
  /** Absolute URL or root-relative path. The current/last item's URL is optional. */
  url?: string;
}

/**
 * Build a BreadcrumbList JSON-LD block.
 * The first crumb is automatically prefixed with the site root unless the
 * caller already starts at "/". Pass localized names directly.
 */
export function buildBreadcrumbList(
  crumbs: BreadcrumbCrumb[],
  options: { includeHome?: boolean; homeName?: string } = {},
): Record<string, unknown> | null {
  const { includeHome = true, homeName = SITE_NAME_AR } = options;
  const list: BreadcrumbCrumb[] = [];
  if (includeHome) list.push({ name: homeName, url: SITE_URL });
  for (const c of crumbs) {
    if (!c?.name) continue;
    list.push(c);
  }
  if (list.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: list.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      ...(c.url ? { item: absoluteUrl(c.url) } : {}),
    })),
  };
}

/** Build a FAQPage JSON-LD block. */
export function buildFaqPage(
  qa: Array<{ q: string; a: string }>,
): Record<string, unknown> | null {
  const items = (qa || []).filter((x) => x?.q && x?.a);
  if (items.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((x) => ({
      '@type': 'Question',
      name: x.q,
      acceptedAnswer: { '@type': 'Answer', text: x.a },
    })),
  };
}

/**
 * Build a generic Service schema for a single service offered by a provider.
 * Use for category landing pages, business sub-services, and offer pages.
 */
export function buildService(input: {
  name: string;
  description?: string;
  providerName?: string;
  providerUrl?: string;
  areaServed?: string;
  serviceType?: string;
  image?: string;
  url?: string;
}): Record<string, unknown> | null {
  if (!input?.name) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: input.name,
    ...(input.description ? { description: input.description } : {}),
    ...(input.serviceType ? { serviceType: input.serviceType } : {}),
    ...(input.image ? { image: input.image } : {}),
    ...(input.url ? { url: absoluteUrl(input.url) } : {}),
    ...(input.areaServed
      ? { areaServed: { '@type': 'Place', name: input.areaServed } }
      : {}),
    ...(input.providerName
      ? {
          provider: {
            '@type': 'Organization',
            name: input.providerName,
            ...(input.providerUrl ? { url: absoluteUrl(input.providerUrl) } : {}),
          },
        }
      : {}),
  };
}

/**
 * Returns a 1200x630 OG image URL for a given page slug. For now this falls
 * back to the global default; once per-page OG renderer is wired up, it will
 * resolve to `${SITE_URL}/og/${slug}.jpg`.
 */
export function ogImageFor(slug?: string | null): string {
  if (!slug) return DEFAULT_OG_IMAGE;
  // Future: return `${SITE_URL}/og/${slug}.jpg` once the renderer exists.
  return DEFAULT_OG_IMAGE;
}

function absoluteUrl(input: string): string {
  if (!input) return SITE_URL;
  if (/^https?:\/\//i.test(input)) return input;
  return `${SITE_URL}${input.startsWith('/') ? input : `/${input}`}`;
}
