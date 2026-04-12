import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import {
  FolderOpen, Building2, DollarSign, Clock, ArrowLeft, ArrowRight,
  Eye, Bookmark, Share2, Crown, Star, BadgeCheck,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { LazyImage } from "@/components/ui/lazy-image";
import { cn } from "@/lib/utils";

/* ── helpers ─────────────────────────────────────────── */
const fmt = (n: number) => {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return n.toString();
};

const tierConfig: Record<string, { label: string; labelEn: string; icon: any; cls: string }> = {
  enterprise: { label: 'بلاتيني', labelEn: 'Platinum', icon: Crown, cls: 'bg-purple-500/90 text-white' },
  premium:    { label: 'ذهبي',    labelEn: 'Gold',     icon: Star,  cls: 'bg-gold/90 text-secondary-foreground' },
  basic:      { label: 'أساسي',   labelEn: 'Basic',    icon: BadgeCheck, cls: 'bg-sky-500/90 text-white' },
};

/* ── skeleton ────────────────────────────────────────── */
const ProjectSkeleton = () => (
  <div className="rounded-2xl overflow-hidden border border-border bg-card">
    <Skeleton className="aspect-[16/10] w-full" />
    <div className="p-5 space-y-3">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
    </div>
  </div>
);

/* ── main component ──────────────────────────────────── */
export const LatestProjectsSection = () => {
  const { language, isRTL } = useLanguage();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['latest-projects-home'],
    queryFn: async () => {
      const { data } = await supabase
        .from('projects')
        .select('*, businesses(username, name_ar, name_en, logo_url, membership_tier, is_verified)')
        .eq('status', 'published')
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(6);
      return data || [];
    },
  });

  const { ref: sectionRef, isVisible } = useScrollAnimation();

  if (!isLoading && projects.length === 0) return null;

  return (
    <section ref={sectionRef} className="py-16 sm:py-28 bg-muted/20 dark:bg-card/5 relative overflow-hidden">
      {/* decorative */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />

      <div className="container px-4 sm:px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-10 sm:mb-14">
          <div>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 text-accent text-xs sm:text-sm font-body font-semibold mb-3">
              {isRTL ? 'أعمالنا' : 'Our Work'}
            </span>
            <h2 className="font-heading font-bold text-xl sm:text-3xl md:text-4xl text-foreground mt-1.5">
              {isRTL ? 'أحدث المشاريع المنجزة' : 'Latest Completed Projects'}
            </h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-lg">
              {isRTL
                ? 'استعرض أحدث المشاريع من مزودي خدمات معتمدين ومصانع رائدة'
                : 'Browse the latest projects from verified providers and leading manufacturers'}
            </p>
          </div>
          <Link to="/projects">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs sm:text-sm">
              {isRTL ? 'عرض الكل' : 'View All'}
              {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </Button>
          </Link>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => <ProjectSkeleton key={i} />)
            : projects.map((p: any, i: number) => {
                const biz = p.businesses;
                const tier = biz?.membership_tier;
                const tierCfg = tierConfig[tier];
                const TierIcon = tierCfg?.icon;

                return (
                  <Link
                    key={p.id}
                    to={`/projects/${p.id}`}
                    className={cn(
                      'group relative rounded-2xl overflow-hidden border bg-card transition-all duration-500 block',
                      'border-border/50 hover:border-accent/40 hover:shadow-xl hover:shadow-accent/5 sm:hover:-translate-y-1.5',
                      p.is_featured && 'ring-1 ring-gold/30',
                      isVisible ? 'animate-fade-in' : 'opacity-0'
                    )}
                    style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'both' }}
                  >
                    {/* Image */}
                    <div className="aspect-[16/10] bg-muted relative overflow-hidden">
                      {p.cover_image_url ? (
                        <LazyImage
                          src={p.cover_image_url}
                          alt={p.title_ar}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                          wrapperClassName="w-full h-full"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/60">
                          <FolderOpen className="w-12 h-12 text-muted-foreground/15" />
                        </div>
                      )}

                      {/* Overlay gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                      {/* Top badges row */}
                      <div className="absolute top-3 inset-x-3 flex items-start justify-between">
                        {/* Featured */}
                        {p.is_featured && (
                          <span className="bg-gold text-secondary-foreground text-[10px] px-2.5 py-1 rounded-full font-bold shadow-lg flex items-center gap-1">
                            <Star className="w-3 h-3" />
                            {isRTL ? 'مميز' : 'Featured'}
                          </span>
                        )}
                        {!p.is_featured && <span />}

                        {/* Membership tier badge */}
                        {tierCfg && (
                          <span className={cn('text-[10px] px-2.5 py-1 rounded-full font-bold shadow-lg flex items-center gap-1', tierCfg.cls)}>
                            <TierIcon className="w-3 h-3" />
                            {isRTL ? tierCfg.label : tierCfg.labelEn}
                          </span>
                        )}
                      </div>

                      {/* Stats overlay (bottom of image) */}
                      <div className="absolute bottom-0 inset-x-0 p-3 flex items-center gap-3 text-white/90 text-[11px] font-medium bg-gradient-to-t from-black/60 to-transparent">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" />
                          {fmt(p.views_count || 0)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Bookmark className="w-3.5 h-3.5" />
                          {fmt(p.saves_count || 0)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Share2 className="w-3.5 h-3.5" />
                          {fmt(p.shares_count || 0)}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 sm:p-5 space-y-3">
                      <h3 className="font-heading font-bold text-sm sm:text-base line-clamp-1 group-hover:text-accent transition-colors">
                        {language === 'ar' ? p.title_ar : (p.title_en || p.title_ar)}
                      </h3>

                      {(p.description_ar || p.description_en) && (
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {language === 'ar' ? p.description_ar : (p.description_en || p.description_ar)}
                        </p>
                      )}

                      {/* Cost & duration chips */}
                      <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                        {p.project_cost && (
                          <span className="flex items-center gap-1 bg-muted/80 dark:bg-muted/40 px-2.5 py-1 rounded-full">
                            <DollarSign className="w-3 h-3 text-accent" />
                            {Number(p.project_cost).toLocaleString()} SAR
                          </span>
                        )}
                        {p.duration_days && (
                          <span className="flex items-center gap-1 bg-muted/80 dark:bg-muted/40 px-2.5 py-1 rounded-full">
                            <Clock className="w-3 h-3 text-accent" />
                            {p.duration_days} {isRTL ? 'يوم' : 'days'}
                          </span>
                        )}
                      </div>

                      {/* Provider row */}
                      {biz && (
                        <div className="flex items-center gap-2.5 pt-3 border-t border-border/30">
                          {biz.logo_url ? (
                            <img src={biz.logo_url} alt="" className="w-7 h-7 rounded-full object-cover ring-1 ring-border/30" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center">
                              <Building2 className="w-3.5 h-3.5 text-accent" />
                            </div>
                          )}
                          <span className="text-sm font-semibold text-accent flex items-center gap-1.5 truncate">
                            {language === 'ar' ? biz.name_ar : (biz.name_en || biz.name_ar)}
                            {biz.is_verified && <BadgeCheck className="w-3.5 h-3.5 text-sky-500 shrink-0" />}
                          </span>
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
        </div>
      </div>
    </section>
  );
};
