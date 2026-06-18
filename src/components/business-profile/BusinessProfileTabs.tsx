import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  Calendar,
  DollarSign,
  ExternalLink,
  FolderOpen,
  GitBranch,
  Globe,
  Hash,
  Image as ImageIcon,
  Mail,
  MapPin,
  MapPinned,
  MessageSquare,
  MessageCircle,
  Navigation,
  Phone,
  PhoneCall,
  Star,
  User,
  Video,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/i18n/LanguageContext";
import { getLocalizedValue, useDirection } from "@/lib/direction";
import { cn } from "@/lib/utils";
import { maskPhone, maskEmail } from "@/lib/masking";
import { fmtNum } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { recordPortfolioView } from "@/modules/portfolio/views";
import {
  useBranches,
  usePortfolio,
  useProjects,
  useReviews,
  useServices,
  useBranchServiceIds,
} from "./business-profile.data";
import { Stars } from "./BusinessProfileHeader";
import { recordBranchVisit } from "@/modules/branchTelemetry";
import { track } from "@/lib/analytics-events";
import { BranchAnalyticsPanel } from "./BranchAnalyticsPanel";
import { WorkingHoursDisplay } from "@/components/businesses/working-hours/WorkingHoursDisplay";
import { ProjectCategoryTabs, type ProjectCategoryTab } from "@/components/project/ProjectCategoryTabs";

const EmptyState = ({ icon: Icon, text }: { icon: React.ElementType; text: string }) => (
  <div className="py-12 text-center sm:py-16">
    <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/30 dark:bg-muted/15">
      <Icon className="h-8 w-8 text-muted-foreground/20" />
    </div>
    <p className="text-sm text-muted-foreground">{text}</p>
  </div>
);

const getVideoEmbedUrl = (url: string) => {
  try {
    if (url.includes("youtube.com/watch")) {
      const videoId = new URL(url).searchParams.get("v");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }

    if (url.includes("youtu.be/")) {
      const videoId = url.split("youtu.be/")[1]?.split(/[?&]/)[0];
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }

    if (url.includes("vimeo.com/")) {
      const videoId = url.match(/vimeo\.com\/(\d+)/)?.[1];
      return videoId ? `https://player.vimeo.com/video/${videoId}` : null;
    }
  } catch {
    return null;
  }

  return null;
};

