import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, CalendarDays, FolderOpen, Image as ImageIcon,
  MapPin, Play, Sparkles, Tag,
} from "lucide-react";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/i18n/LanguageContext";
import { usePageMeta } from "@/hooks/usePageMeta";
import {
  useBusinessByUsername, useProjects, usePortfolio,
} from "@/components/business-profile/business-profile.data";
import { getLocalizedValue } from "@/lib/direction";

/**
 * Dedicated, portfolio-first showcase page for a provider's works.
 * Route: /works/:username — distinct, richer visual layout vs. the
 * tabbed BusinessProfile. No new business logic; reuses existing data hooks.
 */
const BusinessWorks = () => {
  const { username } = useParams<{ username: string }>();
  const { language, isRTL } = useLanguage();
  const ArrowFwd = isRTL ? ArrowLeft : ArrowRight;

  const { data: business, isLoading: bLoading } = useBusinessByUsername(username);
  const { data: projects = [], isLoading: pLoading } = useProjects(business?.id);
  const { data: portfolio = [], isLoading: foLoading } = usePortfolio(business?.id);

  const businessName = business
    ? getLocalizedValue(business.name_ar, business.name_en, language) || business.username
    : "";

  usePageMeta({
    title: business
      ? (isRTL ? `أعمال ${businessName} | قِطاعات` : `${businessName} — Works | Qitaat`)
      : (isRTL ? "أعمال المزود" : "Provider works"),
    description: isRTL
      ? `استعرض مشاريع وأعمال ${businessName} في قطاعات الألمنيوم والزجاج والحديد والخشب.`
      : `Browse projects and portfolio works delivered by ${businessName}.`,
  });

  const featuredProject = useMemo(
    () => projects.find((p) => p.is_featured) ?? projects[0] ?? null,
    [projects],
  );
  const otherProjects = useMemo(
    () => projects.filter((p) => p.id !== featuredProject?.id),
    [projects, featuredProject],
  );

  if (bLoading) {
    return (
      <div className="container-app py-10">
        <Skeleton className="h-72 w-full rounded-3xl" />
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="container-app py-20 text-center">
        <p className="text-muted-foreground">
          {isRTL ? "لم يتم العثور على المزود." : "Provider not found."}
        </p>
      </div>
    );
  }

  const totalWorks = projects.length + portfolio.length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20" dir={isRTL ? "rtl" : "ltr"}>
      {/* Hero strip */}
      <section className="relative overflow-hidden border-b border-border/40 bg-gradient-to-br from-primary/5 via-accent/5 to-transparent">
        <div className="container-app py-8 sm:py-12">
          <Link
            to={`/${business.username}`}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowFwd className="h-3.5 w-3.5 rotate-180" />
            <span>{isRTL ? "العودة إلى صفحة الجهة" : "Back to provider page"}</span>
          </Link>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <Badge variant="outline" className="mb-3 gap-1.5 border-primary/30 bg-primary/5 text-primary">
                <Sparkles className="h-3 w-3" />
                {isRTL ? "معرض الأعمال" : "Works showcase"}
              </Badge>
              <h1 className="text-2xl font-bold sm:text-3xl">
                {isRTL ? `أعمال ${businessName}` : `Works by ${businessName}`}
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {isRTL
                  ? `${totalWorks} عمل منشور — مشاريع منفّذة ومحفظة بصرية.`
                  : `${totalWorks} published items — delivered projects and visual portfolio.`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Stat icon={<FolderOpen className="h-3.5 w-3.5" />} label={isRTL ? "مشاريع" : "Projects"} value={projects.length} />
              <Stat icon={<ImageIcon className="h-3.5 w-3.5" />} label={isRTL ? "محفظة" : "Portfolio"} value={portfolio.length} />
            </div>
          </div>
        </div>
      </section>

      <main className="container-app py-8 sm:py-12 space-y-12">
        {/* Featured project */}
        {featuredProject && (
          <section>
            <SectionHeader
              title={isRTL ? "مشروع مميّز" : "Featured project"}
              hint={isRTL ? "أحدث وأبرز ما تم تنفيذه" : "Latest highlighted delivery"}
            />
            <FeaturedProjectCard project={featuredProject} businessUsername={business.username} />
          </section>
        )}

        {/* Projects grid */}
        {otherProjects.length > 0 && (
          <section>
            <SectionHeader
              title={isRTL ? "مشاريع منفّذة" : "Delivered projects"}
              hint={isRTL ? `${otherProjects.length} مشروع إضافي` : `${otherProjects.length} more projects`}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {otherProjects.map((p) => (
                <ProjectCard key={p.id} project={p} businessUsername={business.username} />
              ))}
            </div>
          </section>
        )}

        {/* Portfolio mosaic */}
        {portfolio.length > 0 && (
          <section>
            <SectionHeader
              title={isRTL ? "محفظة الأعمال" : "Visual portfolio"}
              hint={isRTL ? `${portfolio.length} عنصر بصري` : `${portfolio.length} visual items`}
            />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {portfolio.map((item) => (
                <PortfolioTile key={item.id} item={item} language={language} />
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {!pLoading && !foLoading && totalWorks === 0 && (
          <div className="rounded-3xl border border-dashed border-border/60 bg-card/40 px-6 py-16 text-center">
            <FolderOpen className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">
              {isRTL ? "لا توجد أعمال منشورة بعد." : "No published works yet."}
            </p>
            <Button asChild variant="outline" size="sm" className="mt-4">
              <Link to={`/${business.username}`}>
                {isRTL ? "زيارة الصفحة الرئيسية للجهة" : "Visit provider page"}
              </Link>
            </Button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

/* ───────────── sub-components ───────────── */

const Stat = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) => (
  <div className="flex items-center gap-2 rounded-xl border border-border/40 bg-card/70 px-3 py-2 text-xs shadow-sm">
    <span className="text-primary">{icon}</span>
    <span className="text-muted-foreground">{label}</span>
    <span className="font-bold tech-content">{value}</span>
  </div>
);

const SectionHeader = ({ title, hint }: { title: string; hint: string }) => (
  <div className="mb-4 flex items-end justify-between gap-3">
    <h2 className="text-lg font-bold sm:text-xl">{title}</h2>
    <span className="text-xs text-muted-foreground">{hint}</span>
  </div>
);

interface ProjectLike {
  id: string;
  title_ar: string | null;
  title_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  cover_image_url: string | null;
  is_featured: boolean | null;
  duration_days: number | null;
  project_cost: number | null;
  currency_code: string | null;
  categories?: { name_ar: string | null; name_en: string | null } | null;
  cities?: { name_ar: string | null; name_en: string | null } | null;
}

const FeaturedProjectCard = ({ project, businessUsername }: { project: ProjectLike; businessUsername: string | null }) => {
  const { language, isRTL } = useLanguage();
  const title = getLocalizedValue(project.title_ar, project.title_en, language) || (isRTL ? "مشروع" : "Project");
  const desc = getLocalizedValue(project.description_ar, project.description_en, language) || "";
  const cat = project.categories ? getLocalizedValue(project.categories.name_ar, project.categories.name_en, language) : null;
  const city = project.cities ? getLocalizedValue(project.cities.name_ar, project.cities.name_en, language) : null;

  return (
    <Link
      to={`/projects/${project.id}`}
      className="group block overflow-hidden rounded-3xl border border-border/40 bg-card shadow-sm transition-all hover:shadow-xl hover-lift"
    >
      <div className="grid grid-cols-1 lg:grid-cols-5">
        <div className="relative aspect-[16/10] overflow-hidden bg-muted lg:col-span-3 lg:aspect-auto">
          {project.cover_image_url ? (
            <img
              src={project.cover_image_url}
              alt={title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <ImageIcon className="h-12 w-12" />
            </div>
          )}
          <Badge className="absolute start-3 top-3 gap-1 bg-primary/90 backdrop-blur">
            <Sparkles className="h-3 w-3" />
            {isRTL ? "مميّز" : "Featured"}
          </Badge>
        </div>
        <div className="flex flex-col justify-between gap-3 p-5 lg:col-span-2 lg:p-6">
          <div>
            {cat && (
              <Badge variant="outline" className="mb-2 gap-1 text-[10px]">
                <Tag className="h-2.5 w-2.5" /> {cat}
              </Badge>
            )}
            <h3 className="text-lg font-bold leading-snug sm:text-xl">{title}</h3>
            {desc && <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{desc}</p>}
          </div>
          <dl className="grid grid-cols-2 gap-2 text-[11px]">
            {city && (
              <Meta icon={<MapPin className="h-3 w-3" />} label={city} />
            )}
            {project.duration_days != null && (
              <Meta
                icon={<CalendarDays className="h-3 w-3" />}
                label={isRTL ? `${project.duration_days} يوم` : `${project.duration_days} days`}
              />
            )}
          </dl>
        </div>
      </div>
    </Link>
  );
};

const ProjectCard = ({ project, businessUsername }: { project: ProjectLike; businessUsername: string | null }) => {
  const { language, isRTL } = useLanguage();
  const title = getLocalizedValue(project.title_ar, project.title_en, language) || (isRTL ? "مشروع" : "Project");
  const city = project.cities ? getLocalizedValue(project.cities.name_ar, project.cities.name_en, language) : null;

  return (
    <Link
      to={`/projects/${project.id}`}
      className="group block overflow-hidden rounded-2xl border border-border/40 bg-card shadow-sm transition-all hover:shadow-md hover-lift"
    >
      <div className="relative aspect-[16/11] overflow-hidden bg-muted">
        {project.cover_image_url ? (
          <img
            src={project.cover_image_url}
            alt={title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <ImageIcon className="h-8 w-8" />
          </div>
        )}
      </div>
      <div className="p-3.5">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{title}</h3>
        {city && (
          <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <MapPin className="h-3 w-3" /> {city}
          </p>
        )}
      </div>
    </Link>
  );
};

const Meta = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <div className="inline-flex items-center gap-1.5 rounded-lg bg-muted/50 px-2 py-1 text-muted-foreground">
    {icon}<span className="truncate">{label}</span>
  </div>
);

interface PortfolioItem {
  id: string;
  title_ar: string | null;
  title_en: string | null;
  media_type: string | null;
  media_url: string | null;
  is_featured: boolean | null;
}

const PortfolioTile = ({ item, language }: { item: PortfolioItem; language: string }) => {
  const title = getLocalizedValue(item.title_ar, item.title_en, language) || "";
  const isVideo = item.media_type === "video";
  return (
    <div className="group relative aspect-square overflow-hidden rounded-2xl border border-border/40 bg-muted shadow-sm">
      {item.media_url ? (
        isVideo ? (
          <>
            <video src={item.media_url} className="h-full w-full object-cover" muted playsInline preload="metadata" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
              <Play className="h-8 w-8 text-white" />
            </div>
          </>
        ) : (
          <img
            src={item.media_url}
            alt={title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        )
      ) : (
        <div className="flex h-full items-center justify-center text-muted-foreground">
          <ImageIcon className="h-8 w-8" />
        </div>
      )}
      {title && (
        <div className="absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-black/80 to-transparent p-2.5 text-[11px] text-white transition-transform group-hover:translate-y-0">
          <span className="line-clamp-2">{title}</span>
        </div>
      )}
      {item.is_featured && (
        <Badge className="absolute start-2 top-2 gap-1 bg-primary/90 text-[10px] backdrop-blur">
          <Sparkles className="h-2.5 w-2.5" />
        </Badge>
      )}
    </div>
  );
};

export default BusinessWorks;