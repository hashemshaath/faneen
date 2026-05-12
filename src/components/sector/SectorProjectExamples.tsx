import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Briefcase, MapPin, Calendar } from 'lucide-react';

interface Props {
  sectorName: string;
  categoryIds: string[];
}

/**
 * Renders up to 6 real, completed projects in this sector. Pulled from
 * `public.projects` filtered by category_id, only published rows.
 */
export const SectorProjectExamples: React.FC<Props> = ({ sectorName, categoryIds }) => {
  const { isRTL, language } = useLanguage();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['sector-projects', categoryIds],
    enabled: categoryIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from('projects')
        .select('id, title_ar, title_en, cover_image_url, completion_date, business_id, city_id, cities(name_ar, name_en), businesses(username, name_ar, name_en)')
        .in('category_id', categoryIds)
        .eq('status', 'published')
        .order('is_featured', { ascending: false })
        .order('completion_date', { ascending: false, nullsFirst: false })
        .limit(6);
      return data ?? [];
    },
  });

  if (!isLoading && projects.length === 0) return null;

  return (
    <section className="container px-4 pt-10" aria-labelledby="sector-projects-heading">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-info" />
          <h2 id="sector-projects-heading" className="font-heading text-lg sm:text-xl font-bold">
            {isRTL ? `أمثلة أعمال ${sectorName}` : `${sectorName} project examples`}
          </h2>
        </div>
        <Link to="/projects" className="text-xs text-primary hover:underline">
          {isRTL ? 'كل الأعمال' : 'All projects'}
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((p) => {
          const biz = p.businesses as { username?: string; name_ar?: string; name_en?: string | null } | null;
          const city = p.cities as { name_ar?: string; name_en?: string | null } | null;
          const title = language === 'ar' ? p.title_ar : (p.title_en || p.title_ar);
          return (
            <Link key={p.id} to={biz?.username ? `/${biz.username}` : '/projects'} className="block group">
              <Card className="hover-lift overflow-hidden h-full">
                <div className="aspect-[16/11] bg-muted overflow-hidden">
                  {p.cover_image_url ? (
                    <img
                      src={p.cover_image_url}
                      alt={title}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                      <Briefcase className="w-10 h-10" />
                    </div>
                  )}
                </div>
                <CardContent className="p-3">
                  <h3 className="font-heading font-bold text-sm text-foreground line-clamp-2 group-hover:text-gold transition-colors">
                    {title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-muted-foreground">
                    {biz?.name_ar && (
                      <span className="line-clamp-1">
                        {language === 'ar' ? biz.name_ar : (biz.name_en || biz.name_ar)}
                      </span>
                    )}
                    {city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {language === 'ar' ? city.name_ar : (city.name_en || city.name_ar)}
                      </span>
                    )}
                    {p.completion_date && (
                      <span className="flex items-center gap-1 tech-content">
                        <Calendar className="w-3 h-3" />
                        {new Date(p.completion_date).getFullYear()}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
};

export default SectorProjectExamples;