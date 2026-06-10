import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Building2,
  Calendar,
  FolderOpen,
  GitBranch,
  Globe,
  MapPin,
  Phone,
  Sparkles,
  Star,
  TrendingUp,
  Wrench,
} from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { getLocalizedValue } from "@/lib/direction";
import { useBi } from "@/components/common/Bilingual";
import { fmtNum } from "@/lib/format";
import { Stars } from "./BusinessProfileHeader";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useBranches,
  usePortfolio,
  useProjects,
  useReviews,
  useServices,
  useCertifications,
  useAwards,
  type BusinessWithJoins,
} from "./business-profile.data";
import { CredentialsSection } from "./CredentialsSection";
import { useBusinessTaxonomyDisplay } from "@/modules/taxonomy/search-integration";
import { Badge } from "@/components/ui/badge";

interface OverviewTabProps {
  business: BusinessWithJoins;
  onJumpToTab?: (tab: string) => void;
}

const SectionTitle = ({
  icon: Icon,
  title,
  action,
}: {
  icon: React.ElementType;
  title: string;
  action?: React.ReactNode;
}) => (
  <div className="mb-3 flex items-center justify-between gap-2">
    <h3 className="flex items-center gap-2 font-heading text-sm font-bold text-foreground sm:text-base">
      <Icon className="h-4 w-4 text-accent" />
      {title}
    </h3>
    {action}
  </div>
);

