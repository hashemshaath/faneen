import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { FolderOpen, Building2, DollarSign, Clock, ArrowLeft, ArrowRight } from "lucide-react";

export const LatestProjectsSection = () => {
  const { language, isRTL } = useLanguage();
  const { data: projects = [] } = useQuery({
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

  if (projects.length === 0) return null;

  return (
    <section className="py-24 bg-background">
      <div className="container">
        <div className="flex items-center justify-between mb-12">
          <div>
            <span className="text-sm font-body text-gold font-semibold">
              {isRTL ? 'أعمالنا' : 'Our Work'}
            </span>
            <h2 className="font-heading font-bold text-3xl md:text-4xl text-foreground mt-2">
              {isRTL ? 'أحدث المشاريع المنجزة' : 'Latest Completed Projects'}
            </h2>
          </div>
          <Link to="/projects">
            <Button variant="outline" size="sm" className="gap-1">
              {isRTL ? 'عرض الكل' : 'View All'}
              {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((p: any) => (
            <div key={p.id} className="group rounded-2xl overflow-hidden border border-border hover:border-gold/40 bg-card transition-all duration-300 hover:shadow-lg">
              <div className="aspect-video bg-muted relative overflow-hidden">
                {p.cover_image_url ? (
                  <img src={p.cover_image_url} alt={p.title_ar} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FolderOpen className="w-12 h-12 text-muted-foreground/20" />
                  </div>
                )}
                {p.is_featured && (
                  <span className="absolute top-2 start-2 bg-gold text-secondary-foreground text-[10px] px-2 py-0.5 rounded-full font-bold">
                    {isRTL ? 'مميز' : 'Featured'}
                  </span>
                )}
              </div>
              <div className="p-4 space-y-2">
                <h3 className="font-heading font-bold text-lg line-clamp-1">
                  {language === 'ar' ? p.title_ar : (p.title_en || p.title_ar)}
                </h3>
                {(p.description_ar || p.description_en) && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {language === 'ar' ? p.description_ar : (p.description_en || p.description_ar)}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {p.project_cost && (
                    <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded-full">
                      <DollarSign className="w-3 h-3" />{Number(p.project_cost).toLocaleString()} SAR
                    </span>
                  )}
                  {p.duration_days && (
                    <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded-full">
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
          ))}
        </div>
      </div>
    </section>
  );
};
