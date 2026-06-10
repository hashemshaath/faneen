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

interface CertificationLite {
  id?: string;
  name_ar?: string | null;
  name_en?: string | null;
  issuer_ar?: string | null;
  issuer_en?: string | null;
  credential_number?: string | null;
  credential_url?: string | null;
  issued_at?: string | null;
  expires_at?: string | null;
}

interface AwardLite {
  id?: string;
  title_ar?: string | null;
  title_en?: string | null;
  issuer_ar?: string | null;
  issuer_en?: string | null;
  awarded_year?: number | null;
}

interface Args {
  business: BusinessWithJoins | null | undefined;
  services: ServiceLite[];
  reviews: ReviewLite[];
  certifications?: CertificationLite[];
  awards?: AwardLite[];
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
  certifications = [],
  awards = [],
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
      address: (() => {
        const b = business as typeof business & {
          street_name?: string | null;
          district?: string | null;
          postal_code?: string | null;
        };
        const streetAddress =
          [b.street_name, b.district].filter(Boolean).join("، ") ||
          b.address ||
          undefined;
        const postalCode =
          typeof b.postal_code === "string" && /^\d{4,10}$/.test(b.postal_code.trim())
            ? b.postal_code.trim()
            : undefined;
        return {
          "@type": "PostalAddress",
          streetAddress,
          addressLocality: cityName || undefined,
          addressRegion: b.region || undefined,
          ...(postalCode ? { postalCode } : {}),
          addressCountry: business.countries?.code || "SA",
        };
      })(),
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

    // schema.org `hasCredential` — EducationalOccupationalCredential[]
    if (certifications.length > 0) {
      localBusiness.hasCredential = certifications.slice(0, 10).map((c) => {
        const name =
          (language === "ar" ? c.name_ar : c.name_en || c.name_ar) || c.name_ar || "";
        const issuerName =
          (language === "ar" ? c.issuer_ar : c.issuer_en || c.issuer_ar) || c.issuer_ar || "";
        const entry: Record<string, unknown> = {
          "@type": "EducationalOccupationalCredential",
          name,
          credentialCategory: "certification",
          ...(issuerName
            ? { recognizedBy: { "@type": "Organization", name: issuerName } }
            : {}),
        };
        const url = sanitizeUrl(c.credential_url, false);
        if (url) entry.url = url;
        if (c.credential_number) entry.identifier = c.credential_number;
        if (c.issued_at) entry.dateCreated = c.issued_at;
        if (c.expires_at) entry.expires = c.expires_at;
        return entry;
      });
    }

    // schema.org `award` — string[] (concise, year-tagged)
    if (awards.length > 0) {
      localBusiness.award = awards
        .slice(0, 10)
        .map((a) => {
          const title =
            (language === "ar" ? a.title_ar : a.title_en || a.title_ar) || a.title_ar || "";
          const issuer =
            (language === "ar" ? a.issuer_ar : a.issuer_en || a.issuer_ar) || a.issuer_ar || "";
          const parts = [a.awarded_year, title, issuer ? `— ${issuer}` : ""].filter(Boolean);
          return parts.join(" ").trim();
        })
        .filter(Boolean);
    }

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
  }, [business, services, reviews, certifications, awards, categoryName, cityName, language, businessName]);
};