export const OverviewTab = ({ business, onJumpToTab }: OverviewTabProps) => {
  const { language, isRTL } = useLanguage();
  const bi = useBi();
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  const { data: services = [], isLoading: servicesLoading } = useServices(business.id);
  const { data: projects = [], isLoading: projectsLoading } = useProjects(business.id);
  const { data: portfolio = [] } = usePortfolio(business.id);
  const { data: branches = [] } = useBranches(business.id);
  const { data: reviews = [] } = useReviews(business.id);
  const { data: certifications = [] } = useCertifications(business.id);
  const { data: awards = [] } = useAwards(business.id);

  const desc = getLocalizedValue(
    language,
    business.description_ar || business.short_description_ar,
    business.description_en || business.short_description_en,
  );
  const cityName = getLocalizedValue(language, business.cities?.name_ar, business.cities?.name_en);
  // Phase 2.3 — Public UI is taxonomy-only. We no longer fall back to
  // `business.categories.name_*` for display; when no modern taxonomy is
  // present we show a localized "Unclassified" label.
  const taxonomy = useBusinessTaxonomyDisplay(business.id, language);
  // Safe Batch 4 — multi-primary aware label for the small stats grid.
  const primaryChips = taxonomy.primaries;
  const categoryName =
    primaryChips.length > 0
      ? primaryChips.map((p) => p.label).join(" · ")
      : (taxonomy.hasModernTaxonomy && taxonomy.primaryLabel) ||
        bi("غير مصنّف", "Unclassified");
  // Grouped specialties: one block per primary activity → secondaries + services nested.
  const taxonomyGroups = taxonomy.groups;
  const hasAnySpecialties = taxonomyGroups.some(
    (g) => g.secondaries.length > 0 || g.services.length > 0 || g.primary,
  );
  const memberYear = new Date(business.created_at).getFullYear();
  const yearsActive = Math.max(1, new Date().getFullYear() - memberYear + 1);

  const ratingAvg = Number(business.rating_avg ?? 0);
  const ratingCount = Number(business.rating_count ?? 0);

  // Build a small rating distribution from the reviews list we already have.
  const distribution: Array<{ stars: number; count: number; pct: number }> = (() => {
    const buckets = [0, 0, 0, 0, 0];
    reviews.forEach((r) => {
      const rating = Math.max(1, Math.min(5, Math.round(Number(r.rating ?? 0))));
      buckets[rating - 1] += 1;
    });
    const total = reviews.length || 1;
    return [5, 4, 3, 2, 1].map((s) => ({
      stars: s,
      count: buckets[s - 1],
      pct: Math.round((buckets[s - 1] / total) * 100),
    }));
  })();

  const featuredProjects = projects
    .slice()
    .sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0))
    .slice(0, 3);
  const topServices = services.slice(0, 3);
  const featuredPortfolio = portfolio.filter((p) => p.media_type === "image").slice(0, 4);

  return (
    <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-3">
      {/* About card — spans 2 cols on large screens */}
      <section className="rounded-2xl border border-border/40 bg-card p-4 dark:border-border/20 sm:p-5 lg:col-span-2">
        <SectionTitle icon={Building2} title={bi("نبذة عن الجهة", "About this provider")} />
        {desc ? (
          <p dir="auto" className="text-sm leading-relaxed text-muted-foreground sm:text-[15px]">{desc}</p>
        ) : (
          <p className="text-sm italic text-muted-foreground/70">
            {bi("لم تُضف الجهة وصفاً بعد.", "This provider hasn't added a description yet.")}
          </p>
        )}

        <dl className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4 sm:gap-3 sm:text-sm">
          {/* Years active — gradient + animated trending pulse */}
          <div className="group relative overflow-hidden rounded-xl border border-accent/20 bg-gradient-to-br from-accent/10 via-accent/5 to-transparent px-3 py-2.5 transition-all hover:border-accent/40 hover:shadow-md dark:from-accent/15 dark:via-accent/5">
            <div className="absolute -end-3 -top-3 h-12 w-12 rounded-full bg-accent/10 blur-xl transition-opacity group-hover:opacity-100" />
            <div className="relative flex items-start justify-between gap-2">
              <div className="min-w-0">
                <dt className="text-[10px] font-medium text-muted-foreground sm:text-[11px]">
                  {bi("سنوات النشاط", "Years active")}
                </dt>
                <dd className="mt-0.5 flex items-baseline gap-1">
                  <span className="font-heading text-lg font-black text-foreground tech-content sm:text-2xl">{yearsActive}</span>
                  <span className="text-[10px] font-bold text-accent sm:text-xs">+</span>
                </dd>
                <div className="mt-0.5 text-[9px] text-muted-foreground/80 sm:text-[10px]">
                  {bi(`منذ ${memberYear}`, `since ${memberYear}`)}
                </div>
              </div>
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
                <TrendingUp className="h-3.5 w-3.5" />
              </div>
            </div>
          </div>

          {/* Sector / classification */}
          <div className="group relative overflow-hidden rounded-xl border border-primary/15 bg-gradient-to-br from-primary/8 via-primary/3 to-transparent px-3 py-2.5 transition-all hover:border-primary/30 hover:shadow-md dark:from-primary/15">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <dt className="text-[10px] font-medium text-muted-foreground sm:text-[11px]">
                  {bi("التصنيف", "Sector")}
                </dt>
                <dd dir="auto" className="mt-0.5 line-clamp-2 font-heading text-[12px] font-bold text-foreground sm:text-[13px]">
                  {categoryName}
                </dd>
              </div>
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
            </div>
          </div>

          {/* Head office city */}
          <div className="group relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-muted/60 to-muted/10 px-3 py-2.5 transition-all hover:border-accent/30 hover:shadow-md dark:from-muted/30 dark:to-muted/5 dark:border-border/20">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <dt className="text-[10px] font-medium text-muted-foreground sm:text-[11px]">
                  {bi("المقر الرئيسي", "Head office")}
                </dt>
                <dd dir="auto" className="mt-0.5 truncate font-heading text-[13px] font-bold text-foreground sm:text-[15px]">
                  {cityName || "—"}
                </dd>
              </div>
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-foreground/5 text-foreground/70 dark:bg-foreground/10">
                <MapPin className="h-3.5 w-3.5" />
              </div>
            </div>
          </div>

          {/* Branches count — clickable */}
          <button
            type="button"
            onClick={() => branches.length > 0 && onJumpToTab?.("branches")}
            disabled={branches.length === 0}
            className="group relative overflow-hidden rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent px-3 py-2.5 text-start transition-all hover:border-emerald-500/40 hover:shadow-md disabled:cursor-default disabled:hover:border-emerald-500/20 disabled:hover:shadow-none dark:from-emerald-500/15"
            aria-label={bi("عرض الفروع", "View branches")}
          >
            <div className="absolute -end-3 -bottom-3 h-12 w-12 rounded-full bg-emerald-500/10 blur-xl" />
            <div className="relative flex items-start justify-between gap-2">
              <div className="min-w-0">
                <dt className="text-[10px] font-medium text-muted-foreground sm:text-[11px]">
                  {bi("الفروع النشطة", "Active branches")}
                </dt>
                <dd className="mt-0.5 flex items-baseline gap-1">
                  <span className="font-heading text-lg font-black text-foreground tech-content sm:text-2xl">{branches.length}</span>
                  {branches.length > 0 && (
                    <span className="text-[9px] text-emerald-600 dark:text-emerald-400 sm:text-[10px]">
                      {bi("نشط", "live")}
                    </span>
                  )}
                </dd>
              </div>
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <GitBranch className="h-3.5 w-3.5" />
              </div>
            </div>
          </button>
        </dl>

        {hasAnySpecialties ? (
          <div className="mt-3 space-y-2">
            <div className="text-[10px] font-medium text-muted-foreground sm:text-[11px]">
              {bi("التخصصات والخدمات", "Specialties & services")}
            </div>
            <div className="space-y-2">
              {taxonomyGroups.map((group, gi) => (
                <div
                  key={`${group.primary?.id ?? "ungrouped"}-${gi}`}
                  className="rounded-xl border border-border/40 bg-muted/20 p-2.5 dark:border-border/20 dark:bg-muted/10"
                >
                  <div className="flex items-center gap-1.5">
                    {group.primary ? (
                      <span className="inline-flex items-center gap-1 rounded-md border border-accent/25 bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">
                        {group.primary.label}
                      </span>
                    ) : (
                      <span className="text-[11px] italic text-muted-foreground">
                        {bi("تخصصات أخرى", "Other specialties")}
                      </span>
                    )}
                    {group.inferred && (
                      <span className="text-[10px] text-muted-foreground/70">
                        {bi("(مستنتج)", "(inferred)")}
                      </span>
                    )}
                  </div>
                  {(group.secondaries.length > 0 || group.services.length > 0) && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {group.secondaries.map((c) => (
                        <Badge
                          key={`sec-${c.id}`}
                          variant="secondary"
                          className="px-2 py-0.5 text-[10px] sm:text-[11px] font-normal"
                        >
                          {c.label}
                        </Badge>
                      ))}
                      {group.services.map((c) => (
                        <Badge
                          key={`svc-${c.id}`}
                          variant="outline"
                          className="px-2 py-0.5 text-[10px] sm:text-[11px] font-normal"
                        >
                          {c.label}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-3 text-[11px] italic text-muted-foreground/80">
            {bi("لم يتم تحديد التخصصات بعد", "Specialties not specified yet")}
          </div>
        )}

        {business.website && (
          <a
            href={business.website}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline sm:text-sm"
          >
            <Globe className="h-3.5 w-3.5" />
            {bi("الموقع الإلكتروني", "Visit website")}
            <ArrowIcon className="h-3 w-3" />
          </a>
        )}
      </section>

      {/* Rating summary */}
      <section className="rounded-2xl border border-border/40 bg-card p-4 dark:border-border/20 sm:p-5">
        <SectionTitle
          icon={Star}
          title={bi("تقييمات العملاء", "Customer reviews")}
          action={
            ratingCount > 0 ? (
              <button
                type="button"
                onClick={() => onJumpToTab?.("reviews")}
                className="text-[11px] font-medium text-accent hover:underline sm:text-xs"
              >
                {bi("الكل", "See all")}
              </button>
            ) : null
          }
        />
        {ratingCount === 0 ? (
          <p className="text-sm italic text-muted-foreground/70">
            {bi("لا توجد تقييمات بعد.", "No reviews yet.")}
          </p>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="text-center">
                <div className="font-heading text-3xl font-black text-foreground tech-content sm:text-4xl">
                  {ratingAvg.toFixed(1)}
                </div>
                <Stars rating={Math.round(ratingAvg)} size="w-3.5 h-3.5" />
                <div className="mt-1 text-[10px] text-muted-foreground tech-content sm:text-xs">
                  ({ratingCount})
                </div>
              </div>
              <ul className="min-w-0 flex-1 space-y-1.5">
                {distribution.map((row) => (
                  <li key={row.stars} className="flex items-center gap-2 text-[11px] sm:text-xs">
                    <span className="w-3 text-end tech-content text-muted-foreground">{row.stars}</span>
                    <Star className="h-3 w-3 fill-accent text-accent" />
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-accent transition-all"
                        style={{ width: `${row.pct}%` }}
                      />
                    </div>
                    <span className="w-7 text-end tech-content text-muted-foreground">{row.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </section>

      {/* Top services */}
      <section className="rounded-2xl border border-border/40 bg-card p-4 dark:border-border/20 sm:p-5 lg:col-span-2">
        <SectionTitle
          icon={Wrench}
          title={bi("أبرز الخدمات", "Highlighted services")}
          action={
            services.length > 0 ? (
              <button
                type="button"
                onClick={() => onJumpToTab?.("services")}
                className="text-[11px] font-medium text-accent hover:underline sm:text-xs"
              >
                {bi(`عرض كل (${services.length})`, `View all (${services.length})`)}
              </button>
            ) : null
          }
        />
        {servicesLoading ? (
          <div className="grid gap-2 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : topServices.length === 0 ? (
          <p className="text-sm italic text-muted-foreground/70">
            {bi("لم تُضف خدمات بعد.", "No services added yet.")}
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-3">
            {topServices.map((s) => {
              const name = getLocalizedValue(language, s.name_ar, s.name_en);
              const description = getLocalizedValue(language, s.description_ar, s.description_en);
              return (
                <article
                  key={s.id}
                  className="rounded-xl border border-border/30 bg-muted/20 p-3 transition-colors hover:border-accent/40 dark:border-border/15 dark:bg-muted/10"
                >
                  <div className="flex items-start gap-2">
                    <Wrench className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                    <div className="min-w-0">
                      <h4 dir="auto" className="line-clamp-1 font-heading text-[13px] font-semibold text-foreground">
                        {name}
                      </h4>
                      {description && (
                        <p dir="auto" className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                          {description}
                        </p>
                      )}
                      {(s.price_from || s.price_to) && (
                        <p dir="ltr" className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-accent tech-content">
                          {s.price_from != null ? fmtNum(Number(s.price_from)) : ""}
                          {s.price_from && s.price_to ? " - " : ""}
                          {s.price_to != null ? fmtNum(Number(s.price_to)) : ""} {s.currency_code}
                        </p>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Featured projects */}
      <section className="rounded-2xl border border-border/40 bg-card p-4 dark:border-border/20 sm:p-5 lg:col-span-2">
        <SectionTitle
          icon={FolderOpen}
          title={bi("مشاريع مختارة", "Featured projects")}
          action={
            projects.length > 0 ? (
              <button
                type="button"
                onClick={() => onJumpToTab?.("projects")}
                className="text-[11px] font-medium text-accent hover:underline sm:text-xs"
              >
                {bi(`عرض كل (${projects.length})`, `View all (${projects.length})`)}
              </button>
            ) : null
          }
        />
        {projectsLoading ? (
          <div className="grid gap-2 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : featuredProjects.length === 0 ? (
          <p className="text-sm italic text-muted-foreground/70">
            {bi("لا توجد مشاريع منشورة بعد.", "No projects published yet.")}
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-3">
            {featuredProjects.map((p) => {
              const title = getLocalizedValue(language, p.title_ar, p.title_en);
              return (
                <Link
                  key={p.id}
                  to={`/projects/${p.id}`}
                  className="group block overflow-hidden rounded-xl border border-border/30 bg-muted/10 transition-colors hover:border-accent/40 dark:border-border/15"
                >
                  <div className="relative aspect-[4/3] bg-muted">
                    {p.cover_image_url ? (
                      <img
                        src={p.cover_image_url}
                        alt={title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Building2 className="h-8 w-8 text-muted-foreground/20" />
                      </div>
                    )}
                    {p.is_featured && (
                      <span className="absolute start-1.5 top-1.5 rounded-md bg-accent px-1.5 py-0.5 text-[9px] font-semibold text-accent-foreground">
                        <Award className="me-0.5 inline h-2.5 w-2.5" />
                        {bi("مميز", "Featured")}
                      </span>
                    )}
                  </div>
                  <div className="p-2">
                    <h4 dir="auto" className="line-clamp-2 font-heading text-[12px] font-semibold text-foreground group-hover:text-accent">
                      {title}
                    </h4>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Location / branches */}
      <section className="rounded-2xl border border-border/40 bg-card p-4 dark:border-border/20 sm:p-5">
        <SectionTitle icon={MapPin} title={bi("الموقع والفروع", "Location & branches")} />
        <ul className="space-y-2 text-[12px] sm:text-sm">
          {cityName && (
            <li className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 text-accent" />
              <span dir="auto">{cityName}</span>
            </li>
          )}
          {business.address && (
            <li className="flex items-start gap-2 text-muted-foreground">
              <Building2 className="mt-0.5 h-3.5 w-3.5 text-accent" />
              <span dir="auto" className="line-clamp-2">{business.address}</span>
            </li>
          )}
          <li className="flex items-center gap-2 text-muted-foreground">
            <GitBranch className="h-3.5 w-3.5 text-accent" />
            <span>
              {bi(`${branches.length} فرع نشط`, `${branches.length} active branches`)}
            </span>
          </li>
          <li className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 text-accent" />
            <span className="tech-content">
              {bi(`عضو منذ ${memberYear}`, `Member since ${memberYear}`)}
            </span>
          </li>
        </ul>
        {branches.length > 0 && (
          <button
            type="button"
            onClick={() => onJumpToTab?.("branches")}
            className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-accent hover:underline sm:text-xs"
          >
            {bi("عرض كل الفروع", "View all branches")}
            <ArrowIcon className="h-3 w-3" />
          </button>
        )}
      </section>

      {/* Featured portfolio strip */}
      {featuredPortfolio.length > 0 && (
        <section className="rounded-2xl border border-border/40 bg-card p-4 dark:border-border/20 sm:p-5 lg:col-span-3">
          <SectionTitle
            icon={Award}
            title={bi("من معرض الأعمال", "From the portfolio")}
            action={
              <button
                type="button"
                onClick={() => onJumpToTab?.("portfolio")}
                className="text-[11px] font-medium text-accent hover:underline sm:text-xs"
              >
                {bi("استعرض الكل", "Browse all")}
              </button>
            }
          />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {featuredPortfolio.map((p) => {
              const title = getLocalizedValue(language, p.title_ar, p.title_en);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onJumpToTab?.("portfolio")}
                  className="group relative aspect-square overflow-hidden rounded-xl border border-border/30 dark:border-border/15"
                >
                  <img
                    src={p.media_url}
                    alt={title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <p dir="auto" className="line-clamp-1 text-[10px] text-white">{title}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Verified credentials — certifications & awards. Renders nothing
          when both lists are empty (component handles its own guard). */}
      {(certifications.length > 0 || awards.length > 0) && (
        <div className="lg:col-span-3">
          <CredentialsSection certifications={certifications} awards={awards} />
        </div>
      )}
    </div>
  );
};

export default OverviewTab;