import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { FolderOpen, Building2, DollarSign, Clock, ArrowLeft, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { LazyImage } from "@/components/ui/lazy-image";

const ProjectSkeleton = () => (
  <div className="rounded-2xl overflow-hidden border border-border bg-card">
    <Skeleton className="aspect-video w-full" />
    <div className="p-4 space-y-3">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <div className="flex items-center gap-2 pt-2">
        <Skeleton className="w-6 h-6 rounded-full" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  </div>
);

export const LatestProjectsSection = () => {
  const { language, isRTL } = useLanguage();
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['latest-projects-home'],
    queryFn: async () => {
      const { data } = await supabase
        .from('projects')
        .select('*, businesses(username, name_ar, name_en, logo_url)')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(6);
      return data || [];
    },
  });

  const { ref: sectionRef, isVisible } = useScrollAnimation();

  if (!isLoading && projects.length === 0) return null;

  return (
    <section ref={sectionRef} className="py-16 sm:py-24 bg-background">
      <div className="container px-4 sm:px-6">
        <div className="flex items-center justify-between mb-8 sm:mb-12">
          <div>
            <span className="text-xs sm:text-sm font-body text-gold font-semibold">
              {isRTL ? 'أعمالنا' : 'Our Work'}
            </span>
            <h2 className="font-heading font-bold text-xl sm:text-3xl md:text-4xl text-foreground mt-1 sm:mt-2">
              {isRTL ? 'أحدث المشاريع المنجزة' : 'Latest Completed Projects'}
            </h2>
          </div>
          <Link to="/projects">
            <Button variant="outline" size="sm" className="gap-1 text-xs sm:text-sm">
              {isRTL ? 'عرض الكل' : 'View All'}
              {isRTL ? <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <ProjectSkeleton key={i} />)
          ) : (
            projects.map((p: any, i: number) => (
              <div key={p.id} className={`group rounded-2xl overflow-hidden border border-border hover:border-gold/40 bg-card transition-all duration-500 hover:shadow-lg hover-scale ${isVisible ? 'animate-fade-in' : ''}`} style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'both' }}>
                <div className="aspect-video bg-muted relative overflow-hidden">
                  {p.cover_image_url ? (
                    <LazyImage src={p.cover_image_url} alt={p.title_ar} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" wrapperClassName="w-full h-full" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FolderOpen className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground/20" />
                    </div>
                  )}
                  {p.is_featured && (
                    <span className="absolute top-2 start-2 bg-gold text-secondary-foreground text-[10px] px-2 py-0.5 rounded-full font-bold">
                      {isRTL ? 'مميز' : 'Featured'}
                    </span>
                  )}
                </div>
                <div className="p-3 sm:p-4 space-y-2">
                  <h3 className="font-heading font-bold text-base sm:text-lg line-clamp-1">
                    {language === 'ar' ? p.title_ar : (p.title_en || p.title_ar)}
                  </h3>
                  {(p.description_ar || p.description_en) && (
                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                      {language === 'ar' ? p.description_ar : (p.description_en || p.description_ar)}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {p.project_cost && (
                      <span className="flex items-center gap-1 bg-muted dark:bg-muted/50 px-2 py-1 rounded-full">
                        <DollarSign className="w-3 h-3" />{Number(p.project_cost).toLocaleString()} SAR
                      </span>
                    )}
                    {p.duration_days && (
                      <span className="flex items-center gap-1 bg-muted dark:bg-muted/50 px-2 py-1 rounded-full">
                        <Clock className="w-3 h-3" />{p.duration_days} {isRTL ? 'يوم' : 'days'}
                      </span>
                    )}
                  </div>
                  {p.businesses && (
                    <Link to={`/${p.businesses.username}`} className="flex items-center gap-2 pt-2 border-t border-border/30">
                      {p.businesses.logo_url ? (
                        <img src={p.businesses.logo_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gold/10 flex items-center justify-center">
                          <Building2 className="w-3 h-3 text-gold" />
                        </div>
                      )}
                      <span className="text-sm font-medium text-gold">
                        {language === 'ar' ? p.businesses.name_ar : (p.businesses.name_en || p.businesses.name_ar)}
                      </span>
                    </Link>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
};
