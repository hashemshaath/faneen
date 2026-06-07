import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Building2, MapPin, X, ChevronLeft, ChevronRight, Upload } from 'lucide-react';
import { type SeoSectorSlug } from '@/lib/sectors-seo';
import { LEGACY_SECTOR_TO_TAXONOMY_SLUG } from '@/modules/taxonomy/legacy-mapping';

/** Map SEO sector slug -> category slugs in the directory. */
export const SECTOR_TO_CATEGORY_SLUGS: Record<SeoSectorSlug, string[]> = {
  aluminum: ['aluminum'],
  steel: ['iron-steel'],
  wood: ['wood-cabinets'],
  glass: ['glass'],
  'stainless-steel': ['iron-steel'],
  'fabrication-installation': ['aluminum', 'iron-steel', 'wood-cabinets', 'glass'],
};

type GalleryImage = {
  id: string;
  image_url: string;
  caption_ar: string | null;
  project_id: string;
  projects: {
    id: string;
    title_ar: string;
    title_en: string | null;
    business_id: string;
    cities: { name_ar: string; name_en: string | null } | null;
    businesses: { username: string; name_ar: string; logo_url: string | null } | null;
  } | null;
};

interface Props {
  sectorSlug: SeoSectorSlug | null;
  /** Hide entirely if no images. Default false (renders empty-state card). */
  hideWhenEmpty?: boolean;
  /** Max items to fetch. Default 24. */
  limit?: number;
  /** Title override. */
  title?: string;
  /** Show provider upload CTA at the bottom. Default true. */
  showUploadCta?: boolean;
}

/**
 * Real-works gallery for a sector — surfaces project images uploaded by
 * providers from the `projects` + `project_images` tables, filtered by
 * categories mapped to the SEO sector slug. Includes an inline fullscreen
 * lightbox (no Dialog) and a CTA pointing providers to their upload screen.
 */
