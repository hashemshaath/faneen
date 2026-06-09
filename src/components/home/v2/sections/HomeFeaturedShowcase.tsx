/**
 * HomeFeaturedShowcase — verified, top-rated providers as a polished
 * "featured" row. Reads from the public `businesses_public` view so RLS
 * is safe. No featured/sponsored flag yet — falls back to is_verified
 * ordered by rating_avg desc, limit 8.
 *
 * TODO: connect to ads microservice / sponsored placements.
 * When that lands, swap the query for a server-side ranking endpoint
 * and keep this presentational shell unchanged.
 */
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Star } from 'lucide-react';
import { useBi } from '@/components/common/Bilingual';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { VerifiedBadge } from '@/components/common/VerifiedBadge';
import { Section, SectionHead, SecondaryCTA } from './_shared';

interface FeaturedRow {
  id: string;
  username: string | null;
  name_ar: string | null;
  name_en: string | null;
  logo_url: string | null;
  rating_avg: number | null;
  rating_count: number | null;
  is_verified: boolean | null;
  cities: { name_ar: string | null; name_en: string | null } | null;
}

const useFeatured = () =>
  useQuery({
    queryKey: ['home-featured-showcase'],
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: async (): Promise<FeaturedRow[]> => {
      const { data, error } = await supabase
        .from('businesses_public')
        .select(
          'id, username, name_ar, name_en, logo_url, rating_avg, rating_count, is_verified, cities(name_ar, name_en)',
        )
        .eq('is_active', true)
        .eq('is_verified', true)
        .not('rating_avg', 'is', null)
        .order('rating_avg', { ascending: false })
        .order('rating_count', { ascending: false })
        .limit(8);
      if (error) return [];
      return (data ?? []) as unknown as FeaturedRow[];
    },
  });

const HomeFeaturedShowcase = () => {
  const bi = useBi();
  const { isRTL } = useLanguage();
  const Arrow = isRTL ? ArrowLeft : ArrowRight;
  const { data: items = [], isLoading } = useFeatured();

  if (!isLoading && items.length === 0) return null;

  return (
    <Section className="border-t border-border/40" ariaLabelledBy="featured-heading">
      <SectionHead
        headingId="featured-heading"
        title={bi('مزوّدون مميّزون', 'Featured providers')}
        sub={bi(
          'مزوّدون موثّقون بتقييمات عالية من عملاء سابقين.',
          'Verified providers with strong ratings from past clients.',
        )}
      />
      <div className="flex sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory">
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="shrink-0 snap-start w-[78%] sm:w-auto rounded-2xl border border-border/60 bg-card p-4 sm:p-5 animate-pulse h-[140px]"
              />
            ))
          : items.map((b) => {
              const name = bi(b.name_ar ?? b.name_en ?? '', b.name_en ?? b.name_ar ?? '');
              const city = b.cities ? bi(b.cities.name_ar ?? '', b.cities.name_en ?? '') : '';
              // Route to the public business profile via UsernameResolver
              // (`/:username`), NOT `/q/:code` which is the barcode/quotation
              // dispatcher and shows "code unavailable" for usernames.
              const href = `/${b.username ?? b.id}`;
              return (
                <Link
                  key={b.id}
                  to={href}
                  className="shrink-0 snap-start w-[78%] sm:w-auto group relative rounded-2xl border border-border/60 bg-card p-4 sm:p-5 hover-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 flex flex-col gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-muted overflow-hidden shrink-0 border border-border/60">
                      {b.logo_url ? (
                        <img
                          src={b.logo_url}
                          alt=""
                          width={48}
                          height={48}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <h3 className="font-heading font-semibold text-sm sm:text-base text-foreground truncate">
                          {name || bi('مزوّد', 'Provider')}
                        </h3>
                        {b.is_verified ? <VerifiedBadge size="xs" /> : null}
                      </div>
                      {city ? (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{city}</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-2 mt-auto border-t border-border/40">
                    <span className="inline-flex items-center gap-1 text-xs text-foreground">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span className="font-semibold tech-content">
                        {b.rating_avg ? Number(b.rating_avg).toFixed(1) : '—'}
                      </span>
                      {b.rating_count ? (
                        <span className="text-muted-foreground tech-content">({b.rating_count})</span>
                      ) : null}
                    </span>
                    <Arrow className="w-3.5 h-3.5 text-primary transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
                  </div>
                </Link>
              );
            })}
      </div>
      <div className="text-center mt-8 sm:mt-10">
        <SecondaryCTA to="/search" label={bi('عرض كل المزوّدين الموثّقين', 'See all verified providers')} />
      </div>
    </Section>
  );
};

export default HomeFeaturedShowcase;