export const ServicesTab = ({
  businessId,
  businessName,
  branchId,
}: {
  businessId: string;
  businessName: string;
  branchId?: string;
}) => {
  const { language } = useLanguage();
  const { data: allServices, isLoading } = useServices(businessId);
  const { data: branchServiceIds } = useBranchServiceIds(branchId);
  // When viewing a branch, restrict to services explicitly linked to that
  // branch. If the branch has no explicit links, show all business services
  // (mirrors BranchDetail's behaviour so a brand-new branch isn't empty).
  const services = (() => {
    if (!branchId) return allServices;
    const ids = branchServiceIds ?? [];
    if (!allServices) return allServices;
    if (ids.length === 0) return allServices;
    return allServices.filter((s) => ids.includes(s.id));
  })();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 rounded-3xl" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-36 rounded-3xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!services?.length) {
    return <EmptyState icon={Wrench} text={language === "ar" ? "لا توجد خدمات بعد" : "No services yet"} />;
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-3.5 sm:rounded-[1.75rem] sm:p-8">
        <div
          className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 70% 30%, hsl(var(--accent) / 0.5) 0%, transparent 50%)" }}
        />
        <div className="relative z-10 flex items-center gap-3 sm:gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/20 sm:h-16 sm:w-16 sm:rounded-2xl">
            <Wrench className="h-5 w-5 text-accent sm:h-8 sm:w-8" />
          </div>
          <div className="min-w-0">
            <h2 className="font-heading text-base font-bold text-primary-foreground sm:text-xl">
              {language === "ar" ? "خدماتنا" : "Our Services"}
            </h2>
            <p className="mt-0.5 text-[11px] text-primary-foreground/70 sm:text-sm">
              {language === "ar"
                ? `${services.length} خدمة متاحة من ${businessName}`
                : `${services.length} services available from ${businessName}`}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
        {services.map((service, index) => {
          const name = getLocalizedValue(language, service.name_ar, service.name_en);
          const description = getLocalizedValue(language, service.description_ar, service.description_en);

          return (
            <article
              key={service.id}
              className="animate-fade-in rounded-2xl border border-border/30 bg-card p-3 transition-all duration-300 hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5 active:scale-[0.98] dark:border-border/15 dark:bg-card/80 sm:rounded-[1.5rem] sm:p-5"
              style={{ animationDelay: `${index * 60}ms`, animationFillMode: "both" }}
            >
              <div className="flex items-start gap-2.5 sm:gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 transition-colors group-hover:bg-accent group-hover:text-accent-foreground dark:bg-accent/15 sm:h-11 sm:w-11 sm:rounded-xl">
                  <Wrench className="h-4 w-4 text-accent sm:h-5 sm:w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 dir="auto" className="mb-1 line-clamp-2 font-heading text-[13px] font-bold text-foreground leading-tight sm:text-base">{name}</h3>
                  {description && (
                    <p dir="auto" className="mb-2 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground sm:mb-3 sm:text-sm">
                      {description}
                    </p>
                  )}

                  {(service.price_from || service.price_to) && (
                    <div dir="ltr" className="inline-flex items-center gap-1 rounded-md bg-accent/5 px-2 py-1 text-[11px] dark:bg-accent/10 sm:gap-1.5 sm:rounded-lg sm:px-2.5 sm:py-1.5 sm:text-sm">
                      <DollarSign className="h-3 w-3 text-accent sm:h-3.5 sm:w-3.5" />
                      <span className="tech-content font-semibold text-foreground">
                        {service.price_from ? fmtNum(Number(service.price_from)) : ""}
                        {service.price_from && service.price_to && " - "}
                        {service.price_to ? fmtNum(Number(service.price_to)) : ""}
                      </span>
                      <span className="tech-content text-[10px] text-muted-foreground">{service.currency_code}</span>
                    </div>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};

export const ProjectsTab = ({ businessId }: { businessId: string }) => {
  const { language, isRTL } = useLanguage();
  const { data: projects, isLoading } = useProjects(businessId);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
        {[1, 2, 3, 4].map((item) => (
          <Skeleton key={item} className="h-64 rounded-3xl" />
        ))}
      </div>
    );
  }

  if (!projects?.length) {
    return <EmptyState icon={FolderOpen} text={language === "ar" ? "لا توجد مشاريع بعد" : "No projects yet"} />;
  }

  const uncategorizedKey = "__uncategorized__";
  const categoryKeyOf = (p: typeof projects[number]) => {
    const name = getLocalizedValue(language, p.categories?.name_ar, p.categories?.name_en);
    return name ? `cat:${name}` : uncategorizedKey;
  };
  const tabsMap = new Map<string, ProjectCategoryTab>();
  for (const p of projects) {
    const key = categoryKeyOf(p);
    const label = key === uncategorizedKey
      ? (isRTL ? "غير مصنّف" : "Uncategorized")
      : getLocalizedValue(language, p.categories?.name_ar, p.categories?.name_en) || (isRTL ? "غير مصنّف" : "Uncategorized");
    const existing = tabsMap.get(key);
    if (existing) existing.count += 1;
    else tabsMap.set(key, { id: key, label, count: 1 });
  }
  const tabs = Array.from(tabsMap.values()).sort((a, b) => b.count - a.count);
  const filteredProjects = activeCategory === "all"
    ? projects
    : projects.filter((p) => categoryKeyOf(p) === activeCategory);

  return (
    <div className="space-y-4">
      <ProjectCategoryTabs
        tabs={tabs}
        value={activeCategory}
        onChange={setActiveCategory}
        size="md"
      />
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 sm:gap-5">
      {filteredProjects.map((project, index) => {
        const title = getLocalizedValue(language, project.title_ar, project.title_en);
        const description = getLocalizedValue(language, project.description_ar, project.description_en);
        const cityName = getLocalizedValue(language, project.cities?.name_ar, project.cities?.name_en);
        // Phase 18b — categoryName is resolved from project taxonomy.
        // When a project has no taxonomy link, show a neutral fallback
        // badge instead of hiding it entirely.
        const taxonomyName = getLocalizedValue(language, project.categories?.name_ar, project.categories?.name_en);
        const categoryName = taxonomyName || (isRTL ? "غير مصنّف" : "Uncategorized");

        return (
          <Link key={project.id} to={`/projects/${project.id}`} className="group block">
            <article
              className="animate-fade-in h-full overflow-hidden rounded-2xl border border-border/30 bg-card transition-all duration-500 hover:border-accent/30 hover:shadow-xl hover:shadow-accent/5 active:scale-[0.98] dark:border-border/15 dark:bg-card/80 sm:rounded-[1.5rem]"
              style={{ animationDelay: `${index * 80}ms`, animationFillMode: "both" }}
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-muted sm:aspect-video">
                {project.cover_image_url ? (
                  <img
                    src={project.cover_image_url}
                    alt={title}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-accent/5 to-muted">
                    <Building2 className="h-10 w-10 text-muted-foreground/15" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                {project.is_featured && (
                  <Badge className="absolute start-2 top-2 bg-accent text-[9px] text-accent-foreground shadow-lg sm:text-[10px]">
                    {isRTL ? "⭐ مميز" : "⭐ Featured"}
                  </Badge>
                )}
                {categoryName && (
                  <Badge
                    variant="outline"
                    className="absolute end-2 top-2 hidden border-border/50 bg-background/80 text-[9px] backdrop-blur-sm sm:inline-flex sm:text-[10px] dark:bg-background/60"
                  >
                    {categoryName}
                  </Badge>
                )}
              </div>

              <div className="space-y-1.5 p-2.5 sm:space-y-2 sm:p-4">
                <h3 dir="auto" className="line-clamp-2 font-heading text-[12px] font-bold text-foreground leading-tight transition-colors group-hover:text-accent sm:text-sm">
                  {title}
                </h3>
                {description && (
                  <p dir="auto" className="hidden line-clamp-2 text-[10px] leading-relaxed text-muted-foreground sm:block sm:text-xs">
                    {description}
                  </p>
                )}
                <div className="flex items-center justify-between gap-1 border-t border-border/20 pt-1.5 text-[10px] text-muted-foreground dark:border-border/10 sm:pt-2 sm:text-[11px]">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 min-w-0">
                    {cityName && (
                      <span className="flex items-center gap-0.5 truncate">
                        <MapPin className="h-2.5 w-2.5 text-accent/50" />
                        <span dir="auto" className="truncate">{cityName}</span>
                      </span>
                    )}
                    {project.duration_days && (
                      <span className="flex items-center gap-0.5">
                        <Calendar className="h-2.5 w-2.5 text-accent/50" />
                        <span className="tech-content">{project.duration_days}</span>
                        <span>{isRTL ? "يوم" : "days"}</span>
                      </span>
                    )}
                  </div>
                  {project.project_cost && (
                    <span dir="ltr" className="tech-content shrink-0 text-[10px] font-semibold text-accent sm:text-xs">
                      {fmtNum(Number(project.project_cost))} {project.currency_code}
                    </span>
                  )}
                </div>
              </div>
            </article>
          </Link>
        );
      })}
      </div>
    </div>
  );
};

export const PortfolioTab = ({ businessId }: { businessId: string }) => {
  const { language } = useLanguage();
  const { PrevIcon, NextIcon } = useDirection();
  const { data: items, isLoading } = usePortfolio(businessId);
  const [filter, setFilter] = useState<"all" | "image" | "video">("all");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {[1, 2, 3, 4, 5, 6].map((item) => (
          <Skeleton key={item} className="aspect-square rounded-3xl" />
        ))}
      </div>
    );
  }

  if (!items?.length) {
    return <EmptyState icon={ImageIcon} text={language === "ar" ? "لا توجد أعمال بعد" : "No portfolio items yet"} />;
  }

  const filtered = filter === "all" ? items : items.filter((item) => item.media_type === filter);
  const activeItem = selectedIndex === null ? null : filtered[selectedIndex] ?? null;
  const activeEmbedUrl = activeItem?.media_type === "video" ? getVideoEmbedUrl(activeItem.media_url) : null;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-1.5 sm:mb-6 sm:gap-2">
        {(["all", "image", "video"] as const).map((currentFilter) => (
          <button
            key={currentFilter}
            onClick={() => setFilter(currentFilter)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs transition-all active:scale-95 sm:px-4 sm:text-sm",
              filter === currentFilter
                ? "bg-accent text-accent-foreground shadow-md shadow-accent/20"
                : "bg-muted text-muted-foreground hover:bg-muted/80 dark:bg-muted/50",
            )}
          >
            {currentFilter === "all"
              ? language === "ar"
                ? "الكل"
                : "All"
              : currentFilter === "image"
                ? language === "ar"
                  ? "صور"
                  : "Images"
                : language === "ar"
                  ? "فيديو"
                  : "Videos"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 sm:gap-4">
        {filtered.map((item, index) => {
          const title = getLocalizedValue(language, item.title_ar, item.title_en);

          return (
            <article
              key={item.id}
              className="group relative aspect-square cursor-pointer overflow-hidden rounded-[1.25rem] border border-border/30 transition-all active:scale-[0.97] dark:border-border/15 animate-fade-in"
              style={{ animationDelay: `${index * 50}ms`, animationFillMode: "both" }}
              onClick={() => { setSelectedIndex(index); void recordPortfolioView(item.id, "view"); }}
            >
              {item.media_type === "image" ? (
                <img
                  src={item.media_url}
                  alt={title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-muted dark:bg-muted/50">
                  <Video className="h-10 w-10 text-accent" />
                </div>
              )}

              {item.is_featured && (
                <div className="absolute start-2 top-2 rounded-full bg-accent px-2 py-0.5 text-[9px] text-accent-foreground sm:text-xs">
                  {language === "ar" ? "مميز" : "Featured"}
                </div>
              )}

              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100 sm:p-3">
                <p className="truncate text-[10px] text-white sm:text-xs">{title}</p>
              </div>
            </article>
          );
        })}
      </div>

      {activeItem && selectedIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-3 sm:p-4"
          onClick={() => setSelectedIndex(null)}
          onKeyDown={(e) => { if (e.key === 'Escape') setSelectedIndex(null); }}
          role="dialog"
          aria-modal="true"
          aria-label="Media viewer"
          tabIndex={-1}
        >
          <button className="absolute end-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-2xl font-bold text-white/70 backdrop-blur-sm hover:text-white">
            ✕
          </button>
          <button
            className={cn(
              "absolute start-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white/70 backdrop-blur-sm hover:text-white sm:start-4",
              selectedIndex === 0 && "pointer-events-none opacity-40",
            )}
            onClick={(event) => {
              event.stopPropagation();
              setSelectedIndex(Math.max(0, selectedIndex - 1));
            }}
          >
            <PrevIcon className="h-6 w-6" />
          </button>
          <button
            className={cn(
              "absolute end-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white/70 backdrop-blur-sm hover:text-white sm:end-4",
              selectedIndex === filtered.length - 1 && "pointer-events-none opacity-40",
            )}
            onClick={(event) => {
              event.stopPropagation();
              setSelectedIndex(Math.min(filtered.length - 1, selectedIndex + 1));
            }}
          >
            <NextIcon className="h-6 w-6" />
          </button>

          {activeItem.media_type === "image" ? (
            <img
              src={activeItem.media_url}
              alt={getLocalizedValue(language, activeItem.title_ar, activeItem.title_en)}
              className="max-h-[85vh] max-w-full rounded-lg object-contain"
              onClick={(event) => event.stopPropagation()}
            />
          ) : activeEmbedUrl ? (
            <div className="w-full max-w-5xl overflow-hidden rounded-2xl" onClick={(event) => event.stopPropagation()}>
              <div className="aspect-video w-full overflow-hidden rounded-2xl">
                <iframe
                  title={getLocalizedValue(language, activeItem.title_ar, activeItem.title_en)}
                  src={activeEmbedUrl}
                  className="h-full w-full"
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          ) : (
            <video
              controls
              src={activeItem.media_url}
              className="max-h-[85vh] max-w-full rounded-lg"
              onClick={(event) => event.stopPropagation()}
            />
          )}

          <div className="absolute inset-x-0 bottom-4 flex justify-center">
            <div className="tech-content rounded-full bg-black/50 px-3 py-1 text-xs text-white/70 backdrop-blur-sm">
              {selectedIndex + 1} / {filtered.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const ReviewsTab = ({ business }: { business: any }) => {
  const { language } = useLanguage();
  const { data: reviews, isLoading } = useReviews(business.id);

  const distribution = useMemo(() => {
    if (!reviews?.length) return [0, 0, 0, 0, 0];

    const counts = [0, 0, 0, 0, 0];
    reviews.forEach((review) => {
      if (review.rating >= 1 && review.rating <= 5) counts[review.rating - 1] += 1;
    });
    return counts;
  }, [reviews]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((item) => (
          <Skeleton key={item} className="h-24 rounded-3xl" />
        ))}
      </div>
    );
  }

  if (!reviews?.length) {
    return <EmptyState icon={MessageSquare} text={language === "ar" ? "لا توجد تقييمات بعد" : "No reviews yet"} />;
  }

  const maxCount = Math.max(...distribution, 1);

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-border/30 bg-card p-4 dark:border-border/15 dark:bg-card/80 sm:p-6">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-8">
          <div className="shrink-0 text-center">
            <div className="font-heading text-4xl font-black text-foreground sm:text-5xl">
              {Number(business.rating_avg ?? 0).toFixed(1)}
            </div>
            <Stars rating={Math.round(business.rating_avg ?? 0)} size="h-4 w-4 sm:h-5 sm:w-5" />
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              <span className="tech-content">{business.rating_count ?? 0}</span>{" "}
              {language === "ar" ? "تقييم" : "reviews"}
            </p>
          </div>
          <div className="w-full flex-1 space-y-1.5">
            {[5, 4, 3, 2, 1].map((starValue) => (
              <div key={starValue} className="flex items-center gap-2 text-xs sm:text-sm">
                <span className="tech-content w-3 text-muted-foreground">{starValue}</span>
                <Star className="h-3 w-3 fill-accent text-accent" />
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted/50 dark:bg-muted/30">
                  <div
                    className="h-full rounded-full bg-accent transition-all duration-700"
                    style={{ width: `${(distribution[starValue - 1] / maxCount) * 100}%` }}
                  />
                </div>
                <span className="tech-content w-5 text-end text-[10px] text-muted-foreground">
                  {distribution[starValue - 1]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="space-y-3 sm:space-y-4">
        {reviews.map((review, index) => {
          const profile = review.profiles as any;
          const reviewerName = profile?.full_name || (language === "ar" ? "مستخدم" : "User");
          const reviewDate = new Date(review.created_at).toLocaleDateString(language === "ar" ? "ar-SA-u-nu-latn" : "en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          });

          return (
            <article
              key={review.id}
              className="animate-fade-in rounded-[1.5rem] border border-border/30 bg-card p-4 transition-colors hover:border-accent/15 dark:border-border/15 dark:bg-card/80 sm:p-5"
              style={{ animationDelay: `${index * 50}ms`, animationFillMode: "both" }}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent/20 to-accent/5 ring-2 ring-accent/10 sm:h-11 sm:w-11">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt={reviewerName} className="h-full w-full rounded-full object-cover" loading="lazy" decoding="async"/>
                    ) : (
                      <span className="text-sm font-bold text-accent">{reviewerName.charAt(0)}</span>
                    )}
                  </div>
                  <div>
                    <p className="font-heading text-sm font-semibold text-foreground">{reviewerName}</p>
                    <p className="text-[10px] text-muted-foreground sm:text-xs">{reviewDate}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Stars rating={review.rating} size="h-3.5 w-3.5" />
                  <span className="tech-content text-xs font-bold text-foreground">{review.rating}</span>
                </div>
              </div>
              {review.title && <h4 className="mb-1 font-heading text-sm font-semibold text-foreground">{review.title}</h4>}
              {review.content && <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">{review.content}</p>}
            </article>
          );
        })}
      </div>
    </div>
  );
};

interface BranchesTabProps {
  businessId: string;
  businessName?: string;
  currentBranchId?: string | null;
  onSelectBranch?: (branch: { id: string }) => void;
  isAuthenticated?: boolean;
  onRequestContact?: () => void;
  onRevealContact?: (kind: "phone" | "email") => void;
  isOwner?: boolean;
}

export const BranchesTab = ({
  businessId,
  businessName,
  currentBranchId,
  onSelectBranch,
  isAuthenticated = false,
  onRequestContact,
  onRevealContact,
  isOwner = false,
}: BranchesTabProps) => {
  const { language } = useLanguage();
  const { data: branches, isLoading } = useBranches(businessId);
  const [regionFilter, setRegionFilter] = useState<string>("all");
  // Inline WhatsApp message editor — per-branch open state + draft text.
  const [waEditorOpen, setWaEditorOpen] = useState<string | null>(null);
  const [waDraft, setWaDraft] = useState<string>("");

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[1, 2].map((item) => (
          <Skeleton key={item} className="h-56 rounded-3xl" />
        ))}
      </div>
    );
  }

  if (!branches?.length) {
    return <EmptyState icon={GitBranch} text={language === "ar" ? "لا توجد فروع بعد" : "No branches yet"} />;
  }

  const regions = Array.from(
    new Set(branches.map((b) => b.region).filter((r): r is string => !!r)),
  );
  const visibleBranches =
    regionFilter === "all" ? branches : branches.filter((b) => b.region === regionFilter);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
      {isOwner && branches && branches.length > 0 && (
        <div className="sm:col-span-2">
          <BranchAnalyticsPanel businessId={businessId} branches={branches} />
        </div>
      )}
      {!isAuthenticated && onRequestContact && (
        <div className="rounded-2xl border border-accent/20 bg-accent/5 p-3 sm:col-span-2 sm:p-4">
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {language === "ar"
              ? "لحماية المورّد، تظهر بيانات تواصل الفروع بشكل مخفي للزوار. أرسل طلبك وسيتواصل معك مباشرة."
              : "Branch contact details are masked for guests. Send a request and the supplier will reach out directly."}
          </p>
          <Button
            type="button"
            variant="primary"
            size="sm"
            className="mt-3 h-10 w-full gap-1.5 rounded-xl sm:w-auto"
            onClick={onRequestContact}
          >
            <MessageSquare className="h-4 w-4" />
            {language === "ar" ? "تواصل مع المورّد" : "Contact supplier"}
          </Button>
        </div>
      )}
      {regions.length > 1 && (
        <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-muted-foreground">
            {language === "ar" ? "تصفية حسب المنطقة:" : "Filter by region:"}
          </span>
          <button
            type="button"
            onClick={() => setRegionFilter("all")}
            className={cn(
              "rounded-full border px-3 py-1 text-[11px] transition-colors",
              regionFilter === "all"
                ? "border-accent bg-accent/10 text-accent"
                : "border-border/40 text-muted-foreground hover:border-accent/30",
            )}
          >
            {language === "ar" ? `الكل (${branches.length})` : `All (${branches.length})`}
          </button>
          {regions.map((r) => {
            const count = branches.filter((b) => b.region === r).length;
            return (
              <button
                key={r}
                type="button"
                onClick={() => setRegionFilter(r)}
                className={cn(
                  "rounded-full border px-3 py-1 text-[11px] transition-colors",
                  regionFilter === r
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border/40 text-muted-foreground hover:border-accent/30",
                )}
              >
                {r} ({count})
              </button>
            );
          })}
        </div>
      )}
      {visibleBranches.map((branch, index) => {
        const name = getLocalizedValue(language, branch.name_ar, branch.name_en);
        const cityName = branch.cities
          ? getLocalizedValue(language, branch.cities.name_ar, branch.cities.name_en)
          : null;
        const addressParts = [
          cityName,
          branch.district,
          branch.region,
          branch.street_name,
          branch.building_number && (language === "ar" ? `مبنى ${branch.building_number}` : `Bldg ${branch.building_number}`),
        ].filter(Boolean);
        const mapHrefForAddress =
          branch.latitude && branch.longitude
            ? `https://www.google.com/maps?q=${branch.latitude},${branch.longitude}`
            : addressParts.length > 0
              ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([name, ...addressParts].join(", "))}`
              : null;

        // Phone/email are masked + tel:/mailto: stripped for unauthenticated
        // visitors. Authenticated users see real values and trigger a
        // `supplier_*_revealed` analytics event when tapping a link.
        const phoneItem = (icon: React.ElementType, label: string, value: string) => ({
          icon, label,
          value: isAuthenticated ? value : maskPhone(value),
          href: isAuthenticated ? `tel:${value}` : undefined,
          dir: "ltr" as const,
          revealKind: "phone" as const,
        });
        const emailItem = (icon: React.ElementType, label: string, value: string) => ({
          icon, label,
          value: isAuthenticated ? value : maskEmail(value),
          href: isAuthenticated ? `mailto:${value}` : undefined,
          dir: "ltr" as const,
          revealKind: "email" as const,
        });
        const contactItems = [
          branch.contact_person && { icon: User, label: language === "ar" ? "مسؤول التواصل" : "Contact Person", value: branch.contact_person },
          branch.phone && phoneItem(Phone, language === "ar" ? "الهاتف" : "Phone", branch.phone),
          branch.mobile && phoneItem(PhoneCall, language === "ar" ? "الجوال" : "Mobile", branch.mobile),
          branch.unified_number && phoneItem(Hash, language === "ar" ? "الرقم الموحد" : "Unified Number", branch.unified_number),
          branch.customer_service_phone && phoneItem(PhoneCall, language === "ar" ? "خدمة العملاء" : "Customer Service", branch.customer_service_phone),
          branch.email && emailItem(Mail, language === "ar" ? "البريد" : "Email", branch.email),
          branch.website && { icon: Globe, label: language === "ar" ? "الموقع" : "Website", value: branch.website.replace(/^https?:\/\//, ""), dir: "ltr" as const, href: branch.website, external: true, leadType: "website" as const },
        ].filter(Boolean) as Array<{ icon: React.ElementType; label: string; value: string; dir?: "ltr"; href?: string; external?: boolean; leadType?: "website"; revealKind?: "phone" | "email" }>;

        return (
          <article
            key={branch.id}
            className="animate-fade-in overflow-hidden rounded-[1.5rem] border border-border/30 bg-card transition-all hover:border-accent/20 dark:border-border/15 dark:bg-card/80"
            style={{ animationDelay: `${index * 80}ms`, animationFillMode: "both" }}
          >
            <div className="border-b border-border/20 p-4 dark:border-border/10 sm:p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 dark:bg-accent/15 sm:h-12 sm:w-12">
                  <MapPinned className="h-5 w-5 text-accent sm:h-6 sm:w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  {businessName && (
                    <p className="truncate text-[11px] font-medium text-muted-foreground/80">
                      {businessName}
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    {onSelectBranch ? (
                      <button
                        type="button"
                        onClick={() => onSelectBranch(branch)}
                        dir="auto"
                        className={cn(
                          "truncate text-start font-heading text-sm font-bold transition sm:text-base",
                          currentBranchId === branch.id ? "text-accent" : "text-foreground hover:text-accent",
                        )}
                      >
                        {name}
                      </button>
                    ) : (
                      <h3 dir="auto" className="truncate font-heading text-sm font-bold text-foreground sm:text-base">{name}</h3>
                    )}
                    {branch.is_main && (
                      <Badge className="shrink-0 border-accent/30 bg-accent/10 text-[10px] text-accent">
                        {language === "ar" ? "رئيسي" : "Main"}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {addressParts.length > 0 && (
                <div className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent/50" />
                  <span dir="auto" className="flex-1">{addressParts.join("، ")}</span>
                  {mapHrefForAddress && (
                    <a
                      href={mapHrefForAddress}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent transition hover:bg-accent/15"
                      aria-label={language === "ar" ? "الوصول للموقع عبر خرائط قوقل" : "Open in Google Maps"}
                    >
                      <Navigation className="h-3 w-3" />
                      {language === "ar" ? "الوصول للموقع" : "Directions"}
                    </a>
                  )}
                </div>
              )}

              <div className="mt-3">
                <WorkingHoursDisplay
                  isRTL={language === "ar"}
                  value={(branch as { working_hours?: unknown }).working_hours}
                  compact
                />
              </div>
            </div>

            {contactItems.length > 0 && (
              <div className="space-y-2.5 p-4 sm:p-5">
                {contactItems.map((item, contactIndex) => {
                  const Wrapper: any = item.href ? "a" : "div";
                  const wrapperProps = item.href
                    ? { href: item.href, ...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {}) }
                    : {};
                  if (item.href && item.leadType) {
                    (wrapperProps as Record<string, string>)["data-contact-type"] = item.leadType;
                  }
                  if (item.href && item.revealKind && onRevealContact) {
                    (wrapperProps as Record<string, unknown>).onClick = () => onRevealContact(item.revealKind!);
                  }

                  return (
                    <Wrapper
                      key={contactIndex}
                      {...wrapperProps}
                      className="group flex items-center gap-2.5 transition-colors hover:text-accent"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/5 dark:bg-accent/10">
                        <item.icon className="h-3.5 w-3.5 text-accent/70" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] text-muted-foreground/70">{item.label}</p>
                        <p
                          dir={item.dir || "auto"}
                          className={cn(
                            "truncate text-xs font-medium text-foreground sm:text-sm",
                            item.dir && "tech-content",
                          )}
                        >
                          {item.value}
                        </p>
                      </div>
                      {item.external && <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground/40" />}
                    </Wrapper>
                  );
                })}
              </div>
            )}

            {(() => {
              const callNumber = isAuthenticated ? (branch.phone || branch.mobile) : null;
              const waNumber = isAuthenticated
                ? ((branch as { whatsapp?: string | null }).whatsapp || branch.phone || branch.mobile)
                : null;
              const mapHref =
                branch.latitude && branch.longitude
                  ? `https://www.google.com/maps?q=${branch.latitude},${branch.longitude}`
                  : addressParts.length > 0
                    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([name, ...addressParts].join(", "))}`
                    : null;
              if (!callNumber && !waNumber && !mapHref) return null;
              const sanitizeWa = (n: string) => n.replace(/[^\d+]/g, "").replace(/^\+/, "");
              // Per-branch prefilled WhatsApp message — "quote request" template.
              const bizLabel = businessName ? `${businessName} — ${name}` : name;
              const waText =
                language === "ar"
                  ? `السلام عليكم،\nأرغب في الحصول على عرض سعر من ${bizLabel}.\nشكراً لكم.`
                  : `Hello,\nI'd like to request a price quote from ${bizLabel}.\nThank you.`;
              const waHref = waNumber
                ? `https://wa.me/${sanitizeWa(waNumber)}?text=${encodeURIComponent(waText)}`
                : null;
              const trackBranch = (
                kind: "call" | "whatsapp" | "map",
                dbEvent: "phone_reveal" | "whatsapp_click" | "share",
              ) => {
                void recordBranchVisit({ businessId, branchId: branch.id, eventType: dbEvent });
                track.leadContactClick({
                  business_slug: branch.slug || undefined,
                  contact_type: kind,
                  source_page: "branch_card",
                  is_authenticated: isAuthenticated,
                });
              };
              return (
                <div className="grid grid-cols-3 gap-2 border-t border-border/20 p-3 dark:border-border/10 sm:p-4">
                  {callNumber ? (
                    <a
                      href={`tel:${callNumber}`}
                      onClick={() => {
                        trackBranch("call", "phone_reveal");
                        onRevealContact?.("phone");
                      }}
                      className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-accent/10 text-[11px] font-medium text-accent transition hover:bg-accent/15 sm:text-xs"
                      aria-label={language === "ar" ? "اتصال" : "Call"}
                    >
                      <Phone className="h-3.5 w-3.5" />
                      {language === "ar" ? "اتصال" : "Call"}
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={onRequestContact}
                      className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-muted/40 text-[11px] font-medium text-muted-foreground transition hover:bg-muted/60 sm:text-xs"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      {language === "ar" ? "اتصال" : "Call"}
                    </button>
                  )}
                  {waHref ? (
                    <button
                      type="button"
                      onClick={() => {
                        setWaDraft(waText);
                        setWaEditorOpen((cur) => (cur === branch.id ? null : branch.id));
                      }}
                      className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-emerald-500/10 text-[11px] font-medium text-emerald-600 transition hover:bg-emerald-500/15 dark:text-emerald-400 sm:text-xs"
                      aria-label="WhatsApp"
                      aria-expanded={waEditorOpen === branch.id}
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      {language === "ar" ? "واتساب" : "WhatsApp"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={onRequestContact}
                      className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-muted/40 text-[11px] font-medium text-muted-foreground transition hover:bg-muted/60 sm:text-xs"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      {language === "ar" ? "واتساب" : "WhatsApp"}
                    </button>
                  )}
                  {mapHref ? (
                    <a
                      href={mapHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackBranch("map", "share")}
                      className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-sky-500/10 text-[11px] font-medium text-sky-600 transition hover:bg-sky-500/15 dark:text-sky-400 sm:text-xs"
                      aria-label={language === "ar" ? "الموقع" : "Map"}
                    >
                      <Navigation className="h-3.5 w-3.5" />
                      {language === "ar" ? "الموقع" : "Map"}
                    </a>
                  ) : (
                    <span className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-muted/30 text-[11px] font-medium text-muted-foreground/60 sm:text-xs">
                      <Navigation className="h-3.5 w-3.5" />
                      {language === "ar" ? "الموقع" : "Map"}
                    </span>
                  )}
                </div>
              );
            })()}

            {waEditorOpen === branch.id && (() => {
              const waNumberLive = isAuthenticated
                ? ((branch as { whatsapp?: string | null }).whatsapp || branch.phone || branch.mobile)
                : null;
              if (!waNumberLive) return null;
              const sanitize = (n: string) => n.replace(/[^\d+]/g, "").replace(/^\+/, "");
              const sendHref = `https://wa.me/${sanitize(waNumberLive)}?text=${encodeURIComponent(waDraft)}`;
              return (
                <div className="border-t border-emerald-500/15 bg-emerald-500/5 p-3 sm:p-4">
                  <label className="mb-1.5 block text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                    {language === "ar" ? "معاينة الرسالة قبل الإرسال" : "Preview message before sending"}
                  </label>
                  <Textarea
                    value={waDraft}
                    onChange={(e) => setWaDraft(e.target.value)}
                    dir="auto"
                    rows={4}
                    maxLength={1000}
                    className="min-h-0 w-full rounded-xl border-emerald-500/30 bg-background p-2.5 text-xs leading-relaxed focus-visible:ring-emerald-500/40"
                  />
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-muted-foreground tech-content">
                      {waDraft.length}/1000
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setWaEditorOpen(null)}
                        className="rounded-lg px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-muted/40"
                      >
                        {language === "ar" ? "إلغاء" : "Cancel"}
                      </button>
                      <a
                        href={sendHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => {
                          void recordBranchVisit({ businessId, branchId: branch.id, eventType: "whatsapp_click" });
                          track.leadContactClick({
                            business_slug: branch.slug || undefined,
                            contact_type: "whatsapp",
                            source_page: "branch_card",
                            is_authenticated: isAuthenticated,
                          });
                          onRevealContact?.("phone");
                          setWaEditorOpen(null);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-700"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        {language === "ar" ? "إرسال عبر واتساب" : "Send on WhatsApp"}
                      </a>
                    </div>
                  </div>
                </div>
              );
            })()}

            {branch.latitude && branch.longitude && (
              <div className="px-4 pb-4 sm:px-5 sm:pb-5">
                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href={`https://www.google.com/maps?q=${branch.latitude},${branch.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[10px] text-accent hover:underline sm:text-xs"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {language === "ar" ? "فتح في خرائط Google" : "Open in Google Maps"}
                  </a>
                  {onSelectBranch && (
                    <button
                      type="button"
                      onClick={() => onSelectBranch(branch)}
                      className="inline-flex items-center gap-1.5 text-[10px] font-medium text-accent hover:underline sm:text-xs"
                    >
                      {currentBranchId === branch.id
                        ? language === "ar" ? "الفرع الحالي" : "Current branch"
                        : language === "ar" ? "عرض هذا الفرع" : "View this branch"}
                    </button>
                  )}
                </div>
              </div>
            )}
            {!(branch.latitude && branch.longitude) && onSelectBranch && (
              <div className="px-4 pb-4 sm:px-5 sm:pb-5">
                <button
                  type="button"
                  onClick={() => onSelectBranch(branch)}
                  className="inline-flex items-center gap-1.5 text-[10px] font-medium text-accent hover:underline sm:text-xs"
                >
                  {currentBranchId === branch.id
                    ? language === "ar" ? "الفرع الحالي" : "Current branch"
                    : language === "ar" ? "عرض هذا الفرع" : "View this branch"}
                </button>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
};

interface ContactTabProps {
  business: any;
  isAuthenticated?: boolean;
  onRequestContact?: () => void;
  onRevealContact?: (kind: "phone" | "email") => void;
}

export const ContactTab = ({
  business,
  isAuthenticated = false,
  onRequestContact,
  onRevealContact,
}: ContactTabProps) => {
  const { language } = useLanguage();
  const cityName = getLocalizedValue(language, business.cities?.name_ar, business.cities?.name_en);
  const countryName = getLocalizedValue(language, business.countries?.name_ar, business.countries?.name_en);

  // Phone/email are masked for unauthenticated visitors to deter scraping.
  // Authenticated users see real values + tel:/mailto: links and trigger
  // a `supplier_*_revealed` analytics event when they tap one.
  const buildPhoneItem = (icon: React.ElementType, label: string, value: string) => ({
    icon,
    label,
    value: isAuthenticated ? value : maskPhone(value),
    href: isAuthenticated ? `tel:${value}` : undefined,
    dir: "ltr" as const,
    revealKind: "phone" as const,
  });
  const buildEmailItem = (icon: React.ElementType, label: string, value: string) => ({
    icon,
    label,
    value: isAuthenticated ? value : maskEmail(value),
    href: isAuthenticated ? `mailto:${value}` : undefined,
    dir: "ltr" as const,
    revealKind: "email" as const,
  });

  const contactItems = [
    business.contact_person && { icon: User, label: language === "ar" ? "مسؤول التواصل" : "Contact Person", value: business.contact_person },
    business.phone && buildPhoneItem(Phone, language === "ar" ? "اتصل بنا" : "Call us", business.phone),
    business.mobile && buildPhoneItem(PhoneCall, language === "ar" ? "الجوال" : "Mobile", business.mobile),
    business.unified_number && buildPhoneItem(Hash, language === "ar" ? "الرقم الموحد" : "Unified Number", business.unified_number),
    business.customer_service_phone && buildPhoneItem(PhoneCall, language === "ar" ? "خدمة العملاء" : "Customer Service", business.customer_service_phone),
    business.email && buildEmailItem(Mail, language === "ar" ? "راسلنا" : "Email us", business.email),
    business.website && { icon: Globe, label: language === "ar" ? "الموقع" : "Website", value: business.website.replace(/^https?:\/\//, ""), href: business.website, dir: "ltr" as const, external: true, leadType: "website" as const },
  ].filter(Boolean) as Array<{ icon: React.ElementType; label: string; value: string; href?: string; dir?: "ltr"; external?: boolean; leadType?: "website"; revealKind?: "phone" | "email" }>;

  const addressParts = [
    business.district,
    business.street_name,
    business.building_number && (language === "ar" ? `مبنى ${business.building_number}` : `Bldg ${business.building_number}`),
    business.region,
  ].filter(Boolean);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 sm:gap-6">
      <div className="space-y-3">
        {!isAuthenticated && onRequestContact && (
          <div className="rounded-2xl border border-accent/20 bg-accent/5 p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {language === "ar"
                ? "لحماية المورّد، تظهر بيانات التواصل بشكل مخفي للزوار. أرسل طلبك عبر النموذج وسيتواصل معك مباشرة."
                : "Contact details are masked for guests. Send a request and the supplier will reach out to you directly."}
            </p>
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="mt-3 h-10 w-full gap-1.5 rounded-xl sm:w-auto"
              onClick={onRequestContact}
            >
              <MessageSquare className="h-4 w-4" />
              {language === "ar" ? "تواصل مع المورّد" : "Contact supplier"}
            </Button>
          </div>
        )}

        {contactItems.map((item, index) => {
          const Wrapper: any = item.href ? "a" : "div";
          const wrapperProps = item.href
            ? { href: item.href, ...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {}) }
            : {};
          if (item.href && item.leadType) {
            (wrapperProps as Record<string, string>)["data-contact-type"] = item.leadType;
          }
          if (item.href && item.revealKind && onRevealContact) {
            (wrapperProps as Record<string, unknown>).onClick = () => onRevealContact(item.revealKind!);
          }

          return (
            <Wrapper
              key={index}
              {...wrapperProps}
              className="group flex items-center gap-3 rounded-[1.5rem] border border-border/30 bg-card p-3 transition-all hover:border-accent/30 active:scale-[0.98] dark:border-border/15 dark:bg-card/80 sm:gap-4 sm:p-4"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 transition-colors group-hover:bg-accent dark:bg-accent/15 sm:h-12 sm:w-12">
                <item.icon className="h-4 w-4 text-accent group-hover:text-accent-foreground sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-muted-foreground sm:text-xs">{item.label}</p>
                <p
                  dir={item.dir || "auto"}
                  className={cn("truncate text-sm font-medium text-foreground", item.dir && "tech-content")}
                >
                  {item.value}
                </p>
              </div>
              {item.external && <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />}
            </Wrapper>
          );
        })}
      </div>

      <div className="rounded-[1.5rem] border border-border/30 bg-card p-4 dark:border-border/15 dark:bg-card/80 sm:p-5">
        <h3 className="mb-3 flex items-center gap-2 font-heading text-sm font-bold text-foreground sm:text-base">
          <MapPin className="h-4 w-4 text-accent sm:h-5 sm:w-5" />
          {language === "ar" ? "الموقع" : "Location"}
        </h3>
        <div className="mb-3 space-y-2 text-xs text-muted-foreground sm:text-sm">
          {addressParts.length > 0 && <p dir="auto">{addressParts.join("، ")}</p>}
          {business.address && <p dir="auto">{business.address}</p>}
          {(cityName || countryName) && <p dir="auto">{[cityName, countryName].filter(Boolean).join("، ")}</p>}
          {/* national_id removed from public view for security */}
          {business.additional_number && (
            <p className="flex items-center gap-1.5">
              <span className="text-muted-foreground/60">{language === "ar" ? "الرقم الإضافي:" : "Additional No:"}</span>
              <span className="tech-content">{business.additional_number}</span>
            </p>
          )}
        </div>

        {business.latitude && business.longitude ? (
          <div className="space-y-2">
            <div className="media-16-9 overflow-hidden rounded-xl border border-border/30 dark:border-border/15">
              <iframe
                title={language === "ar" ? "موقع المزود" : "Provider location"}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(business.longitude) - 0.01},${Number(business.latitude) - 0.008},${Number(business.longitude) + 0.01},${Number(business.latitude) + 0.008}&layer=mapnik&marker=${business.latitude},${business.longitude}`}
              />
            </div>
            <a
              href={`https://www.google.com/maps?q=${business.latitude},${business.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline sm:text-sm"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {language === "ar" ? "فتح في خرائط Google" : "Open in Google Maps"}
            </a>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground/60 sm:text-sm">
            {language === "ar" ? "لم يتم تحديد الموقع" : "Location not set"}
          </p>
        )}
      </div>
    </div>
  );
};

