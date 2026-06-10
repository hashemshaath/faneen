import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Clock,
  Crown,
  FolderOpen,
  GitBranch,
  Loader2,
  MapPin,
  MessageSquare,
  Share2,
  Star,
  TicketPercent,
  User,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { getLocalizedValue, useDirection } from "@/lib/direction";
import { tierConfig } from "./business-profile.data";
import { VerificationStatusBadge } from "@/components/common/VerificationStatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import { BrandLogo } from "@/components/common/BrandLogo";
import { BusinessIdentityStrip } from "@/components/business/BusinessIdentityStrip";
import { useBusinessTaxonomyDisplay } from "@/modules/taxonomy/search-integration";
import { ResponsiveImage } from "@/modules/files";

export const Stars = ({ rating, size = "w-4 h-4" }: { rating: number; size?: string }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((index) => (
      <Star
        key={index}
        className={`${size} ${index <= rating ? "fill-accent text-accent" : "text-muted-foreground/20"}`}
      />
    ))}
  </div>
);

interface BusinessProfileTopBarProps {
  businessName: string;
  onContact: () => void;
  isContacting: boolean;
}

export const BusinessProfileTopBar = ({
  businessName,
  onContact,
  isContacting,
}: BusinessProfileTopBarProps) => {
  const { language } = useLanguage();
  const { BackIcon } = useDirection();

  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-accent/20 bg-primary/95 backdrop-blur-md dark:border-border/30 dark:bg-card/95">
      <div className="container flex h-12 items-center justify-between px-3 sm:h-14 sm:px-4">
        <Link
          to="/"
          className="flex items-center gap-1.5 text-xs font-medium text-primary-foreground/80 transition-colors hover:text-accent sm:gap-2 sm:text-sm dark:text-foreground/80"
        >
          <BackIcon className="h-4 w-4" />
          <div className="flex items-center">
            <BrandLogo variant="full" tone="dark" size={28} alt="قِطاعات" />
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <span className="max-w-[120px] truncate font-heading text-xs font-semibold text-primary-foreground sm:max-w-none sm:text-sm dark:text-foreground">
            {businessName}
          </span>
          <Button
            variant="hero"
            size="sm"
            className="h-7 gap-1 px-2 text-[10px] sm:h-8 sm:px-3 sm:text-xs"
            onClick={onContact}
            disabled={isContacting}
          >
            {isContacting ? <Loader2 className="h-3 w-3 animate-spin" /> : <MessageSquare className="h-3 w-3" />}
            <span className="hidden sm:inline">{language === "ar" ? "تواصل" : "Contact"}</span>
          </Button>
        </div>
      </div>
    </nav>
  );
};

interface BusinessProfileHeaderProps {
  business: any;
  onContact: () => void;
  isContacting: boolean;
  projectCount: number;
  serviceCount: number;
  branchCount: number;
  activeOffersCount?: number;
  topServices?: Array<{ name_ar: string; name_en?: string | null }>;
}

