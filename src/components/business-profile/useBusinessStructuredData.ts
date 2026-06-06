import { useMemo } from "react";
import { buildBreadcrumbList, buildService } from "@/lib/seo/structured-data";
import type { BusinessWithJoins } from "./business-profile.data";

// Whitelisted public social platforms used to validate the optional
// `social_links` array. Anything else is dropped.
const SOCIAL_HOSTS = [
  "linkedin.com",
  "x.com",
  "twitter.com",
  "instagram.com",
  "facebook.com",
  "fb.com",
  "youtube.com",
  "youtu.be",
];

const isPublicSocial = (host: string): boolean =>
  SOCIAL_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));

/**
 * Validate + canonicalise a candidate URL for sameAs enrichment.
 * Rules: https only, no userinfo, no localhost/IPs, optional social-host gate,
 * fragments stripped. Returns null when the URL is unsafe or malformed.
 */
const sanitizeUrl = (raw: unknown, requireSocial: boolean): string | null => {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 300) return null;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;
  if (parsed.username || parsed.password) return null;
  const host = parsed.hostname.toLowerCase();
  if (!host || host === "localhost") return null;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return null; // IPv4
  if (host.includes(":")) return null; // IPv6
  if (requireSocial && !isPublicSocial(host)) return null;
  parsed.hash = "";
  return parsed.toString();
};

interface ServiceLite {
  id?: string;
  name_ar?: string | null;
  name_en?: string | null;
  description_ar?: string | null;
  description_en?: string | null;
}

interface ReviewLite {
  id?: string;
  rating?: number | null;
  comment?: string | null;
  created_at?: string | null;
  profiles?: { full_name?: string | null } | null;
}

interface Args {
  business: BusinessWithJoins | null | undefined;
  services: ServiceLite[];
  reviews: ReviewLite[];
  categoryName: string;
  cityName: string;
  language: string;
  businessName: string;
}

/**
 * Builds the multi-JSON-LD payload for a business profile page:
 *   - LocalBusiness (with PostalAddress, GeoCoordinates, AggregateRating, sameAs)
 *   - BreadcrumbList (category → business)
 *   - Up to 5 Service entities
 *   - Up to 5 Review entities
 *
 * Returns null when there is no business loaded yet so callers can pass the
 * result directly to `useMultiJsonLd`.
 */
export const useBusinessStructuredData = ({
  business,
  services,
  reviews,
  categoryName,
  cityName,
  language,
  businessName,
}: Args): Record<string, unknown>[] | null => {
  return useMemo(() => {
    if (!business) return null;

    const candidates: Array<{ raw: unknown; requireSocial: boolean }> = [
      { raw: (business as { website?: unknown }).website, requireSocial: false },
    ];
    const extraSocials = (business as { social_links?: unknown }).social_links;
    if (Array.isArray(extraSocials)) {
      for (const link of extraSocials) candidates.push({ raw: link, requireSocial: true });
    }
    const sameAs = Array.from(
      new Set(
        candidates
          .map((c) => sanitizeUrl(c.raw, c.requireSocial))
          .filter((u): u is string => !!u),
      ),
    ).slice(0, 8);

    const localBusiness: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      "@id": `https://qitaat.com/${business.username}`,
      name: businessName || business.name_ar,
      alternateName: language === "ar" ? business.name_en : business.name_ar,
      description:
        (language === "ar" ? business.description_ar : business.description_en) ||
        business.description_ar,
      url: `https://qitaat.com/${business.username}`,
      image: business.logo_url || business.cover_url,
      logo: business.logo_url,
      // Phone/email intentionally omitted from JSON-LD to prevent scraper harvesting.
      telephone: undefined,
      email: undefined,
      ...(sameAs.length > 0 ? { sameAs } : {}),
      address: {
        "@type": "PostalAddress",
        streetAddress: business.address || undefined,
        addressRegion: business.region || undefined,
        addressLocality: cityName || undefined,
        addressCountry: business.countries?.code || "SA",
      },
      geo:
        business.latitude && business.longitude
          ? {
              "@type": "GeoCoordinates",
              latitude: business.latitude,
              longitude: business.longitude,
            }
          : undefined,
      aggregateRating:
        Number(business.rating_count) > 0
          ? {
              "@type": "AggregateRating",
              ratingValue: Number(business.rating_avg).toFixed(1),
              reviewCount: business.rating_count,
              bestRating: "5",
              worstRating: "1",
            }
          : undefined,
      priceRange: business.membership_tier === "free" ? "$$" : "$$$",
      areaServed: cityName ? { "@type": "City", name: cityName } : undefined,
      serviceType:
        services.length > 0
          ? services.map((s) => (language === "ar" ? s.name_ar : s.name_en || s.name_ar))
          : undefined,
    };

    const breadcrumb = buildBreadcrumbList([
      ...(categoryName
        ? [
            {
              name: categoryName,
              url: `/categories/${business.categories?.slug || ""}`,
            },
          ]
        : []),
      { name: businessName || business.name_ar, url: `/${business.username}` },
    ]);

    const serviceEntities = services
      .slice(0, 5)
      .map((s) =>
        buildService({
          name: (language === "ar" ? s.name_ar : s.name_en || s.name_ar) || "",
          description:
            language === "ar"
              ? s.description_ar || undefined
              : s.description_en || s.description_ar || undefined,
          providerName: businessName || business.name_ar,
          providerUrl: `/${business.username}`,
          areaServed: cityName || undefined,
          serviceType: categoryName || undefined,
        }),
      )
      .filter(Boolean) as Record<string, unknown>[];

    const reviewEntities = reviews.slice(0, 5).map((review) => ({
      "@context": "https://schema.org",
      "@type": "Review",
      itemReviewed: {
        "@type": "LocalBusiness",
        name: businessName || business.name_ar,
        "@id": `https://qitaat.com/${business.username}`,
      },
      author: {
        "@type": "Person",
        name: review.profiles?.full_name || (language === "ar" ? "عميل" : "Customer"),
      },
      reviewRating: {
        "@type": "Rating",
        ratingValue: String(review.rating ?? 0),
        bestRating: "5",
        worstRating: "1",
      },
      ...(review.comment ? { reviewBody: review.comment } : {}),
      datePublished: review.created_at
        ? new Date(review.created_at).toISOString().split("T")[0]
        : undefined,
    }));

    return [
      localBusiness,
      ...(breadcrumb ? [breadcrumb] : []),
      ...serviceEntities,
      ...reviewEntities,
    ];
  }, [business, services, reviews, categoryName, cityName, language, businessName]);
};