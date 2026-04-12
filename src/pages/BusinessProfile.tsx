import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { usePageMeta, useMultiJsonLd } from "@/hooks/usePageMeta";
import {
  CreditCard,
  FolderOpen,
  GitBranch,
  Image as ImageIcon,
  Loader2,
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
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { getLocalizedValue, useDirection } from "@/lib/direction";
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
} from "@/components/business-profile/business-profile.data";
import { BnplBadges } from "@/components/bnpl/BnplBadges";
import { BookingWidget } from "@/components/booking/BookingWidget";

const BusinessProfile = () => {
  const { username } = useParams<{ username: string }>();
  const { t, language, isRTL } = useLanguage();
  const { BackIcon } = useDirection();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookingOpen, setBookingOpen] = useState(false);
  const { data: business, isLoading, error } = useBusinessByUsername(username || "");
  const { data: projects = [] } = useProjects(business?.id);
  const { data: services = [] } = useServices(business?.id);
  const { data: branches = [] } = useBranches(business?.id);

  const businessName = business ? getLocalizedValue(language, business.name_ar, business.name_en) : '';
  const businessDesc = business ? (getLocalizedValue(language, business.description_ar, business.description_en) || getLocalizedValue(language, business.short_description_ar, business.short_description_en) || '') : '';
  const categoryName = business?.categories ? getLocalizedValue(language, business.categories.name_ar, business.categories.name_en) : '';
  const cityName = business?.cities ? getLocalizedValue(language, business.cities.name_ar, business.cities.name_en) : '';

  const seoTitle = business
    ? `${businessName}${categoryName ? ` — ${categoryName}` : ''}${cityName ? ` في ${cityName}` : ''} | فنيين`
    : (isRTL ? 'جاري التحميل... | فنيين' : 'Loading... | Faneen');

  const seoDesc = business
    ? (businessDesc.substring(0, 140) || `${businessName}${categoryName ? ` - ${categoryName}` : ''}${cityName ? ` في ${cityName}` : ''} — مزود خدمات معتمد على منصة فنيين`)
    + (business.phone ? ` | ${business.phone}` : '')
    : undefined;

  usePageMeta({
    title: seoTitle,
    description: seoDesc,
    ogType: 'business.business',
    ogImage: business?.logo_url || business?.cover_url || undefined,
    canonical: business ? `https://faneen.com/${business.username}` : undefined,
    keywords: business ? [businessName, categoryName, cityName, 'فنيين', 'دليل أعمال'].filter(Boolean).join(', ') : undefined,
  });

  const structuredDataArray = useMemo(() => {
    if (!business) return null;
    const localBusiness: Record<string, any> = {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      '@id': `https://faneen.com/${business.username}`,
      name: business.name_ar,
      alternateName: business.name_en,
      description: business.description_ar,
      url: `https://faneen.com/${business.username}`,
      image: business.logo_url || business.cover_url,
      logo: business.logo_url,
      telephone: business.phone,
      email: business.email,
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

    const breadcrumb: Record<string, any> = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'فنيين', item: 'https://faneen.com' },
        ...(categoryName ? [{ '@type': 'ListItem', position: 2, name: categoryName, item: `https://faneen.com/categories/${business.categories?.slug || ''}` }] : []),
        { '@type': 'ListItem', position: categoryName ? 3 : 2, name: business.name_ar, item: `https://faneen.com/${business.username}` },
      ],
    };

    return [localBusiness, breadcrumb];
  }, [business, services, categoryName, cityName]);

  useMultiJsonLd(structuredDataArray);

  const contactMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        navigate("/auth");
        throw new Error("not_authenticated");
      }

      if (!business) throw new Error("no_business");

      const providerId = business.user_id;
      if (providerId === user.id) throw new Error("self_contact");

      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .or(`and(participant_1.eq.${user.id},participant_2.eq.${providerId}),and(participant_1.eq.${providerId},participant_2.eq.${user.id})`)
        .maybeSingle();

      if (existing) return { id: existing.id, isNew: false };

      const { data: created, error: createError } = await supabase
        .from("conversations")
        .insert({ participant_1: user.id, participant_2: providerId })
        .select("id")
        .single();

      if (createError) throw createError;

      const bName = getLocalizedValue(language, business.name_ar, business.name_en);
      const greeting =
        language === "ar"
          ? `مرحباً، أود الاستفسار عن خدماتكم في ${bName}`
          : `Hello, I'd like to inquire about your services at ${bName}`;

      await supabase.from("messages").insert({
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
    onError: (errorResult: any) => {
      if (errorResult.message === "not_authenticated") return;
      if (errorResult.message === "self_contact") {
        toast.error(isRTL ? "لا يمكنك مراسلة نفسك" : "You can't message yourself");
        return;
      }
      toast.error(isRTL ? "فشل بدء المحادثة" : "Failed to start conversation");
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="pt-14">
          <Skeleton className="h-44 w-full sm:h-60" />
          <div className="container mt-8 space-y-4 px-3 sm:px-4">
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
              <BackIcon className="h-4 w-4" />
              {t("profile.back_home")}
            </Button>
          </Link>
        </div>
      </div>
    );
  }


  const sectionIntroTitle =
    language === "ar"
      ? "كل ما تحتاجه للتعامل مع المزود في صفحة واحدة"
      : "Everything you need to work with this provider in one page";
  const sectionIntroText =
    language === "ar"
      ? "استعرض الخدمات، المشاريع، بيانات الفروع والتواصل بتجربة ثنائية الاتجاه أكثر وضوحاً واحترافية."
      : "Browse services, projects, branches, and contact details in a clearer professional bilingual experience.";

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
        onContact={() => contactMutation.mutate()}
        isContacting={contactMutation.isPending}
      />

      <div className="pt-12 sm:pt-14">
        <BusinessProfileHeader
          business={business}
          onContact={() => contactMutation.mutate()}
          isContacting={contactMutation.isPending}
          projectCount={projects.length}
          serviceCount={services.length}
          branchCount={branches.length}
        />

        <main className="container px-3 pb-10 pt-6 sm:px-4 sm:pb-16 sm:pt-8">
          <section className="rounded-[1.75rem] border border-border/40 bg-card/80 p-4 shadow-sm backdrop-blur-sm dark:border-border/20 dark:bg-card/60 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <span className="inline-flex rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-[11px] font-medium text-accent sm:text-xs">
                  {language === "ar" ? "ملف احترافي" : "Professional profile"}
                </span>
                <div>
                  <h2 className="font-heading text-xl font-bold text-foreground sm:text-2xl">{sectionIntroTitle}</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">{sectionIntroText}</p>
                </div>
              </div>

              <Button
                variant="hero"
                className="gap-2 self-start"
                onClick={() => contactMutation.mutate()}
                disabled={contactMutation.isPending}
              >
                {contactMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                {language === "ar" ? "ابدأ التواصل الآن" : "Start contact now"}
              </Button>
            </div>
          </section>

          <section className="mt-5 rounded-[1.75rem] border border-border/30 bg-card/60 p-2 shadow-sm dark:border-border/20 dark:bg-card/40 sm:mt-6 sm:p-3">
            <Tabs defaultValue="services" className="w-full">
              <div className="overflow-x-auto px-1 no-scrollbar">
                <TabsList className="h-auto w-max min-w-full justify-start gap-1 rounded-2xl bg-muted/40 p-1.5 dark:bg-muted/20">
                  {tabs.map((tab) => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="shrink-0 gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-medium data-[state=active]:bg-accent data-[state=active]:text-accent-foreground sm:px-4 sm:text-sm"
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

              <div className="mt-4 rounded-[1.5rem] bg-background/70 p-2 sm:mt-6 sm:p-3">
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
                  <BranchesTab businessId={business.id} />
                </TabsContent>
                <TabsContent value="reviews" className="mt-0">
                  <ReviewsTab business={business} />
                </TabsContent>
                <TabsContent value="contact" className="mt-0">
                  <ContactTab business={business} />
                  {/* BNPL section */}
                  <div className="mt-6">
                    <BnplBadges businessId={business.id} />
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </section>
        </main>
      </div>

      <Footer />
    </div>
  );
};

export default BusinessProfile;
