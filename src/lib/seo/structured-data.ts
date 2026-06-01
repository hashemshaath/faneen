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

/** Type tag used by the dynamic OG renderer to pick a label chip. */
export type OgImageType = 'business' | 'blog' | 'project' | 'category' | 'sector' | 'page';

export interface OgImageParams {
  type?: OgImageType;
  title?: string | null;
  subtitle?: string | null;
  /** Absolute https URL of an inline cover image (jpg/png/webp). Optional. */
  image?: string | null;
}

/**
 * Resolve the Supabase Edge Function base URL at build time. Falls back to a
 * sensible default so the helper still returns the global static image when
 * the env var is missing (e.g. during pure unit tests).
 */
function edgeBaseUrl(): string | null {
  // Vite injects VITE_SUPABASE_URL at build time.
  const fromEnv =
    typeof import.meta !== 'undefined' && (import.meta as ImportMeta & { env?: Record<string, string> }).env
      ? (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_SUPABASE_URL
      : undefined;
  return fromEnv ? fromEnv.replace(/\/+$/, '') : null;
}

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
  options: { includeHome?: boolean; homeName?: string; id?: string } = {},
): Record<string, unknown> | null {
  const { includeHome = true, homeName = SITE_NAME_AR, id } = options;
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
    ...(id ? { '@id': id } : {}),
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
 * Returns a 1200x630 OG image URL for a given page.
 *
 * - When called with just a `slug` (back-compat), returns the global static
 *   `og-image.jpg` so existing callers are unaffected.
 * - When called with structured `params` ({ type, title, subtitle, image }),
 *   returns a URL pointing at the `og-image` Edge Function which renders a
 *   per-page 1200x630 SVG with Qitaat branding and Arabic-friendly typography.
 *
 * The Edge Function falls back to a generic Qitaat card if any param is
 * missing or malformed, and the page-level meta still lists the static
 * `og-image.jpg` as the ultimate fallback.
 */
export function ogImageFor(slug?: string | null, params?: OgImageParams): string {
  // Back-compat: single string arg → static image.
  if (!params) return DEFAULT_OG_IMAGE;

  const base = edgeBaseUrl();
  if (!base) return DEFAULT_OG_IMAGE;

  const qs = new URLSearchParams();
  qs.set('type', params.type || 'page');
  if (params.title) qs.set('title', String(params.title).slice(0, 120));
  if (params.subtitle) qs.set('subtitle', String(params.subtitle).slice(0, 200));
  if (params.image && /^https:\/\//i.test(params.image)) qs.set('image', params.image);
  // Cache-bust marker tied to the slug so updates propagate without changing key params.
  if (slug) qs.set('v', encodeURIComponent(slug).slice(0, 60));

  return `${base}/functions/v1/og-image?${qs.toString()}`;
}

function absoluteUrl(input: string): string {
  if (!input) return SITE_URL;
  if (/^https?:\/\//i.test(input)) return input;
  return `${SITE_URL}${input.startsWith('/') ? input : `/${input}`}`;
}
