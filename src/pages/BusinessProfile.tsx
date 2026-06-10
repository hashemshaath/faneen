import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { usePageMeta, useMultiJsonLd } from "@/hooks/usePageMeta";
import { buildSeoTitle, buildSeoDescription } from "@/modules/seo/seoTitleBuilder";
import {
  CalendarClock,
  FolderOpen,
  GitBranch,
  Image as ImageIcon,
  Inbox,
  LayoutDashboard,
  MessageSquare,
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
import { useBusinessTaxonomyDisplay } from "@/modules/taxonomy/search-integration";
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
import { BusinessBranchSwitcher } from "@/components/business-profile/BusinessBranchSwitcher";
import {
  useBranches,
  useBusinessByUsername,
  useProjects,
  useServices,
  useActivePromotionsCount,
  useActiveBranchPromotionsCount,
  useBranchBySlug,
} from "@/components/business-profile/business-profile.data";
import { useReviews, useCertifications, useAwards } from "@/components/business-profile/business-profile.data";
import { BusinessProfileStickyCta } from "@/components/business-profile/BusinessProfileStickyCta";
import { OverviewTab } from "@/components/business-profile/OverviewTab";
import { ShareMenu } from "@/components/business-profile/ShareMenu";
import { SimilarBusinesses } from "@/components/business-profile/SimilarBusinesses";
import {
  canViewSection,
  useBusinessVisibility,
  type ProfileSectionKey,
} from "@/components/business-profile/business-profile.visibility";
import { ogImageFor } from "@/lib/seo/structured-data";
import { useBusinessStructuredData } from "@/components/business-profile/useBusinessStructuredData";
import { track } from "@/lib/analytics-events";

// Heavy / below-the-fold tabs + widgets are code-split so the initial
// profile render only ships the Overview tab + Header chunks.
const RequestsAsBeneficiaryTab = lazy(() =>
  import("@/components/business-profile/RequestsTab").then((m) => ({
    default: m.RequestsAsBeneficiaryTab,
  })),
);
const BookingWidget = lazy(() =>
  import("@/components/booking/BookingWidget").then((m) => ({ default: m.BookingWidget })),
);
const ContactSupplierSheet = lazy(() =>
  import("@/components/business-profile/ContactSupplierSheet").then((m) => ({
    default: m.ContactSupplierSheet,
  })),
);
const BnplBadges = lazy(() =>
  import("@/components/bnpl/BnplBadges").then((m) => ({ default: m.BnplBadges })),
);
const BusinessBarcodeCard = lazy(() =>
  import("@/components/business-profile/BusinessBarcodeCard").then((m) => ({
    default: m.BusinessBarcodeCard,
  })),
);

const TabFallback = () => <Skeleton className="h-48 w-full rounded-2xl" />;

const BusinessProfile = () => {
  const { username, branchSlug } = useParams<{ username: string; branchSlug?: string }>();
  const { t, language, isRTL } = useLanguage();
  const { BackIcon } = useDirection();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookingOpen, setBookingOpen] = useState(false);
  const [contactSheetOpen, setContactSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const { data: businessRow, isLoading, error } = useBusinessByUsername(username || "");
  const { data: branchFromUrl } = useBranchBySlug(businessRow?.id, branchSlug);
  // Branch selection lives in local state so switching between branches
  // updates the page in-place without changing the route or remounting.
  // The URL is still kept in sync via `history.replaceState` from the
  // switcher so the page stays shareable/refreshable.
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  // Seed selection from the URL on first load (deep-link to /:username/:branchSlug).
  useEffect(() => {
    if (branchFromUrl?.id) setSelectedBranchId((prev) => prev ?? branchFromUrl.id);
  }, [branchFromUrl?.id]);
  const { data: branchesList = [] } = useBranches(businessRow?.id);
  // Resolve the active branch from the locally selected id, falling back to
  // the URL-resolved branch while the branches list is still loading.
  const branch = useMemo(() => {
    if (!selectedBranchId) return null;
    return branchesList.find((b) => b.id === selectedBranchId) ?? branchFromUrl ?? null;
  }, [selectedBranchId, branchesList, branchFromUrl]);

  // When viewing `/:username/:branchSlug`, swap the contact/location fields
  // on the business row with the selected branch's values. The screen
  // (header, tabs, layout) stays identical — only the data changes.
  const business = useMemo(() => {
    if (!businessRow) return businessRow;
    if (!branch) return businessRow;
    return {
      ...businessRow,
      phone: branch.phone ?? businessRow.phone ?? null,
      mobile: branch.mobile ?? businessRow.mobile ?? null,
      whatsapp: branch.whatsapp ?? (businessRow as { whatsapp?: string | null }).whatsapp ?? null,
      customer_service_phone:
        branch.customer_service_phone ?? businessRow.customer_service_phone ?? null,
      unified_number: branch.unified_number ?? businessRow.unified_number ?? null,
      email: branch.email ?? businessRow.email ?? null,
      website: branch.website ?? businessRow.website ?? null,
      address: branch.address ?? businessRow.address ?? null,
      region: branch.region ?? businessRow.region ?? null,
      district: branch.district ?? businessRow.district ?? null,
      street_name: branch.street_name ?? businessRow.street_name ?? null,
      building_number: branch.building_number ?? businessRow.building_number ?? null,
      additional_number: branch.additional_number ?? businessRow.additional_number ?? null,
      latitude: branch.latitude ?? businessRow.latitude ?? null,
      longitude: branch.longitude ?? businessRow.longitude ?? null,
    } as typeof businessRow;
  }, [businessRow, branch]);

  const { data: projects = [] } = useProjects(business?.id);
  const { data: services = [] } = useServices(business?.id);
  const branches = branchesList;
  const { data: reviews = [] } = useReviews(business?.id);
  const { data: certifications = [] } = useCertifications(business?.id);
  const { data: awards = [] } = useAwards(business?.id);
  const { data: businessOffersCount = 0 } = useActivePromotionsCount(business?.id);
  const { data: branchOffersCount = 0 } = useActiveBranchPromotionsCount(business?.id, branch?.id);
  const activeOffersCount = branch?.id ? branchOffersCount : businessOffersCount;
  const { data: visibility } = useBusinessVisibility(business?.id);

  const isOwner = !!user && !!business && business.user_id === user.id;
  const viewerCtx = useMemo(
    () => ({ isAuthenticated: !!user, isOwner, isAdmin: false }),
    [user, isOwner],
  );
  const canSee = (key: ProfileSectionKey): boolean => {
    if (!visibility) return true; // optimistic until loaded
    return canViewSection(visibility.levels[key], viewerCtx);
  };

  // Record a click event when this page was opened from an embedded
  // "Verified on Qitaat" badge (?ref=badge) — visible in DashboardBadge.
  useBadgeClickTracking(business?.id, business?.username);

  const businessName = business ? getLocalizedValue(language, business.name_ar, business.name_en) : '';
  const businessDesc = business ? (getLocalizedValue(language, business.description_ar, business.description_en) || getLocalizedValue(language, business.short_description_ar, business.short_description_en) || '') : '';
  // Phase 2.3 — Public UI is taxonomy-only. The legacy `business.categories`
  // name is intentionally NOT used for display, SEO title/desc, keywords or
  // breadcrumb link text. The legacy join may still arrive from upstream
  // queries (for the route `slug` used in internal links) but is never
  // surfaced as a label.
  const taxonomyDisplay = useBusinessTaxonomyDisplay(business?.id, language);
  const categoryName =
    (taxonomyDisplay.hasModernTaxonomy && taxonomyDisplay.primaryLabel) || '';
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
    ? buildSeoTitle({
        kind: 'company',
        lang: language === 'ar' ? 'ar' : 'en',
        name: businessName,
        activity: categoryName,
        city: cityName,
      })
    : (isRTL ? 'جاري التحميل... | قِطاعات' : 'Loading... | Qitaat');

  const seoDesc = business
    ? buildSeoDescription({
        kind: 'company',
        lang: language === 'ar' ? 'ar' : 'en',
        name: businessName,
        activity: categoryName,
        city: cityName,
        rawDescription: businessDesc,
      })
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
    canonical: business
      ? `https://qitaat.com/${business.username}${branch?.slug ? `/${branch.slug}` : ''}`
      : undefined,
    keywords: business ? [businessName, categoryName, cityName, 'قِطاعات', 'دليل أعمال'].filter(Boolean).join(', ') : undefined,
  });

  const structuredDataArray = useBusinessStructuredData({
    business,
    services,
    reviews,
    certifications,
    awards,
    categoryName,
    cityName,
    language,
    businessName,
  });

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

  // Mobile sticky CTA share handler — mirrors header share without
  // exposing private fields. Native share with clipboard fallback.
  const handleShare = async () => {
    if (typeof window === "undefined") return;
    const shareUrl = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: businessName || "Qitaat", url: shareUrl });
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        toast.success(isRTL ? "تم نسخ الرابط" : "Link copied");
      }
    } catch {
      return;
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
    { value: "overview", label: language === "ar" ? "نظرة عامة" : "Overview", icon: LayoutDashboard },
    canSee("services") && services.length > 0 && { value: "services", label: language === "ar" ? "الخدمات" : "Services", icon: Wrench, count: services.length },
    canSee("projects") && projects.length > 0 && { value: "projects", label: language === "ar" ? "المشاريع" : "Projects", icon: FolderOpen, count: projects.length },
    canSee("portfolio") && { value: "portfolio", label: language === "ar" ? "الأعمال" : "Portfolio", icon: ImageIcon },
    canSee("requests_as_beneficiary") && { value: "requests", label: language === "ar" ? "طلبات مطروحة" : "Public requests", icon: Inbox },
    canSee("branches") && branches.length > 0 && { value: "branches", label: language === "ar" ? "الفروع" : "Branches", icon: GitBranch, count: branches.length },
    canSee("reviews") && { value: "reviews", label: language === "ar" ? "التقييمات" : "Reviews", icon: Star, count: business.rating_count ?? 0 },
    canSee("contact") && { value: "contact", label: language === "ar" ? "التواصل" : "Contact", icon: Phone },
  ].filter(Boolean) as Array<{ value: string; label: string; icon: React.ElementType; count?: number }>;
  const defaultTab = tabs[0]?.value ?? "overview";

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
          selectedBranch={branch ?? null}
        />

        <main className="container-app pb-10 pt-4 sm:pb-16 sm:pt-8">
          {/* Branch switcher — sits above the quick actions so visitors can
              jump between the head office view and any specific branch
              before drilling into tabs. */}
          {business.username && (
            <BusinessBranchSwitcher
              username={business.username}
              branches={branches as Array<{ id: string; slug?: string | null; name_ar: string; name_en?: string | null; region?: string | null; is_main?: boolean | null }>}
              currentBranchId={selectedBranchId}
              onSelect={(b) => setSelectedBranchId(b?.id ?? null)}
            />
          )}

          {/* Quick actions — visit request, contact request, share. The
              "Contact" icon button mirrors the branch-resolved phone so the
              visitor always sees the right channel for the page they're on. */}
          <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
            <ShareMenu
              businessId={business.id}
              businessName={businessName}
              shareUrl={typeof window !== "undefined" ? window.location.href : `https://qitaat.com/${business.username}`}
              vCardInput={{
                name: businessName,
                org: businessName,
                title: categoryName || undefined,
                url: `https://qitaat.com/${business.username}`,
                address: {
                  street: business.address || undefined,
                  city: cityName || undefined,
                  region: business.region || undefined,
                  country: business.countries?.code || "SA",
                },
                note: businessDesc?.slice(0, 240) || undefined,
              }}
            />
            <Button
              variant="outline"
              size="app"
              className="hidden gap-2 sm:inline-flex"
              onClick={() => {
                void recordBadgeConversion(business?.id, 'booking', 'desktop_quick_action');
                setBookingOpen(true);
              }}
            >
              <CalendarClock className="ic-sm" />
              {language === "ar" ? "طلب زيارة" : "Request visit"}
            </Button>
            <Button
              variant="default"
              size="app"
              className="gap-2"
              onClick={() => handleContactClick("header_request_contact")}
              aria-label={language === "ar" ? "طلب تواصل" : "Request contact"}
            >
              <MessageSquare className="ic-sm" />
              {language === "ar" ? "طلب تواصل" : "Request contact"}
            </Button>
            {/* Direct contact — uses the branch-resolved phone when a branch
                is selected, falling back to the main business phone. Guests
                hit the lead-capture sheet; authenticated users get a real
                tel: link with reveal tracking. */}
            {(business.phone || business.mobile) && (
              user ? (
                <a
                  href={`tel:${business.phone || business.mobile}`}
                  onClick={() => handleContactReveal("phone")}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-background px-3 text-xs font-medium text-foreground hover:border-accent/40 hover:text-accent sm:text-sm"
                  aria-label={language === "ar" ? "اتصال مباشر" : "Call directly"}
                >
                  <Phone className="ic-sm" />
                  {language === "ar" ? "اتصل" : "Call"}
                </a>
              ) : (
                <Button
                  variant="outline"
                  size="app"
                  className="gap-2"
                  onClick={() => handleContactClick("header_call_intent")}
                  aria-label={language === "ar" ? "اتصال" : "Call"}
                >
                  <Phone className="ic-sm" />
                  {language === "ar" ? "اتصل" : "Call"}
                </Button>
              )
            )}
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
            <Tabs
              value={tabs.some((tab) => tab.value === activeTab) ? activeTab : defaultTab}
              onValueChange={setActiveTab}
              dir={isRTL ? "rtl" : "ltr"}
              className="w-full"
            >
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
                <TabsContent value="overview" className="mt-0">
                  <OverviewTab business={business} onJumpToTab={setActiveTab} />
                </TabsContent>
                {canSee("services") && (
                  <TabsContent value="services" className="mt-0">
                    <ServicesTab businessId={business.id} businessName={businessName} branchId={branch?.id} />
                  </TabsContent>
                )}
                {canSee("projects") && (
                  <TabsContent value="projects" className="mt-0">
                    <ProjectsTab businessId={business.id} />
                  </TabsContent>
                )}
                {canSee("portfolio") && (
                  <TabsContent value="portfolio" className="mt-0">
                    <PortfolioTab businessId={business.id} />
                  </TabsContent>
                )}
                {canSee("requests_as_beneficiary") && (
                  <TabsContent value="requests" className="mt-0">
                    <Suspense fallback={<TabFallback />}>
                      <RequestsAsBeneficiaryTab businessId={business.id} />
                    </Suspense>
                  </TabsContent>
                )}
                {canSee("branches") && (
                  <TabsContent value="branches" className="mt-0">
                  <BranchesTab
                    businessId={business.id}
                    businessName={businessName}
                    businessUsername={business.username}
                    isAuthenticated={!!user}
                    onRequestContact={() => handleContactClick("branches_tab")}
                    onRevealContact={handleContactReveal}
                  />
                  </TabsContent>
                )}
                {canSee("reviews") && (
                  <TabsContent value="reviews" className="mt-0">
                    <ReviewsTab business={business} />
                  </TabsContent>
                )}
                {canSee("contact") && (
                  <TabsContent value="contact" className="mt-0">
                  <ContactTab
                    business={business}
                    isAuthenticated={!!user}
                    onRequestContact={() => handleContactClick("contact_tab")}
                    onRevealContact={handleContactReveal}
                  />
                  {/* BNPL section */}
                  <div className="mt-6">
                    <Suspense fallback={null}>
                      <BnplBadges businessId={business.id} />
                    </Suspense>
                  </div>
                  {/* Business barcode + printable 30x20 cm sticker */}
                  <div className="mt-6">
                    <Suspense fallback={null}>
                      <BusinessBarcodeCard businessId={business.id} businessName={businessName} />
                    </Suspense>
                  </div>
                  </TabsContent>
                )}
              </div>
            </Tabs>
          </section>

          {/* Explore more — hub/spoke depth (SEO-7).
              Only uses public slugs already loaded on this page. */}
          <nav
            aria-label={isRTL ? 'استكشف المزيد في قِطاعات' : 'Explore more on Qitaat'}
            className="container mx-auto px-4 mt-8 mb-6"
          >
            <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
              <h2 className="font-heading text-base font-bold mb-3">
                {isRTL ? 'روابط مفيدة' : 'Useful links'}
              </h2>
              <ul className="flex flex-wrap gap-2 text-sm">
                {categoryName && (business.categories as { slug?: string } | null)?.slug && (
                  <li>
                    <Link
                      to={`/sectors/${(business.categories as { slug?: string }).slug}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 hover:border-primary/40 hover:text-primary"
                    >
                      {isRTL ? `قطاع ${categoryName}` : `${categoryName} sector`}
                    </Link>
                  </li>
                )}
                {categoryName && (business.categories as { slug?: string } | null)?.slug &&
                  (business.cities as { slug?: string } | null)?.slug && (
                    <li>
                      <Link
                        to={`/sectors/${(business.categories as { slug?: string }).slug}/${(business.cities as { slug?: string }).slug}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 hover:border-primary/40 hover:text-primary"
                      >
                        {isRTL ? `${categoryName} في ${cityName}` : `${categoryName} in ${cityName}`}
                      </Link>
                    </li>
                  )}
                <li>
                  <Link
                    to="/sectors"
                    className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 hover:border-primary/40 hover:text-primary"
                  >
                    {isRTL ? 'كل القطاعات' : 'All sectors'}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/services"
                    className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 hover:border-primary/40 hover:text-primary"
                  >
                    {isRTL ? 'الخدمات' : 'Services'}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/brands"
                    className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 hover:border-primary/40 hover:text-primary"
                  >
                    {isRTL ? 'العلامات التجارية' : 'Brands'}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/showcase"
                    className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 hover:border-primary/40 hover:text-primary"
                  >
                    {isRTL ? 'أعمال المزودين' : 'Provider showcase'}
                  </Link>
                </li>
              </ul>
            </div>
          </nav>

          <SimilarBusinesses
            currentBusinessId={business.id}
            cityId={(business as { city_id?: string | null }).city_id ?? null}
            categorySlug={(business.categories as { slug?: string } | null)?.slug || null}
            cityName={cityName || undefined}
            categoryName={categoryName || undefined}
          />
        </main>
      </div>

      {bookingOpen && (
        <Suspense fallback={null}>
          <BookingWidget
            businessId={business.id}
            businessName={businessName}
            open={bookingOpen}
            onOpenChange={setBookingOpen}
          />
        </Suspense>
      )}

      {contactSheetOpen && (
        <Suspense fallback={null}>
          <ContactSupplierSheet
            open={contactSheetOpen}
            onOpenChange={setContactSheetOpen}
            businessId={business.id}
            businessName={businessName}
            source="business-profile"
          />
        </Suspense>
      )}

      {/* Mobile-only sticky CTA — hidden when the owner views their own
          profile to keep authoring UX clean. */}
      {business.user_id !== user?.id && (
        <>
          {/* Spacer to prevent the mobile sticky CTA from covering the footer. */}
          <div aria-hidden="true" className="h-20 sm:hidden" />
          <BusinessProfileStickyCta
            onContact={() => handleContactClick("sticky_mobile")}
            onShare={handleShare}
            isContacting={contactMutation.isPending}
          />
        </>
      )}

      <Footer />
    </div>
  );
};

export default BusinessProfile;
