import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  BadgeCheck,
  Clock,
  Crown,
  FolderOpen,
  GitBranch,
  Loader2,
  MapPin,
  MessageSquare,
  Share2,
  Star,
  User,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { getLocalizedValue, useDirection } from "@/lib/direction";
import { tierConfig } from "./business-profile.data";

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
          <div className="flex items-center gap-1.5">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-gradient-gold sm:h-7 sm:w-7">
              <span className="font-heading text-[10px] font-black text-secondary-foreground sm:text-xs">ف</span>
            </div>
            <span className="hidden font-heading text-sm font-bold text-primary-foreground sm:inline dark:text-foreground">
              فنيين
            </span>
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
}

export const BusinessProfileHeader = ({
  business,
  onContact,
  isContacting,
  projectCount,
  serviceCount,
  branchCount,
}: BusinessProfileHeaderProps) => {
  const { t, language, isRTL } = useLanguage();
  const name = getLocalizedValue(language, business.name_ar, business.name_en);
  const shortDesc = getLocalizedValue(
    language,
    business.short_description_ar || business.description_ar,
    business.short_description_en || business.description_en,
  );
  const cityName = getLocalizedValue(language, business.cities?.name_ar, business.cities?.name_en);
  const categoryName = getLocalizedValue(language, business.categories?.name_ar, business.categories?.name_en);
  const memberDate = new Date(business.created_at).toLocaleDateString(language === "ar" ? "ar-SA" : "en-US", {
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
      <div className="relative h-44 overflow-hidden bg-gradient-navy sm:h-60 md:h-80">
        {business.cover_url ? (
          <img src={business.cover_url} alt={name} className="h-full w-full object-cover" loading="eager" />
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

      <div className="container relative z-10 -mt-16 px-3 sm:-mt-24 sm:px-4">
        <div className="rounded-[1.75rem] border border-border/50 bg-card/90 p-4 shadow-xl backdrop-blur-xl dark:border-border/30 dark:bg-card/80 dark:shadow-black/20 sm:p-6">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:gap-6">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-3xl border-2 border-accent/20 bg-background shadow-lg dark:border-accent/30 sm:h-28 sm:w-28">
              {business.logo_url ? (
                <img src={business.logo_url} alt={name} className="h-full w-full object-cover" />
              ) : (
                <span className="font-heading text-3xl font-black text-accent sm:text-4xl">
                  {name.charAt(0) || "ف"}
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2 sm:gap-3">
                    <h1 className="truncate font-heading text-xl font-bold text-foreground sm:text-3xl">
                      {name}
                    </h1>
                    {business.is_verified && (
                      <Badge className="gap-1 border-accent/30 bg-accent/10 text-accent dark:bg-accent/20">
                        <BadgeCheck className="h-3.5 w-3.5" />
                        {t("profile.verified")}
                      </Badge>
                    )}
                    {tier && (
                      <Badge className={`${tier.color} gap-1`}>
                        <Crown className="h-3.5 w-3.5" />
                        {language === "ar" ? tier.labelAr : tier.label}
                      </Badge>
                    )}
                  </div>

                  {categoryName && (
                    <span className="text-sm font-medium text-accent">{categoryName}</span>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground sm:text-sm">
                    {cityName && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-accent" />
                        <span>{cityName}</span>
                      </div>
                    )}
                    {business.contact_person && (
                      <div className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5 text-accent" />
                        <span>{business.contact_person}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                      <span className="font-semibold text-foreground">{Number(business.rating_avg ?? 0).toFixed(1)}</span>
                      <span className="tech-content">({business.rating_count ?? 0})</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{memberDate}</span>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Button variant="hero" size="sm" className="gap-1.5" onClick={onContact} disabled={isContacting}>
                    {isContacting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                    {language === "ar" ? "تواصل" : "Contact"}
                  </Button>
                  <Button variant="outline" size="icon" className="dark:border-border/40" onClick={handleShare}>
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {shortDesc && (
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">{shortDesc}</p>
              )}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 border-t border-border/30 pt-4 dark:border-border/20 sm:grid-cols-4 sm:gap-4">
            {stats.map((stat) => (
              <div key={stat.label} className="flex items-center justify-center gap-3 rounded-2xl bg-muted/30 px-3 py-3 dark:bg-muted/15">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/10 dark:bg-accent/20">
                  <stat.icon className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <div className="font-heading text-lg font-bold text-foreground">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
};
