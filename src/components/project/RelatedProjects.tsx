import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { MapPin, Calendar, ArrowLeft, ArrowRight, FolderOpen } from 'lucide-react';

interface Props {
  projectId: string;
  businessId: string;
  categoryId: string | null;
  cityId: string | null;
}

export const RelatedProjects = ({ projectId, businessId, categoryId, cityId }: Props) => {
  const { isRTL, language } = useLanguage();

  // Same business projects
  const { data: sameBusinessProjects = [], isLoading: loadingBiz } = useQuery({
    queryKey: ['related-same-biz', businessId, projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from('projects')
        .select('id, title_ar, title_en, cover_image_url, completion_date, city_id, cities(name_ar, name_en)')
        .eq('business_id', businessId)
        .eq('status', 'published')
        .neq('id', projectId)
        .order('created_at', { ascending: false })
        .limit(4);
      return data || [];
    },
    enabled: !!businessId,
  });

  // Same category projects (from other businesses)
  const { data: sameCategoryProjects = [], isLoading: loadingCat } = useQuery({
    queryKey: ['related-same-cat', categoryId, projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from('projects')
        .select('id, title_ar, title_en, cover_image_url, completion_date, business_id, businesses(name_ar, name_en, logo_url, username), city_id, cities(name_ar, name_en)')
        .eq('category_id', categoryId!)
        .eq('status', 'published')
        .neq('id', projectId)
        .neq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(4);
      return data || [];
    },
    enabled: !!categoryId,
  });

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  const renderCard = (p: any, showBusiness = false) => {
    const title = language === 'ar' ? p.title_ar : (p.title_en || p.title_ar);
    const cityName = p.cities ? (language === 'ar' ? p.cities.name_ar : p.cities.name_en) : null;

    return (
      <Link
        key={p.id}
        to={`/projects/${p.id}`}
        className="group rounded-xl border border-border/50 dark:border-border/30 bg-card dark:bg-card/80 overflow-hidden hover:shadow-lg hover:border-accent/20 transition-all"
      >
        <div className="aspect-[16/10] bg-muted overflow-hidden relative">
          {p.cover_image_url ? (
            <img src={p.cover_image_url} alt={title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <FolderOpen className="w-10 h-10 text-muted-foreground/20" />
            </div>
          )}
          {showBusiness && p.businesses?.logo_url && (
            <div className="absolute top-2.5 start-2.5">
              <img src={p.businesses.logo_url} alt="" className="w-8 h-8 rounded-lg border-2 border-background object-cover" />
            </div>
          )}
        </div>
        <div className="p-3 sm:p-4">
          <h4 className="font-heading font-bold text-sm line-clamp-2 mb-2 group-hover:text-accent transition-colors">{title}</h4>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {cityName && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {cityName}
              </span>
            )}
            {p.completion_date && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {p.completion_date}
              </span>
            )}
          </div>
          {showBusiness && p.businesses && (
            <p className="text-xs text-accent mt-2 font-medium truncate">
              {language === 'ar' ? p.businesses.name_ar : (p.businesses.name_en || p.businesses.name_ar)}
            </p>
          )}
        </div>
      </Link>
    );
  };

  const isLoading = loadingBiz || loadingCat;
  const hasContent = sameBusinessProjects.length > 0 || sameCategoryProjects.length > 0;

  if (isLoading) {
    return (
      <div className="mt-10 sm:mt-14">
        <Skeleton className="h-8 w-48 mb-6 rounded-lg" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-56 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!hasContent) return null;

  return (
    <div className="mt-10 sm:mt-14 space-y-10">
      {/* Same business projects */}
      {sameBusinessProjects.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-heading font-bold text-lg sm:text-xl">
              {isRTL ? 'مشاريع أخرى لنفس المزود' : 'More from this Provider'}
            </h2>
            <Link
              to={`/projects?business=${businessId}`}
              className="text-xs text-accent hover:underline flex items-center gap-1"
            >
              {isRTL ? 'عرض الكل' : 'View all'}
              <ArrowIcon className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {sameBusinessProjects.map(p => renderCard(p, false))}
          </div>
        </div>
      )}

      {/* Same category projects */}
      {sameCategoryProjects.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-heading font-bold text-lg sm:text-xl">
              {isRTL ? 'مشاريع مشابهة' : 'Similar Projects'}
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {sameCategoryProjects.map(p => renderCard(p, true))}
          </div>
        </div>
      )}
    </div>
  );
};
