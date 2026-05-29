import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { usePageMeta, useMultiJsonLd } from "@/hooks/usePageMeta";
import {
  CalendarClock,
  FolderOpen,
  GitBranch,
  Image as ImageIcon,
  Phone,
  Shield,
  Star,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useBadgeClickTracking } from "@/hooks/useBadgeClickTracking";
import { recordBadgeConversion } from "@/lib/badge-attribution";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { getLocalizedValue, useDirection } from "@/lib/direction";
import {
  findConversationBetweenUsers,
  createConversation,
  insertMessage,
} from "@/modules/messaging";
import {
  BusinessProfileHeader,
  BusinessProfileTopBar,
} from "@/components/business-profile/BusinessProfileHeader";
import {
  BranchesTab,
  ContactTab,
  PortfolioTab,
  ProjectsTab,
  ReviewsTab,
  ServicesTab,
} from "@/components/business-profile/BusinessProfileTabs";
import {
  useBranches,
  useBusinessByUsername,
  useProjects,
  useServices,
  useActivePromotionsCount,
} from "@/components/business-profile/business-profile.data";
import { useReviews } from "@/components/business-profile/business-profile.data";
import { BnplBadges } from "@/components/bnpl/BnplBadges";
import { BusinessBarcodeCard } from "@/components/business-profile/BusinessBarcodeCard";
import { BookingWidget } from "@/components/booking/BookingWidget";
import { ContactSupplierSheet } from "@/components/business-profile/ContactSupplierSheet";
import { buildBreadcrumbList, buildService, ogImageFor } from "@/lib/seo/structured-data";
import { track } from "@/lib/analytics-events";
// JSON-LD types emitted via helpers below: '@type': 'BreadcrumbList', itemListElement:

const BusinessProfile = () => {
  const { username } = useParams<{ username: string }>();
  const { t, language, isRTL } = useLanguage();
  const { BackIcon } = useDirection();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookingOpen, setBookingOpen] = useState(false);
  const [contactSheetOpen, setContactSheetOpen] = useState(false);
  const { data: business, isLoading, error } = useBusinessByUsername(username || "");
  const { data: projects = [] } = useProjects(business?.id);
  const { data: services = [] } = useServices(business?.id);
  const { data: branches = [] } = useBranches(business?.id);
  const { data: reviews = [] } = useReviews(business?.id);
  const { data: activeOffersCount = 0 } = useActivePromotionsCount(business?.id);

  // Record a click event when this page was opened from an embedded
  // "Verified on Qitaat" badge (?ref=badge) — visible in DashboardBadge.
  useBadgeClickTracking(business?.id, business?.username);

  const businessName = business ? getLocalizedValue(language, business.name_ar, business.name_en) : '';
  const businessDesc = business ? (getLocalizedValue(language, business.description_ar, business.description_en) || getLocalizedValue(language, business.short_description_ar, business.short_description_en) || '') : '';
  const categoryName = business?.categories ? getLocalizedValue(language, business.categories.name_ar, business.categories.name_en) : '';
  const cityName = business?.cities ? getLocalizedValue(language, business.cities.name_ar, business.cities.name_en) : '';

  // business_profile_view — fires once per profile load (slug-based).
  useEffect(() => {
    if (!business?.username) return;
    track.businessProfileView({
      business_slug: business.username,
      category_slug: business.categories ? (business.categories as { slug?: string }).slug : undefined,
      category_name: categoryName || undefined,
      city: cityName || undefined,
    });
  }, [business?.username, business?.categories, categoryName, cityName]);

  const seoTitle = business
    ? `${businessName}${categoryName ? ` — ${categoryName}` : ''}${cityName ? ` في ${cityName}` : ''} | قِطاعات`
    : (isRTL ? 'جاري التحميل... | قِطاعات' : 'Loading... | Qitaat');

  const seoDesc = business
    ? (businessDesc.substring(0, 140) || `${businessName}${categoryName ? ` - ${categoryName}` : ''}${cityName ? ` في ${cityName}` : ''} — مزود خدمات معتمد على منصة قِطاعات`)
    : undefined;

  usePageMeta({
    title: seoTitle,
    description: seoDesc,
    ogType: 'business.business',
    ogImage:
      business?.cover_url ||
      business?.logo_url ||
      ogImageFor(business?.username || 'business', {
        type: 'business',
        title: businessName,
        subtitle: [categoryName, cityName].filter(Boolean).join(' — ') || 'قِطاعات',
      }),
    canonical: business ? `https://qitaat.com/${business.username}` : undefined,
    keywords: business ? [businessName, categoryName, cityName, 'قِطاعات', 'دليل أعمال'].filter(Boolean).join(', ') : undefined,
  });

  const structuredDataArray = useMemo(() => {
    if (!business) return null;

    // ── sameAs enrichment ──
    // Only the `website` column exists in the public `businesses` schema today;
    // a future migration could add dedicated social_links. To stay forward-
    // compatible we accept an optional `business.social_links` array of strings
    // as well, but never read private contact fields (phone/email).
    //
    // Validation rules per URL candidate:
    //   1. Must parse as a valid URL via the WHATWG `URL` constructor.
    //   2. Protocol must be exactly `https:` (no http, javascript:, data:, etc.).
    //   3. Hostname must be either:
    //        - the official website (any host, but stripped of credentials), OR
    //        - on the whitelist of public social platforms below.
    //   4. No userinfo (user:pass@), no localhost / IP literals, no fragments
    //      that look like tracking junk longer than 200 chars.
    //   5. Trimmed, deduplicated, capped at 8 entries.
    const SOCIAL_HOSTS = [
      'linkedin.com', 'x.com', 'twitter.com', 'instagram.com',
      'facebook.com', 'fb.com', 'youtube.com', 'youtu.be',
    ];
    const isPublicSocial = (host: string) =>
      SOCIAL_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
    const sanitizeUrl = (raw: unknown, requireSocial: boolean): string | null => {
      if (typeof raw !== 'string') return null;
      const trimmed = raw.trim();
      if (!trimmed || trimmed.length > 300) return null;
      let parsed: URL;
      try { parsed = new URL(trimmed); } catch { return null; }
      if (parsed.protocol !== 'https:') return null;
      if (parsed.username || parsed.password) return null;
      const host = parsed.hostname.toLowerCase();
      if (!host || host === 'localhost') return null;
      if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return null; // IPv4
      if (host.includes(':')) return null; // IPv6
      if (requireSocial && !isPublicSocial(host)) return null;
      // Strip fragments to keep the canonical profile URL clean.
      parsed.hash = '';
      return parsed.toString();
    };

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

    const localBusiness: Record<string, any> = {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      '@id': `https://qitaat.com/${business.username}`,
      name: business.name_ar,
      alternateName: business.name_en,
      description: business.description_ar,
      url: `https://qitaat.com/${business.username}`,
      image: business.logo_url || business.cover_url,
      logo: business.logo_url,
      // Phone/email intentionally omitted from JSON-LD to prevent scraper harvesting.
      // Visitors see the contact details inside the page (rendered client-side).
      telephone: undefined,
      email: undefined,
      ...(sameAs.length > 0 ? { sameAs } : {}),
      address: {
        '@type': 'PostalAddress',
        streetAddress: business.address || undefined,
        addressRegion: business.region || undefined,
        addressLocality: cityName || undefined,
        addressCountry: business.countries?.code || 'SA',
      },
      geo: business.latitude && business.longitude ? {
        '@type': 'GeoCoordinates',
        latitude: business.latitude,
        longitude: business.longitude,
      } : undefined,
      aggregateRating: Number(business.rating_count) > 0 ? {
        '@type': 'AggregateRating',
        ratingValue: Number(business.rating_avg).toFixed(1),
        reviewCount: business.rating_count,
        bestRating: '5',
        worstRating: '1',
      } : undefined,
      priceRange: business.membership_tier === 'free' ? '$$' : '$$$',
      areaServed: cityName ? { '@type': 'City', name: cityName } : undefined,
      serviceType: services.length > 0 ? services.map(s => s.name_ar) : undefined,
    };

    const breadcrumb = buildBreadcrumbList([
      ...(categoryName ? [{ name: categoryName, url: `/categories/${business.categories?.slug || ''}` }] : []),
      { name: business.name_ar, url: `/${business.username}` },
    ]);

    // Up to 5 Service entries reflecting the provider's offered services so
    // search and AI engines can index them as discrete offerings.
    const serviceEntities = (services || []).slice(0, 5).map((s: any) =>
      buildService({
        name: language === 'ar' ? s.name_ar : (s.name_en || s.name_ar),
        description: language === 'ar'
          ? (s.description_ar || undefined)
          : (s.description_en || s.description_ar || undefined),
        providerName: business.name_ar,
        providerUrl: `/${business.username}`,
        areaServed: cityName || undefined,
        serviceType: categoryName || undefined,
      }),
    ).filter(Boolean) as Record<string, unknown>[];

    // Individual Review entities (up to 5 most recent)
    const reviewEntities = reviews.slice(0, 5).map((review: any) => ({
      '@context': 'https://schema.org',
      '@type': 'Review',
      itemReviewed: {
        '@type': 'LocalBusiness',
        name: business.name_ar,
        '@id': `https://qitaat.com/${business.username}`,
      },
      author: {
        '@type': 'Person',
        name: review.profiles?.full_name || (language === 'ar' ? 'عميل' : 'Customer'),
      },
      reviewRating: {
        '@type': 'Rating',
        ratingValue: String(review.rating),
        bestRating: '5',
        worstRating: '1',
      },
      ...(review.comment ? { reviewBody: review.comment } : {}),
      datePublished: review.created_at ? new Date(review.created_at).toISOString().split('T')[0] : undefined,
    }));

    return [localBusiness, ...(breadcrumb ? [breadcrumb] : []), ...serviceEntities, ...reviewEntities];
  }, [business, services, reviews, categoryName, cityName, language]);

  useMultiJsonLd(structuredDataArray);

  const contactMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        // Guests get the lead-capture sheet — never bounce them to /auth.
        throw new Error("not_authenticated");
      }

      if (!business) throw new Error("no_business");

      const providerId = business.user_id;
      if (providerId === user.id) throw new Error("self_contact");

      const { data: existing } = await findConversationBetweenUsers({
        userIdA: user.id,
        userIdB: providerId,
      });

      if (existing) return { id: existing.id, isNew: false };

      const { data: created, error: createError } = await createConversation({
        participant_1: user.id,
        participant_2: providerId,
      });

      if (createError) throw createError;

      const bName = getLocalizedValue(language, business.name_ar, business.name_en);
      const greeting =
        language === "ar"
          ? `مرحباً، أود الاستفسار عن خدماتكم في ${bName}`
          : `Hello, I'd like to inquire about your services at ${bName}`;

      await insertMessage({
        conversation_id: created.id,
        sender_id: user.id,
        content: greeting,
        message_type: "text",
      });

      return { id: created.id, isNew: true };
    },
    onSuccess: (result) => {
      if (result.isNew) toast.success(isRTL ? "تم بدء المحادثة" : "Conversation started");
      navigate("/dashboard/messages");
    },
    onError: (errorResult: Error) => {
      if (errorResult.message === "not_authenticated") return;
      if (errorResult.message === "self_contact") {
        toast.error(isRTL ? "لا يمكنك مراسلة نفسك" : "You can't message yourself");
        return;
      }
      toast.error(isRTL ? "فشل بدء المحادثة" : "Failed to start conversation");
    },
  });

  // Unified contact handler: guests open the lead-capture sheet, authenticated
  // non-owners go through the existing conversation flow. Always tracks the
  // click (PII-free).
  const handleContactClick = (sourcePage: string = "header") => {
    track.contactButtonClicked({
      business_slug: business?.username || undefined,
      source_page: sourcePage,
      is_authenticated: !!user,
    });
    void recordBadgeConversion(business?.id, 'contact', sourcePage);
    if (!user) {
      setContactSheetOpen(true);
      return;
    }
    contactMutation.mutate();
  };

  // Track tel:/mailto reveals for authenticated users (called from ContactTab).
  const handleContactReveal = (kind: "phone" | "email") => {
    if (kind === "phone") {
      track.supplierPhoneRevealed({
        business_slug: business?.username || undefined,
        is_authenticated: !!user,
      });
      void recordBadgeConversion(business?.id, 'phone_reveal');
    } else {
      track.supplierEmailRevealed({
        business_slug: business?.username || undefined,
        is_authenticated: !!user,
      });
      void recordBadgeConversion(business?.id, 'email_reveal');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="pt-14">
          <Skeleton className="h-44 w-full sm:h-60" />
          <div className="container-app mt-8 space-y-4">
            <Skeleton className="h-44 w-full rounded-3xl" />
            <Skeleton className="h-72 w-full rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!business || error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-accent/10 dark:bg-accent/20">
            <Shield className="h-10 w-10 text-accent" />
          </div>
          <h2 className="font-heading text-xl font-bold text-foreground sm:text-2xl">{t("profile.not_found")}</h2>
          <p className="text-sm text-muted-foreground">{t("profile.not_found_desc")}</p>
          <Link to="/">
            <Button variant="hero" className="gap-2">
              <BackIcon className="ic-sm" />
              {t("profile.back_home")}
            </Button>
          </Link>
        </div>
      </div>
    );
  }


  const tabs = [
    { value: "services", label: language === "ar" ? "الخدمات" : "Services", icon: Wrench },
    { value: "projects", label: language === "ar" ? "المشاريع" : "Projects", icon: FolderOpen, count: projects.length },
    { value: "portfolio", label: language === "ar" ? "الأعمال" : "Portfolio", icon: ImageIcon },
    { value: "branches", label: language === "ar" ? "الفروع" : "Branches", icon: GitBranch, count: branches.length },
    { value: "reviews", label: language === "ar" ? "التقييمات" : "Reviews", icon: Star, count: business.rating_count ?? 0 },
    { value: "contact", label: language === "ar" ? "التواصل" : "Contact", icon: Phone },
  ];

  return (
    <div className="min-h-screen bg-background">
      <BusinessProfileTopBar
        businessName={businessName}
        onContact={() => handleContactClick("topbar")}
        isContacting={contactMutation.isPending}
      />

      <div className="pt-12 sm:pt-14">
        {business.approval_status !== 'published' && (
          <div
            className="border-b border-warning/30 bg-warning/10 text-warning-foreground"
            role="status"
            aria-live="polite"
          >
            <div className="container-app flex flex-col gap-1 py-2.5 text-xs sm:flex-row sm:items-center sm:justify-between sm:text-sm">
              <p className="font-semibold text-warning">
                {isRTL
                  ? '⚠️ معاينة فقط — هذا الملف غير منشور بعد ولا يظهر للعملاء.'
                  : '⚠️ Preview only — this profile is not yet published and is hidden from customers.'}
              </p>
              <span className="text-[11px] text-muted-foreground">
                {isRTL
                  ? `الحالة: ${business.approval_status}`
                  : `Status: ${business.approval_status}`}
              </span>
            </div>
          </div>
        )}
        <BusinessProfileHeader
          business={business}
          onContact={() => handleContactClick("header")}
          isContacting={contactMutation.isPending}
          projectCount={projects.length}
          serviceCount={services.length}
          branchCount={branches.length}
          activeOffersCount={activeOffersCount}
          topServices={services}
        />

        <main className="container-app pb-10 pt-4 sm:pb-16 sm:pt-8">
          {/* Booking quick action — desktop only (mobile has inline button in header) */}
          <div className="mb-4 hidden items-center justify-end gap-2 sm:flex">
            <Button
              variant="outline"
              size="app"
              className="gap-2"
              onClick={() => {
                void recordBadgeConversion(business?.id, 'booking', 'desktop_quick_action');
                setBookingOpen(true);
              }}
            >
              <CalendarClock className="ic-sm" />
              {language === "ar" ? "حجز موعد" : "Book appointment"}
            </Button>
          </div>

          <section
            className="rounded-2xl border border-border/40 bg-card/60 p-1.5 shadow-sm dark:border-border/20 dark:bg-card/40 sm:p-3"
            data-lead-context=""
            data-lead-business-slug={business.username || ""}
            data-lead-membership-tier={business.membership_tier || ""}
            data-lead-sector={(business.categories as { slug?: string } | null)?.slug || ""}
            data-lead-category-slug={(business.categories as { slug?: string } | null)?.slug || ""}
            data-lead-city={(business.cities as { slug?: string } | null)?.slug || cityName || ""}
          >
            <Tabs defaultValue="services" dir={isRTL ? "rtl" : "ltr"} className="w-full">
              <div
                className="sticky top-12 z-30 -mx-1.5 overflow-x-auto bg-background/80 px-1.5 py-1 backdrop-blur-md no-scrollbar sm:top-14 sm:-mx-3 sm:px-3 sm:py-1.5"
                dir={isRTL ? "rtl" : "ltr"}
              >
                <TabsList className="h-auto w-max min-w-full justify-start gap-1 rounded-2xl bg-muted/40 p-1 dark:bg-muted/20 sm:p-1.5" dir={isRTL ? "rtl" : "ltr"}>
                  {tabs.map((tab) => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="shrink-0 gap-1.5 whitespace-nowrap rounded-xl px-2.5 py-1.5 text-[11px] font-medium data-[state=active]:bg-accent data-[state=active]:text-accent-foreground sm:px-4 sm:py-2 sm:text-sm"
                    >
                      <tab.icon className="h-3.5 w-3.5" />
                      {tab.label}
                      {typeof tab.count === "number" && tab.count > 0 && (
                        <span className="tech-content rounded-full bg-accent/20 px-1.5 text-[10px] text-current">
                          {tab.count}
                        </span>
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <div className="mt-3 rounded-2xl bg-background/70 p-1.5 sm:mt-6 sm:rounded-3xl sm:p-3">
                <TabsContent value="services" className="mt-0">
                  <ServicesTab businessId={business.id} businessName={businessName} />
                </TabsContent>
                <TabsContent value="projects" className="mt-0">
                  <ProjectsTab businessId={business.id} />
                </TabsContent>
                <TabsContent value="portfolio" className="mt-0">
                  <PortfolioTab businessId={business.id} />
                </TabsContent>
                <TabsContent value="branches" className="mt-0">
                  <BranchesTab
                    businessId={business.id}
                    isAuthenticated={!!user}
                    onRequestContact={() => handleContactClick("branches_tab")}
                    onRevealContact={handleContactReveal}
                  />
                </TabsContent>
                <TabsContent value="reviews" className="mt-0">
                  <ReviewsTab business={business} />
                </TabsContent>
                <TabsContent value="contact" className="mt-0">
                  <ContactTab
                    business={business}
                    isAuthenticated={!!user}
                    onRequestContact={() => handleContactClick("contact_tab")}
                    onRevealContact={handleContactReveal}
                  />
                  {/* BNPL section */}
                  <div className="mt-6">
                    <BnplBadges businessId={business.id} />
                  </div>
                  {/* Business barcode + printable 30x20 cm sticker */}
                  <div className="mt-6">
                    <BusinessBarcodeCard businessId={business.id} businessName={businessName} />
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </section>
        </main>
      </div>

      <BookingWidget
        businessId={business.id}
        businessName={businessName}
        open={bookingOpen}
        onOpenChange={setBookingOpen}
      />

      <ContactSupplierSheet
        open={contactSheetOpen}
        onOpenChange={setContactSheetOpen}
        businessId={business.id}
        businessName={businessName}
        source="business-profile"
      />

      <Footer />
    </div>
  );
};

export default BusinessProfile;