export const BusinessProfileHeader = ({
  business,
  onContact,
  isContacting,
  projectCount,
  serviceCount,
  branchCount,
  activeOffersCount = 0,
  topServices = [],
}: BusinessProfileHeaderProps) => {
  const { user } = useAuth();
  const isOwner = !!user?.id && user.id === business?.user_id;
  const { language, isRTL } = useLanguage();
  const name = getLocalizedValue(language, business.name_ar, business.name_en);
  const shortDesc = getLocalizedValue(
    language,
    business.short_description_ar || business.description_ar,
    business.short_description_en || business.description_en,
  );
  const cityName = getLocalizedValue(language, business.cities?.name_ar, business.cities?.name_en);
  // Phase 2.3 — Public UI is taxonomy-only. The legacy `business.categories`
  // name is intentionally not used for display. When no modern taxonomy is
  // available we show a localized "Unclassified" label.
  const taxonomy = useBusinessTaxonomyDisplay(business.id, language);
  // Safe Batch 4 — multi-primary aware. Render up to 3 primaries joined
  // by a thin separator; fall back to the canonical legacy primaryLabel
  // (already normalized upstream) or "Unclassified".
  const primaryChips = taxonomy.primaries.slice(0, 3);
  const categoryName =
    primaryChips.length > 0
      ? primaryChips.map((p) => p.label).join(" · ")
      : taxonomy.hasModernTaxonomy && taxonomy.primaryLabel
        ? taxonomy.primaryLabel
        : language === "ar"
          ? "غير مصنّف"
          : "Unclassified";
  const memberDate = new Date(business.created_at).toLocaleDateString(language === "ar" ? "ar-SA-u-nu-latn" : "en-US", {
    year: "numeric",
    month: "long",
  });
  const tier = tierConfig[business.membership_tier];

  const handleShare = async () => {
    const shareUrl = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({ title: name, url: shareUrl });
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

  const stats = [
    { icon: FolderOpen, value: projectCount, label: language === "ar" ? "مشروع" : "Projects" },
    { icon: Wrench, value: serviceCount, label: language === "ar" ? "خدمة" : "Services" },
    { icon: GitBranch, value: branchCount, label: language === "ar" ? "فرع" : "Branches" },
    { icon: Star, value: business.rating_count ?? 0, label: language === "ar" ? "تقييم" : "Reviews" },
  ];

  return (
    <header className="relative">
      <div className="relative h-28 overflow-hidden bg-primary sm:h-52 md:h-72">
        {business.cover_url ? (
          <ResponsiveImage
            originalUrl={business.cover_url}
            variants={business.cover_image_variants}
            alt={name}
            sizes="100vw"
            priority
            className="h-full w-full object-cover"
          />
        ) : (
          <>
            <div
              className="absolute inset-0 opacity-20"
              style={{ backgroundImage: "radial-gradient(circle at 30% 50%, hsl(var(--accent) / 0.4) 0%, transparent 60%)" }}
            />
            <div
              className="absolute inset-0 opacity-10"
              style={{ backgroundImage: "radial-gradient(circle at 80% 20%, hsl(var(--accent) / 0.3) 0%, transparent 50%)" }}
            />
          </>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
      </div>

      <div className="container relative z-10 -mt-10 px-3 sm:-mt-24 sm:px-4">
        <div className="rounded-2xl border border-border/50 bg-card/95 p-3 shadow-xl backdrop-blur-xl dark:border-border/30 dark:bg-card/80 dark:shadow-black/20 sm:rounded-[1.75rem] sm:p-6">
          <div className="flex flex-row items-start gap-3 sm:gap-6">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-accent/20 bg-background shadow-lg dark:border-accent/30 sm:h-28 sm:w-28 sm:rounded-3xl">
              {business.logo_url ? (
                <ResponsiveImage
                  originalUrl={business.logo_url}
                  variants={business.logo_image_variants}
                  alt={name}
                  sizes="(max-width: 640px) 64px, 112px"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="font-heading text-2xl font-black text-accent sm:text-4xl">
                  {name.charAt(0) || "ق"}
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-1.5 sm:gap-3">
                    <h1
                      dir="auto"
                      data-testid="business-profile-name"
                      className="font-heading text-base font-bold text-foreground leading-tight sm:text-3xl line-clamp-2"
                    >
                      {name}
                    </h1>
                    <VerificationStatusBadge
                      isVerified={business.is_verified}
                      size="sm"
                      ownerView={isOwner}
                    />
                    {activeOffersCount > 0 && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-destructive/10 text-destructive dark:text-destructive text-[10px] sm:text-[11px] font-body font-semibold border border-destructive/20">
                        <TicketPercent className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        {language === "ar" ? "كوبون خصم" : "Coupon"}
                      </span>
                    )}
                    {tier && (
                      <Badge className={`${tier.color} gap-1 text-[10px] px-1.5 py-0 sm:text-xs sm:px-2.5 sm:py-0.5`}>
                        <Crown className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        {language === "ar" ? tier.labelAr : tier.label}
                      </Badge>
                    )}
                  </div>

                  {categoryName && (
                    <span
                      dir="auto"
                      data-testid="business-profile-taxonomy"
                      className="text-xs font-medium text-accent sm:text-sm"
                    >
                      {primaryChips.length > 0 ? (
                        primaryChips.map((p, i) => (
                          <span key={p.label + i}>
                            {i > 0 && <span aria-hidden="true"> · </span>}
                            <span data-testid="business-profile-taxonomy-chip">{p.label}</span>
                          </span>
                        ))
                      ) : (
                        categoryName
                      )}
                    </span>
                  )}

                  <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-muted-foreground sm:mt-3 sm:gap-x-3 sm:gap-y-1.5 sm:text-sm">
                    {cityName && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-accent" />
                        <span dir="auto">{cityName}</span>
                      </div>
                    )}
                    {business.contact_person && (
                      <div className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5 text-accent" />
                        <span dir="auto" className="truncate max-w-[120px]">{business.contact_person}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                      <span className="font-semibold text-foreground">{Number(business.rating_avg ?? 0).toFixed(1)}</span>
                      <span className="tech-content">({business.rating_count ?? 0})</span>
                    </div>
                    <div className="hidden sm:flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{memberDate}</span>
                    </div>
                  </div>

                  <BusinessIdentityStrip
                    business={business}
                    className="mt-2"
                    linkUsername={false}
                  />
                </div>

                <div className="hidden sm:flex shrink-0 items-center gap-2">
                  <Button variant="hero" size="app" className="gap-1.5" onClick={onContact} disabled={isContacting}>
                    {isContacting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                    {language === "ar" ? "تواصل" : "Contact"}
                  </Button>
                  <Button
                    variant="outline"
                    size="appIcon"
                    className="dark:border-border/40"
                    onClick={handleShare}
                    aria-label={language === "ar" ? "مشاركة" : "Share"}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {shortDesc && (
                <p dir="auto" className="mt-2 hidden max-w-3xl text-sm leading-relaxed text-muted-foreground sm:block sm:mt-3">{shortDesc}</p>
              )}

              {topServices.length > 0 && (
                <div className="mt-2 hidden flex-wrap items-center gap-1.5 sm:mt-3 sm:flex">
                  {topServices.slice(0, 4).map((s, idx) => {
                    const label = getLocalizedValue(language, s.name_ar, s.name_en);
                    if (!label) return null;
                    return (
                      <span
                        key={idx}
                        dir="auto"
                        className="inline-flex items-center px-2.5 py-1 rounded-lg bg-primary/5 text-primary border border-primary/15 text-[11px] sm:text-xs font-body truncate max-w-[180px]"
                      >
                        {label}
                      </span>
                    );
                  })}
                  {serviceCount > 4 && (
                    <span className="inline-flex items-center px-2 py-1 rounded-lg bg-muted text-muted-foreground text-[11px] sm:text-xs font-body tech-content">
                      +{serviceCount - 4}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Mobile description (full width below logo+name) */}
          {shortDesc && (
            <p dir="auto" className="mt-3 line-clamp-3 text-xs leading-relaxed text-muted-foreground sm:hidden">{shortDesc}</p>
          )}

          {/* Mobile quick action row */}
          <div className="mt-3 flex items-center gap-2 sm:hidden">
            <Button variant="hero" size="sm" className="h-10 flex-1 gap-1.5 rounded-xl" onClick={onContact} disabled={isContacting}>
              {isContacting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
              {language === "ar" ? "تواصل" : "Contact"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-10 w-10 shrink-0 rounded-xl p-0 dark:border-border/40"
              onClick={handleShare}
              aria-label={language === "ar" ? "مشاركة" : "Share"}
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-3 grid grid-cols-4 gap-1.5 border-t border-border/30 pt-3 dark:border-border/20 sm:mt-5 sm:gap-4 sm:pt-4">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col items-center justify-center gap-1 rounded-xl bg-muted/30 px-1.5 py-2 dark:bg-muted/15 sm:flex-row sm:gap-3 sm:rounded-2xl sm:px-3 sm:py-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10 dark:bg-accent/20 sm:h-10 sm:w-10 sm:rounded-2xl">
                  <stat.icon className="h-3.5 w-3.5 text-accent sm:h-5 sm:w-5" />
                </div>
                <div className="text-center sm:text-start">
                  <div className="font-heading text-sm font-bold text-foreground leading-none sm:text-lg">{stat.value}</div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground sm:text-xs">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
};
