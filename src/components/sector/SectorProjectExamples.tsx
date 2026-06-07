import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Briefcase, MapPin, Calendar, Building2, ArrowLeft, ArrowRight } from 'lucide-react';
import { SA_CITIES } from '@/lib/sa-cities';
import type { SectorSlug } from '@/lib/sector-keywords';
import { LEGACY_SECTOR_TO_TAXONOMY_SLUG } from '@/modules/taxonomy/legacy-mapping';

interface Props {
  sectorName: string;
  /** Sector slug — used to deep-link the "more in sector" CTA and to
   * resolve the taxonomy category used for project filtering. */
  sectorSlug?: SectorSlug;
  /** Legacy `categories.id` list — accepted for backward compatibility
   * with existing callers but no longer used to filter projects. Filtering
   * is taxonomy-only and driven by `sectorSlug`. */
  categoryIds?: string[];
  /** Optional city filter — when set, only projects in this city are shown. */
  cityId?: string | null;
  /** Optional city display name — used in the heading and CTA labels. */
  cityName?: string | null;
}

/**
 * Up to 6 real, completed projects in this sector. Each card now exposes
 * THREE separate internal links to maximize session depth:
 *   - cover/title → /projects/:id (project detail)
 *   - business name → /:username (provider profile)
 *   - city → /sectors/:slug/:city when slug is known, else /search?city=…
 */
export const SectorProjectExamples: React.FC<Props> = ({ sectorName, sectorSlug, cityId, cityName }) => {
  const { isRTL, language } = useLanguage();
  const Arrow = isRTL ? ArrowLeft : ArrowRight;

  // Phase 13: resolve the sector slug to taxonomy category ids, then look
  // up projects via `project_taxonomy_categories` (never `projects.category_id`).
  const taxonomySlug = sectorSlug ? LEGACY_SECTOR_TO_TAXONOMY_SLUG[sectorSlug] ?? null : null;

  const { data: taxonomyCategoryIds = [] } = useQuery({
    queryKey: ['sector-projects-tax-cat', taxonomySlug],
    enabled: !!taxonomySlug,
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from('taxonomy_categories')
        .select('id')
        .eq('slug', taxonomySlug!)
        .eq('is_active', true);
      return (data ?? []).map((c) => c.id as string);
    },
  });

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['sector-projects-tax', taxonomyCategoryIds, cityId ?? 'all'],
    enabled: taxonomyCategoryIds.length > 0,
    queryFn: async () => {
      const { data: links } = await supabase
        .from('project_taxonomy_categories')
        .select('project_id')
        .in('category_id', taxonomyCategoryIds)
        .limit(200);
      const ids = Array.from(new Set((links ?? []).map((l) => l.project_id)));
      if (ids.length === 0) return [];
      let q = supabase
        .from('projects')
        .select('id, title_ar, title_en, cover_image_url, completion_date, business_id, city_id, cities(name_ar, name_en), businesses(username, name_ar, name_en)')
        .in('id', ids)
        .eq('status', 'published');
      if (cityId) q = q.eq('city_id', cityId);
      const { data } = await q
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
            {cityName
              ? (isRTL ? `أمثلة أعمال ${sectorName} في ${cityName}` : `${sectorName} project examples in ${cityName}`)
              : (isRTL ? `أمثلة أعمال ${sectorName}` : `${sectorName} project examples`)}
          </h2>
        </div>
        <Link
          to={sectorSlug ? `/projects?sector=${sectorSlug}` : '/projects'}
          className="text-xs text-primary hover:underline inline-flex items-center gap-1"
        >
          {isRTL ? `كل أعمال ${sectorName}` : `All ${sectorName} work`}
          <Arrow className="w-3 h-3" />
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((p) => {
          const biz = p.businesses as { username?: string; name_ar?: string; name_en?: string | null } | null;
          const city = p.cities as { name_ar?: string; name_en?: string | null } | null;
          const title = language === 'ar' ? p.title_ar : (p.title_en || p.title_ar);
          const citySlug = city?.name_en
            ? SA_CITIES.find((c) => c.nameEn.toLowerCase() === city.name_en!.toLowerCase())?.slug
            : null;
          const cityHref = citySlug && sectorSlug
            ? `/sectors/${sectorSlug}/${citySlug}`
            : null;

          return (
            <Card key={p.id} className="hover-lift overflow-hidden h-full flex flex-col">
              {/* Cover + title → project detail */}
              <Link to={`/projects/${p.id}`} className="block group">
                <div className="aspect-[16/11] bg-muted overflow-hidden">
                  {p.cover_image_url ? (
                    <img
                      src={p.cover_image_url}
                      alt={title}
                      loading="lazy"
                      decoding="async"
                      width={640}
                      height={440}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                      <Briefcase className="w-10 h-10" />
                    </div>
                  )}
                </div>
              </Link>

              <CardContent className="p-3 flex-1 flex flex-col">
                <Link to={`/projects/${p.id}`} className="group">
                  <h3 className="font-heading font-bold text-sm text-foreground line-clamp-2 group-hover:text-gold transition-colors">
                    {title}
                  </h3>
                </Link>

                {/* Separate inline links for provider + city + completion year */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-muted-foreground">
                  {biz?.username && biz?.name_ar && (
                    <Link
                      to={`/${biz.username}`}
                      className="inline-flex items-center gap-1 hover:text-primary hover:underline line-clamp-1"
                    >
                      <Building2 className="w-3 h-3" />
                      {language === 'ar' ? biz.name_ar : (biz.name_en || biz.name_ar)}
                    </Link>
                  )}
                  {city && (
                    cityHref ? (
                      <Link
                        to={cityHref}
                        className="inline-flex items-center gap-1 hover:text-primary hover:underline"
                      >
                        <MapPin className="w-3 h-3" />
                        {language === 'ar' ? city.name_ar : (city.name_en || city.name_ar)}
                      </Link>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {language === 'ar' ? city.name_ar : (city.name_en || city.name_ar)}
                      </span>
                    )
                  )}
                  {p.completion_date && (
                    <span className="inline-flex items-center gap-1 tech-content">
                      <Calendar className="w-3 h-3" />
                      {new Date(p.completion_date).getFullYear()}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
};

export default SectorProjectExamples;