export const SectorWorksGallery: React.FC<Props> = ({
  sectorSlug,
  hideWhenEmpty = false,
  limit = 24,
  title,
  showUploadCta = true,
}) => {
  const categorySlugs = sectorSlug ? SECTOR_TO_CATEGORY_SLUGS[sectorSlug] : [];

  // Phase 13: translate legacy sector → taxonomy slugs → taxonomy category
  // ids, then resolve project ids via `project_taxonomy_categories`. We no
  // longer hit the legacy `categories` table or `projects.category_id`.
  const taxonomySlugs = useMemo(
    () => Array.from(new Set(
      categorySlugs
        .map((s) => LEGACY_SECTOR_TO_TAXONOMY_SLUG[s] ?? null)
        .filter((s): s is string => !!s),
    )),
    [categorySlugs],
  );

  const { data: taxonomyCategoryIds = [] } = useQuery({
    queryKey: ['sector-gallery-tax-cats', taxonomySlugs.join(',')],
    enabled: taxonomySlugs.length > 0,
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from('taxonomy_categories')
        .select('id')
        .in('slug', taxonomySlugs)
        .eq('is_active', true);
      return (data ?? []).map((c) => c.id as string);
    },
  });

  const { data: projectIdsInSector = [] } = useQuery({
    queryKey: ['sector-gallery-tax-projects', taxonomyCategoryIds],
    enabled: taxonomyCategoryIds.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from('project_taxonomy_categories')
        .select('project_id')
        .in('category_id', taxonomyCategoryIds)
        .limit(500);
      return Array.from(new Set((data ?? []).map((l) => l.project_id as string)));
    },
  });

  const { data: images = [], isLoading } = useQuery({
    queryKey: ['sector-gallery', sectorSlug, projectIdsInSector, limit],
    enabled: projectIdsInSector.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from('project_images')
        .select(
          'id, image_url, caption_ar, project_id, projects!inner(id, title_ar, title_en, business_id, status, is_demo, cities(name_ar, name_en), businesses!inner(username, name_ar, logo_url, is_active))',
        )
        .in('project_id', projectIdsInSector)
        .eq('projects.status', 'published')
        .eq('projects.is_demo', false)
        .eq('projects.businesses.is_active', true)
        .order('created_at', { ascending: false })
        .limit(limit);
      return (data ?? []) as unknown as GalleryImage[];
    },
  });

  // Fullscreen lightbox state (inline overlay — not a Dialog primitive).
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  useEffect(() => {
    if (lightboxIdx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIdx(null);
      if (e.key === 'ArrowRight') setLightboxIdx((i) => (i === null ? null : Math.min(i + 1, images.length - 1)));
      if (e.key === 'ArrowLeft') setLightboxIdx((i) => (i === null ? null : Math.max(i - 1, 0)));
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [lightboxIdx, images.length]);

  const current = useMemo(
    () => (lightboxIdx === null ? null : images[lightboxIdx] ?? null),
    [lightboxIdx, images],
  );

  if (!sectorSlug) return null;
  if (hideWhenEmpty && !isLoading && images.length === 0) return null;

  const headingText = title ?? 'معرض أعمال حقيقية من المزودين';

  return (
    <section aria-labelledby="sector-works-h" className="space-y-5">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h2 id="sector-works-h" className="font-heading text-2xl font-bold">
            {headingText}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            صور مشاريع منفذة من قبل مزودي الخدمات في هذا القطاع.
          </p>
        </div>
        {!isLoading && images.length > 0 ? (
          <span className="text-xs text-muted-foreground tech-content">
            {images.length} صورة
          </span>
        ) : null}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-xl" />
          ))}
        </div>
      ) : images.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            لا توجد صور أعمال منشورة لهذا القطاع حتى الآن.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {images.map((img, idx) => {
            const biz = img.projects?.businesses ?? null;
            const city = img.projects?.cities ?? null;
            return (
              <button
                key={img.id}
                type="button"
                onClick={() => setLightboxIdx(idx)}
                className="group relative aspect-square overflow-hidden rounded-xl bg-muted text-start hover-lift focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label={img.projects?.title_ar ?? 'صورة عمل'}
              >
                <img
                  src={img.image_url}
                  alt={img.caption_ar ?? img.projects?.title_ar ?? 'صورة عمل'}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/75 via-black/40 to-transparent">
                  <div className="text-[11px] text-white/95 truncate font-semibold">
                    {biz?.name_ar ?? img.projects?.title_ar ?? ''}
                  </div>
                  {city ? (
                    <div className="text-[10px] text-white/75 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" />
                      {city.name_ar}
                    </div>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {showUploadCta ? (
        <Card className="bg-primary/5 border-primary/10">
          <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-base">هل أنت مزود في هذا القطاع؟</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  ارفع صور أعمالك الحقيقية لتظهر في معرض القطاع وتصل لعملاء جدد.
                </p>
              </div>
            </div>
            <Link to="/dashboard/projects">
              <Button size="default" className="rounded-xl h-11 px-5">
                <Upload className="w-4 h-4 ms-2" />
                ارفع أعمالك
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : null}

      {/* Inline fullscreen lightbox (no Dialog primitive — respects no-popup rule) */}
      {current ? (
        <div
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-label="معاينة صورة العمل"
          onClick={() => setLightboxIdx(null)}
        >
          <div className="flex items-center justify-between p-3 sm:p-4 text-white">
            <div className="min-w-0 flex items-center gap-3">
              {current.projects?.businesses?.logo_url ? (
                <img
                  src={current.projects.businesses.logo_url}
                  alt=""
                  className="w-9 h-9 rounded-lg object-cover bg-white/10"
                loading="lazy" decoding="async"/>
              ) : (
                <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
              )}
              <div className="min-w-0">
                <div className="text-sm font-bold truncate">
                  {current.projects?.businesses?.name_ar ?? ''}
                </div>
                <div className="text-xs text-white/70 truncate">
                  {current.projects?.title_ar ?? ''}
                  {current.projects?.cities?.name_ar ? ` • ${current.projects.cities.name_ar}` : ''}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {current.projects?.businesses?.username ? (
                <Link
                  to={`/business/${current.projects.businesses.username}`}
                  onClick={(e) => e.stopPropagation()}
                  className="hidden sm:inline-flex items-center text-xs px-3 h-9 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                >
                  زيارة المزود
                </Link>
              ) : null}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIdx(null);
                }}
                aria-label="إغلاق"
                className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div
            className="flex-1 flex items-center justify-center px-3 pb-3 sm:px-6 sm:pb-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightboxIdx((i) => (i === null ? null : Math.max(i - 1, 0)))}
              disabled={lightboxIdx === 0}
              aria-label="السابق"
              className="hidden sm:flex w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white items-center justify-center"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <img
              src={current.image_url}
              alt={current.caption_ar ?? current.projects?.title_ar ?? 'صورة عمل'}
              className="max-h-full max-w-full object-contain rounded-lg mx-3"
            loading="lazy" decoding="async"/>
            <button
              type="button"
              onClick={() =>
                setLightboxIdx((i) => (i === null ? null : Math.min(i + 1, images.length - 1)))
              }
              disabled={lightboxIdx === images.length - 1}
              aria-label="التالي"
              className="hidden sm:flex w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white items-center justify-center"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>

          {current.caption_ar ? (
            <div
              className="text-center text-xs sm:text-sm text-white/80 px-4 pb-4"
              onClick={(e) => e.stopPropagation()}
            >
              {current.caption_ar}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
};

export default SectorWorksGallery;